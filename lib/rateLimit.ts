interface RateLimitEntry {
  count: number;
  windowStart: number;
}

interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

let cleanupScheduled = false;
function scheduleCleanup(windowMs: number) {
  if (cleanupScheduled) return;
  cleanupScheduled = true;
  setInterval(
    () => {
      const now = Date.now();
      for (const [key, entry] of store.entries()) {
        if (now - entry.windowStart > windowMs) {
          store.delete(key);
        }
      }
    },
    Math.max(windowMs, 5 * 60_000),
  );
}

export function rateLimit(
  identifier: string,
  options: RateLimitOptions,
): RateLimitResult {
  const { limit, windowMs } = options;
  scheduleCleanup(windowMs);

  const now = Date.now();
  const entry = store.get(identifier);

  if (!entry || now - entry.windowStart > windowMs) {
    store.set(identifier, { count: 1, windowStart: now });
    return {
      allowed: true,
      remaining: limit - 1,
      resetAt: now + windowMs,
    };
  }

  if (entry.count < limit) {
    entry.count += 1;
    return {
      allowed: true,
      remaining: limit - entry.count,
      resetAt: entry.windowStart + windowMs,
    };
  }

  return {
    allowed: false,
    remaining: 0,
    resetAt: entry.windowStart + windowMs,
  };
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}
