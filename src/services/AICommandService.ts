import prisma from "@/lib/prisma";
import { getAIProvider, AIContext, AICommandResult } from "@/lib/ai";
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
    conversationState?: any;
    confirmExecution?: boolean;
  }): Promise<{
    success: boolean;
    result: AICommandResult;
    executionData?: any;
    error?: string;
    speechResponse: string;
  }> {
    const { shopId, text, conversationState, confirmExecution = false } = params;

    // 1. Gather context
    const [shop, products, customers] = await Promise.all([
      prisma.shop.findUnique({ where: { id: shopId } }),
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
      products,
      customers,
      conversationState,
    };

    // 2. Parse command via AI Provider
    const aiProvider = getAIProvider();
    const commandResult = await aiProvider.parseCommand(text, context);

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
      // Attach RAG metadata for API consumers (Intelligence page)
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

      return {
        success: true,
        result: commandResult,
        speechResponse: commandResult.clarification_question,
      };
    }

    if (commandResult.requires_confirmation && !confirmExecution) {
      return {
        success: true,
        result: commandResult,
        speechResponse: commandResult.confirmation_message || "Please confirm this operation.",
      };
    }

    // 4. Execute business logic atomically
    try {
      let executionData: any = null;
      let speech = commandResult.speech_response || "Recorded.";

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
          break;
        }

        case "set_profit_margin": {
          const { product_name, profit_amount } = commandResult.entities;
          const product = products.find((p) => p.name.toLowerCase() === product_name.toLowerCase());
          if (!product) throw new Error(`Product "${product_name}" not found.`);

          executionData = await PricingService.setProfitMargin(shopId, product.id, profit_amount);
          speech = `Selling price set to ₹${executionData.sellingPrice}/${executionData.unit}.`;
          break;
        }

        case "set_product_price": {
          const { product_name, price } = commandResult.entities;
          const product = products.find((p) => p.name.toLowerCase() === product_name.toLowerCase());
          if (!product) throw new Error(`Product "${product_name}" not found.`);

          executionData = await PricingService.setSellingPrice(shopId, product.id, price);
          speech = `Selling price for ${executionData.name} is now ₹${price} per ${executionData.unit}.`;
          break;
        }

        case "set_minimum_stock": {
          const { product_name, minimum_stock } = commandResult.entities;
          const product = products.find((p) => p.name.toLowerCase() === product_name.toLowerCase());
          if (!product) throw new Error(`Product "${product_name}" not found.`);

          executionData = await InventoryService.setMinimumStock(shopId, product.id, minimum_stock);
          speech = `Minimum threshold for ${executionData.name} set to ${minimum_stock} ${executionData.unit}.`;
          break;
        }

        case "get_product_price": {
          const { product_name } = commandResult.entities;
          const product = products.find((p) => p.name.toLowerCase().includes(product_name.toLowerCase()));
          if (!product) throw new Error(`Product "${product_name}" not found.`);
          speech = `${product.name} is currently ₹${product.sellingPrice} per ${product.unit}.`;
          executionData = product;
          break;
        }

        case "get_stock": {
          const { product_name } = commandResult.entities;
          const product = products.find((p) => p.name.toLowerCase().includes(product_name.toLowerCase()));
          if (!product) throw new Error(`Product "${product_name}" not found.`);
          speech = `Current stock of ${product.name} is ${product.currentStock} ${product.unit}.`;
          executionData = product;
          break;
        }

        case "get_customer_balance": {
          const { customer_name, open_payment } = commandResult.entities;
          const customer = customers.find((c) => c.name.toLowerCase().includes(customer_name.toLowerCase()));
          if (!customer) throw new Error(`Customer "${customer_name}" not found.`);
          speech = `${customer.name} currently owes ₹${customer.outstandingBalance}.`;
          executionData = { ...customer, open_payment };
          break;
        }

        default: {
          speech = commandResult.speech_response || "Sorry, I couldn't understand that command. Please try again.";
          break;
        }
      }

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
        speechResponse: speech,
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
