import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { initDatabase } from './lib/db';

/**
 * Entry point — {{PROJECT_NAME}}
 * Yumi Hub Standard Environment
 */
const startApp = async () => {
  // Initialiser SQLite uniquement dans Tauri
  if (window.__TAURI_INTERNALS__) {
    try {
      await initDatabase();
      console.log('[Main] Database ready.');
    } catch (err) {
      console.error('[Main] DB init failed:', err);
    }
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
};

startApp();
