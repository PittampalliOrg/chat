import { CacheHandler } from "@neshca/cache-handler";
import createLruHandler from "@neshca/cache-handler/local-lru";
import createRedisHandler from "@neshca/cache-handler/redis-stack";
import { redis } from "./lib/redis.js";

CacheHandler.onCreation(async () => {
  let redisHandler;

  if (process.env.REDIS_AVAILABLE) {
    try {
      redisHandler = await createRedisHandler({
        client: redis,
        timeoutMs: 5_000,
      });
    } catch (err) {
      console.warn("🔴  Redis handler failed → falling back to in-memory:", err);
    }
  }

  return {
    handlers: [redisHandler, createLruHandler()],
  };
});

export default CacheHandler;
