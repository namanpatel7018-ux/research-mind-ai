import React, { useCallback, useEffect, useState } from 'react';
import { Theme, ResolvedTheme, ThemeContext } from './ThemeContext';
import { updateUserSettings } from '../lib/api';

const STORAGE_KEY = 'theme';

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (saved === 'dark' || saved === 'light' || saved === 'system') {
      return saved;
    }
  } catch (e) {
    console.warn('Could not read theme from localStorage:', e);
  }
  return 'dark';
}

function applyThemeClasses(resolved: ResolvedTheme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.remove('dark', 'light');
  root.classList.add(resolved);
  root.dataset.theme = resolved;
  root.style.colorScheme = resolved;

  if (document.body) {
    document.body.classList.remove('dark', 'light');
    document.body.classList.add(resolved);
    document.body.dataset.theme = resolved;
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemTheme);

  // Synchronize OS preferences
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const updateFromOS = () => {
      const detected = media.matches ? 'dark' : 'light';
      setSystemTheme(detected);
    };

    if (media.addEventListener) {
      media.addEventListener('change', updateFromOS);
    } else if ((media as any).addListener) {
      (media as any).addListener(updateFromOS);
    }

    window.addEventListener('focus', updateFromOS);

    return () => {
      if (media.removeEventListener) {
        media.removeEventListener('change', updateFromOS);
      } else if ((media as any).removeListener) {
        (media as any).removeListener(updateFromOS);
      }
      window.removeEventListener('focus', updateFromOS);
    };
  }, []);

  const resolvedTheme: ResolvedTheme = theme === 'system' ? systemTheme : theme;

  // Keep DOM in sync on mount and on resolvedTheme change
  useEffect(() => {
    applyThemeClasses(resolvedTheme);
  }, [resolvedTheme]);

  const setTheme = useCallback((newTheme: Theme) => {
    const resolved: ResolvedTheme = newTheme === 'system' ? getSystemTheme() : newTheme;
    
    // Apply synchronously to DOM immediately for zero-lag response
    applyThemeClasses(resolved);

    // Update React state
    setThemeState(newTheme);

    // Save locally
    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
    } catch (e) {
      console.warn('Failed to save theme to localStorage:', e);
    }

    // Broadcast change for non-React listeners
    try {
      window.dispatchEvent(new CustomEvent('theme:changed', { detail: { theme: newTheme, resolvedTheme: resolved } }));
    } catch (e) {}

    // Persist to user profile in background
    updateUserSettings({ theme: newTheme }).catch(() => {});
  }, []);

  const toggleTheme = useCallback(() => {
    const next: ResolvedTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  }, [resolvedTheme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, systemTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
