# GenAI Integration Guide

## Overview

Auteurium supports AI-powered content generation through multiple LLM providers. Users can generate text content in snippet text fields using models from Gemini, OpenAI, and other providers.

## Architecture

### Components

1. **Frontend**: Model selection dropdown and generate button in `EditSnippetModal`
2. **GraphQL API**: `generateContent` mutation, `availableModels` query
3. **GenAI Orchestrator**: Provider abstraction layer (`services/genai-orchestrator`)
4. **CDK Stack**: Infrastructure for GenAI services (`auteurium-genai-stack`)
5. **DynamoDB**: Generation history storage

### Data Flow

```
User clicks Generate
    ↓
EditSnippetModal calls generateContent mutation
    ↓
Lambda resolver (generateContent.ts)
    ↓
GenerationOrchestrator routes to provider
    ↓
Gemini/OpenAI API generates content
    ↓
Response saved to DynamoDB
    ↓
Content returned to frontend
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure API Keys

API keys are stored in AWS Secrets Manager. After deploying the GenAI stack:

```bash
# Get secret ARN from CDK outputs
aws secretsmanager get-secret-value \
  --secret-id auteurium/genai/api-keys-dev

# Update secret with actual API keys
aws secretsmanager update-secret \
  --secret-id auteurium/genai/api-keys-dev \
  --secret-string '{
    "gemini": "YOUR_GEMINI_API_KEY",
    "openai": "YOUR_OPENAI_API_KEY"
  }'
```

### 3. Deploy GenAI Stack

```bash
cd infrastructure/aws-cdk
npm run deploy -- Auteurium-GenAI-dev
```

### 4. Run GraphQL Code Generation

```bash
npm run generate
```

## Usage

### Available Models Query

Get list of enabled models:

```graphql
query GetAvailableModels {
  availableModels(modality: TEXT_TO_TEXT) {
    id
    displayName
    description
    provider
    maxTokens
    costPerToken
  }
}
```

### Generate Content Mutation

Generate content for a snippet:

```graphql
mutation GenerateContent($snippetId: ID!, $input: GenerateContentInput!) {
  generateContent(snippetId: $snippetId, input: $input) {
    content
    tokensUsed
    cost
    modelUsed
    generationTimeMs
  }
}
```

Variables:
```json
{
  "snippetId": "snippet-123",
  "input": {
    "modelId": "gemini-1.5-pro",
    "prompt": "Write a summary of quantum computing",
    "temperature": 0.7,
    "maxTokens": 500
  }
}
```

### Generation History Query

Get past generations for a snippet:

```graphql
query GetGenerationHistory($snippetId: ID!) {
  generationHistory(snippetId: $snippetId) {
    id
    modelUsed
    prompt
    result
    tokensUsed
    cost
    createdAt
  }
}
```

## Frontend Integration

### Model Selector Component

```typescript
import { useQuery } from '@apollo/client'
import { AVAILABLE_MODELS } from './graphql/queries'

function ModelSelector() {
  const { data, loading } = useQuery(AVAILABLE_MODELS, {
    variables: { modality: 'TEXT_TO_TEXT' }
  })

  return (
    <select>
      {data?.availableModels.map(model => (
        <option key={model.id} value={model.id}>
          {model.displayName}
        </option>
      ))}
    </select>
  )
}
```

### Generate Hook

```typescript
import { useMutation } from '@apollo/client'
import { GENERATE_CONTENT } from './graphql/mutations'

function useGenAI(snippetId: string) {
  const [generateContent, { loading }] = useMutation(GENERATE_CONTENT)

  const generate = async (modelId: string, prompt: string) => {
    const result = await generateContent({
      variables: {
        snippetId,
        input: { modelId, prompt }
      }
    })

    return result.data.generateContent.content
  }

  return { generate, loading }
}
```

## Adding New Providers

### 1. Implement Provider

Create provider class in `services/genai-orchestrator/src/providers/{provider}/`:

```typescript
export class NewProviderTextProvider implements ITextProvider {
  readonly name = 'new-provider'

  async initialize(apiKey: string) {
    // Initialize provider SDK
  }

  async generate(request: GenerationRequest) {
    // Call provider API
    // Return GenerationResponse
  }
}
```

### 2. Register Provider

Update `providers/registry.ts`:

```typescript
ProviderRegistry.register(
  ModelProvider.NEW_PROVIDER,
  () => new NewProviderTextProvider()
)
```

### 3. Add Models

Update `config/models.ts`:

```typescript
{
  id: 'new-model-v1',
  provider: ModelProvider.NEW_PROVIDER,
  modelId: 'new-model-v1',
  modality: GenerationModality.TEXT_TO_TEXT,
  displayName: 'New Model v1',
  enabled: true
}
```

### 4. Update Secrets

Add API key to Secrets Manager:

```bash
aws secretsmanager update-secret \
  --secret-id auteurium/genai/api-keys-dev \
  --secret-string '{
    "gemini": "...",
    "openai": "...",
    "new-provider": "NEW_API_KEY"
  }'
```

## Cost Management

### Per-User Limits

Configured in `config/limits.ts`:
- Daily budget: $5.00
- Monthly budget: $50.00
- Alert at 90% threshold

### Monitoring

View costs in DynamoDB:

```bash
aws dynamodb query \
  --table-name auteurium-generations-dev \
  --index-name userId-modelProvider-index \
  --key-condition-expression "userId = :userId" \
  --expression-attribute-values '{":userId":{"S":"user-123"}}'
```

## Security

### API Key Management
- Stored in AWS Secrets Manager
- Retrieved at runtime by Lambda
- Rotated regularly

### User Isolation
- Each generation record tied to userId
- Users can only access their own generations
- Snippet ownership verified before generation

### Content Safety
- Provider-specific safety filters (Gemini: HARM_CATEGORY_*)
- Input validation (max length, required fields)
- Rate limiting per user

## Troubleshooting

### "Model not found" Error
- Check model ID in `config/models.ts`
- Verify model is enabled: `enabled: true`

### "Provider not initialized" Error
- Verify API key in Secrets Manager
- Check Lambda has SecretsManager read permissions
- Ensure API key is valid

### High Costs
- Review `generationsTable` for usage patterns
- Adjust cost limits in `config/limits.ts`
- Set up CloudWatch alarms for budget alerts

## Testing

### Unit Tests

```bash
cd services/genai-orchestrator
npm test
```

### Integration Tests

```bash
cd services/api
npm test -- genai
```

### E2E Tests

```bash
npm run test:e2e -- genai
```

## Next Steps

- [ ] Add streaming support for real-time generation
- [ ] Implement text-to-image providers (DALL-E, Midjourney)
- [ ] Add generation history UI component
- [ ] Implement cost dashboard for admins
- [ ] Add retry logic with exponential backoff
