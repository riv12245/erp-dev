import { randomUUID } from 'node:crypto';

export interface CorrelationContext {
  readonly correlationId: string;
  readonly causationId?: string;
  readonly requestId?: string;
}

export function generateCorrelationId(): string {
  return randomUUID();
}

export function createCorrelationContext(causationId?: string): CorrelationContext {
  return { correlationId: randomUUID(), causationId };
}

/** Async-local store so any code can read the current correlation id. */
export class Correlator {
  private static instance: Correlator | null = null;
  private readonly store = new Map<string, CorrelationContext>();

  static getInstance(): Correlator {
    if (!Correlator.instance) Correlator.instance = new Correlator();
    return Correlator.instance;
  }

  /** Bind a correlation context to the current async flow. */
  run<T>(context: CorrelationContext, fn: () => Promise<T>): Promise<T> {
    const key = randomUUID();
    this.store.set(key, context);
    return Promise.resolve()
      .then(fn)
      .finally(() => this.store.delete(key));
  }

  current(): CorrelationContext | null {
    return this.store.values().next().value ?? null;
  }
}

export const correlator = Correlator.getInstance();