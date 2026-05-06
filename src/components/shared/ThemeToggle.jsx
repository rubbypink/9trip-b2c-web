'use client';
/**
 * ThemeToggle — Sun/Moon icon button that cycles: light → dark → system.
 */
import { useThemeStore } from '@/stores/theme-store';

export default function ThemeToggle() {
  const { theme, setTheme } = useThemeStore();
  
  const cycle = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };
  
  const icon = theme === 'dark' ? '🌙' : theme === 'light' ? '☀️' : '💻';
  const label = theme === 'dark' ? 'Dark' : theme === 'light' ? 'Light' : 'System';
  
  return (
    <button
      onClick={cycle}
      className="p-2 rounded-lg hover:bg-muted/20 transition-colors"
      aria-label={`Theme: ${label}`}
      title={`Current: ${label}. Click to switch.`}
    >
      <span className="text-lg">{icon}</span>
    </button>
  );
}
