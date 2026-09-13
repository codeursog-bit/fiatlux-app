/**
 * Simple in-memory rate limiter for MVP.
 * In a production environment with high traffic or multiple instances, 
 * this should be replaced with Redis.
 */

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

/**
 * Checks if a request should be limited.
 * @param identifier Unique identifier for the client (e.g. IP, Token)
 * @param limit Max requests allowed in the window
 * @param windowMs Time window in milliseconds
 * @returns boolean True if limited, False if allowed
 */
export function isRateLimited(identifier: string, limit: number = 10, windowMs: number = 60000): boolean {
  const now = Date.now();
  
  if (!store[identifier]) {
    store[identifier] = {
      count: 1,
      resetTime: now + windowMs,
    };
    return false;
  }

  const record = store[identifier];

  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + windowMs;
    return false;
  }

  record.count++;

  return record.count > limit;
}
