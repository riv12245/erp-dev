import { Redis } from 'ioredis';
import { createConnection } from 'mongoose';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
const MONGO_URI = process.env.MONGO_URI ?? 'mongodb://localhost:27017/erp';

/**
 * Tests that touch live infrastructure (Redis/Mongo) skip gracefully when the
 * dependency is not reachable, keeping `turbo run test` green without a local
 * Redis/Mongo process.
 */
export async function hasRedis(): Promise<boolean> {
  const redis = new Redis(REDIS_URL, { retryStrategy: () => null, maxRetries: 1, lazyConnect: true, connectTimeout: 1500 });
  redis.on('error', () => {
    /* ignore: not available */
  });
  try {
    await redis.connect();
    await redis.quit();
    return true;
  } catch {
    return false;
  }
}

export async function hasMongo(): Promise<boolean> {
  const connection = createConnection(MONGO_URI, { serverSelectionTimeoutMS: 1500, connectTimeoutMS: 1500 });
  try {
    await connection.openUri(MONGO_URI, { serverSelectionTimeoutMS: 1500, connectTimeoutMS: 1500 });
    await connection.asPromise();
    await connection.close();
    return true;
  } catch {
    return false;
  }
}