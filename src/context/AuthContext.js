import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  async function loadStoredAuth() {
    try {
      const storedToken = await AsyncStorage.getItem('token');
      const storedUser = await AsyncStorage.getItem('user');
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.log('Error loading auth:', error);
    } finally {
      setLoading(false);
    }
  }

  async function login(email, password) {
    const response = await api.post('/login', { email, password });
    const { token, user } = response.data;
    await AsyncStorage.setItem('token', token);
    await AsyncStorage.setItem('user', JSON.stringify(user));
    setToken(token);
    setUser(user);
    return response.data;
  }

  async function register(name, email, password, password_confirmation) {
    const response = await api.post('/register', {
      name, email, password, password_confirmation
    });
    return response.data;
  }

  async function logout() {
    try {
      await api.post('/logout');
    } catch (error) {
      console.log('Logout error:', error);
    }
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
    setToken(null);
    setUser(null);
  }

  async function updateUser(updatedUser) {
    await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  }

  return (
    <AuthContext.Provider value={{ user, setUser, token, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}