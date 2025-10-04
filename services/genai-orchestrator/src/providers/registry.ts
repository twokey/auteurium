import { ModelProvider } from '@auteurium/shared-types'
import type { ILLMProvider } from './base'
import { GeminiTextProvider } from './gemini'

/**
 * Provider registry - factory for creating provider instances
 * This allows easy addition of new providers without changing client code
 */
export class ProviderRegistry {
  private static providers = new Map<ModelProvider, () => ILLMProvider>()

  static {
    // Register Gemini provider
    this.providers.set(ModelProvider.GEMINI, () => new GeminiTextProvider())

    // Future providers will be registered here:
    // this.providers.set(ModelProvider.OPENAI, () => new OpenAITextProvider())
    // this.providers.set(ModelProvider.ANTHROPIC, () => new AnthropicTextProvider())
  }

  /**
   * Get a provider instance by name
   * @param provider - Provider identifier
   * @returns Provider instance
   */
  static getProvider(provider: ModelProvider): ILLMProvider {
    const factory = this.providers.get(provider)

    if (!factory) {
      throw new Error(`Provider not registered: ${provider}`)
    }

    return factory()
  }

  /**
   * Check if a provider is registered
   * @param provider - Provider identifier
   */
  static isProviderRegistered(provider: ModelProvider): boolean {
    return this.providers.has(provider)
  }

  /**
   * Get all registered providers
   */
  static getRegisteredProviders(): ModelProvider[] {
    return Array.from(this.providers.keys())
  }
}
