/**
 * Theme store — Zustand with localStorage persistence.
 * Supports 'light', 'dark', and 'system' modes.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useThemeStore = create(
  persist(
    (set, get) => ({
      theme: 'system',
      
      setTheme: (theme) => set({ theme }),
      
      getResolvedTheme: () => {
        const { theme } = get();
        if (theme === 'system') {
          if (typeof window !== 'undefined') {
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
          }
          return 'light';
        }
        return theme;
      },
    }),
    { name: '9trip-theme' }
  )
);
