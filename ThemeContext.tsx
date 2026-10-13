// App-wide theme state. The chosen theme is saved on the device so it sticks between launches.
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { themes, Theme } from './theme';

const STORAGE_KEY = 'theme_name';
const DEFAULT_THEME = 'light';
const DARK_THEMES = ['dark']; // themes that need light status-bar text

type ThemeContextValue = {
  theme: Theme;
  themeName: string;
  isDark: boolean;
  setThemeName: (name: string) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function useThemeContext() {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return value;
}

// Just the colors. Use this in screens: const theme = useTheme();
export const useTheme = () => useThemeContext().theme;

// Colors plus the controls for changing them. Use this on the Appearance screen.
export const useThemeSettings = () => useThemeContext();

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeName, setThemeNameState] = useState(DEFAULT_THEME);
  const [loaded, setLoaded] = useState(false);

  // Load the saved choice once on startup.
  useEffect(() => {
    SecureStore.getItemAsync(STORAGE_KEY)
      .then((saved) => {
        if (saved && themes[saved]) setThemeNameState(saved);
      })
      .catch(() => {}) // fall back to the default theme
      .finally(() => setLoaded(true));
  }, []);

  const setThemeName = (name: string) => {
    if (!themes[name]) return;
    setThemeNameState(name);
    SecureStore.setItemAsync(STORAGE_KEY, name).catch(() => {});
  };

  // Wait for the saved theme so the app doesn't flash the default colors first.
  if (!loaded) return null;

  return (
    <ThemeContext.Provider
      value={{ theme: themes[themeName], themeName, isDark: DARK_THEMES.includes(themeName), setThemeName }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
