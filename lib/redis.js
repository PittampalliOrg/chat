// lib/redis.js  (pure ES module, executes in Node immediately)
import { createClient } from "redis";

/** @type {globalThis & { __REDIS__?: import("redis").RedisClientType }} */
const g = globalThis;

export const redis =
  g.__REDIS__ ??
  (() => {
    const client = createClient({ url: process.env.REDIS_URL || "redis://localhost:6379" });

    client.on("error", (err) => console.error("Redis error:", err));
    client.connect().catch((err) => console.error("Redis connect failed:", err));

    g.__REDIS__ = client;
    return client;
  })();
