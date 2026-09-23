import { afterEach, describe, expect, it, vi } from 'vitest';
const driver = vi.hoisted(() => ({ createConnection: vi.fn() }));
vi.mock('mongoose', () => ({ createConnection: driver.createConnection }));
import { MongoConnection } from '../src/connection.js';

describe('worker Mongo connection lifecycle', () => {
  afterEach(async () => {
    await MongoConnection.getInstance().disconnect();
    vi.restoreAllMocks();
  });
  it('closes failed connections and exposes only safe error classification', async () => {
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    let openResource = true;
    driver.createConnection.mockReturnValue({
      asPromise: async () => { throw new Error('mongodb://user:private-password@host'); },
      close: async () => { openResource = false; },
    });
    await expect(MongoConnection.getInstance().connect()).rejects.toThrow(/^MongoDB connection failed$/);
    expect(openResource).toBe(false);
    expect(MongoConnection.getInstance().getConnection()).toBeNull();
    expect(errorLog.mock.calls.flat().map(String).join(' ')).not.toContain('private-password');
  });
  it('sanitizes asynchronous driver errors after connection succeeds', async () => {
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const listeners = new Map<string, (error?: Error) => void>();
    const connection = {
      readyState: 1,
      asPromise: async () => connection,
      close: async () => { connection.readyState = 0; },
      on: (name: string, handler: (error?: Error) => void) => { listeners.set(name, handler); },
    };
    driver.createConnection.mockReturnValue(connection);
    await MongoConnection.getInstance().connect();
    listeners.get('error')!(new Error('driver error private-password'));
    expect(errorLog.mock.calls.flat().map(String).join(' ')).not.toContain('private-password');
  });
});
