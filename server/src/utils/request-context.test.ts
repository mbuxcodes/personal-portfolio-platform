import type { Response } from 'express';
import { describe, expect, it } from 'vitest';
import { createRequestId, getRequestContext, setRequestContext } from '#utils/request-context';
import { createMemoryLogger } from '../../test/memory-logger.js';

const fakeResponse = (): Response => ({ locals: {} }) as unknown as Response;

describe('createRequestId', () => {
  it('has the form req_ followed by 16 hexadecimal characters', () => {
    expect(createRequestId()).toMatch(/^req_[0-9a-f]{16}$/);
  });

  it('is different every time', () => {
    const ids = new Set(Array.from({ length: 5000 }, () => createRequestId()));

    expect(ids.size).toBe(5000);
  });
});

describe('request context', () => {
  it('is stored on the response and read back', () => {
    const response = fakeResponse();
    const { logger } = createMemoryLogger();

    setRequestContext(response, { requestId: 'req_1', logger });

    expect(getRequestContext(response)).toEqual({ requestId: 'req_1', logger });
  });

  it('is undefined when nothing set it', () => {
    expect(getRequestContext(fakeResponse())).toBeUndefined();
  });
});
