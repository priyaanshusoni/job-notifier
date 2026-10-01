import { Request, Response, NextFunction } from "express";

/**
 * Sliding Window Rate Limiter
 *
 * Tracks request timestamps per IP in a rolling time window.
 * More accurate than fixed-window (no boundary burst issue).
 *
 * Algorithm:
 * 1. Keep a list of timestamps for each IP key
 * 2. On each request: prune timestamps older than windowMs
 * 3. If remaining count < limit → allow and record timestamp
 * 4. Else → reject with 429
 */

interface WindowEntry {
  timestamps: number[];
}

const store = new Map<string, WindowEntry>();

export function slidingWindowRateLimit(options: {
  windowMs: number;   // window size in ms
  max: number;        // max requests per window
  message?: string;
}) {
  const { windowMs, max, message = "Too many requests, please try again later." } = options;

  // Cleanup stale keys every 5 minutes to avoid memory leaks
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);
      if (entry.timestamps.length === 0) store.delete(key);
    }
  }, 5 * 60 * 1000);

  return function (req: Request, res: Response, next: NextFunction) {
    const key = req.ip || "unknown";
    const now = Date.now();

    if (!store.has(key)) {
      store.set(key, { timestamps: [] });
    }

    const entry = store.get(key)!;

    // Slide: remove timestamps outside the window
    entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);

    if (entry.timestamps.length >= max) {
      const oldestTimestamp = entry.timestamps[0];
      const retryAfter = Math.ceil((oldestTimestamp + windowMs - now) / 1000);

      res.setHeader("Retry-After", retryAfter);
      res.setHeader("X-RateLimit-Limit", max);
      res.setHeader("X-RateLimit-Remaining", 0);
      res.setHeader("X-RateLimit-Reset", new Date(oldestTimestamp + windowMs).toISOString());

      res.status(429).json({ success: false, message, retryAfter });
      return;
    }

    entry.timestamps.push(now);

    res.setHeader("X-RateLimit-Limit", max);
    res.setHeader("X-RateLimit-Remaining", max - entry.timestamps.length);

    next();
  };
}

// Pre-configured limiters for different route types
export const authRateLimit = slidingWindowRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                   // max 10 auth attempts per 15 min
  message: "Too many auth attempts, please try again in 15 minutes.",
});

export const apiRateLimit = slidingWindowRateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,             // 60 requests per minute
  message: "Rate limit exceeded, please slow down.",
});

export const triggerRateLimit = slidingWindowRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,                    // max 5 manual pipeline triggers per hour
  message: "Pipeline trigger limit reached. Try again in an hour.",
});
