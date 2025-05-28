import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const instructorApi = {
  getSchedule: () => api.get('/instructor/schedule'),
  getAvailability: () => api.get('/instructor/availability'),
  addAvailability: (date: string) => api.post('/instructor/availability', { date }),
  removeAvailability: (date: string) => api.delete(`/instructor/availability/${date}`),
  updateProfile: (data: any) => api.put('/instructor/profile', data),
  getClasses: () => api.get('/instructor/classes'),
  markAttendance: (classId: string, data: any) => api.post(`/instructor/classes/${classId}/attendance`, data)
};

export default api; 