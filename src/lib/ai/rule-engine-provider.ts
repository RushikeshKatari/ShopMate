import { AIProvider } from "./ai-provider.interface";
import { AICommandResult, AIContext } from "./types";

export class RuleEngineAIProvider implements AIProvider {
  name = "RuleEngineAIProvider (Offline/Deterministic)";

  async parseCommand(rawText: string, context: AIContext): Promise<AICommandResult> {
    const text = rawText.trim();
    const lower = text.toLowerCase();

    // 0. Handle multi-turn conversation memory if pending
    if (context.conversationState?.pendingIntent) {
      const state = context.conversationState;
      const entities = { ...(state.pendingEntities || {}) };

      if (state.missingSlot === "quantity") {
        const qtyMatch = text.match(/(\d+(?:\.\d+)?)\s*(kilos?|kg|litres?|l|packets?|pieces?|box|dozen)?/i);
        if (qtyMatch) {
          entities.quantity = parseFloat(qtyMatch[1]);
          if (qtyMatch[2]) {
            entities.unit = this.normalizeUnit(qtyMatch[2]);
          }

          if (state.pendingIntent === "record_sale") {
            return {
              intent: "record_sale",
              confidence: 0.95,
              entities,
              requires_confirmation: false,
            };
          } else if (state.pendingIntent === "record_credit_sale") {
            return {
              intent: "record_credit_sale",
              confidence: 0.95,
              entities,
              requires_confirmation: false,
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
              confidence: 0.95,
              entities,
              requires_confirmation: false,
              speech_response: `${matchedProduct.name} is currently ₹${matchedProduct.sellingPrice} per ${matchedProduct.unit}.`,
            };
          }
        }
      }
    }

    // 1. Ambiguous commands handling (Multi-turn prompts)
    if (/^(i sold|sold|becha|sell)\s+(some\s+)?([a-z\s]+)$/i.test(lower) && !/\d+/.test(lower)) {
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

    if (/^([a-z\s]+)\s+(took|bought)\s+([a-z\s]+)\s+(on khata|on credit|udhaar)$/i.test(lower) && !/\d+/.test(lower)) {
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

    // 2. PURCHASE INTENT: "I bought 10 kilos of rice for ₹520"
    // Regex matches: "bought/purchased/kharida X (unit) (of) Y for/at/₹ Z"
    if (
      /(bought|purchased|kharida|buy|purchase|aaya|stock in)/i.test(lower) &&
      /(for|at|rs\.?|₹|in|rup|rupee)/i.test(lower)
    ) {
      const qtyMatch = text.match(/(\d+(?:\.\d+)?)\s*(kilos?|kg|litres?|l|packets?|pieces?|box|dozen|g|ml)?/i);
      const amountMatch = text.match(/(?:for|at|₹|rs\.?|of)\s*₹?\s*(\d+(?:\.\d+)?)/i) ||
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
          entities: {
            product_name: product.name,
            quantity: qty,
            unit,
            total_amount: amount,
            purchase_price_per_unit: unitPrice,
          },
          requires_confirmation: false,
          speech_response: `Recorded. ${product.name} stock increased by ${qty} ${unit}. Purchase price: ₹${unitPrice}/${unit}.`,
        };
      }
    }

    // 3. PRICING & PROFIT: "I want ₹10 profit per kilo on rice"
    if (/(profit|munafa|margin)/i.test(lower)) {
      const profitMatch = text.match(/(?:₹|rs\.?|rupees?)?\s*(\d+(?:\.\d+)?)\s*(?:profit|munafa|margin)/i) ||
                          text.match(/(?:profit|munafa|margin)\s*(?:of)?\s*(?:₹|rs\.?)?\s*(\d+(?:\.\d+)?)/i);
      const product = this.findProductInText(text, context.products);

      if (profitMatch && product) {
        const profit = parseFloat(profitMatch[1]);
        const newSellingPrice = product.purchasePrice + profit;
        return {
          intent: "set_profit_margin",
          confidence: 0.96,
          entities: {
            product_name: product.name,
            profit_amount: profit,
          },
          requires_confirmation: false,
          speech_response: `Selling price for ${product.name} is now ₹${newSellingPrice} per ${product.unit}.`,
        };
      }
    }

    // Set selling price directly: "Set selling price of rice to ₹62"
    if (/(set|change|kardo|rakho).*(selling price|price|rate|bhav)/i.test(lower) || /(selling price|price|rate).*(to|is|hoga)\s*₹?\s*(\d+)/i.test(lower)) {
      const priceMatch = text.match(/(?:to|is|₹|rs\.?)\s*(\d+(?:\.\d+)?)/i);
      const product = this.findProductInText(text, context.products);
      if (priceMatch && product) {
        const price = parseFloat(priceMatch[1]);
        return {
          intent: "set_product_price",
          confidence: 0.96,
          entities: {
            product_name: product.name,
            price,
          },
          requires_confirmation: false,
          speech_response: `Selling price for ${product.name} is set to ₹${price} per ${product.unit}.`,
        };
      }
    }

    // 4. QUERIES: "What is the selling price of rice?" / "Rice kitne ka hai?"
    if (/(price|rate|bhav|cost|kitne ka|kitna rate).*(rice|sugar|oil|flour|tea|biscuit|[a-z]+)/i.test(lower) ||
        /(what is the|batao|kya hai).*(price|rate|bhav)/i.test(lower)) {
      const product = this.findProductInText(text, context.products);
      if (product) {
        return {
          intent: "get_product_price",
          confidence: 0.95,
          entities: { product_name: product.name },
          requires_confirmation: false,
          speech_response: `${product.name} is currently ₹${product.sellingPrice} per ${product.unit}.`,
        };
      }
    }

    // Stock query: "How much rice is left?" / "Rice ka stock kitna hai?"
    if (/(stock|kitna bacha|kitna stock|quantity left|how much).*(rice|sugar|oil|flour|tea|biscuit|[a-z]+)/i.test(lower)) {
      const product = this.findProductInText(text, context.products);
      if (product) {
        return {
          intent: "get_stock",
          confidence: 0.95,
          entities: { product_name: product.name },
          requires_confirmation: false,
          speech_response: `Current stock of ${product.name} is ${product.currentStock} ${product.unit}.`,
        };
      }
    }

    // 5. KHATA / CREDIT SALE: "Ramesh took 2 kilos of rice on khata" / "Ramesh ko 2 kilo rice udhaar diya"
    if (/(khata|credit|udhaar|baaki|pay later|hisab mein)/i.test(lower)) {
      const customer = this.findCustomerInText(text, context.customers);
      const product = this.findProductInText(text, context.products);
      const qtyMatch = text.match(/(\d+(?:\.\d+)?)\s*(kilos?|kg|litres?|l|packets?|pieces?|box|dozen)?/i);

      if (customer && product && qtyMatch) {
        const qty = parseFloat(qtyMatch[1]);
        const unit = qtyMatch[2] ? this.normalizeUnit(qtyMatch[2]) : product.unit;
        const totalAmount = Math.round(qty * product.sellingPrice * 100) / 100;

        // Confirmation required if credit sale > ₹5,000
        const isHighRisk = totalAmount >= 5000;

        return {
          intent: "record_credit_sale",
          confidence: 0.98,
          entities: {
            customer_name: customer.name,
            product_name: product.name,
            quantity: qty,
            unit,
            total_amount: totalAmount,
          },
          requires_confirmation: isHighRisk,
          confirmation_message: isHighRisk ? `You're recording a ₹${totalAmount} credit sale for ${customer.name}. Confirm?` : undefined,
          speech_response: `₹${totalAmount} added to ${customer.name}'s khata. ${product.name} stock reduced by ${qty} ${unit}.`,
        };
      }
    }

    // 6. PAYMENT / KHATA SETTLEMENT: "Ramesh paid ₹124" / "Ramesh wants to pay"
    if (/(paid|pay|diya|chuka diya|jama kiya|gave)/i.test(lower)) {
      const customer = this.findCustomerInText(text, context.customers);
      const amountMatch = text.match(/(?:₹|rs\.?|rupees?)?\s*(\d+(?:\.\d+)?)/i);

      if (customer) {
        // "Ramesh wants to pay" (no specific amount mentioned) -> opens payment modal with outstanding
        if (!amountMatch || lower.includes("wants to pay")) {
          return {
            intent: "get_customer_balance",
            confidence: 0.95,
            entities: {
              customer_name: customer.name,
              open_payment: true,
            },
            requires_confirmation: false,
            speech_response: `${customer.name} currently owes ₹${customer.outstandingBalance}. Ready to collect payment.`,
          };
        }

        const amount = parseFloat(amountMatch[1]);
        return {
          intent: "record_payment",
          confidence: 0.97,
          entities: {
            customer_name: customer.name,
            amount,
            payment_method: lower.includes("upi") ? "UPI" : "CASH",
          },
          requires_confirmation: false,
          speech_response: `Recorded ₹${amount} payment from ${customer.name}.`,
        };
      }
    }

    // 7. CASH/NORMAL SALE: "I sold 5 kilos of rice for ₹310"
    if (/(sold|becha|sell|bik gaya|cash sale)/i.test(lower)) {
      const product = this.findProductInText(text, context.products);
      const qtyMatch = text.match(/(\d+(?:\.\d+)?)\s*(kilos?|kg|litres?|l|packets?|pieces?|box|dozen)?/i);
      const amountMatch = text.match(/(?:for|₹|rs\.?)\s*(\d+(?:\.\d+)?)/i);

      if (product && qtyMatch) {
        const qty = parseFloat(qtyMatch[1]);
        const unit = qtyMatch[2] ? this.normalizeUnit(qtyMatch[2]) : product.unit;
        const total = amountMatch ? parseFloat(amountMatch[1]) : Math.round(qty * product.sellingPrice);

        return {
          intent: "record_sale",
          confidence: 0.97,
          entities: {
            product_name: product.name,
            quantity: qty,
            unit,
            total_amount: total,
            payment_method: lower.includes("upi") ? "UPI" : "CASH",
          },
          requires_confirmation: false,
          speech_response: `Recorded. ${qty} ${unit} ${product.name} sold for ₹${total}.`,
        };
      }
    }

    // 8. MINIMUM STOCK: "Maintain minimum 10 kilos of rice"
    if (/(maintain minimum|minimum stock|min stock|kam se kam)/i.test(lower)) {
      const product = this.findProductInText(text, context.products);
      const qtyMatch = text.match(/(\d+(?:\.\d+)?)\s*(kilos?|kg|litres?|l|packets?|pieces?|box|dozen)?/i);

      if (product && qtyMatch) {
        const minStock = parseFloat(qtyMatch[1]);
        return {
          intent: "set_minimum_stock",
          confidence: 0.97,
          entities: {
            product_name: product.name,
            minimum_stock: minStock,
          },
          requires_confirmation: false,
          speech_response: `Minimum stock threshold for ${product.name} set to ${minStock} ${product.unit}.`,
        };
      }
    }

    // 9. DAILY SUMMARY: "What are today's sales?" / "Aaj ki bikri kitni hui?"
    if (/(today.*sale|daily sales|aaj ki bikri|total sales today)/i.test(lower)) {
      return {
        intent: "get_daily_sales",
        confidence: 0.95,
        entities: {},
        requires_confirmation: false,
      };
    }

    // Default Unknown Intent
    return {
      intent: "unknown",
      confidence: 0.3,
      entities: { raw: text },
      requires_confirmation: false,
      clarification_question: "Sorry, I couldn't understand that. Please try saying 'Bought 10 kg rice for 520' or 'Ramesh took 2 kg rice on khata'.",
      speech_response: "Sorry, I couldn't understand that. Please try again.",
    };
  }

  private findProductInText(text: string, products: AIContext["products"]) {
    const lower = text.toLowerCase();
    // Sort by name length descending to avoid partial word collisions
    const sorted = [...products].sort((a, b) => b.name.length - a.name.length);
    for (const p of sorted) {
      const pName = p.name.toLowerCase();
      if (lower.includes(pName)) return p;
      // Also match common Indian synonyms:
      if (pName.includes("rice") && (lower.includes("chawal") || lower.includes("rice"))) return p;
      if (pName.includes("sugar") && (lower.includes("cheeni") || lower.includes("shakkar"))) return p;
      if (pName.includes("oil") && (lower.includes("tel") || lower.includes("oil"))) return p;
      if (pName.includes("wheat") && (lower.includes("atta") || lower.includes("flour"))) return p;
      if (pName.includes("tea") && (lower.includes("chai") || lower.includes("tea"))) return p;
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
