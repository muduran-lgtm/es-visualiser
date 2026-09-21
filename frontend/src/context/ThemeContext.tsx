import React, { createContext, useContext, useState, useEffect } from 'react';

interface ThemeContextType {
  isDarkTheme: boolean;
  toggleTheme: () => void;
  setTheme: (dark: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  isDarkTheme: true,
  toggleTheme: () => {},
  setTheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDarkTheme, setIsDarkTheme] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('panoptext_theme');
      if (saved) {
        return saved === 'dark';
      }
    } catch {
      // Fallback
    }
    return true; // Default to dark theme
  });

  useEffect(() => {
    try {
      localStorage.setItem('panoptext_theme', isDarkTheme ? 'dark' : 'light');
    } catch {
      // Ignore
    }

    if (isDarkTheme) {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
      document.body.style.backgroundColor = '#121316';
      document.body.style.color = '#e1e2e6';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      document.body.style.backgroundColor = '#f8fafc';
      document.body.style.color = '#0f172a';
    }
  }, [isDarkTheme]);

  const toggleTheme = () => setIsDarkTheme(prev => !prev);
  const setTheme = (dark: boolean) => setIsDarkTheme(dark);

  return (
    <ThemeContext.Provider value={{ isDarkTheme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
