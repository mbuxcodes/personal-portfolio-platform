import { describe, expect, expectTypeOf, it } from 'vitest';
import { normalizeError } from '../errors/normalize-error';
import { apiUrl, startMockServer } from '../mocks';
import type { ItemResponse } from '../types/common';
import type { ErrorResponse } from '../types/errors';
import type { PublicSettings } from '../types/public';
import * as fixtures from './index';
import { errorFixtures, publicSettingsResponse } from './index';

startMockServer();

/*
 * Every fixture is declared with `satisfies <contract type>`, so a fixture that stops matching
 * the contract fails `npm run type-check`. The checks below prove that this protection is really
 * on, and that the fixtures behave as the contract says when they travel the whole way.
 */
describe('contract fixtures', () => {
  it('are typed against the contract', () => {
    expectTypeOf(publicSettingsResponse).toExtend<ItemResponse<PublicSettings>>();

    // A fixture with a field the contract does not have must not compile.
    const invalid = {
      // @ts-expect-error `invented` is not in the contract.
      data: { ...publicSettingsResponse.data, invented: true },
    } satisfies ItemResponse<PublicSettings>;
    expect(invalid.data.invented).toBe(true);

    // @ts-expect-error a code that is not in the contract is refused.
    const wrongCode: ErrorResponse = { error: { code: 'MADE_UP', message: 'x', requestId: 'r' } };
    expect(wrongCode).toBeDefined();
  });

  it('exports a non-empty set of examples', () => {
    expect(Object.keys(fixtures).length).toBeGreaterThanOrEqual(30);
  });

  it.each(errorFixtures)(
    'normalizes the contract error $name to the one client shape',
    ({ body }) => {
      const error = normalizeError({ status: 400, data: body });

      expect(error.code).toBe(body.error.code);
      expect(error.requestId).toBe(body.error.requestId);
      expect(error.details).toEqual('details' in body.error ? body.error.details : []);
    },
  );

  it('are served unchanged by the mock API', async () => {
    const response = await fetch(apiUrl('settings'));

    expect(await response.json()).toEqual(publicSettingsResponse);
  });

  it('are not answered for an endpoint the contract gives no example for', async () => {
    await expect(fetch(apiUrl('articles/some-article'))).rejects.toThrow();
  });
});
