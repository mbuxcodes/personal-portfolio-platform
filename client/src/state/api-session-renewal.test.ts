import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { baseApi } from '@/data-access';
import { notFoundError, sessionExpiredError, unauthenticatedError } from '@/data-access/fixtures';
import { apiUrl, mockServer, recordRequests, startMockServer } from '@/data-access/mocks';
import { createAppStore } from './store';

/*
 * The whole request path, through a real store and the mock API: credentials, error
 * normalization, and session renewal (API_DESIGN.md Section 5.1, ARCHITECTURE_DESIGN.md
 * Section 6.5). The endpoints below exist only in this file. `baseApi` has none of its own.
 */
startMockServer();

const testApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    probe: builder.query<unknown, number | void>({
      query: (n) => `admin/messages?probe=${n ?? 0}`,
    }),
    missing: builder.query<unknown, void>({ query: () => 'projects/does-not-exist' }),
    refreshProbe: builder.mutation<unknown, void>({
      query: () => ({ url: 'auth/refresh', method: 'POST' }),
      invalidatesTags: [], // A test probe: it changes nothing that is cached.
    }),
  }),
});

/** An admin read that answers `SESSION_EXPIRED` until the session is renewed. */
function expireUntilRenewed(renewal: { renewed: boolean; refreshStatus?: () => Response }) {
  mockServer.use(
    http.get(apiUrl('admin/messages'), () =>
      renewal.renewed
        ? HttpResponse.json({
            data: [],
            meta: { pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 } },
          })
        : HttpResponse.json(sessionExpiredError, { status: 401 }),
    ),
    http.post(apiUrl('auth/refresh'), async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      if (renewal.refreshStatus) {
        return renewal.refreshStatus();
      }
      renewal.renewed = true;
      return new HttpResponse(null, { status: 204 });
    }),
  );
}

