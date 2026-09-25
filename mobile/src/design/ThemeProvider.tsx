import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { Appearance } from 'react-native';

import { darkTheme, Theme, themes } from './tokens';

const THEME_PREFERENCE_KEY = '@bearing/theme-preference';

export type ThemePreference = keyof typeof themes;

type ThemeContextValue = {
  theme: Theme;
  preference: ThemePreference;
  isHydrated: boolean;
  setPreference: (preference: ThemePreference) => Promise<void>;
};

const defaultThemeContext: ThemeContextValue = {
  theme: darkTheme,
  preference: 'dark',
  isHydrated: true,
  setPreference: async () => undefined,
};

const ThemeContext = createContext<ThemeContextValue>(defaultThemeContext);

type ThemeProviderProps = {
  children: ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [preference, setPreferenceState] = useState<ThemePreference>('dark');
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    Appearance.setColorScheme(preference);
  }, [preference]);

  useEffect(() => {
    let isMounted = true;

    void AsyncStorage.getItem(THEME_PREFERENCE_KEY)
      .then((storedPreference) => {
        if (isMounted && (storedPreference === 'dark' || storedPreference === 'light')) {
          setPreferenceState(storedPreference);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsHydrated(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const setPreference = async (nextPreference: ThemePreference): Promise<void> => {
    setPreferenceState(nextPreference);
    await AsyncStorage.setItem(THEME_PREFERENCE_KEY, nextPreference);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme: themes[preference],
        preference,
        isHydrated,
        setPreference,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
