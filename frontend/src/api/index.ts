import axios from 'axios';
import { tokenService } from '../services/tokenService';

const api = axios.create({
  baseURL: 'http://localhost:3001/api/v1',
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
  updateProfile: (data: any) => api.put('/instructor/profile', data),
  getClasses: () => api.get('/instructor/classes'),
  submitAttendance: (classId: number, data: any) =>
    api.post(`/instructor/classes/${classId}/attendance`, data),
};

export default api;
