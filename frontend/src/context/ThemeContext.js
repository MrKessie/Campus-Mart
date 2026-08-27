import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_KEY = '@campusmart_theme';

export const lightColors = {
  bg: '#F5F5F5',
  cardBg: '#FFFFFF',
  text: '#333333',
  subText: '#666666',
  subTextLight: '#999999',
  border: '#EEEEEE',
  borderDark: '#DDDDDD',
  primary: '#FF6600',
  primaryLight: '#FFF1E6',
  headerBg: '#FF6600',
  headerText: '#FFFFFF',
  inputBg: '#FFFFFF',
  bannerBg: '#1E3A5F',
  accent: '#1E3A5F',
  isDark: false,
};

export const darkColors = {
  bg: '#121212',
  cardBg: '#1E1E1E',
  text: '#F5F5F5',
  subText: '#B0B0B0',
  subTextLight: '#757575',
  border: '#2C2C2C',
  borderDark: '#383838',
  primary: '#FF6600',
  primaryLight: '#2C1A0E',
  headerBg: '#1A1A1A',
  headerText: '#FF6600',
  inputBg: '#2A2A2A',
  bannerBg: '#0D1B2A',
  accent: '#3A6073',
  isDark: true,
};

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    loadTheme();
  }, []);

  async function loadTheme() {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_KEY);
      if (savedTheme) {
        setTheme(savedTheme);
      }
    } catch (e) {
      console.log('Error loading theme:', e);
    }
  }

  async function toggleTheme() {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    try {
      await AsyncStorage.setItem(THEME_KEY, newTheme);
    } catch (e) {
      console.log('Error saving theme:', e);
    }
  }

  const colors = theme === 'dark' ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ theme, isDark: theme === 'dark', toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      theme: 'light',
      isDark: false,
      toggleTheme: () => {},
      colors: lightColors,
    };
  }
  return context;
}
