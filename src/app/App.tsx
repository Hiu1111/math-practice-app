import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from './AppRoutes';

/** Root component: provides routing for the whole app. */
export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
