/*
 * The mock API for tests, built from the contract fixtures. For tests only. Import from
 * '@/data-access/mocks'. It is not exported by '@/data-access', so MSW never reaches the
 * production bundle.
 */
export { defaultHandlers } from './handlers';
export { mockServer } from './server';
export { apiUrl } from './urls';
export { recordRequests, startMockServer } from './start-mock-server';
export type { RecordedRequest, RequestRecorder } from './start-mock-server';
