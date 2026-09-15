import { AIProvider } from "./ai-provider.interface";
import { AICommandResult, AIContext } from "./types";

/**
 * ShopMate Standalone Local NLP Engine
 * 100% On-Device, Deterministic, Zero External API dependencies, 0ms Network Latency.
 * Supports: English + Hinglish + Telugu (transliterated)
 */
export class LocalNLPProvider implements AIProvider {
  name = "ShopMate Local NLP Engine (English + Telugu / 100% On-Device)";

  private readonly teluguSynonyms: Record<string, string> = {
    // Products
    "biyyam": "rice",
    "baas mati": "rice",
    "basmati biyyam": "rice",
    "bavuram": "rice",
    "chekkera": "sugar",
    "chekkara": "sugar",
    "nune": "oil",
    "vanta nune": "oil",
    "nuvvula nune": "oil",
    "pindi": "flour",
    "godhuma pindi": "flour",
    "godhumalu": "wheat",
    "godhuma": "wheat",
    "chaakali": "flour",
    "tea akulu": "tea",
    "chaayapakku": "tea",
    "chaay": "tea",
    "biskets": "biscuit",
    "bisketu": "biscuit",
    "bishket": "biscuit",
    "uppu": "salt",
    "miriyalu": "pepper",
    "karam podi": "chilli powder",
    "pasupu podi": "turmeric",
    "senagapappu": "chana dal",
    "kandipappu": "toor dal",
    "pesarapappu": "moong dal",
    "ravva": "semolina",
    "semiya": "vermicelli",
    "atukulu": "poha",
    "neyyi": "ghee",
    "pala podi": "milk powder",
    // Purchase intents
    "konnanu": "bought",
    "konukkonnanu": "bought",
    "teesukonna": "bought",
    "stock lo vestam": "bought",
    "mangayam": "purchased",
    // Sale intents
    "ammanu": "sold",
    "ammai": "sold",
    "ammai potundi": "sold",
    "ammai poyindi": "sold",
    "ammina": "sold",
    "cash sale cheyyi": "sold",
    // Credit / Khata
    "udharo": "khata",
    "abbayi": "credit",
    "bayataki ichu": "credit",
    "bayata teesuku poyadu": "credit",
    "bayata poyadu": "credit",
    "akaunts lo petti": "khata",
    "hisab lo petti": "khata",
    "bakaya": "balance",
    // Payment
    "chellimpu": "paid",
    "chesadu": "paid",
    "icchaadu": "paid",
    "icchari": "paid",
    "cash icchaadu": "paid",
    // Stock
    "stock chudandi": "stock",
    "entha stock undi": "stock",
    "stock check cheyyi": "stock",
    "miga undi": "left",
    "migili undi": "left",
    // Price
    "dhara": "price",
    "dhara cheppu": "price",
    "enta dhara": "how much price",
    "entaku ammali": "selling price",
    "entaku konnamu": "purchase price",
    "dhara petti": "set price",
    // Profit
    "labham": "profit",
    "laabham": "profit",
    "labham petti": "profit",
    // Min stock
    "minimum stock petti": "maintain minimum",
    "konika stock": "minimum stock",
    // Daily summary
    "neti ammakalu": "today sales",
    "neti bikri": "today sales",
    "neti accounts": "daily sales",
  };

  private normalizeText(raw: string): string {
    let text = raw.toLowerCase().trim();
    const entries = Object.entries(this.teluguSynonyms).sort(([a], [b]) => b.length - a.length);
    for (const [tel, eng] of entries) {
      const escaped = tel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      text = text.replace(new RegExp(escaped, "gi"), eng);
    }
    text = text
      .replace(/\bkilu\b/gi, "kilo")
      .replace(/\blitra\b/gi, "litre")
      .replace(/\blitru\b/gi, "litre")
      .replace(/\bpaka\b/gi, "packet")
      .replace(/\bpakalu\b/gi, "packet")
      .replace(/\bnagu\b/gi, "piece")
      .replace(/\bgrama\b/gi, "g")
      .replace(/\bgrammulu\b/gi, "g");
    return text;
  }

