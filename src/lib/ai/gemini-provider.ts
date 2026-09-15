import { GoogleGenerativeAI } from "@google/generative-ai";
import { AIProvider } from "./ai-provider.interface";
import { AICommandResult, AIContext } from "./types";
import { RuleEngineAIProvider } from "./rule-engine-provider";

export class GeminiAIProvider implements AIProvider {
  name = "GeminiAIProvider";
  private genAI: GoogleGenerativeAI | null = null;
  private fallback: RuleEngineAIProvider;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.GEMINI_API_KEY;
    if (key) {
      this.genAI = new GoogleGenerativeAI(key);
    }
    this.fallback = new RuleEngineAIProvider();
  }

  async parseCommand(rawText: string, context: AIContext): Promise<AICommandResult> {
    if (!this.genAI) {
      return this.fallback.parseCommand(rawText, context);
    }

    try {
      const model = this.genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1,
        },
      });

      const prompt = `You are ShopMate AI, an intelligent business assistant for an Indian retail shop (${context.shopName}).
Parse the following user voice/text command into a structured JSON action.

Current Available Products:
${JSON.stringify(context.products.map(p => ({ name: p.name, currentStock: p.currentStock, unit: p.unit, sellingPrice: p.sellingPrice, purchasePrice: p.purchasePrice })))}

Current Customers:
${JSON.stringify(context.customers.map(c => ({ name: c.name, outstandingBalance: c.outstandingBalance })))}

Conversation Memory:
${JSON.stringify(context.conversationState || {})}

Input: "${rawText}"

Allowed Intents:
- "record_purchase" (product_name, quantity, unit, total_amount)
- "record_sale" (product_name, quantity, unit, total_amount, payment_method)
- "record_credit_sale" (customer_name, product_name, quantity, unit, total_amount)
- "record_payment" (customer_name, amount, payment_method)
- "get_product_price" (product_name)
- "set_product_price" (product_name, price)
- "set_profit_margin" (product_name, profit_amount)
- "set_minimum_stock" (product_name, minimum_stock)
- "get_stock" (product_name)
- "get_customer_balance" (customer_name)
- "get_daily_sales" ()
- "unknown" ()

Return JSON only in this exact format:
{
  "intent": string,
  "confidence": number, // between 0 and 1
  "entities": object,
  "requires_confirmation": boolean,
  "speech_response": string, // natural, concise Indian English feedback
  "clarification_question": string // optional, if essential details missing
}
`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      const parsed = JSON.parse(responseText) as AICommandResult;

      if (parsed && parsed.intent) {
        return parsed;
      }
    } catch (err) {
      console.warn("Gemini AI parse failed or unavailable, falling back to rule engine:", err);
    }

    return this.fallback.parseCommand(rawText, context);
  }
}
