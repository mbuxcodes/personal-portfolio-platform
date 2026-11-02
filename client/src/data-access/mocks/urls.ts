import { resolveApiBaseUrl } from '../api/api-config';

/**
 * The absolute address of an API path, for mock handlers: `apiUrl('settings')` is
 * `http://localhost:3000/api/v1/settings` in the test browser. Handlers use the full address, so
 * they match what the base query really sends.
 */
export function apiUrl(path: string): string {
  return `${resolveApiBaseUrl()}/${path.replace(/^\/+/, '')}`;
}
