import { Provider } from 'react-redux';
import { RouterProvider } from 'react-router/dom';
import { NotificationRegion } from '@/app/notification-region';
import { createAppRouter } from '@/routing/create-app-router';
import { store } from '@/state';

const router = createAppRouter();

function App() {
  return (
    <Provider store={store}>
      <RouterProvider router={router} />
      <NotificationRegion />
    </Provider>
  );
}

export default App;
