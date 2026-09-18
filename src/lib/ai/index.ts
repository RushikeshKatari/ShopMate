import { AIProvider } from "./ai-provider.interface";
import { AICommandResult, AIContext } from "./types";
import { LocalNLPProvider } from "./local-nlp-provider";
import { MobileLLMProvider } from "./mobile-llm-provider";

// Primary, pure on-device Local NLP Engine (Zero external API dependencies)
const localNLPInstance = new LocalNLPProvider();

// Opt-in and on-device only. The native shell may provide the compact model;
// all other environments keep deterministic local NLP as the safe default.
const provider: AIProvider = process.env.MOBILE_LLM_ENABLED === "true"
  ? new MobileLLMProvider()
  : localNLPInstance;

export function getAIProvider(): AIProvider {
  return localNLPInstance;
}

/**
 * Keep the small model off the common path. Shop phrases that our rule parser
 * already understands never allocate LLM memory; Qwen is a last-mile language
 * fallback for casual or unusually worded requests.
 */
export async function parseShopCommand(text: string, context: AIContext): Promise<AICommandResult> {
  const deterministicResult = await localNLPInstance.parseCommand(text, context);
  const needsLlm = deterministicResult.intent === "unknown" || deterministicResult.confidence < 0.75;
  if (!needsLlm || provider === localNLPInstance) return deterministicResult;

  return provider.parseCommand(text, context);
}

export * from "./types";
export * from "./ai-provider.interface";
export * from "./local-nlp-provider";
export { LocalNLPProvider as RuleEngineAIProvider }; // Backward compatibility alias
