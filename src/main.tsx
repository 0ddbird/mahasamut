import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import './fonts';
import './styles/tokens.scss';
import './styles/base.scss';
import './styles/fonts.scss';
import App from './App.tsx';
import { ErrorBoundary } from './monitoring/ErrorBoundary';
import { ErrorFallback } from './monitoring/ErrorFallback';
import { initMonitoring, siteDsn } from './monitoring/sentry';

initMonitoring({
  dsn: siteDsn(),
  release: import.meta.env.VITE_SENTRY_RELEASE || undefined,
  mode: import.meta.env.MODE,
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      {/* The boundary does not depend on the monitoring being on: without it, a render error leaves a blank page. */}
      <ErrorBoundary fallback={<ErrorFallback />}>
        <App />
      </ErrorBoundary>
    </BrowserRouter>
  </StrictMode>,
);
