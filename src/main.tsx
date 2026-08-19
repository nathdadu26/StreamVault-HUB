import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

// Safe handling for third-party / cross-origin script errors
if (typeof window !== 'undefined') {
  window.addEventListener(
    'error',
    (event) => {
      if (
        event.message === 'Script error.' ||
        event.message?.includes('Script error') ||
        (!event.filename && !event.lineno)
      ) {
        event.preventDefault?.();
        event.stopImmediatePropagation?.();
      }
    },
    true,
  );

  window.addEventListener(
    'unhandledrejection',
    (event) => {
      if (
        event.reason &&
        typeof event.reason === 'string' &&
        event.reason.includes('Script error')
      ) {
        event.preventDefault?.();
        event.stopImmediatePropagation?.();
      }
    },
    true,
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

