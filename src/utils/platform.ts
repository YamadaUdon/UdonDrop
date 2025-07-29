/**
 * Check if the app is running in Tauri environment
 */
export const isTauri = () => {
  if (typeof window === 'undefined') return false;
  
  // Multiple checks for Tauri environment
  const hasTauriGlobal = ('__TAURI__' in window) || ('__TAURI_INTERNALS__' in window);
  const isTauriUserAgent = typeof navigator !== 'undefined' && navigator.userAgent.includes('Tauri');
  const hasTauriAPI = typeof window !== 'undefined' && 
    (window as any).__TAURI_INTERNALS__ !== undefined;
    
  // Check if running in webpack dev server (browser development)
  const isWebpackDev = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') &&
    window.location.port === '1420' &&
    !hasTauriGlobal;
  
  // Return true only if we detect Tauri and not in webpack dev mode
  return (hasTauriGlobal || isTauriUserAgent || hasTauriAPI) && !isWebpackDev;
};

/**
 * Check if the app is running in a web browser
 */
export const isBrowser = () => {
  return typeof window !== 'undefined' && !('__TAURI__' in window);
};