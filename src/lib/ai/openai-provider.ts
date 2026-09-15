import { AIProvider } from "./ai-provider.interface";
import { AICommandResult, AIContext } from "./types";
import { RuleEngineAIProvider } from "./rule-engine-provider";

export class OpenAIProvider implements AIProvider {
  name = "OpenAIProvider";
  private apiKey: string;
  private fallback: RuleEngineAIProvider;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || "";
    this.fallback = new RuleEngineAIProvider();
  }

  async parseCommand(rawText: string, context: AIContext): Promise<AICommandResult> {
    if (!this.apiKey) {
      return this.fallback.parseCommand(rawText, context);
    }

    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: `You are ShopMate AI, a business assistant for an Indian retail shop (${context.shopName}).
Available Products: ${JSON.stringify(context.products.map(p => ({ name: p.name, currentStock: p.currentStock, unit: p.unit, sellingPrice: p.sellingPrice })))}
Customers: ${JSON.stringify(context.customers.map(c => ({ name: c.name, outstandingBalance: c.outstandingBalance })))}

Return JSON with:
{
  "intent": "record_purchase" | "record_sale" | "record_credit_sale" | "record_payment" | "get_product_price" | "set_product_price" | "set_profit_margin" | "set_minimum_stock" | "get_stock" | "get_customer_balance" | "unknown",
  "confidence": number,
  "entities": object,
  "requires_confirmation": boolean,
  "speech_response": string
}`,
            },
            {
              role: "user",
              content: rawText,
            },
          ],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const content = data.choices[0]?.message?.content;
        if (content) {
          return JSON.parse(content);
        }
      }
    } catch (e) {
      console.warn("OpenAI call failed, falling back to rule engine:", e);
    }

    return this.fallback.parseCommand(rawText, context);
  }
}
