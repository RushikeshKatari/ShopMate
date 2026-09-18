import prisma from "@/lib/prisma";
import { parseShopCommand, AIContext, AICommandResult } from "@/lib/ai";
import { shopRAG } from "@/lib/rag/ShopRAGEngine";
import { PurchaseService } from "./PurchaseService";
import { SalesService } from "./SalesService";
import { KhataService } from "./KhataService";
import { PricingService } from "./PricingService";
import { InventoryService } from "./InventoryService";

export class AICommandService {
  static async processCommand(params: {
    shopId: string;
    text: string;
    language?: string;
    conversationState?: any;
    confirmExecution?: boolean;
  }): Promise<{
    success: boolean;
    result: AICommandResult;
    executionData?: any;
    error?: string;
    speechResponse: string;
    speechResponseTelugu?: string;
  }> {
    let { shopId, text, language, conversationState, confirmExecution = false } = params;
    const mutatingIntents = new Set([
      "record_purchase",
      "record_sale",
      "record_credit_sale",
      "record_payment",
      "set_profit_margin",
      "set_product_price",
      "set_minimum_stock",
    ]);

    // 1. Gather context
    const [shop, products, customers] = await Promise.all([
      prisma.shop.findUnique({ where: { id: shopId }, include: { settings: true } }),
      prisma.product.findMany({
        where: { shopId },
        select: {
          id: true,
          name: true,
          currentStock: true,
          unit: true,
          purchasePrice: true,
          sellingPrice: true,
          minimumStock: true,
        },
      }),
      prisma.customer.findMany({
        where: { shopId },
        select: {
          id: true,
          name: true,
          outstandingBalance: true,
          phone: true,
        },
      }),
    ]);

    if (!shop) throw new Error("Shop not found");

    const context: AIContext = {
      shopName: shop.name,
      currency: shop.currency,
      language: language || shop.settings?.language || "en-IN",
      products,
      customers,
      conversationState,
    };

    // 2. Parse command via AI Provider
    const commandResult = await parseShopCommand(text, context);
    const isTelugu = Boolean(
      commandResult.is_telugu ||
      context.language === "te-IN" ||
      /[\u0C00-\u0C7F]/.test(text)
    );

    // 2a. Conversational Voice Confirmation / Cancellation / Greeting / Help
    if (commandResult.intent === "confirm_action") {
      if (conversationState?.pendingIntent) {
        commandResult.intent = conversationState.pendingIntent as any;
        commandResult.entities = conversationState.pendingEntities || {};
        confirmExecution = true;
      } else {
        const noPendingMsg = isTelugu
          ? "ధృవీకరించడానికి పెండింగ్ ఆదేశాలు ఏమీ లేవు."
          : "There are no pending operations to confirm.";
        return {
          success: true,
          result: commandResult,
          speechResponse: noPendingMsg,
          speechResponseTelugu: "ధృవీకరించడానికి పెండింగ్ ఆదేశాలు ఏమీ లేవు.",
        };
      }
    }

    if (commandResult.intent === "cancel_action") {
      const cancelMsg = isTelugu
        ? "రద్దు చేయబడింది. మీ షాప్ రికార్డులలో ఎటువంటి మార్పులు చేయలేదు."
        : "Cancelled. Nothing was changed in your shop records.";
      return {
        success: true,
        result: commandResult,
        speechResponse: cancelMsg,
        speechResponseTelugu: "రద్దు చేయబడింది. మీ షాప్ రికార్డులలో ఎటువంటి మార్పులు చేయలేదు.",
      };
    }

    if (commandResult.intent === "greeting") {
      const greetEn = commandResult.speech_response || `Hello! I'm ShopMate, your kirana assistant.`;
      const greetTe = commandResult.speech_response_telugu || `నమస్కారం! నేను మీ షాప్‌మేట్ కిరాణా AI సహాయకుడిని.`;
      return {
        success: true,
        result: commandResult,
        speechResponse: isTelugu ? greetTe : greetEn,
        speechResponseTelugu: greetTe,
      };
    }

    if (commandResult.intent === "help") {
      const helpEn = commandResult.speech_response || "You can record purchases, sales, khata, check prices or stock.";
      const helpTe = commandResult.speech_response_telugu || "మీరు అమ్మకాలు, కొనుగోళ్లు, ఖాతా లేదా స్టాక్ వివరాల గురించి అడగవచ్చు.";
      return {
        success: true,
        result: commandResult,
        speechResponse: isTelugu ? helpTe : helpEn,
        speechResponseTelugu: helpTe,
      };
    }

    // 2b. RAG — Retrieve → Augment: enrich speech response with shop-specific context
    try {
      const ragCtx = await shopRAG.query({
        shopId,
        intent: commandResult.intent,
        productName: commandResult.entities?.product_name,
        customerName: commandResult.entities?.customer_name,
        amount: commandResult.entities?.amount ?? commandResult.entities?.total_amount,
      });
      if (ragCtx.tip && commandResult.speech_response) {
        commandResult.speech_response = `${commandResult.speech_response} ${ragCtx.tip}`;
      }
      (commandResult as any).ragContext = ragCtx;
    } catch {
      // RAG is non-blocking — never fail the command if RAG errors
    }

    // 3. Check for clarification questions or pending confirmation
    if (commandResult.clarification_question) {
      await prisma.aICommand.create({
        data: {
          shopId,
          rawText: text,
          intent: commandResult.intent,
          structuredData: JSON.stringify(commandResult.entities),
          confidence: commandResult.confidence,
          status: "PENDING",
        },
      });

      const clarEn = commandResult.clarification_question;
      const clarTe = commandResult.speech_response_telugu || clarEn;

      return {
        success: true,
        result: commandResult,
        speechResponse: isTelugu ? clarTe : clarEn,
        speechResponseTelugu: clarTe,
      };
    }

    // Never write stock, prices, or money records until confirmed.
    if (mutatingIntents.has(commandResult.intent) && !confirmExecution) {
      commandResult.requires_confirmation = true;
      const confirmEn = commandResult.confirmation_message || `${commandResult.speech_response || "This change"} Should I record it?`;
      const confirmTe = commandResult.speech_response_telugu
        ? `${commandResult.speech_response_telugu} నమోదు చేయమంటారా?`
        : "ఈ లావాదేవీని నమోదు చేయమంటారా?";

      return {
        success: true,
        result: commandResult,
        speechResponse: isTelugu ? confirmTe : confirmEn,
        speechResponseTelugu: confirmTe,
      };
    }

    // 4. Execute business logic atomically
    try {
      let executionData: any = null;
      let speech = commandResult.speech_response || "Recorded.";
      let speechTelugu = commandResult.speech_response_telugu || "నమోదయింది.";

      switch (commandResult.intent) {
        case "record_purchase": {
          const { product_name, quantity, unit, total_amount } = commandResult.entities;
          executionData = await PurchaseService.recordPurchase({
            shopId,
            productName: product_name,
            quantity,
            unit,
            totalAmount: total_amount,
            source: "VOICE",
          });
          speech = `Recorded. ${executionData.product.name} stock increased by ${quantity} ${executionData.product.unit}. Purchase price: ₹${executionData.purchasePricePerUnit}/${executionData.product.unit}.`;
          speechTelugu = `నమోదయింది. ${executionData.product.name} స్టాక్ ${quantity} ${executionData.product.unit} పెరిగింది. కొనుగోలు ధర: ₹${executionData.purchasePricePerUnit}/${executionData.product.unit}.`;
          break;
        }

        case "record_sale": {
          const { product_name, quantity, unit, total_amount, payment_method } = commandResult.entities;
          executionData = await SalesService.recordSale({
            shopId,
            productName: product_name,
            quantity,
            unit,
            totalAmount: total_amount,
            paymentMethod: payment_method,
            source: "VOICE",
          });
          speech = `Recorded. ${quantity} ${executionData.product.unit} ${executionData.product.name} sold for ₹${executionData.totalAmount}.`;
          speechTelugu = `అమ్మకం రికార్డ్ అయింది. ₹${executionData.totalAmount} కు ${quantity} ${executionData.product.unit} ${executionData.product.name} అమ్మారు.`;
          break;
        }

        case "record_credit_sale": {
          const { customer_name, product_name, quantity, unit, total_amount } = commandResult.entities;
          executionData = await KhataService.recordCreditSale({
            shopId,
            customerName: customer_name,
            productName: product_name,
            quantity,
            unit,
            totalAmount: total_amount,
            source: "VOICE",
          });
          speech = `₹${executionData.amount} added to ${executionData.customer.name}'s khata. ${executionData.product.name} stock reduced by ${quantity} ${executionData.product.unit}.`;
          speechTelugu = `₹${executionData.amount} ${executionData.customer.name} ఖాతాలో చేర్చబడింది. ${executionData.product.name} స్టాక్ ${quantity} ${executionData.product.unit} తగ్గింది.`;
          break;
        }

        case "record_payment": {
          const { customer_name, amount, payment_method } = commandResult.entities;
          executionData = await KhataService.recordPayment({
            shopId,
            customerName: customer_name,
            amount,
            paymentMethod: payment_method,
            source: "VOICE",
          });
          speech = `Payment of ₹${amount} recorded for ${executionData.customer.name}. Outstanding balance is now ₹${executionData.newBalance}.`;
          speechTelugu = `${executionData.customer.name} నుండి ₹${amount} చెల్లింపు నమోదయింది. ప్రస్తుత ఖాతా బాకీ ₹${executionData.newBalance}.`;
          break;
        }

        case "set_profit_margin": {
          const { product_name, profit_amount } = commandResult.entities;
          const product = products.find((p) => p.name.toLowerCase() === product_name.toLowerCase());
          if (!product) throw new Error(`Product "${product_name}" not found.`);

          executionData = await PricingService.setProfitMargin(shopId, product.id, profit_amount);
          speech = `Selling price set to ₹${executionData.sellingPrice}/${executionData.unit}.`;
          speechTelugu = `${product.name} అమ్మకం ధర ₹${executionData.sellingPrice}/${executionData.unit} గా నిర్ణయించబడింది.`;
          break;
        }

        case "set_product_price": {
          const { product_name, price } = commandResult.entities;
          const product = products.find((p) => p.name.toLowerCase() === product_name.toLowerCase());
          if (!product) throw new Error(`Product "${product_name}" not found.`);

          executionData = await PricingService.setSellingPrice(shopId, product.id, price);
          speech = `Selling price for ${executionData.name} is now ₹${price} per ${executionData.unit}.`;
          speechTelugu = `${executionData.name} అమ్మకం ధర ఇప్పుడు ₹${price} ప్రతి ${executionData.unit}కు.`;
          break;
        }

        case "set_minimum_stock": {
          const { product_name, minimum_stock } = commandResult.entities;
          const product = products.find((p) => p.name.toLowerCase() === product_name.toLowerCase());
          if (!product) throw new Error(`Product "${product_name}" not found.`);

          executionData = await InventoryService.setMinimumStock(shopId, product.id, minimum_stock);
          speech = `Minimum threshold for ${executionData.name} set to ${minimum_stock} ${executionData.unit}.`;
          speechTelugu = `${executionData.name} కనీస స్టాక్ పరిమితి ${minimum_stock} ${executionData.unit} గా నిర్ణయించబడింది.`;
          break;
        }

        case "get_product_price": {
          const { product_name } = commandResult.entities;
          const product = products.find((p) => p.name.toLowerCase().includes(product_name.toLowerCase()));
          if (!product) throw new Error(`Product "${product_name}" not found.`);
          speech = `${product.name} is currently ₹${product.sellingPrice} per ${product.unit}.`;
          speechTelugu = `ప్రస్తుతం ${product.name} ధర ₹${product.sellingPrice} ప్రతి ${product.unit}కు.`;
          executionData = product;
          break;
        }

        case "get_stock": {
          const { product_name } = commandResult.entities;
          const product = products.find((p) => p.name.toLowerCase().includes(product_name.toLowerCase()));
          if (!product) throw new Error(`Product "${product_name}" not found.`);
          speech = `Current stock of ${product.name} is ${product.currentStock} ${product.unit}.`;
          speechTelugu = `ప్రస్తుతం ${product.name} స్టాక్ ${product.currentStock} ${product.unit} అందుబాటులో ఉంది.`;
          executionData = product;
          break;
        }

        case "get_customer_balance": {
          const { customer_name, open_payment } = commandResult.entities;
          const customer = customers.find((c) => c.name.toLowerCase().includes(customer_name.toLowerCase()));
          if (!customer) throw new Error(`Customer "${customer_name}" not found.`);
          speech = `${customer.name} currently owes ₹${customer.outstandingBalance}.`;
          speechTelugu = `${customer.name} ప్రస్తుత ఖాతా బాకీ ₹${customer.outstandingBalance}.`;
          executionData = { ...customer, open_payment };
          break;
        }

        case "list_products": {
          const inventory = products.slice().sort((a, b) => a.name.localeCompare(b.name));
          if (inventory.length === 0) {
            speech = "No products have been added yet.";
            speechTelugu = "దుకాణంలో ఇంకా ఏ సరుకులు నమోదు కాలేదు.";
          } else {
            const details = inventory.slice(0, 10).map(p => `${p.name}: ${p.currentStock} ${p.unit}`).join(", ");
            speech = `You have ${inventory.length} products. ${details}${inventory.length > 10 ? ", and more." : "."}`;
            speechTelugu = `మీ వద్ద ${inventory.length} రకాల సరుకులు ఉన్నాయి: ${inventory.slice(0, 5).map(p => `${p.name} (${p.currentStock} ${p.unit})`).join(", ")}.`;
          }
          executionData = inventory;
          break;
        }

        case "get_low_stock": {
          const lowStock = products.filter(p => p.currentStock <= p.minimumStock && p.currentStock > 0);
          speech = lowStock.length
            ? `Low stock items: ${lowStock.map(p => `${p.name}, ${p.currentStock} ${p.unit} remaining`).join("; ")}.`
            : "No items are currently running low.";
          speechTelugu = lowStock.length
            ? `స్టాక్ తక్కువగా ఉన్న వస్తువులు: ${lowStock.map(p => `${p.name} (${p.currentStock} ${p.unit})`).join(", ")}.`
            : "ప్రస్తుతం ఏ వస్తువుల స్టాక్ తక్కువగా లేదు.";
          executionData = lowStock;
          break;
        }

        case "get_out_of_stock": {
          const outOfStock = products.filter(p => p.currentStock <= 0);
          speech = outOfStock.length
            ? `Out of stock: ${outOfStock.map(p => p.name).join(", ")}.`
            : "No items are out of stock.";
          speechTelugu = outOfStock.length
            ? `స్టాక్ అయిపోయిన వస్తువులు: ${outOfStock.map(p => p.name).join(", ")}.`
            : "అన్ని వస్తువుల స్టాక్ అందుబాటులో ఉంది.";
          executionData = outOfStock;
          break;
        }

        case "get_khata_summary": {
          const owing = customers.filter(c => c.outstandingBalance > 0).sort((a, b) => b.outstandingBalance - a.outstandingBalance);
          const total = owing.reduce((sum, customer) => sum + customer.outstandingBalance, 0);
          speech = owing.length
            ? `${owing.length} customers have pending khata totaling ₹${total}. ${owing.slice(0, 5).map(c => `${c.name} owes ₹${c.outstandingBalance}`).join("; ")}.`
            : "No customer has pending khata.";
          speechTelugu = owing.length
            ? `${owing.length} మంది కస్టమర్ల నుండి మొత్తం ₹${total} ఖాతా బాకీ ఉంది.`
            : "కస్టమర్ల పెండింగ్ ఖాతా బాకీ ఏమీ లేదు.";
          executionData = owing;
          break;
        }

        case "get_daily_sales": {
          const start = new Date();
          start.setHours(0, 0, 0, 0);
          const sales = await prisma.transaction.findMany({
            where: { shopId, type: { in: ["SALE", "CREDIT_SALE"] }, createdAt: { gte: start } },
          });
          const total = sales.reduce((sum, sale) => sum + sale.amount, 0);
          speech = `Today's sales are ₹${total} from ${sales.length} recorded sale${sales.length === 1 ? "" : "s"}.`;
          speechTelugu = `ఈరోజు మొత్తం అమ్మకాలు ₹${total}, ${sales.length} లావాదేవీలు పూర్తయ్యాయి.`;
          executionData = { total, count: sales.length };
          break;
        }

        case "get_profit_summary": {
          const start = new Date();
          start.setHours(0, 0, 0, 0);
          const sales = await prisma.transaction.findMany({
            where: { shopId, type: { in: ["SALE", "CREDIT_SALE"] }, createdAt: { gte: start } },
            include: { product: { select: { purchasePrice: true } } },
          });
          const revenue = sales.reduce((sum, sale) => sum + sale.amount, 0);
          const cost = sales.reduce((sum, sale) => sum + (sale.quantity ?? 0) * (sale.product?.purchasePrice ?? 0), 0);
          const profit = Math.round((revenue - cost) * 100) / 100;
          speech = `Today's estimated gross profit is ₹${profit}, from ₹${revenue} sales less ₹${Math.round(cost * 100) / 100} cost of goods sold.`;
          speechTelugu = `ఈరోజు సుమారు స్థూల లాభం ₹${profit}, మొత్తం అమ్మకాలు ₹${revenue}.`;
          executionData = { revenue, cost, profit };
          break;
        }

        case "business_overview": {
          const start = new Date();
          start.setHours(0, 0, 0, 0);
          const sales = await prisma.transaction.findMany({
            where: { shopId, type: { in: ["SALE", "CREDIT_SALE"] }, createdAt: { gte: start } },
            include: { product: { select: { purchasePrice: true } } },
          });
          const revenue = sales.reduce((sum, sale) => sum + sale.amount, 0);
          const cost = sales.reduce((sum, sale) => sum + (sale.quantity ?? 0) * (sale.product?.purchasePrice ?? 0), 0);
          const profit = Math.max(0, Math.round((revenue - cost) * 100) / 100);
          const owingCustomers = customers.filter((c) => c.outstandingBalance > 0);
          const totalKhata = owingCustomers.reduce((sum, c) => sum + c.outstandingBalance, 0);
          const lowStockCount = products.filter((p) => p.currentStock <= p.minimumStock).length;

          speech = `Today: ₹${revenue} sales, ₹${profit} estimated gross profit. ${owingCustomers.length} customers owe ₹${totalKhata} on khata. ${lowStockCount} items need restocking.`;
          speechTelugu = `ఈరోజు సారాంశం: మొత్తం అమ్మకాలు ₹${revenue}, లాభం ₹${profit}. ${owingCustomers.length} మంది కస్టమర్ల నుండి ₹${totalKhata} ఖాతా బాకీ ఉంది. ${lowStockCount} వస్తువుల స్టాక్ తక్కువగా ఉంది.`;
          executionData = { revenue, profit, owingCustomersCount: owingCustomers.length, totalKhata, lowStockCount };
          break;
        }

        default: {
          speech = commandResult.speech_response || "Sorry, I couldn't understand that command. Please try again.";
          speechTelugu = commandResult.speech_response_telugu || "క్షమించండి, మీ ఆదేశం అర్థం కాలేదు. దయచేసి మళ్ళీ ప్రయత్నించండి.";
          break;
        }
      }

      commandResult.speech_response = speech;
      commandResult.speech_response_telugu = speechTelugu;

      // Log AI command execution
      await prisma.aICommand.create({
        data: {
          shopId,
          rawText: text,
          intent: commandResult.intent,
          structuredData: JSON.stringify(commandResult.entities),
          confidence: commandResult.confidence,
          status: "EXECUTED",
        },
      });

      return {
        success: true,
        result: commandResult,
        executionData,
        speechResponse: isTelugu ? speechTelugu : speech,
        speechResponseTelugu: speechTelugu,
      };
    } catch (err: any) {
      await prisma.aICommand.create({
        data: {
          shopId,
          rawText: text,
          intent: commandResult.intent,
          structuredData: JSON.stringify(commandResult.entities),
          confidence: commandResult.confidence,
          status: "FAILED",
          errorMessage: err.message,
        },
      });

      return {
        success: false,
        result: commandResult,
        error: err.message,
        speechResponse: err.message,
      };
    }
  }
}
