export interface RateLimitConfig {
  requestsPerMinute: number;
  burst: number;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSec: number;
  remaining: number;
}

interface Bucket {
  tokens: number;
  lastRefillAtMs: number;
}

export class TokenBucketRateLimiter {
  private readonly buckets = new Map<string, Bucket>();
  private readonly capacity: number;
  private readonly refillPerSecond: number;
  private readonly now: () => number;

  constructor(config: RateLimitConfig, now?: () => number) {
    this.capacity = Math.max(1, Math.floor(config.burst));
    const rpm = Math.max(1, Math.floor(config.requestsPerMinute));
    this.refillPerSecond = rpm / 60;
    this.now = now || (() => Date.now());
  }

  check(key: string): RateLimitResult {
    const nowMs = this.now();
    const bucket = this.buckets.get(key) || {
      tokens: this.capacity,
      lastRefillAtMs: nowMs,
    };

    const elapsedSec = Math.max(0, (nowMs - bucket.lastRefillAtMs) / 1000);
    const refilledTokens = elapsedSec * this.refillPerSecond;
    bucket.tokens = Math.min(this.capacity, bucket.tokens + refilledTokens);
    bucket.lastRefillAtMs = nowMs;

    if (bucket.tokens < 1) {
      this.buckets.set(key, bucket);
      const needed = 1 - bucket.tokens;
      const retryAfterSec = Math.max(1, Math.ceil(needed / this.refillPerSecond));
      return {
        allowed: false,
        retryAfterSec,
        remaining: 0,
      };
    }

    bucket.tokens -= 1;
    this.buckets.set(key, bucket);
    return {
      allowed: true,
      retryAfterSec: 0,
      remaining: Math.max(0, Math.floor(bucket.tokens)),
    };
  }
}
