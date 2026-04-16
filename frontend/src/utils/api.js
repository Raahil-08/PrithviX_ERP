import axios from 'axios';

const authDisabled = String(process.env.REACT_APP_AUTH_DISABLED || '').toLowerCase() !== 'false';
const defaultBaseURL = process.env.NODE_ENV === 'development'
  ? 'http://127.0.0.1:8000'
  : '/_/backend';

const api = axios.create({
  baseURL: process.env.REACT_APP_BACKEND_URL || defaultBaseURL,
  headers: { 'Content-Type': 'application/json' }
});

// Add token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('prithvix_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!authDisabled && error.response?.status === 401) {
      localStorage.removeItem('prithvix_token');
      localStorage.removeItem('prithvix_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
