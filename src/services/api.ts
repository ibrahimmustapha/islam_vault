// src/services/api.ts
import axios from 'axios';

// Create an Axios instance
const api = axios.create({
  baseURL: 'https://api.alquran.cloud/v1', // example: Quran API base
  timeout: 10000,
});

// Optional: add interceptors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API error:', error);
    return Promise.reject(error);
  }
);

export default api;