  async parseCommand(rawText: string, context: AIContext): Promise<AICommandResult> {
    const text = this.normalizeText(rawText.trim());
    const lower = text.toLowerCase();

    // 0. Multi-turn conversation memory
    if (context.conversationState?.pendingIntent) {
      const state = context.conversationState;
      const entities = { ...(state.pendingEntities || {}) };

      if (state.missingSlot === "quantity") {
        const qtyMatch = text.match(/(\d+(?:\.\d+)?)\s*(kilos?|kg|litres?|l|packets?|pieces?|box|dozen|g|ml)?/i);
        if (qtyMatch) {
          entities.quantity = parseFloat(qtyMatch[1]);
          if (qtyMatch[2]) entities.unit = this.normalizeUnit(qtyMatch[2]);

          if (state.pendingIntent === "record_sale") {
            const prod = context.products.find(p => p.name.toLowerCase() === (entities.product_name || "").toLowerCase());
            const unit = entities.unit || prod?.unit || "kg";
            const price = prod?.sellingPrice || 0;
            const total = entities.total_amount || Math.round(entities.quantity * price);
            return {
              intent: "record_sale",
              confidence: 0.98,
              entities: { ...entities, unit, total_amount: total },
              requires_confirmation: false,
              speech_response: `Recorded. ${entities.quantity} ${unit} ${entities.product_name} sold for ₹${total}.`,
            };
          } else if (state.pendingIntent === "record_credit_sale") {
            const prod = context.products.find(p => p.name.toLowerCase() === (entities.product_name || "").toLowerCase());
            const unit = entities.unit || prod?.unit || "kg";
            const price = prod?.sellingPrice || 0;
            const total = Math.round(entities.quantity * price);
            return {
              intent: "record_credit_sale",
              confidence: 0.98,
              entities: { ...entities, unit, total_amount: total },
              requires_confirmation: total >= 5000,
              speech_response: `₹${total} added to ${entities.customer_name}'s khata. ${entities.product_name} stock reduced by ${entities.quantity} ${unit}.`,
            };
          }
        }
      }

      if (state.missingSlot === "product_name") {
        const matchedProduct = this.findProductInText(text, context.products);
        if (matchedProduct) {
          entities.product_name = matchedProduct.name;
          if (state.pendingIntent === "get_product_price") {
            return {
              intent: "get_product_price",
              confidence: 0.98,
              entities,
              requires_confirmation: false,
              speech_response: `${matchedProduct.name} is currently ₹${matchedProduct.sellingPrice} per ${matchedProduct.unit}.`,
            };
          }
        }
      }
    }

    // 1. Ambiguous (no quantity)
    if (/^(i sold|sold|becha|sell|ammanu|ammai)\s+(some\s+)?([a-z\s]+)$/i.test(lower) && !/\d+/.test(lower)) {
      const p = this.findProductInText(lower, context.products);
      if (p) {
        return {
          intent: "record_sale",
          confidence: 0.85,
          entities: { product_name: p.name },
          requires_confirmation: false,
          clarification_question: `How many ${p.unit} of ${p.name} did you sell?`,
          speech_response: `How many ${p.unit} of ${p.name} did you sell?`,
        };
      }
    }

    if (/^([a-z\s]+)\s+(took|bought|konnanu|teesukonna)\s+([a-z\s]+)\s+(on khata|on credit|udhaar|udharo|credit|khata)$/i.test(lower) && !/\d+/.test(lower)) {
      const c = this.findCustomerInText(lower, context.customers);
      const p = this.findProductInText(lower, context.products);
      if (c && p) {
        return {
          intent: "record_credit_sale",
          confidence: 0.85,
          entities: { customer_name: c.name, product_name: p.name },
          requires_confirmation: false,
          clarification_question: `How many ${p.unit} of ${p.name} did ${c.name} take?`,
          speech_response: `How many ${p.unit} of ${p.name} did ${c.name} take?`,
        };
      }
    }

    // 2. PURCHASE
    if (
      /(bought|purchased|kharida|buy|purchase|stock in|mangwaya|konnanu|mangayam|teesukonna)/i.test(lower) &&
      /(for|at|rs\.?|₹|in|rup|rupee|mein|ki)/i.test(lower)
    ) {
      const qtyMatch = text.match(/(\d+(?:\.\d+)?)\s*(kilos?|kg|litres?|l|packets?|pieces?|box|dozen|g|ml)?/i);
      const amountMatch =
        text.match(/(?:for|at|₹|rs\.?|of|mein|ki)\s*₹?\s*(\d+(?:\.\d+)?)/i) ||
        text.match(/(\d+(?:\.\d+)?)\s*(?:rupees|rs|rup)/i);
      const product = this.findProductInText(text, context.products);
      if (qtyMatch && amountMatch && product) {
        const qty = parseFloat(qtyMatch[1]);
        const amount = parseFloat(amountMatch[1]);
        const unit = qtyMatch[2] ? this.normalizeUnit(qtyMatch[2]) : product.unit;
        const unitPrice = Math.round((amount / qty) * 100) / 100;
        return {
          intent: "record_purchase",
          confidence: 0.98,
          entities: { product_name: product.name, quantity: qty, unit, total_amount: amount, purchase_price_per_unit: unitPrice },
          requires_confirmation: false,
          speech_response: `Recorded. ${product.name} stock increased by ${qty} ${unit}. Purchase price: ₹${unitPrice}/${unit}.`,
        };
      }
    }

    // 3. PROFIT / MARGIN
    if (/(profit|munafa|margin|labham|laabham)/i.test(lower)) {
      const profitMatch =
        text.match(/(?:₹|rs\.?|rupees?)?\s*(\d+(?:\.\d+)?)\s*(?:profit|munafa|margin|labham|laabham)/i) ||
        text.match(/(?:profit|munafa|margin|labham|laabham)\s*(?:of)?\s*(?:₹|rs\.)?\s*(\d+(?:\.\d+)?)/i);
      const product = this.findProductInText(text, context.products);
      if (profitMatch && product) {
        const profit = parseFloat(profitMatch[1]);
        const newSellingPrice = product.purchasePrice + profit;
        return {
          intent: "set_profit_margin",
          confidence: 0.98,
          entities: { product_name: product.name, profit_amount: profit },
          requires_confirmation: false,
          speech_response: `Selling price set to ₹${newSellingPrice}/${product.unit}.`,
        };
      }
    }

    // SET SELLING PRICE
    if (
      /(set|change|kardo|rakho|dhara petti|entaku petti)\s*(selling price|price|rate|bhav)/i.test(lower) ||
      /(selling price|price|rate|dhara)\s*(to|is|hoga|₹)\s*₹?\s*\d+/i.test(lower)
    ) {
      const priceMatch = text.match(/(?:to|is|hoga|₹|rs\.?)\s*(\d+(?:\.\d+)?)/i);
      const product = this.findProductInText(text, context.products);
      if (priceMatch && product) {
        const price = parseFloat(priceMatch[1]);
        return {
          intent: "set_product_price",
          confidence: 0.98,
          entities: { product_name: product.name, price },
          requires_confirmation: false,
          speech_response: `Selling price for ${product.name} is now ₹${price} per ${product.unit}.`,
        };
      }
    }

    // 4. PRICE QUERY
    if (/(price|rate|bhav|cost|kitne ka|kitna rate|dhara|enta dhara|dhara cheppu)/i.test(lower)) {
      const product = this.findProductInText(text, context.products);
      if (product) {
        return {
          intent: "get_product_price",
          confidence: 0.98,
          entities: { product_name: product.name },
          requires_confirmation: false,
          speech_response: `${product.name} is currently ₹${product.sellingPrice} per ${product.unit}.`,
        };
      }
    }

    // STOCK QUERY
    if (/(stock|kitna bacha|kitna stock|quantity left|how much|entha stock|miga undi|migili)/i.test(lower)) {
      const product = this.findProductInText(text, context.products);
      if (product) {
        return {
          intent: "get_stock",
          confidence: 0.98,
          entities: { product_name: product.name },
          requires_confirmation: false,
          speech_response: `Current stock of ${product.name} is ${product.currentStock} ${product.unit}.`,
        };
      }
    }

    // 5. CREDIT SALE (checked before balance query so product+quantity takes precedence)
    if (/(khata|credit|udhaar|baaki|pay later|hisab mein|udharo|abbayi|bayataki)/i.test(lower)) {
      const customer = this.findCustomerInText(text, context.customers);
      const product = this.findProductInText(text, context.products);
      const qtyMatch = text.match(/(\d+(?:\.\d+)?)\s*(kilos?|kg|litres?|l|packets?|pieces?|box|dozen|g|ml)?/i);
      if (customer && product && qtyMatch) {
        const qty = parseFloat(qtyMatch[1]);
        const unit = qtyMatch[2] ? this.normalizeUnit(qtyMatch[2]) : product.unit;
        const totalAmount = Math.round(qty * product.sellingPrice * 100) / 100;
        const isHighRisk = totalAmount >= 5000;
        return {
          intent: "record_credit_sale",
          confidence: 0.98,
          entities: { customer_name: customer.name, product_name: product.name, quantity: qty, unit, total_amount: totalAmount },
          requires_confirmation: isHighRisk,
          confirmation_message: isHighRisk ? `You're recording a ₹${totalAmount} credit sale for ${customer.name}. Confirm?` : undefined,
          speech_response: `₹${totalAmount} added to ${customer.name}'s khata. ${product.name} stock reduced by ${qty} ${unit}.`,
        };
      }
    }

    // CUSTOMER BALANCE
    if (
      /(balance|hisab|kitna baaki|kitna dena|bakaya)/i.test(lower) ||
      /(how much does|kitna).*owe/i.test(lower) ||
      (/(what is|check|batao|kya hai).*(khata|balance)/i.test(lower))
    ) {
      const customer = this.findCustomerInText(text, context.customers);
      if (customer) {
        return {
          intent: "get_customer_balance",
          confidence: 0.98,
          entities: { customer_name: customer.name },
          requires_confirmation: false,
          speech_response: `${customer.name} currently owes ₹${customer.outstandingBalance}.`,
        };
      }
    }

    // 6. PAYMENT
    if (/(paid|pay|diya|chuka diya|jama kiya|gave|received|chellimpu|chesadu|icchaadu|icchari)/i.test(lower)) {
      const customer = this.findCustomerInText(text, context.customers);
      const amountMatch = text.match(/(?:₹|rs\.?|rupees?)?\s*(\d+(?:\.\d+)?)/i);
      if (customer) {
        if (!amountMatch || lower.includes("wants to pay")) {
          return {
            intent: "get_customer_balance",
            confidence: 0.98,
            entities: { customer_name: customer.name, open_payment: true },
            requires_confirmation: false,
            speech_response: `${customer.name} currently owes ₹${customer.outstandingBalance}. Ready to collect payment.`,
          };
        }
        const amount = parseFloat(amountMatch[1]);
        return {
          intent: "record_payment",
          confidence: 0.98,
          entities: { customer_name: customer.name, amount, payment_method: lower.includes("upi") ? "UPI" : "CASH" },
          requires_confirmation: false,
          speech_response: `Recorded ₹${amount} payment from ${customer.name}.`,
        };
      }
    }

    // 7. CASH SALE
    if (/(sold|becha|sell|bik gaya|cash sale|ammanu|ammai|ammina)/i.test(lower)) {
      const product = this.findProductInText(text, context.products);
      const qtyMatch = text.match(/(\d+(?:\.\d+)?)\s*(kilos?|kg|litres?|l|packets?|pieces?|box|dozen|g|ml)?/i);
      const amountMatch = text.match(/(?:for|₹|rs\.?|ki)\s*(\d+(?:\.\d+)?)/i);
      if (product && qtyMatch) {
        const qty = parseFloat(qtyMatch[1]);
        const unit = qtyMatch[2] ? this.normalizeUnit(qtyMatch[2]) : product.unit;
        const total = amountMatch ? parseFloat(amountMatch[1]) : Math.round(qty * product.sellingPrice);
        return {
          intent: "record_sale",
          confidence: 0.98,
          entities: { product_name: product.name, quantity: qty, unit, total_amount: total, payment_method: lower.includes("upi") ? "UPI" : "CASH" },
          requires_confirmation: false,
          speech_response: `Recorded. ${qty} ${unit} ${product.name} sold for ₹${total}.`,
        };
      }
    }

    // 8. MINIMUM STOCK
    if (/(maintain minimum|minimum stock|min stock|kam se kam|konika stock)/i.test(lower)) {
      const product = this.findProductInText(text, context.products);
      const qtyMatch = text.match(/(\d+(?:\.\d+)?)\s*(kilos?|kg|litres?|l|packets?|pieces?|box|dozen|g|ml)?/i);
      if (product && qtyMatch) {
        const minStock = parseFloat(qtyMatch[1]);
        return {
          intent: "set_minimum_stock",
          confidence: 0.98,
          entities: { product_name: product.name, minimum_stock: minStock },
          requires_confirmation: false,
          speech_response: `Minimum stock threshold for ${product.name} set to ${minStock} ${product.unit}.`,
        };
      }
    }

    // 9. DAILY SUMMARY
    if (/(today.*sale|daily sales|aaj ki bikri|total sales today|neti ammakalu|neti bikri|daily report)/i.test(lower)) {
      return {
        intent: "get_daily_sales",
        confidence: 0.98,
        entities: {},
        requires_confirmation: false,
      };
    }

    // Fallback
    return {
      intent: "unknown",
      confidence: 0.3,
      entities: { raw: rawText },
      requires_confirmation: false,
      clarification_question:
        "Sorry, I couldn't understand. Try: 'Bought 10 kg rice for ₹520', '5 kilu biyyam ammanu', or 'Ramesh ₹124 chellimpu chesadu'.",
      speech_response: "Sorry, I couldn't understand that. Please try again.",
    };
  }

