// ============================================================
// Simple in-memory rate limiter for Next.js API routes
// Resets on server restart (good enough for Vercel serverless)
// ============================================================

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Cleanup old buckets every 5 minutes to avoid memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
}, 5 * 60 * 1000);

export interface RateLimitOptions {
  /** Max requests allowed in the window */
  limit: number;
  /** Window duration in seconds */
  windowSec: number;
}

/**
 * Returns true when the key has exceeded the rate limit.
 * `key` is typically `${ip}:${eventId}` or just the IP.
 */
export function isRateLimited(key: string, opts: RateLimitOptions): boolean {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + opts.windowSec * 1000 });
    return false;
  }

  existing.count++;
  if (existing.count > opts.limit) return true;
  return false;
}

/** Extract the real client IP from the request headers (Vercel-aware) */
export function getClientIp(headers: Headers): string {
  return (
    headers.get("x-real-ip") ||
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}
