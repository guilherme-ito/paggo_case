'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  const applyTheme = useCallback((newTheme: Theme) => {
    if (typeof window === 'undefined') return;
    const root = document.documentElement;
    // Remove any existing theme classes
    root.classList.remove('light', 'dark');
    // Add the new theme class
    if (newTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    root.setAttribute('data-theme', newTheme);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    setMounted(true);
    // Check localStorage or system preference
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
    const initialTheme = savedTheme || systemTheme;
    
    // Apply theme immediately
    applyTheme(initialTheme);
    setTheme(initialTheme);
    
    // Listen for storage changes (in case theme is changed in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'theme' && e.newValue) {
        const newTheme = e.newValue as Theme;
        applyTheme(newTheme);
        setTheme(newTheme);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [applyTheme]);

  const toggleTheme = useCallback(() => {
    if (typeof window === 'undefined') return;
    setTheme((currentTheme) => {
      const newTheme = currentTheme === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', newTheme);
      // Apply immediately, don't wait for state update
      applyTheme(newTheme);
      return newTheme;
    });
  }, [applyTheme]);

  // Always provide context, even before mounting
  // This prevents the "must be used within ThemeProvider" error
  const contextValue = {
    theme,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