  private findProductInText(text: string, products: AIContext["products"]) {
    const lower = text.toLowerCase();
    const sorted = [...products].sort((a, b) => b.name.length - a.name.length);
    for (const p of sorted) {
      const pName = p.name.toLowerCase();
      if (lower.includes(pName)) return p;
      if (pName.includes("rice") && /\b(chawal|rice|biyyam|baas|basmati|bavuram)\b/.test(lower)) return p;
      if (pName.includes("sugar") && /\b(cheeni|shakkar|sugar|chekkera|chekkara)\b/.test(lower)) return p;
      if (pName.includes("oil") && /\b(tel|oil|nune|nuvvula nune|vanta nune)\b/.test(lower)) return p;
      if ((pName.includes("wheat") || pName.includes("flour")) && /\b(atta|flour|gehu|pindi|godhumalu|godhuma|chaakali)\b/.test(lower)) return p;
      if (pName.includes("tea") && /\b(chai|tea|patti|chaay|chaayapakku)\b/.test(lower)) return p;
      if (pName.includes("biscuit") && /\b(biskut|biscuit|biskets|bisketu|bishket)\b/.test(lower)) return p;
      if (pName.includes("salt") && /\b(salt|uppu)\b/.test(lower)) return p;
      if (pName.includes("ghee") && /\b(ghee|neyyi)\b/.test(lower)) return p;
    }
    return null;
  }

  private findCustomerInText(text: string, customers: AIContext["customers"]) {
    const lower = text.toLowerCase();
    const sorted = [...customers].sort((a, b) => b.name.length - a.name.length);
    for (const c of sorted) {
      const cName = c.name.toLowerCase();
      if (lower.includes(cName)) return c;
      const firstName = cName.split(" ")[0];
      if (lower.includes(firstName)) return c;
    }
    return null;
  }

  private normalizeUnit(rawUnit: string): string {
    const u = rawUnit.toLowerCase();
    if (u.startsWith("kilo") || u === "kg") return "kg";
    if (u.startsWith("litre") || u.startsWith("liter") || u === "l") return "litre";
    if (u.startsWith("packet") || u === "pkt") return "packet";
    if (u.startsWith("piece") || u === "pc") return "piece";
    if (u.startsWith("gram") || u === "g") return "g";
    if (u === "ml") return "ml";
    if (u.startsWith("box")) return "box";
    if (u.startsWith("dozen")) return "dozen";
    return "kg";
  }
}
