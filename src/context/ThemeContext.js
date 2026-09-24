import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { THEME_PRESETS, getTheme } from '../theme';

const THEME_STORAGE_KEY = '@mydiary_theme_id';
const DEFAULT_THEME_ID = 'classic';

const ThemeContext = createContext({
  currentThemeId: DEFAULT_THEME_ID,
  theme: getTheme(DEFAULT_THEME_ID),
  setThemeId: () => {},
  presets: THEME_PRESETS,
});

export const ThemeProvider = ({ children }) => {
  const [currentThemeId, setCurrentThemeIdState] = useState(DEFAULT_THEME_ID);

  useEffect(() => {
    const loadSavedTheme = async () => {
      try {
        const savedId = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedId && THEME_PRESETS.some((p) => p.id === savedId)) {
          setCurrentThemeIdState(savedId);
        }
      } catch (err) {
        console.warn('Failed to load theme from AsyncStorage:', err);
      }
    };
    loadSavedTheme();
  }, []);

  const setThemeId = async (newThemeId) => {
    if (!THEME_PRESETS.some((p) => p.id === newThemeId)) return;
    setCurrentThemeIdState(newThemeId);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newThemeId);
    } catch (err) {
      console.warn('Failed to save theme to AsyncStorage:', err);
    }
  };

  const currentTheme = getTheme(currentThemeId);

  return (
    <ThemeContext.Provider
      value={{
        currentThemeId,
        theme: currentTheme,
        setThemeId,
        presets: THEME_PRESETS,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
