import { Request, Response, NextFunction } from "express";

// Sliding Window Log Algorithm

type RateLimitStore = Map<string, number[]>;

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  // Seconds until the oldest request slides out of the window (only when blocked)
  retryAfterSec: number;
  resetAt: number;
}

export function rateLimiter(options: {
  key: string;
  store: RateLimitStore;
  windowMs: number;
  max: number;
}): RateLimitResult {
  const { key, store, windowMs, max } = options;
  const now = Date.now();

  const timestamps = (store.get(key) ?? []).filter((ts) => ts > now - windowMs);

  if (timestamps.length >= max) {
    const oldest = timestamps[0];
    store.set(key, timestamps);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSec: Math.ceil((oldest + windowMs - now) / 1000),
      resetAt: oldest + windowMs,
    };
  }

  timestamps.push(now);
  store.set(key, timestamps);

  return {
    allowed: true,
    remaining: max - timestamps.length,
    retryAfterSec: 0,
    resetAt: now + windowMs,
  };
}

export function slidingWindowRateLimit(options: {
  windowMs: number; // window size in ms
  max: number; // max requests per window
  message?: string;
}) {
  const {
    windowMs,
    max,
    message = "Too many requests, please try again later.",
  } = options;

  // Each limiter owns its store; sharing one map across limiters would
  // let requests on one route consume the quota of another.
  const store: RateLimitStore = new Map();

  // Evict stale keys every 5 minutes. unref() so the timer never keeps
  // the process alive on shutdown.
  setInterval(
    () => {
      const now = Date.now();
      for (const [key, timestamps] of store.entries()) {
        const alive = timestamps.filter((ts) => ts > now - windowMs);
        if (alive.length === 0) store.delete(key);
        else store.set(key, alive);
      }
    },
    5 * 60 * 1000,
  ).unref();

  return function (req: Request, res: Response, next: NextFunction) {
    const key = req.socket?.remoteAddress || req.ip || "unknown";

    const result = rateLimiter({ key, store, windowMs, max });

    res.setHeader("X-RateLimit-Limit", max);
    res.setHeader("X-RateLimit-Remaining", result.remaining);
    res.setHeader("X-RateLimit-Reset", new Date(result.resetAt).toISOString());

    if (!result.allowed) {
      res.setHeader("Retry-After", result.retryAfterSec);
      res.status(429).json({
        success: false,
        message,
        retryAfter: result.retryAfterSec,
      });
      return;
    }

    next();
  };
}

// Pre-configured limiters for different route types
export const authRateLimit = slidingWindowRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // max 10 auth attempts per 15 min
  message: "Too many auth attempts, please try again in 15 minutes.",
});

export const apiRateLimit = slidingWindowRateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: "Rate limit exceeded, please slow down.",
});

export const triggerRateLimit = slidingWindowRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // max 5 manual pipeline triggers per hour
  message: "Pipeline trigger limit reached. Try again in an hour.",
});
