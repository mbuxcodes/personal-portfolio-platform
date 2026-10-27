import { describe, expect, it } from 'vitest';
import { InvalidSettingsError, readBootstrapSettings } from '#config/bootstrap-settings';

describe('readBootstrapSettings', () => {
  it('uses the defaults when nothing is set', () => {
    expect(readBootstrapSettings({})).toEqual({
      port: 5000,
      trustProxyHops: 0,
      shutdownTimeoutMs: 10_000,
    });
  });

  it('reads valid values, converting the shutdown limit to milliseconds', () => {
    const settings = readBootstrapSettings({
      PORT: '8080',
      TRUST_PROXY_HOPS: '2',
      SHUTDOWN_TIMEOUT_SECONDS: '30',
    });

    expect(settings).toEqual({ port: 8080, trustProxyHops: 2, shutdownTimeoutMs: 30_000 });
  });

  it('treats an empty value as not set', () => {
    expect(readBootstrapSettings({ PORT: '' }).port).toBe(5000);
  });

  it('accepts port 0 and the limits of each range', () => {
    expect(readBootstrapSettings({ PORT: '0' }).port).toBe(0);
    expect(readBootstrapSettings({ PORT: '65535' }).port).toBe(65535);
    expect(readBootstrapSettings({ TRUST_PROXY_HOPS: '10' }).trustProxyHops).toBe(10);
    expect(readBootstrapSettings({ SHUTDOWN_TIMEOUT_SECONDS: '1' }).shutdownTimeoutMs).toBe(1000);
    expect(readBootstrapSettings({ SHUTDOWN_TIMEOUT_SECONDS: '120' }).shutdownTimeoutMs).toBe(
      120_000,
    );
  });

  it.each([
    ['PORT', '65536'],
    ['PORT', 'abc'],
    ['PORT', '-1'],
    ['PORT', '80.5'],
    ['TRUST_PROXY_HOPS', '11'],
    ['TRUST_PROXY_HOPS', 'true'],
    ['SHUTDOWN_TIMEOUT_SECONDS', '0'],
    ['SHUTDOWN_TIMEOUT_SECONDS', '121'],
  ])('rejects %s=%s', (name, value) => {
    expect(() => readBootstrapSettings({ [name]: value })).toThrow(InvalidSettingsError);
  });

  it('names every invalid variable and never shows a value', () => {
    const secretLooking = 'not-a-number-s3cr3t';

    try {
      readBootstrapSettings({ PORT: secretLooking, TRUST_PROXY_HOPS: '99' });
      expect.unreachable('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidSettingsError);
      const failure = error as InvalidSettingsError;
      expect(failure.variables).toEqual(['PORT', 'TRUST_PROXY_HOPS']);
      expect(failure.message).not.toContain(secretLooking);
      expect(failure.message).not.toContain('99');
    }
  });
});
