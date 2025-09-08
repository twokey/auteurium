# Key Backend Logic Areas

1. **Authentication & Authorization:**  
   * Integrate with Amazon Cognito for user sign-up, sign-in, token issuance.  
   * Logic within Lambda functions to check userID from token against resource ownership.  
2. **Cascade Deletes:**  
   * Deleting projects or snippets requires deleting related dependent items.
3. **Media Uploads:**  
   * Frontend gets pre-signed S3 URL from backend.  
   * Frontend uploads directly to S3.  
   * Frontend notifies backend upon successful upload to finalize media registration.  
4. **GenAI Integration:**  
   * Securely manage API keys/credentials for the GenAI service.  
   * Error handling and retries for GenAI calls.  
5. **Data Validation:**  
   * Validate all incoming request payloads (data types, required fields, constraints).  
   * Use a validation library.  
6. **Idempotency:** For critical operations like creation or linking, consider idempotency mechanisms if retries are possible.  
7. **Error Handling & Logging:**  
   * Consistent error response format from API.  
   * Detailed logging using Amazon CloudWatch for debugging and monitoring.  
8. **Scalability & Performance:**   
   * Optimize Lambda function performance (cold starts, memory).
9. **Infrasctructure**
   * Stacks should be identified by app name in case there are several stacks in one account for different apps
   * Resources (e.g. table names, functions) should be identifiable by stack and app name to make them identifiable in console
10. **API Layer**
   * Use GraphQL with AppSync


