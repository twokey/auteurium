/**
 * Rate limiting and quota configuration
 */

export const RATE_LIMITS = {
  // Max requests per user per minute
  REQUESTS_PER_MINUTE: 10,

  // Max requests per user per hour
  REQUESTS_PER_HOUR: 100,

  // Max requests per user per day
  REQUESTS_PER_DAY: 500,

  // Max tokens per request
  MAX_TOKENS_PER_REQUEST: 8192,

  // Max prompt length in characters
  MAX_PROMPT_LENGTH: 50000
}

export const COST_LIMITS = {
  // Max cost per user per day (in dollars)
  DAILY_BUDGET_PER_USER: 5.0,

  // Max cost per user per month (in dollars)
  MONTHLY_BUDGET_PER_USER: 50.0,

  // Alert threshold (90% of daily budget)
  DAILY_ALERT_THRESHOLD: 4.5,

  // Alert threshold (90% of monthly budget)
  MONTHLY_ALERT_THRESHOLD: 45.0
}

export const RETRY_CONFIG = {
  // Max retry attempts for failed requests
  MAX_RETRIES: 3,

  // Initial delay between retries (ms)
  INITIAL_RETRY_DELAY: 1000,

  // Exponential backoff multiplier
  BACKOFF_MULTIPLIER: 2,

  // Max delay between retries (ms)
  MAX_RETRY_DELAY: 10000
}

export const TIMEOUT_CONFIG = {
  // Timeout for standard generation (ms)
  GENERATION_TIMEOUT: 30000,

  // Timeout for streaming generation (ms)
  STREAMING_TIMEOUT: 60000,

  // Timeout for model availability check (ms)
  HEALTH_CHECK_TIMEOUT: 5000
}
