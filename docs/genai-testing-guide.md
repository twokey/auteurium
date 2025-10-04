# GenAI Testing Guide

## Deployment Status ✅

All GenAI infrastructure has been successfully deployed:
- ✅ Lambda Functions: `auteurium-genai-generate-dev`, `auteurium-genai-models-dev`, `auteurium-genai-history-dev`
- ✅ DynamoDB Table: `auteurium-generations-dev`
- ✅ Secrets Manager: API keys configured at `auteurium/genai/api-keys-dev`
- ✅ AppSync Resolvers: Connected to GraphQL API

**GraphQL API Endpoint**: `https://6ch6wplfmfhzvpcpvdbxqm4bje.appsync-api.us-west-2.amazonaws.com/graphql`

## Testing Methods

### Option 1: AWS AppSync Console (Recommended for Quick Testing)

1. Open AWS Console → AppSync → `auteurium-api-dev`
2. Click "Queries" in left sidebar
3. Use the built-in GraphQL explorer with auto-authentication

### Option 2: Auteurium Web App (End-to-End Testing)

Test directly in your application:
1. Log into Auteurium web app
2. Open a snippet
3. Use the LLM dropdown and Generate button

### Option 3: GraphQL Queries via CLI (Advanced)

You'll need to authenticate first to get a JWT token.

## Test Queries

### 1. Test Available Models Query

```graphql
query GetAvailableModels {
  availableModels(modality: TEXT_TO_TEXT) {
    id
    displayName
    description
    provider
    modality
    maxTokens
    costPerToken
    enabled
  }
}
```

**Expected Result:**
```json
{
  "data": {
    "availableModels": [
      {
        "id": "gemini-1.5-pro",
        "displayName": "Gemini 1.5 Pro",
        "description": "Most capable Gemini model with 1M token context",
        "provider": "GEMINI",
        "modality": "TEXT_TO_TEXT",
        "maxTokens": 8192,
        "costPerToken": 0.00000125,
        "enabled": true
      },
      {
        "id": "gemini-1.5-flash",
        "displayName": "Gemini 1.5 Flash",
        "description": "Faster, more efficient Gemini model",
        "provider": "GEMINI",
        "modality": "TEXT_TO_TEXT",
        "maxTokens": 8192,
        "costPerToken": 0.000000075,
        "enabled": true
      },
      {
        "id": "gemini-pro",
        "displayName": "Gemini Pro",
        "description": "Previous generation Gemini model",
        "provider": "GEMINI",
        "modality": "TEXT_TO_TEXT",
        "maxTokens": 32760,
        "costPerToken": 0.0000005,
        "enabled": true
      }
    ]
  }
}
```

### 2. Test Generate Content Mutation

**Prerequisites:**
- You must have an existing snippet ID
- You must be authenticated

```graphql
mutation GenerateContent {
  generateContent(
    snippetId: "YOUR_SNIPPET_ID_HERE"
    input: {
      modelId: "gemini-1.5-flash"
      prompt: "Write a haiku about programming"
      temperature: 0.7
      maxTokens: 100
    }
  ) {
    content
    tokensUsed
    cost
    modelUsed
    generationTimeMs
  }
}
```

**Expected Result:**
```json
{
  "data": {
    "generateContent": {
      "content": "Code flows like water\nBugs hide in silent shadows\nDebug brings the light",
      "tokensUsed": 25,
      "cost": 0.0000018,
      "modelUsed": "gemini-1.5-flash",
      "generationTimeMs": 1250
    }
  }
}
```

### 3. Test Generation History Query

```graphql
query GetGenerationHistory {
  generationHistory(snippetId: "YOUR_SNIPPET_ID_HERE") {
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

**Expected Result:**
```json
{
  "data": {
    "generationHistory": [
      {
        "id": "1727712345678-abc123",
        "modelUsed": "gemini-1.5-flash",
        "prompt": "Write a haiku about programming",
        "result": "Code flows like water...",
        "tokensUsed": 25,
        "cost": 0.0000018,
        "createdAt": "2025-09-30T19:45:12.345Z"
      }
    ]
  }
}
```

## Getting a Snippet ID for Testing

### Method 1: Query Existing Snippets

```graphql
query GetMySnippets {
  projects {
    id
    name
    snippets {
      id
      title
      textField1
    }
  }
}
```

### Method 2: Create a Test Snippet

```graphql
mutation CreateTestSnippet {
  createSnippet(
    input: {
      projectId: "YOUR_PROJECT_ID"
      title: "GenAI Test Snippet"
      textField1: "Write a haiku about programming"
      textField2: ""
      position: { x: 100, y: 100 }
    }
  ) {
    id
    title
  }
}
```

## Troubleshooting

### Error: "User not authenticated"
- Make sure you're logged into the AppSync console or have a valid JWT token
- Check that your Cognito user pool is configured correctly

### Error: "Snippet not found"
- Verify the snippet ID exists
- Make sure the snippet belongs to the authenticated user

### Error: "Failed to retrieve LLM API keys"
- Check that the Secrets Manager secret exists
- Verify Lambda has permission to read the secret
- Confirm the secret contains valid API keys

### Error: "Model not found: gemini-1.5-pro"
- Check that the model ID matches exactly (case-sensitive)
- Verify the model is enabled in `services/genai-orchestrator/src/config/models.ts`

### Error: "Provider not initialized"
- Verify the Gemini API key is correctly set in Secrets Manager
- Check CloudWatch Logs for the Lambda function:
  ```bash
  aws logs tail /aws/lambda/auteurium-genai-generate-dev --follow
  ```

### High Costs
- Check the generations table for usage:
  ```bash
  aws dynamodb scan --table-name auteurium-generations-dev \
    --projection-expression "userId,cost,modelUsed,createdAt" \
    --max-items 10
  ```

## Monitoring

### View Lambda Logs

```bash
# Generate content function
aws logs tail /aws/lambda/auteurium-genai-generate-dev --follow

# Available models function
aws logs tail /aws/lambda/auteurium-genai-models-dev --follow

# Generation history function
aws logs tail /aws/lambda/auteurium-genai-history-dev --follow
```

### Check Recent Generations

```bash
aws dynamodb scan \
  --table-name auteurium-generations-dev \
  --limit 5 \
  --projection-expression "id,userId,modelUsed,tokensUsed,cost,createdAt"
```

## Next Steps

Once testing is complete:

1. **Frontend Integration (Phase 2)**
   - Create GraphQL operations in `apps/web/src/graphql/genai.ts`
   - Build `ModelSelector` component
   - Build `useGenAI` hook
   - Update `EditSnippetModal` with real GenAI integration

2. **OpenAI Provider (Phase 3)**
   - Implement `OpenAITextProvider`
   - Add GPT-4 and GPT-3.5 models to config
   - Update Secrets Manager with OpenAI API key

3. **Advanced Features (Phase 4)**
   - Streaming responses
   - Generation history UI
   - Cost tracking dashboard
