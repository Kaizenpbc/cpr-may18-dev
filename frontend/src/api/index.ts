import axios from 'axios';
import { tokenService } from '../services/tokenService';
import { API_URL } from '../config';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  config => {
    const token = tokenService.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle errors
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      tokenService.clearTokens();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const instructorApi = {
  getSchedule: () => api.get('/instructor/schedule'),
  getAvailability: () => api.get('/instructor/availability'),
  addAvailability: (date: string) =>
    api.post('/instructor/availability', { date }),
  removeAvailability: (date: string) =>
    api.delete(`/instructor/availability/${date}`),
  updateProfile: (data: Record<string, unknown>) => api.put('/instructor/profile', data),
  getClasses: () => api.get('/instructor/classes'),
  submitAttendance: (classId: number, data: Record<string, unknown>) =>
    api.post(`/instructor/classes/${classId}/attendance`, data),
};

export default api;
