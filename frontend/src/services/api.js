import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.180:8000/api';
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  response => response,
  error => {
    console.log('API Error:', JSON.stringify(error.response?.data));
    console.log('API Error Status:', error.response?.status);
    console.log('API Error Message:', error.message);
    return Promise.reject(error);
  }
);

export const BASE_URL = API_URL.replace(/\/api\/?$/, '');
export const STORAGE_URL = `${BASE_URL}/storage`;

export function getImageUrl(path) {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('file://')) {
    return path;
  }
  const cleanPath = path.replace(/^\//, '');
  return `${STORAGE_URL}/${cleanPath}`;
}

export default api;