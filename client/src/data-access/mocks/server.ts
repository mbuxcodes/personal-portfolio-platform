import { setupServer } from 'msw/node';
import { defaultHandlers } from './handlers';

/** The mock API for tests. Start it with `startMockServer()`. */
export const mockServer = setupServer(...defaultHandlers);
