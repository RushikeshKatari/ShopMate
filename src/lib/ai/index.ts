import { AIProvider } from "./ai-provider.interface";
import { LocalNLPProvider } from "./local-nlp-provider";

// Primary, pure on-device Local NLP Engine (Zero external API dependencies)
const localNLPInstance = new LocalNLPProvider();

export function getAIProvider(): AIProvider {
  return localNLPInstance;
}

export * from "./types";
export * from "./ai-provider.interface";
export * from "./local-nlp-provider";
export { LocalNLPProvider as RuleEngineAIProvider }; // Backward compatibility alias
