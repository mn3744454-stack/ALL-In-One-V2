/**
 * Utility to clear all authentication-related data from the browser.
 * This helps resolve issues caused by stale session data after account deletion.
 */

export async function clearAuthData(): Promise<void> {
  // Clear localStorage keys related to Supabase/auth
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.includes('supabase') || key.includes('sb-') || key.includes('auth'))) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));

  // Clear sessionStorage keys related to Supabase/auth
  const sessionKeysToRemove: string[] = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key && (key.includes('supabase') || key.includes('sb-') || key.includes('auth'))) {
      sessionKeysToRemove.push(key);
    }
  }
  sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key));

  // Unregister all service workers
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(reg => reg.unregister()));
    } catch (e) {
      console.warn('Failed to unregister service workers:', e);
    }
  }

  // Clear cache storage
  if ('caches' in window) {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    } catch (e) {
      console.warn('Failed to clear cache storage:', e);
    }
  }
}

/**
 * Clear auth data and reload the page
 */
export async function clearAuthDataAndReload(): Promise<void> {
  await clearAuthData();
  window.location.reload();
}
