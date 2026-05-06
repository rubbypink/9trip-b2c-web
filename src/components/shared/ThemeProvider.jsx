'use client';
/**
 * ThemeProvider — Syncs theme store to <html> class and listens to system preference changes.
 */
import { useEffect } from 'react';
import { useThemeStore } from '@/stores/theme-store';

export default function ThemeProvider({ children }) {
  const { theme, getResolvedTheme } = useThemeStore();
  
  useEffect(() => {
    const resolved = getResolvedTheme();
    const root = document.documentElement;
    
    if (resolved === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme, getResolvedTheme]);
  
  useEffect(() => {
    if (theme !== 'system') return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = () => {
      const root = document.documentElement;
      if (mediaQuery.matches) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);
  
  return children;
}
