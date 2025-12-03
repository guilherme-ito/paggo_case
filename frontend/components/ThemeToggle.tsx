'use client';

import { useTheme } from '@/lib/theme-provider';
import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Return a placeholder during SSR to avoid hydration mismatch
    return (
      <button
        className="p-2 rounded-lg bg-gray-200 dark:bg-gray-800 transition-colors"
        aria-label="Toggle theme"
        disabled
      >
        <Moon className="h-5 w-5 text-gray-700" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        console.log('Theme toggle clicked, current theme:', theme);
        toggleTheme();
        // Force a re-check after a brief delay
        setTimeout(() => {
          const htmlElement = document.documentElement;
          console.log('HTML classes after toggle:', htmlElement.classList.toString());
          console.log('Has dark class:', htmlElement.classList.contains('dark'));
        }, 100);
      }}
      className="p-2 rounded-lg bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
      aria-label="Toggle theme"
    >
      {theme === 'light' ? (
        <Moon className="h-5 w-5 text-gray-700 dark:text-gray-300" />
      ) : (
        <Sun className="h-5 w-5 text-yellow-500" />
      )}
    </button>
  );
}
