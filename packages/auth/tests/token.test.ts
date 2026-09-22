import { describe, expect, it } from 'vitest';
import { issueTokenPair, issueAccessToken, verifyAccessToken, verifyRefreshToken } from '../src/index.js';
import type { TokenConfig } from '../src/index.js';

const config: TokenConfig = {
  accessSecret: 'access-secret-A',
  refreshSecret: 'refresh-secret-B',
  accessTtlSeconds: 900,
  refreshTtlSeconds: 604800,
  refreshRotation: false,
};

describe('token pairs', () => {
  it('issues a pair and verifies each with its own secret', async () => {
    const pair = await issueTokenPair(config, 'user-42', { tenantId: 'tenant_a', companyId: 'cmp_1', roles: ['sales'] });
    expect(pair.accessTokenExpiresInSeconds).toBe(900);
    expect(pair.refreshTokenExpiresInSeconds).toBe(604800);

    const access = await verifyAccessToken(config, pair.accessToken);
    expect(access?.sub).toBe('user-42');
    expect(access?.tenantId).toBe('tenant_a');
    expect(access?.companyId).toBe('cmp_1');
    expect(access?.roles).toEqual(['sales']);

    const refresh = await verifyRefreshToken(config, pair.refreshToken);
    expect(refresh?.sub).toBe('user-42');
    expect(refresh?.jti).toBeTruthy();
  });

  it('cannot cross-verify tokens between access and refresh secrets', async () => {
    const pair = await issueTokenPair(config, 'user-42', {});
    await expect(verifyAccessToken(config, pair.refreshToken)).resolves.toBeNull();
    await expect(verifyRefreshToken(config, pair.accessToken)).resolves.toBeNull();
  });

  it('issues access tokens with the configured TTL', async () => {
    const token = await issueAccessToken(config, 'user-7', { tenantId: 'tenant_b' });
    const payload = await verifyAccessToken(config, token);
    expect(payload?.exp - payload!.iat).toBe(900);
  });
});