import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add a request interceptor to include the token in headers
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    // Only attach token if it exists AND is a reasonable size (JWTs are typically < 2KB)
    if (token && token.length < 2048) {
      config.headers.Authorization = `Bearer ${token}`;
    } else if (token && token.length >= 2048) {
      // Token is suspiciously large - clear it and don't send it
      console.warn('Token is suspiciously large, clearing it');
      localStorage.removeItem('token');
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
