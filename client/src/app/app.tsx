import { Provider } from 'react-redux';
import { RouterProvider } from 'react-router/dom';
import { NotificationDisplay } from '@/app/notification-display';
import { NotificationRegion } from '@/app/notification-region';
import { createAppRouter } from '@/routing/create-app-router';
import { PageErrorBoundary } from '@/shared-ui/error-boundary';
import { store } from '@/state';

const router = createAppRouter();

function App() {
  return (
    <Provider store={store}>
      <PageErrorBoundary>
        <RouterProvider router={router} />
        <NotificationDisplay />
      </PageErrorBoundary>
      <NotificationRegion />
    </Provider>
  );
}

export default App;
