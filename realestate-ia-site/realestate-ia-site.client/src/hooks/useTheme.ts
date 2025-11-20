import { useEffect } from 'react';

/**
 * Hook to apply theme on app mount
 * Reads theme from localStorage and applies it to the document root
 */
export function useTheme() {
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const root = document.documentElement;
    
    if (savedTheme === 'dark') {
      root.classList.add('dark');
    } else {
      // Default to light theme
      root.classList.remove('dark');
      if (!savedTheme) {
        localStorage.setItem('theme', 'light');
      }
    }
  }, []);
}
