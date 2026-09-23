import type { ApiClient } from './client.js';
import { ApiClientError } from './errors.js';

export interface Session {
  readonly accessToken: string;
  readonly refreshToken?: string;
  readonly tenantId: string;
  readonly sessionId: string;
  readonly user: { readonly userId: string; readonly email: string };
}

/** Native adapters encrypt the token; web adapters store only a logout tombstone. */
export interface SessionStorage {
  read(): Promise<string | null>;
  write(token: string | null): Promise<void>;
  blocked(): Promise<boolean>;
  block(value: boolean): Promise<void>;
}

export function createSessionController(options: {
  client: ApiClient;
  native: boolean;
  storage: SessionStorage;
  changed: (session: Session | null, loading: boolean, error: string | null) => void;
}) {
  let epoch = 0;
  let session: Session | null = null;
  let locallyBlocked = false;
  let tail: Promise<unknown> = Promise.resolve();
  let refreshFlight: Promise<string | null> | null = null;
  const serial = <T>(work: () => Promise<T>): Promise<T> => {
    const result = tail.then(work, work);
    tail = result.catch(() => undefined);
    return result;
  };
  const body = (token: string | null) => options.native ? { refreshToken: token } : undefined;
  const revoke = async (token: string | null) => {
    await options.client.post('/api/v1/auth/logout', body(token));
  };
  const erase = async (): Promise<boolean> => {
    const results = await Promise.allSettled([
      Promise.resolve().then(() => options.storage.block(true)),
      Promise.resolve().then(() => options.storage.write(null)),
    ]);
    return results.every((result) => result.status === 'fulfilled');
  };
  const discard = async (value: Session): Promise<void> => {
    await erase();
    try { await revoke(value.refreshToken ?? null); } catch { /* No session is exposed; logout remains fenced. */ }
  };
  const accept = async (value: Session, current: number): Promise<boolean> => {
    if (!value.accessToken || !value.tenantId || !value.sessionId || !value.user?.userId || (options.native && !value.refreshToken)) throw new Error('Invalid session response');
    if (epoch !== current) {
      await discard(value);
      return false;
    }
    try {
      await options.storage.write(value.refreshToken ?? null);
    } catch (error) {
      await discard(value);
      throw error;
    }
    if (epoch !== current) { await discard(value); return false; }
    try {
      await options.storage.block(false);
    } catch (error) {
      await discard(value);
      throw error;
    }
    if (epoch !== current) { await discard(value); return false; }
    session = value;
    locallyBlocked = false;
    options.changed(value, false, null);
    return true;
  };
  const refresh = (): Promise<string | null> => {
    if (refreshFlight) return refreshFlight;
    const current = epoch;
    refreshFlight = serial(async () => {
      try {
        if (current !== epoch || locallyBlocked || await options.storage.blocked()) return null;
        const token = await options.storage.read();
        if (options.native && !token) { options.changed(null, false, null); return null; }
        const value = await options.client.post<Session>('/api/v1/auth/refresh', body(token));
        return await accept(value, current) ? value.accessToken : null;
      } catch (error) {
        if (current === epoch) {
          let failureEpoch = current;
          if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) {
            locallyBlocked = true;
            failureEpoch = ++epoch;
            await erase();
          }
          if (failureEpoch !== epoch) return null;
          session = null;
          options.changed(null, false, error instanceof Error ? error.message : 'Session restoration failed');
        }
        return null;
      }
    }).finally(() => { refreshFlight = null; });
    return refreshFlight;
  };
  return {
    epoch: () => epoch,
    refresh,
    restore: refresh,
    login: (email: string, password: string, tenantId: string): Promise<boolean> => {
      const current = ++epoch;
      locallyBlocked = true;
      session = null;
      options.changed(null, true, null);
      return serial(async () => {
        if (current !== epoch) return false;
        try {
          await options.storage.block(true);
          await options.storage.write(null);
          if (!tenantId.trim()) throw new Error('Tenant is required');
          const value = await options.client.post<Session>('/api/v1/auth/login', { email, password }, { headers: { 'x-tenant-id': tenantId.trim() } });
          return await accept(value, current);
        } catch (error) {
          if (current === epoch) options.changed(null, false, error instanceof Error ? error.message : 'Login failed');
          return false;
        }
      });
    },
    logout: (all = false): Promise<void> => {
      const current = ++epoch;
      locallyBlocked = true;
      const previous = session;
      session = null;
      options.changed(null, false, null);
      // Persist intent immediately: an offline cookie must not restore on restart.
      const blocked = Promise.resolve().then(() => options.storage.block(true)).then(() => true, () => false);
      return serial(async () => {
        let token = previous?.refreshToken ?? null;
        let storageOk = await blocked;
        try { token = token ?? await options.storage.read(); } catch { storageOk = false; }
        storageOk = await erase() && storageOk;
        let remoteOk = true;
        if (all) {
          try {
            // Obtain a fresh access credential without restoring UI/storage: the user's old access token may have expired.
            const fresh = await options.client.post<Session>('/api/v1/auth/refresh', body(token));
            token = fresh.refreshToken ?? null;
            await options.client.post('/api/v1/auth/logout-all', undefined, {
              headers: { authorization: `Bearer ${fresh.accessToken}`, 'x-tenant-id': fresh.tenantId },
            });
          } catch { remoteOk = false; }
        }
        try { await revoke(token); } catch { remoteOk = false; }
        if (current === epoch && (!storageOk || !remoteOk)) options.changed(null, false,
          'Signed out locally.' + (!storageOk ? ' Secure logout persistence could not be confirmed.' : '') +
          (!remoteOk ? ' Server revocation could not be confirmed.' : ''));
      });
    },
  };
}
