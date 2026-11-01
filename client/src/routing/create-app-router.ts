import { createBrowserRouter } from 'react-router';
import { appRoutes } from './app-routes';

/** Creates the browser router. Call it once, at application start. */
export function createAppRouter() {
  return createBrowserRouter(appRoutes);
}
