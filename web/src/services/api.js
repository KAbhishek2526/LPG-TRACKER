import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to uniformly inject authorization matrices into every outgoing payload
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('jwt_token');
    const sessionId = localStorage.getItem('session_id');
    const deviceFingerprint = localStorage.getItem('device_fingerprint');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (sessionId) {
      config.headers['x-session-token'] = sessionId;
    }
    if (deviceFingerprint) {
      config.headers['x-device-fingerprint'] = deviceFingerprint;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
