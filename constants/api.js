// const/api.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ⚠️ REPLACE THIS WITH YOUR COMPUTER'S LOCAL WI-FI IP ADDRESS!
// Example: 'http://192.168.1.15:3001/api'
const BASE_URL = 'https://vtm.back.miketsak.gr/api'; 

const api = axios.create({
  baseURL: BASE_URL,
});

// Automatically attach the token to every request
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export { BASE_URL };
export default api;