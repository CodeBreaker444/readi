'use client';

import { useTheme as useNextTheme } from 'next-themes';

export function useTheme() {
  const { theme, setTheme, systemTheme } = useNextTheme();
  
  const currentTheme = theme === 'system' ? systemTheme : theme;
  const isDark = currentTheme === 'dark';
  
  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  return { 
    theme: currentTheme, 
    isDark, 
    toggleTheme,
    setTheme 
  };
}