import type { ILLMProvider } from './ILLMProvider'

/**
 * Interface for text-to-text generation providers
 * Extends base provider with text-specific capabilities
 */
export interface ITextProvider extends ILLMProvider {
  /**
   * Validate prompt content before sending to LLM
   * @param prompt - User prompt
   * @throws Error if prompt violates content policies
   */
  validatePrompt(prompt: string): Promise<boolean>

  /**
   * Estimate token count for a given text
   * @param text - Text to analyze
   * @returns Estimated token count
   */
  estimateTokens(text: string): number
}
