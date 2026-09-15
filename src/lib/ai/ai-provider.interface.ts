import { AICommandResult, AIContext } from "./types";

export interface AIProvider {
  name: string;
  parseCommand(text: string, context: AIContext): Promise<AICommandResult>;
}
