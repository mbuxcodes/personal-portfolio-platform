import { RouterProvider } from 'react-router/dom';
import { createAppRouter } from '@/routing/create-app-router';

const router = createAppRouter();

function App() {
  return <RouterProvider router={router} />;
}

export default App;
