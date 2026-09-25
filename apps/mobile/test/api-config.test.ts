import { describe, expect, it, beforeEach, vi } from 'vitest';
import { configureApi, getApiBaseUrl, authClient } from '../src/services/api-config';

describe('mobile api-config & authClient dynamic URL initialization', () => {
  beforeEach(() => {
    // Reset to default emulator URL
    configureApi('http://10.0.2.2:3000');
  });

  it('provides the default Android emulator base URL initially', () => {
    expect(getApiBaseUrl()).toBe('http://10.0.2.2:3000');
  });

  it('updates the base URL when configureApi is called from native startup', () => {
    configureApi('http://192.168.1.50:3000');
    expect(getApiBaseUrl()).toBe('http://192.168.1.50:3000');
  });

  it('strips trailing slashes from the configured base URL', () => {
    configureApi('https://api.erp.domain.com///');
    expect(getApiBaseUrl()).toBe('https://api.erp.domain.com');
  });

  it('rejects invalid or non-absolute URLs', () => {
    expect(() => configureApi('invalid-url')).toThrow('An absolute API URL is required');
    expect(() => configureApi('ftp://10.0.2.2:3000')).toThrow('An absolute API URL is required');
  });

  it('dynamically evaluates the updated URL when authClient makes requests', async () => {
    const createMockResponse = () =>
      new Response(JSON.stringify({ status: 'ok', data: { status: 'healthy' } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(createMockResponse())
    );

    try {
      // 1. First request with default URL
      await authClient.get('/api/v1/health');
      expect(fetchSpy).toHaveBeenLastCalledWith(
        'http://10.0.2.2:3000/api/v1/health',
        expect.objectContaining({ method: 'GET' })
      );

      // 2. Reconfigure URL dynamically (simulating NativeModules startup or host change)
      configureApi('http://192.168.1.100:8080');

      // 3. Second request must use the new base URL dynamically
      await authClient.get('/api/v1/health');
      expect(fetchSpy).toHaveBeenLastCalledWith(
        'http://192.168.1.100:8080/api/v1/health',
        expect.objectContaining({ method: 'GET' })
      );
    } finally {
      fetchSpy.mockRestore();
    }
  });
});
