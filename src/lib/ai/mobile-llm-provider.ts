import { AIProvider } from "./ai-provider.interface";
import { AICommandResult, AIContext, SUPPORTED_INTENTS } from "./types";
import { LocalNLPProvider } from "./local-nlp-provider";

/** Runtime exposed by an Android/iOS shell after a bundled GGUF is loaded. */
export interface OnDeviceLlmRuntime {
  generate(prompt: string, options: { maxTokens: number; temperature: number }): Promise<string>;
}

declare global {
  // Set only by the native shell; the web app never fetches a model or API.
  // eslint-disable-next-line no-var
  var ShopMateOnDeviceLLM: OnDeviceLlmRuntime | undefined;
}

/**
 * Optional small local LLM. It improves flexible phrasing but never becomes
 * authoritative: absent model/runtime, invalid output, or a memory failure all
 * return to the deterministic offline parser.
 */
export class MobileLLMProvider implements AIProvider {
  name = "ShopMate Optional On-Device LLM";
  private readonly fallback = new LocalNLPProvider();
  private readonly runtime: OnDeviceLlmRuntime | undefined;

  constructor(runtime: OnDeviceLlmRuntime | undefined = globalThis.ShopMateOnDeviceLLM) {
    this.runtime = runtime;
  }

  async parseCommand(rawText: string, context: AIContext): Promise<AICommandResult> {
    if (!this.runtime) return this.fallback.parseCommand(rawText, context);

    const prompt = [
      "You are an offline ShopMate intent parser. Return JSON only.",
      `Allowed intents: ${SUPPORTED_INTENTS.join(", ")}.`,
      `Products: ${JSON.stringify(context.products.map(p => ({ name: p.name, unit: p.unit })))}.`,
      `Customers: ${JSON.stringify(context.customers.map(c => ({ name: c.name })))}.`,
      `Conversation: ${JSON.stringify(context.conversationState ?? {})}.`,
      `User: ${rawText}`,
      "JSON: {intent, confidence, entities, requires_confirmation, speech_response, clarification_question?}",
    ].join("\n");

    try {
      const response = await this.runtime.generate(prompt, { maxTokens: 256, temperature: 0.1 });
      const parsed = JSON.parse(response.replace(/```json\s*|```/g, "").trim()) as Partial<AICommandResult>;
      if (
        typeof parsed.intent === "string" &&
        (SUPPORTED_INTENTS as readonly string[]).includes(parsed.intent) &&
        parsed.entities && typeof parsed.entities === "object"
      ) {
        return {
          intent: parsed.intent as AICommandResult["intent"],
          confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.7,
          entities: parsed.entities,
          requires_confirmation: Boolean(parsed.requires_confirmation),
          speech_response: typeof parsed.speech_response === "string" ? parsed.speech_response : undefined,
          clarification_question: typeof parsed.clarification_question === "string" ? parsed.clarification_question : undefined,
        };
      }
    } catch {
      // A model may be released under memory pressure; preserve core features.
    }
    return this.fallback.parseCommand(rawText, context);
  }
}
