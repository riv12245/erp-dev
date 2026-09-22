import { describe, expect, it } from 'vitest';
import { signToken, verifyToken, decodeToken } from '../src/index.js';
import { createHmac } from 'node:crypto';

const SECRET = 'unit-test-secret-0123456789abcdef';

describe('JWT (HS256)', () => {
  it('rejects signed tokens with invalid headers and malformed claims', async () => {
    const now = Math.floor(Date.now() / 1000);
    for (const [header, payload] of [
      [{ alg: 'none', typ: 'JWT' }, { sub: 'u', iat: now, exp: now + 60 }],
      [{ alg: 'HS256', typ: 'JWT' }, { sub: 12, iat: now, exp: now + 60 }],
      [{ alg: 'HS256', typ: 'JWT' }, { sub: 'u', iat: now, exp: now + 60, roles: 'ADMIN' }],
      [{ alg: 'HS256', typ: 'JWT' }, { sub: 'u', iat: now, exp: now + 60, tenantId: {} }],
    ]) {
      const data = `${Buffer.from(JSON.stringify(header)).toString('base64url')}.${Buffer.from(JSON.stringify(payload)).toString('base64url')}`;
      const token = `${data}.${createHmac('sha256', SECRET).update(data).digest('base64url')}`;
      expect((await verifyToken(token, SECRET)) === null).toBe(true);
    }
  });
  it('signs and verifies a token', async () => {
    const token = await signToken({ sub: 'user-1', roles: ['admin'] }, SECRET, 3600);
    const payload = await verifyToken(token, SECRET);
    expect(payload?.sub).toBe('user-1');
    expect(payload?.roles).toEqual(['admin']);
    expect(payload?.exp).toBe(payload!.iat + 3600);
  });

  it('rejects a tampered signature', async () => {
    const token = await signToken({ sub: 'user-1' }, SECRET, 3600);
    const [header, body] = token.split('.');
    const tampered = `${header}.${body}.AAAA`;
    await expect(verifyToken(tampered, SECRET)).resolves.toBeNull();
  });

  it('rejects a token signed with a different secret', async () => {
    const token = await signToken({ sub: 'user-1' }, 'secret-a', 3600);
    await expect(verifyToken(token, 'secret-b')).resolves.toBeNull();
  });

  it('rejects an expired token', async () => {
    const token = await signToken({ sub: 'user-1' }, SECRET, -10);
    await expect(verifyToken(token, SECRET)).resolves.toBeNull();
  });

  it('cannot verify a malformed token', async () => {
    await expect(verifyToken('not-a-jwt', SECRET)).resolves.toBeNull();
    await expect(verifyToken('a.b', SECRET)).resolves.toBeNull();
  });

  it('decodes without verifying (introspection only)', async () => {
    const token = await signToken({ sub: 'user-1', tenantId: 't1' }, SECRET, 3600);
    const payload = decodeToken(token);
    expect(payload?.sub).toBe('user-1');
    expect(payload?.tenantId).toBe('t1');
  });
});
