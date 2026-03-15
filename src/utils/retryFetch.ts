/**
 * Utility for retrying fetch requests with exponential backoff.
 * Useful for handling rate limiting and transient failures.
 */

export interface RetryConfig {
  maxRetries?: number;
  initialDelayMs?: number;
  backoffMultiplier?: number;
  jitterPercent?: number;
  isRetryableError?: (response: Response) => boolean | Promise<boolean>;
}

const DEFAULT_CONFIG: Required<RetryConfig> = {
  maxRetries: 3,
  initialDelayMs: 5000,
  backoffMultiplier: 2,
  jitterPercent: 10,
  isRetryableError: (response: Response) => response.status === 429,
};

/**
 * Adds jitter to a delay to prevent thundering herd.
 * Adds/subtracts a random percentage of the delay based on jitterPercent.
 */
function addJitter(delayMs: number, jitterPercent: number): number {
  const jitterRange = (delayMs * jitterPercent) / 100;
  const jitter = (Math.random() - 0.5) * 2 * jitterRange;
  return Math.max(0, delayMs + jitter);
}

/**
 * Sleeps for the specified duration in milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetches a URL with automatic retry logic for rate limit errors.
 * Implements exponential backoff between retries.
 *
 * @param input - The fetch request URL or Request object
 * @param init - Optional fetch request configuration
 * @param config - Optional retry configuration
 * @returns The fetch Response object
 *
 * @example
 * const response = await fetchWithRetry('https://api.example.com/data', {
 *   method: 'GET'
 * }, {
 *   maxRetries: 3,
 *   initialDelayMs: 5000
 * });
 */
export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  config?: RetryConfig
): Promise<Response> {
  const finalConfig: Required<RetryConfig> = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  let lastResponse: Response | null = null;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
    try {
      const response = await fetch(input, init);
      lastResponse = response;

      // If not retryable or it's the last attempt, return the response
      if (
        attempt === finalConfig.maxRetries ||
        !(await finalConfig.isRetryableError(response))
      ) {
        return response;
      }

      // Response indicates a retryable error, calculate delay and retry
      const delayMs = finalConfig.initialDelayMs *
        Math.pow(finalConfig.backoffMultiplier, attempt);
      const delayWithJitter = addJitter(
        delayMs,
        finalConfig.jitterPercent
      );

      console.debug(
        `[fetchWithRetry] Rate limit detected. Attempt ${attempt + 1}/${finalConfig.maxRetries + 1}. ` +
          `Retrying after ${Math.round(delayWithJitter)}ms...`
      );

      await sleep(delayWithJitter);
    } catch (error) {
      lastError = error as Error;

      // If it's the last attempt, throw the error
      if (attempt === finalConfig.maxRetries) {
        throw error;
      }

      // For network errors, we could optionally retry
      // For now, we re-throw immediately
      throw error;
    }
  }

  // Should not reach here, but return last response if we do
  if (lastResponse) {
    return lastResponse;
  }

  throw lastError || new Error("fetchWithRetry failed with no response");
}
