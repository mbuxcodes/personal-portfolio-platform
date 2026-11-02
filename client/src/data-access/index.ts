/*
 * The public surface of the data-access layer. Import from '@/data-access', never from a file
 * inside it. Fixtures and the mock server are for tests and are deliberately not exported here,
 * so they can never reach the production bundle.
 */
export { baseApi } from './api/base-api';
export {
  API_BASE_PATH,
  API_REQUEST_TIMEOUT_MS,
  CACHE_FRESHNESS,
  SESSION_RENEWAL_PATH,
} from './api/api-config';
export { createRenewingBaseQuery } from './api/base-query';
export type { ApiBaseQuery } from './api/base-query';
export type { DataAccessExtra } from './api/data-access-extra';
export { unwrapItem, unwrapList, unwrapPage } from './api/response-helpers';
export type { Page } from './api/response-helpers';

export { isApiError, normalizeError } from './errors/normalize-error';
export {
  getFieldError,
  mapFieldErrors,
  parseFieldPath,
  toFormErrorEntries,
  toFormPath,
} from './errors/field-error-mapper';
export type {
  FieldError,
  FieldPathSegment,
  FormErrorEntry,
  MappedFieldErrors,
} from './errors/field-error-mapper';

export { DASHBOARD_TAG, TAG_TYPES, itemTag, listTag, providesList, staleAfterWrite } from './tags';
export type { TagType } from './tags';

export * from './types';
