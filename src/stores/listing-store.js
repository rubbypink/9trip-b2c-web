'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Client-side cache for listing page data.
 * Keys format: "{type}:page={n}:sortBy={sort}:locationId={loc}:..."
 * Persisted to sessionStorage for instant back/forward navigation.
 */
const useListingStore = create(
  persist(
    (set, get) => ({
      pages: {},

      setPageData(key, data) {
        set((state) => ({
          pages: { ...state.pages, [key]: { ...data, _cachedAt: Date.now() } },
        }));
      },

      getPageData(key) {
        const page = get().pages[key];
        if (!page) return null;
        if (Date.now() - page._cachedAt > 10 * 60 * 1000) {
          return null;
        }
        return page;
      },

      hasPageData(key) {
        const page = get().pages[key];
        if (!page) return false;
        return Date.now() - page._cachedAt <= 10 * 60 * 1000;
      },

      clearExpired() {
        const now = Date.now();
        const current = get().pages;
        const filtered = {};
        for (const [k, v] of Object.entries(current)) {
          if (now - v._cachedAt <= 10 * 60 * 1000) {
            filtered[k] = v;
          }
        }
        set({ pages: filtered });
      },
    }),
    {
      name: '9trip-listing-cache',
      getStorage: () => ({
        getItem: (key) => {
          try {
            const val = sessionStorage.getItem(key);
            return val ? JSON.parse(val) : null;
          } catch {
            return null;
          }
        },
        setItem: (key, val) => {
          try {
            sessionStorage.setItem(key, JSON.stringify(val));
          } catch {
            // quota exceeded, ignore
          }
        },
        removeItem: (key) => {
          try {
            sessionStorage.removeItem(key);
          } catch {
            // ignore
          }
        },
      }),
    }
  )
);

export default useListingStore;
