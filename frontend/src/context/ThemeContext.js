import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_KEY = '@campusmart_theme';

export const lightColors = {
  bg: '#F8FAFC',
  cardBg: '#FFFFFF',
  text: '#0F172A',
  subText: '#475569',
  subTextLight: '#94A3B8',
  border: '#E2E8F0',
  borderDark: '#CBD5E1',
  primary: '#FF6600',
  primaryLight: '#FFF3EB',
  headerBg: '#FF6600',
  headerText: '#FFFFFF',
  inputBg: '#F1F5F9',
  bannerBg: '#0F172A',
  accent: '#1E3A5F',
  success: '#10B981',
  successLight: '#ECFDF5',
  cardShadow: 'rgba(0, 0, 0, 0.06)',
  isDark: false,
};

export const darkColors = {
  bg: '#0B0F17',
  cardBg: '#161E2E',
  text: '#F8FAFC',
  subText: '#94A3B8',
  subTextLight: '#64748B',
  border: '#1E293B',
  borderDark: '#334155',
  primary: '#FF6600',
  primaryLight: '#2A170A',
  headerBg: '#111827',
  headerText: '#FF6600',
  inputBg: '#1E293B',
  bannerBg: '#0B132B',
  accent: '#38BDF8',
  success: '#10B981',
  successLight: '#064E3B',
  cardShadow: 'rgba(0, 0, 0, 0.4)',
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
