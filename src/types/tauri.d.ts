/**
 * Global declarations for Tauri Environment
 */
declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
  }
}

export {};
