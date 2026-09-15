import { AIProvider } from "./ai-provider.interface";
import { AICommandResult, AIContext } from "./types";
import { RuleEngineAIProvider } from "./rule-engine-provider";

export class OllamaAIProvider implements AIProvider {
  name = "OllamaAIProvider (Local LLM)";
  private host: string;
  private model: string;
  private fallback: RuleEngineAIProvider;

  constructor(host: string = "http://localhost:11434", model: string = "llama3") {
    this.host = process.env.OLLAMA_HOST || host;
    this.model = process.env.OLLAMA_MODEL || model;
    this.fallback = new RuleEngineAIProvider();
  }

  async parseCommand(rawText: string, context: AIContext): Promise<AICommandResult> {
    try {
      const prompt = `You are ShopMate AI, a business assistant for an Indian retail shop (${context.shopName}).
Parse the user voice/text command into structured JSON.

Products: ${JSON.stringify(context.products.map(p => ({ name: p.name, currentStock: p.currentStock, unit: p.unit, sellingPrice: p.sellingPrice })))}
Customers: ${JSON.stringify(context.customers.map(c => ({ name: c.name, outstandingBalance: c.outstandingBalance })))}

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
- "unknown" ()

Respond in JSON only:
{
  "intent": string,
  "confidence": number,
  "entities": object,
  "requires_confirmation": boolean,
  "speech_response": string
}`;

      const res = await fetch(`${this.host}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.model,
          prompt,
          format: "json",
          stream: false,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const parsed = JSON.parse(data.response);
        if (parsed && parsed.intent) {
          return parsed;
        }
      }
    } catch {
      // Fallback silently if local Ollama daemon is not responding
    }

    return this.fallback.parseCommand(rawText, context);
  }
}
