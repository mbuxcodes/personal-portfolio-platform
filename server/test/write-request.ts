import type { Express } from 'express';
import request from 'supertest';

export type WriteMethod = 'post' | 'put' | 'patch' | 'delete';
export type HttpMethod = WriteMethod | 'get' | 'head' | 'options';

/**
 * Starts a request with a method chosen at run time.
 *
 * The method lookup lives in its own short statement on purpose. Written inline as
 * `request(app)[method](path).set(...)`, Prettier moves `[method]` onto its own line, and ESLint
 * then reports `no-unexpected-multiline`. Here the lookup cannot be split, and the caller chains
 * `.send()`, `.set()` and `.expect()` on the result.
 */
export function requestWith(app: Express, method: HttpMethod, path: string) {
  const agent = request(app);
  return agent[method](path);
}
