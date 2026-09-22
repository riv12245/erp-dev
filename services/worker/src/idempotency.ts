import { randomUUID as uuidv4 } from 'node:crypto';

interface IdempotencyRecord {
  key: string;
  result: unknown;
  expiresAt: Date;
}

export class IdempotencyService {
  private static instance: IdempotencyService;
  private records: Map<string, IdempotencyRecord> = new Map();
  private readonly ttlMs: number;

  private constructor() {
    this.ttlMs = Number(process.env.IDEMPOTENCY_TTL_MS ?? 3600000);
  }

  static getInstance(): IdempotencyService {
    if (!IdempotencyService.instance) {
      IdempotencyService.instance = new IdempotencyService();
    }
    return IdempotencyService.instance;
  }

  async execute<T>(key: string, operation: () => Promise<T>): Promise<T> {
    const existing = this.records.get(key);

    if (existing && existing.expiresAt > new Date()) {
      return existing.result as T;
    }

    const result = await operation();

    this.records.set(key, {
      key,
      result,
      expiresAt: new Date(Date.now() + this.ttlMs),
    });

    return result;
  }

  async has(key: string): Promise<boolean> {
    const record = this.records.get(key);
    if (!record) return false;
    if (record.expiresAt <= new Date()) {
      this.records.delete(key);
      return false;
    }
    return true;
  }

  async invalidate(key: string): Promise<void> {
    this.records.delete(key);
  }

  async invalidateAll(): Promise<void> {
    this.records.clear();
  }

  generateKey(prefix: string = 'idemp'): string {
    return `${prefix}-${uuidv4()}`;
  }

  cleanup(): void {
    const now = new Date();
    for (const [key, record] of this.records.entries()) {
      if (record.expiresAt <= now) {
        this.records.delete(key);
      }
    }
  }
}
