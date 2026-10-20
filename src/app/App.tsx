import { BrowserRouter } from 'react-router-dom';
import { AppProvider } from './AppProvider';
import { AppRoutes } from './AppRoutes';

/** Root component: provides saved app data and routing for the whole app. */
export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppProvider>
  );
}
