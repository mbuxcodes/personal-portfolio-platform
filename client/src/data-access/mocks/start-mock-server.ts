import { mockServer } from './server';

export interface RecordedRequest {
  method: string;
  /** The path below the API base, without a query string: `auth/refresh`. */
  path: string;
  /** The query string as sent, without the `?`. */
  search: string;
}

export interface RequestRecorder {
  /** Every request seen so far, in order. */
  all: () => readonly RecordedRequest[];
  /** How many requests had this method and path. */
  count: (method: string, path: string) => number;
}

/**
 * Starts the mock API for the test file that calls it, and cleans up after each test:
 *
 * - a request that no handler answers FAILS the test (`onUnhandledFrame: 'error'`), so a test
 *   can never pass by quietly reaching for something that is not in the contract;
 * - handlers a test added with `mockServer.use(...)` are removed after that test.
 *
 * Call it once, at the top of the test file.
 */
export function startMockServer(): void {
  beforeAll(() => {
    mockServer.listen({ onUnhandledFrame: 'error' });
  });

  afterEach(() => {
    mockServer.resetHandlers();
  });

  afterAll(() => {
    mockServer.close();
  });
}

/**
 * Records the requests the mock API receives while it is running. Call it inside a test.
 * The recording stops when the test ends.
 */
export function recordRequests(): RequestRecorder {
  const seen: RecordedRequest[] = [];
  const apiPrefix = '/api/v1/';

  const onRequest = ({ request }: { request: Request }) => {
    const url = new URL(request.url);
    seen.push({
      method: request.method,
      path: url.pathname.startsWith(apiPrefix)
        ? url.pathname.slice(apiPrefix.length)
        : url.pathname,
      search: url.search.replace(/^\?/, ''),
    });
  };

  mockServer.events.on('request:start', onRequest);
  onTestFinished(() => {
    mockServer.events.removeListener('request:start', onRequest);
  });

  return {
    all: () => seen,
    count: (method, path) =>
      seen.filter((request) => request.method === method.toUpperCase() && request.path === path)
        .length,
  };
}
