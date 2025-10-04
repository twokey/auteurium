# GenAI Orchestrator

Provider abstraction layer for LLM integration in Auteurium.

## Overview

This package provides a unified interface for integrating multiple LLM providers (Gemini, OpenAI, Anthropic, etc.) with support for various modalities (text-to-text, text-to-image, text-to-video, text-to-audio).

## Architecture

### Provider Abstraction Pattern

```
┌─────────────────────────────────────┐
│   GenerationOrchestrator            │
│   - Routes requests to providers    │
│   - Handles cost tracking          │
│   - Manages API keys               │
└──────────────┬──────────────────────┘
               │
        ┌──────┴───────┐
        │              │
   ┌────▼────┐   ┌────▼────┐
   │ Gemini  │   │ OpenAI  │
   │Provider │   │Provider │
   └─────────┘   └─────────┘
```

### Provider Registry

New providers are registered in `providers/registry.ts`:

```typescript
ProviderRegistry.register(ModelProvider.GEMINI, () => new GeminiTextProvider())
```

### Model Configuration

Models are configured in `config/models.ts`:

```typescript
{
  id: 'gemini-1.5-pro',
  provider: ModelProvider.GEMINI,
  modelId: 'gemini-1.5-pro',
  modality: GenerationModality.TEXT_TO_TEXT,
  displayName: 'Gemini 1.5 Pro',
  maxTokens: 8192,
  costPerToken: 0.00000125,
  enabled: true
}
```

## Usage

### Initialize Orchestrator

```typescript
import { GenerationOrchestrator } from '@auteurium/genai-orchestrator'

const orchestrator = new GenerationOrchestrator()
orchestrator.setApiKey('gemini', process.env.GEMINI_API_KEY!)
```

### Generate Content

```typescript
const response = await orchestrator.generate(
  {
    modelId: 'gemini-1.5-pro',
    prompt: 'Write a summary of quantum computing',
    temperature: 0.7,
    maxTokens: 500
  },
  {
    userId: 'user-123',
    snippetId: 'snippet-456',
    projectId: 'project-789'
  }
)

console.log(response.content)
console.log(`Cost: $${response.cost.toFixed(4)}`)
console.log(`Tokens: ${response.tokensUsed}`)
```

## Adding New Providers

### 1. Implement Provider Class

Create `providers/{provider}/ProviderTextProvider.ts`:

```typescript
import { ITextProvider } from '../base'

export class MyProviderTextProvider implements ITextProvider {
  readonly name = 'my-provider'

  async initialize(apiKey: string): Promise<void> {
    // Initialize SDK
  }

  async generate(request: GenerationRequest): Promise<GenerationResponse> {
    // Call provider API
  }

  // Implement other interface methods...
}
```

### 2. Register Provider

Add to `providers/registry.ts`:

```typescript
ProviderRegistry.register(
  ModelProvider.MY_PROVIDER,
  () => new MyProviderTextProvider()
)
```

### 3. Add Model Configurations

Add to `config/models.ts`:

```typescript
{
  id: 'my-model-v1',
  provider: ModelProvider.MY_PROVIDER,
  modelId: 'my-model-v1',
  modality: GenerationModality.TEXT_TO_TEXT,
  displayName: 'My Model v1',
  maxTokens: 4096,
  costPerToken: 0.00001,
  enabled: true
}
```

### 4. Update CDK Stack

Add API key to Secrets Manager in `infrastructure/aws-cdk/lib/stacks/auteurium-genai-stack.ts`

## Testing

```bash
# Run all tests
npm test

# Run specific provider tests
npm test -- gemini
```

## Cost Tracking

All generations are tracked with:
- Token usage
- Cost per generation
- Model used
- Generation time

Cost limits are configured in `config/limits.ts`.

## Rate Limiting

Configured in `config/limits.ts`:
- Requests per minute/hour/day
- Max tokens per request
- Max prompt length

## Security

- API keys stored in AWS Secrets Manager
- User data isolation enforced
- Input validation using Zod schemas
- Content safety filters (provider-specific)
