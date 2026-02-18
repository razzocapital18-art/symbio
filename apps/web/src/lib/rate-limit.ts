import Redis from "ioredis";

const memoryStore = new Map<string, { count: number; expiresAt: number }>();
const redis = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : null;

type LimitResult = { allowed: boolean; remaining: number; resetAt: number };

export async function applyRateLimit(key: string, limit = 40, windowSeconds = 60): Promise<LimitResult> {
  const now = Date.now();
  const resetAt = now + windowSeconds * 1000;

  if (redis) {
    const redisKey = `rl:${key}`;
    const tx = redis.multi();
    tx.incr(redisKey);
    tx.expire(redisKey, windowSeconds);
    const result = await tx.exec();
    const count = Number(result?.[0]?.[1] ?? 0);

    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
      resetAt
    };
  }

  const existing = memoryStore.get(key);
  if (!existing || existing.expiresAt < now) {
    memoryStore.set(key, { count: 1, expiresAt: resetAt });
    return { allowed: true, remaining: limit - 1, resetAt };
  }

  existing.count += 1;
  memoryStore.set(key, existing);
  return {
    allowed: existing.count <= limit,
    remaining: Math.max(0, limit - existing.count),
    resetAt: existing.expiresAt
  };
}
