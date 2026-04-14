import axios from 'axios';
import { getData } from '../utils/storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to inject security headers on every request seamlessly
api.interceptors.request.use(
  async (config) => {
    const token = await getData('jwt_token');
    const sessionId = await getData('session_id');
    const deviceFingerprint = await getData('device_fingerprint');

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
