import axios from 'axios';
import { tokenService } from '../services/tokenService';

const api = axios.create({
  baseURL: 'http://localhost:3002/api/v1',
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
  getSchedule: () => api.get('/api/v1/instructor/schedule'),
  getAvailability: () => api.get('/api/v1/instructor/availability'),
  addAvailability: (date: string) =>
    api.post('/api/v1/instructor/availability', { date }),
  removeAvailability: (date: string) =>
    api.delete(`/api/v1/instructor/availability/${date}`),
  updateProfile: (data: any) => api.put('/api/v1/instructor/profile', data),
  getClasses: () => api.get('/api/v1/instructor/classes'),
  markAttendance: (classId: string, data: any) =>
    api.post(`/api/v1/instructor/classes/${classId}/attendance`, data),
};

export default api;