describe('session renewal through the store', () => {
  it('makes exactly one renewal request for 10 concurrent expired requests, then repeats each once', async () => {
    const store = createAppStore();
    const requests = recordRequests();
    expireUntilRenewed({ renewed: false });

    const results = await Promise.all(
      Array.from({ length: 10 }, (_, n) => store.dispatch(testApi.endpoints.probe.initiate(n))),
    );

    expect(requests.count('POST', 'auth/refresh')).toBe(1);
    expect(results.every((result) => result.isSuccess)).toBe(true);
    // 10 first attempts that expired, and 10 repeats after the renewal. Never a third round.
    expect(requests.count('GET', 'admin/messages')).toBe(20);
    expect(store.getState().session.status).toBe('unknown');
  });

  it('ends the session once, and never retries, when the renewal is refused', async () => {
    const store = createAppStore();
    const requests = recordRequests();
    expireUntilRenewed({
      renewed: false,
      refreshStatus: () => HttpResponse.json(sessionExpiredError, { status: 401 }),
    });

    const results = await Promise.all(
      Array.from({ length: 10 }, (_, n) => store.dispatch(testApi.endpoints.probe.initiate(n))),
    );

    expect(requests.count('POST', 'auth/refresh')).toBe(1);
    expect(requests.count('GET', 'admin/messages')).toBe(10);
    expect(store.getState().session.status).toBe('signed-out');
    for (const result of results) {
      expect(result.error).toMatchObject({ code: 'SESSION_EXPIRED', details: [] });
    }
  });

  it('treats a missing session at renewal time as the end of the session', async () => {
    const store = createAppStore();
    expireUntilRenewed({
      renewed: false,
      refreshStatus: () => HttpResponse.json(unauthenticatedError, { status: 401 }),
    });

    await store.dispatch(testApi.endpoints.probe.initiate(1));

    expect(store.getState().session.status).toBe('signed-out');
  });

  it('keeps the session when the renewal fails for a reason that says nothing about it', async () => {
    const store = createAppStore();
    const requests = recordRequests();
    expireUntilRenewed({ renewed: false, refreshStatus: () => HttpResponse.error() });

    const result = await store.dispatch(testApi.endpoints.probe.initiate(1));

    expect(result.error).toMatchObject({ code: 'NETWORK_ERROR' });
    expect(store.getState().session.status).toBe('unknown');
    expect(requests.count('POST', 'auth/refresh')).toBe(1);
    expect(requests.count('GET', 'admin/messages')).toBe(1);
  });

  it('does not loop when the server renews the session but still refuses the request', async () => {
    const store = createAppStore();
    const requests = recordRequests();
    mockServer.use(
      http.get(apiUrl('admin/messages'), () =>
        HttpResponse.json(sessionExpiredError, { status: 401 }),
      ),
    );

    const result = await store.dispatch(testApi.endpoints.probe.initiate(1));

    expect(requests.count('POST', 'auth/refresh')).toBe(1);
    expect(requests.count('GET', 'admin/messages')).toBe(2);
    expect(result.error).toMatchObject({ code: 'SESSION_EXPIRED' });
    expect(store.getState().session.status).toBe('signed-out');
  });

  it('never renews because the renewal itself expired', async () => {
    const store = createAppStore();
    const requests = recordRequests();
    mockServer.use(
      http.post(apiUrl('auth/refresh'), () =>
        HttpResponse.json(sessionExpiredError, { status: 401 }),
      ),
    );

    await store.dispatch(testApi.endpoints.refreshProbe.initiate());

    expect(requests.count('POST', 'auth/refresh')).toBe(1);
  });

  it('does not renew for an error that is not SESSION_EXPIRED', async () => {
    const store = createAppStore();
    const requests = recordRequests();
    mockServer.use(
      http.get(apiUrl('admin/messages'), () =>
        HttpResponse.json(unauthenticatedError, { status: 401 }),
      ),
    );

    const result = await store.dispatch(testApi.endpoints.probe.initiate(1));

    expect(requests.count('POST', 'auth/refresh')).toBe(0);
    expect(result.error).toMatchObject({ code: 'UNAUTHENTICATED' });
  });

  it('renews again for a later expiry, because that is a new expiry', async () => {
    const store = createAppStore();
    const requests = recordRequests();
    const renewal = { renewed: false };
    expireUntilRenewed(renewal);

    await store.dispatch(testApi.endpoints.probe.initiate(1));
    renewal.renewed = false;
    await store.dispatch(testApi.endpoints.probe.initiate(2));

    expect(requests.count('POST', 'auth/refresh')).toBe(2);
  });
});

describe('errors through the store', () => {
  it('gives features one normalized error for a contract error body', async () => {
    const store = createAppStore();

    const result = await store.dispatch(testApi.endpoints.missing.initiate());

    expect(result.error).toEqual({
      code: 'NOT_FOUND',
      message: notFoundError.error.message,
      details: [],
      requestId: notFoundError.error.requestId,
    });
  });

  it('turns a network failure into a friendly error with no request identifier', async () => {
    const store = createAppStore();
    mockServer.use(http.get(apiUrl('projects/does-not-exist'), () => HttpResponse.error()));

    const result = await store.dispatch(testApi.endpoints.missing.initiate());

    expect(result.error).toEqual({
      code: 'NETWORK_ERROR',
      message: 'We could not reach the server. Check your connection and try again.',
      details: [],
      requestId: null,
    });
    expect(JSON.stringify(result.error)).not.toMatch(/Failed to fetch|TypeError/);
  });

  it('sends credentials and asks for JSON with every request', async () => {
    const store = createAppStore();
    const realFetch = globalThis.fetch;
    const seen: Request[] = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
      seen.push(input instanceof Request ? input : new Request(input, init));
      return realFetch(input, init);
    });

    await store.dispatch(testApi.endpoints.probe.initiate(1));

    expect(seen).toHaveLength(1);
    expect(seen[0]?.credentials).toBe('include');
    expect(seen[0]?.headers.get('Accept')).toBe('application/json');
    vi.restoreAllMocks();
  });
});
