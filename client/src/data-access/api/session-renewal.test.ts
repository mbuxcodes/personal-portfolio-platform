import { describe, expect, it, vi } from 'vitest';
import { createSessionRenewal, type RenewalResult } from './session-renewal';

/** A promise that a test settles by hand. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe('createSessionRenewal', () => {
  it('starts with nothing finished', () => {
    const renewal = createSessionRenewal();

    expect(renewal.epoch).toBe(0);
    expect(renewal.lastResult).toBeNull();
  });

  it('runs one attempt for any number of concurrent callers, and gives all the same result', async () => {
    const renewal = createSessionRenewal();
    const gate = deferred<RenewalResult>();
    const attempt = vi.fn(() => gate.promise);

    const callers = Array.from({ length: 25 }, () => renewal.renew(attempt));
    gate.resolve({ status: 'renewed' });
    const results = await Promise.all(callers);

    expect(attempt).toHaveBeenCalledTimes(1);
    expect(results).toHaveLength(25);
    expect(results.every((result) => result.status === 'renewed')).toBe(true);
  });

  it('records the result and advances the epoch before any caller continues', async () => {
    const renewal = createSessionRenewal();
    const seen: { epoch: number; status: string | undefined }[] = [];

    const result = renewal.renew(() => Promise.resolve({ status: 'ended' }));
    void result.then(() => {
      seen.push({ epoch: renewal.epoch, status: renewal.lastResult?.status });
    });
    await result;

    expect(seen).toEqual([{ epoch: 1, status: 'ended' }]);
  });

  it('starts a new attempt for a caller that arrives after the first finished', async () => {
    const renewal = createSessionRenewal();
    const attempt = vi.fn(() => Promise.resolve<RenewalResult>({ status: 'renewed' }));

    await renewal.renew(attempt);
    await renewal.renew(attempt);

    expect(attempt).toHaveBeenCalledTimes(2);
    expect(renewal.epoch).toBe(2);
  });

  it('turns an attempt that throws into "unavailable" and keeps working', async () => {
    const renewal = createSessionRenewal();

    const failed = await renewal.renew(() => Promise.reject(new Error('secret internals')));
    const next = await renewal.renew(() => Promise.resolve({ status: 'renewed' }));

    expect(failed).toMatchObject({ status: 'unavailable', error: { code: 'UNKNOWN_ERROR' } });
    expect(JSON.stringify(failed)).not.toContain('secret');
    expect(next.status).toBe('renewed');
  });
});
