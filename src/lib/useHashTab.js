import { useState, useCallback, useEffect } from 'react';

/**
 * useHashTab — Syncs active tab state with window.location.hash.
 * Reads initial hash via lazy useState (SSR-safe), updates URL on tab change,
 * and listens to popstate for browser back/forward navigation.
 *
 * @param {{ id: string, label: string }[]} tabs — Array of tab definitions with id and label.
 * @param {string} [defaultTab='overview'] — Fallback tab when hash is missing or invalid.
 * @returns {[string, (tabId: string) => void]} — [activeTab, setActiveTab] tuple.
 * @updated 2026-05-14
 */
export function useHashTab(tabs, defaultTab = 'overview') {
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '');
      if (hash && tabs.some((t) => t.id === hash)) return hash;
    }
    return defaultTab;
  });

  const handleTabChange = useCallback(
    (tabId) => {
      setActiveTab(tabId);
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', `#${tabId}`);
      }
    },
    [],
  );

  useEffect(() => {
    const syncFromHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash && tabs.some((t) => t.id === hash)) {
        setActiveTab(hash);
      }
    };
    syncFromHash();
    window.addEventListener('popstate', syncFromHash);
    return () => window.removeEventListener('popstate', syncFromHash);
  }, [tabs]);

  return [activeTab, handleTabChange];
}
