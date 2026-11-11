import { createRoot } from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { missingRuntime } from './i18n';
import { getAppStore } from './store/gameStore';
import './index.css';

// StrictMode is intentionally not used: its double-invoked effects would replay the
// gacha animation lifecycle in development. Production behaviour is identical either way.
// Debug hooks for the browser console (also used by the automated screenshot checks).
Object.assign(window, { __i18nMissing: missingRuntime, __samStore: getAppStore() });

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
