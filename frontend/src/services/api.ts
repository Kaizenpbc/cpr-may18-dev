import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { tokenService } from './tokenService';
import type {
  DashboardMetrics,
  Class,
  Availability,
  ApiResponse,
  User,
} from '../types/api';
import { API_URL } from '../config.js';

console.log('🌐 [API] Initializing API service with base URL:', import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1');

// Initialize API service with single base URL
console.log('[TRACE] Initializing API service at:', API_URL);

// Create axios instance
const api = axios.create({
  baseURL: 'http://localhost:3001/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Enable sending cookies
});

// Add request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token to all requests
    const token = tokenService.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Ensure proper JSON formatting for request data
    if (config.data && typeof config.data === 'object') {
      try {
        // Validate JSON data
        JSON.stringify(config.data);
      } catch (error) {
        console.error('❌ [API REQUEST ERROR] Invalid JSON data:', error);
        return Promise.reject(new Error('Invalid JSON data in request'));
      }
    }

    console.log('\n🚀 [API REQUEST]', {
      method: config.method?.toUpperCase(),
      url: config.url,
      baseURL: config.baseURL,
      headers: config.headers,
      params: config.params,
      data: config.data,
    });
    return config;
  },
  (error) => {
    console.error('❌ [API REQUEST ERROR]', error);
    return Promise.reject(error);
  }
);

// Add response interceptor
api.interceptors.response.use(
  (response) => {
    console.log('\n✅ [API RESPONSE]', {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      data: response.data,
    });
    return response;
  },
  async (error) => {
    console.error('❌ [API RESPONSE ERROR]', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
      config: {
        method: error.config?.method,
        url: error.config?.url,
        headers: error.config?.headers,
        data: error.config?.data,
      }
    });

    // Handle 401 errors - redirect to login instead of trying to refresh
    if (error.response?.status === 401) {
      console.log('[AUTH] Unauthorized access, redirecting to login');
      // Clear any stored tokens and redirect to login
      tokenService.clearTokens();
      window.location.href = '/login';
      return Promise.reject(error);
    }

    // Enhanced error handling for specific status codes
    if (error.response?.status === 403) {
      console.error('[AUTH] Access denied - insufficient permissions');
    } else if (error.response?.status === 404) {
      console.error('[API] Resource not found');
    } else if (error.response?.status === 500) {
      console.error('[API] Internal server error - check backend logs');
    }

    return Promise.reject(error);
  }
);

// Helper function to extract data from API response (new format)
const extractData = <T>(response: {
  data: { success: boolean; data: T; error?: any; message?: string };
}): T => {
  if (response.data.success === false) {
    throw new Error(
      response.data.error?.message || response.data.message || 'API Error'
    );
  }
  return response.data.data;
};

// Helper function for legacy API responses (old format)
const extractLegacyData = <T>(response: { data: ApiResponse<T> }): T => {
  if (!response.data.success) {
    throw new Error(response.data.message || 'API Error');
  }
  return response.data.data;
};

// Dashboard endpoints
export const fetchDashboardData = async (): Promise<DashboardMetrics> => {
  console.log('[Debug] api.ts - Fetching dashboard data');
  try {
    // Get current date in YYYY-MM-DD format
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const currentDate = `${year}-${month}-${day}`;

    const [instructorStats, dashboardSummary] = await Promise.all([
      api.get<ApiResponse<any>>(`/admin/instructor-stats?month=${currentDate}`),
      api.get<ApiResponse<any>>(`/admin/dashboard-summary?month=${currentDate}`)
    ]);

    // Transform the data to match DashboardMetrics interface
    const data: DashboardMetrics = {
      upcomingClasses: extractLegacyData(dashboardSummary)?.upcomingClasses || 0,
      totalStudents: extractLegacyData(dashboardSummary)?.totalStudents || 0,
      completedClasses: extractLegacyData(dashboardSummary)?.completedClasses || 0,
      recentClasses: extractLegacyData(dashboardSummary)?.recentClasses || []
    };

    console.log('[Debug] api.ts - Dashboard data received:', data);
    return data;
  } catch (error) {
    console.error('[Debug] api.ts - Error fetching dashboard data:', error);
    if (axios.isAxiosError(error)) {
      console.error(
        '[Debug] api.ts - Response status:',
        error.response?.status
      );
      console.error('[Debug] api.ts - Response data:', error.response?.data);
    }
    throw error;
  }
};

// Auth endpoints
export const authApi = {
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }),
  logout: () => api.post('/auth/logout'),
  refreshToken: () => api.post('/auth/refresh'),
};

// Password reset functions
export const requestPasswordReset = async (email: string) => {
  const response = await api.post('/auth/forgot-password', { email });
  return response.data;
};

export const resetPassword = async (token: string, password: string) => {
  const response = await api.post('/auth/reset-password', {
    token,
    password,
  });
  return response.data;
};

// Course admin endpoints
export const courseAdminApi = {
  // Courses
  getCourses: () => api.get('/courses'),
  createCourse: (data: any) => api.post('/courses', data),
  updateCourse: (id: number, data: any) =>
    api.put(`/courses/${id}`, data),
  deleteCourse: (id: number) => api.delete(`/courses/${id}`),
  assignInstructor: (courseId: number, instructorId: number) =>
    api.put(`/courses/${courseId}/assign-instructor`, { instructorId }),

  // Classes
  getClasses: () => api.get('/classes'),
  createClass: (data: any) => api.post('/classes', data),
  updateClass: (id: number, data: any) =>
    api.put(`/classes/${id}`, data),
  deleteClass: (id: number) => api.delete(`/classes/${id}`),

  // Instructors
  getInstructors: () => api.get('/instructors'),
  createInstructor: (data: any) => api.post('/instructors', data),
  updateInstructor: (id: number, data: any) =>
    api.put(`/instructors/${id}`, data),
  deleteInstructor: (id: number) => api.delete(`/instructors/${id}`),
  updateInstructorAvailability: (id: number, data: any) =>
    api.put(`/instructors/${id}/availability`, data),
};

// Organization endpoints
export const organizationApi = {
  getMyCourses: async () => {
    const response = await api.get('/organization/courses');
    return extractData(response);
  },
  getArchivedCourses: async () => {
    const response = await api.get('/organization/archive');
    return extractData(response);
  },
  getInvoices: () => api.get('/organization/invoices'),
  getBillingSummary: () => api.get('/organization/billing-summary'),
  getCourseTypes: async () => {
    const response = await api.get('/course-types');
    return extractData(response);
  },
  requestCourse: (data: any) => api.post('/organization/course-request', data),
  
  // Upload students for a course
  uploadStudents: async (courseRequestId: number, students: any[]) => {
    console.log('[TRACE] API - Uploading students for course:', courseRequestId);
    console.log('[TRACE] API - Students data:', students);
    
    try {
      const response = await api.post('/organization/upload-students', {
        courseRequestId,
        students
      });
      
      console.log('[TRACE] API - Upload response:', response.data);
      return response.data;
    } catch (error) {
      console.error('[TRACE] API - Upload error:', error);
      throw error;
    }
  },
};

// Student endpoints
export const studentApi = {
  getSchedule: () => api.get('/student/classes'),
  enrollInClass: (classId: number) =>
    api.post(`/student/enroll/${classId}`),
  withdrawFromClass: (classId: number) =>
    api.delete(`/student/withdraw/${classId}`),
};

// Instructor endpoints
export const instructorApi = {
  getSchedule: () => api.get('/instructor/schedule'),
  getAvailability: () => api.get('/instructor/availability'),
  updateAvailability: (data: any) =>
    api.put('/instructor/availability', data),
};

// Additional exports for backward compatibility
export const fetchInstructorAvailability = async (): Promise<
  Availability[]
> => {
  const response = await api.get<ApiResponse<Availability[]>>(
    '/instructor/availability'
  );
  return extractLegacyData(response);
};

export const fetchSchedule = async (): Promise<Class[]> => {
  const response = await api.get<ApiResponse<Class[]>>(
    '/instructor/schedule'
  );
  return extractLegacyData(response);
};

// Export the api instance for use in other services
export { api };

// Accounting and Course Pricing API functions
export const getCoursePricing = async () => {
  const response = await api.get('/accounting/course-pricing');
  return response.data;
};

export const updateCoursePrice = async (pricingId: number, data: any) => {
  const response = await api.put(
    `/accounting/course-pricing/${pricingId}`,
    data
  );
  return response.data;
};

export const createCoursePricing = async (data: any): Promise<ApiResponse<any>> => {
  const response = await api.post('/accounting/course-pricing', data);
  return response.data;
};

export const getOrganizations = async () => {
  const response = await api.get('/accounting/organizations');
  return response.data;
};

// Invoice and Billing API functions
export const getBillingQueue = async () => {
  const response = await api.get('/accounting/billing-queue');
  return response.data;
};

export const createInvoice = async (courseId: number) => {
  const response = await api.post('/accounting/invoices', { courseId });
  return response.data;
};

export const getInvoices = async () => {
  const response = await api.get('/accounting/invoices');
  return response.data.data || [];
};

export const getInvoiceDetails = async (invoiceId: number) => {
  const response = await api.get(`/accounting/invoices/${invoiceId}`);
  return response.data;
};

export const updateInvoice = async (invoiceId: number, data: any) => {
  const response = await api.put(
    `/accounting/invoices/${invoiceId}`,
    data
  );
  return response.data;
};

export const emailInvoice = async (invoiceId: number) => {
  const response = await api.post(
    `/accounting/invoices/${invoiceId}/email`
  );
  return response.data;
};

export const getInvoicePayments = async (invoiceId: number) => {
  const response = await api.get(
    `/accounting/invoices/${invoiceId}/payments`
  );
  return response.data;
};

export const recordInvoicePayment = async (
  invoiceId: number,
  paymentData: any
) => {
  const response = await api.post(
    `/accounting/invoices/${invoiceId}/payments`,
    paymentData
  );
  return response.data;
};

export const getRevenueReport = async (year: number): Promise<ApiResponse<any>> => {
  const response = await api.get(`/accounting/reports/revenue?year=${year}`);
  return response.data;
};

// System Administration API functions
export const sysAdminApi = {
  // Dashboard
  getDashboard: async () => {
    const response = await api.get('/sysadmin/dashboard');
    return response.data;
  },

  // Course Management
  getCourses: async () => {
    const response = await api.get('/sysadmin/courses');
    return response.data;
  },
  createCourse: async (courseData: any) => {
    const response = await api.post('/sysadmin/courses', courseData);
    return response.data;
  },
  updateCourse: async (courseId: number, courseData: any) => {
    const response = await api.put(
      `/sysadmin/courses/${courseId}`,
      courseData
    );
    return response.data;
  },
  deleteCourse: async (courseId: number) => {
    const response = await api.delete(`/sysadmin/courses/${courseId}`);
    return response.data;
  },

  // User Management
  getUsers: async () => {
    const response = await api.get('/sysadmin/users');
    return response.data;
  },
  createUser: async (userData: any) => {
    const response = await api.post('/sysadmin/users', userData);
    return response.data;
  },
  updateUser: async (userId: number, userData: any) => {
    const response = await api.put(
      `/sysadmin/users/${userId}`,
      userData
    );
    return response.data;
  },
  deleteUser: async (userId: number) => {
    const response = await api.delete(`/sysadmin/users/${userId}`);
    return response.data;
  },

  // Vendor Management
  getVendors: async () => {
    const response = await api.get('/sysadmin/vendors');
    return response.data;
  },
  createVendor: async (vendorData: any) => {
    const response = await api.post('/sysadmin/vendors', vendorData);
    return response.data;
  },
  updateVendor: async (vendorId: number, vendorData: any) => {
    const response = await api.put(
      `/sysadmin/vendors/${vendorId}`,
      vendorData
    );
    return response.data;
  },
  deleteVendor: async (vendorId: number) => {
    const response = await api.delete(`/sysadmin/vendors/${vendorId}`);
    return response.data;
  },

  // Organization Management
  getOrganizations: async () => {
    const response = await api.get('/sysadmin/organizations');
    return response.data;
  },
  createOrganization: async (orgData: any) => {
    const response = await api.post('/sysadmin/organizations', orgData);
    return response.data;
  },
  updateOrganization: async (orgId: number, orgData: any) => {
    const response = await api.put(
      `/sysadmin/organizations/${orgId}`,
      orgData
    );
    return response.data;
  },
  deleteOrganization: async (orgId: number) => {
    const response = await api.delete(
      `/sysadmin/organizations/${orgId}`
    );
    return response.data;
  },
};

// Organization Analytics API
export const getOrganizationCourseRequestAnalytics = async (
  timeframe: string = '12'
): Promise<any> => {
  const response = await api.get(
    `/organization/analytics/course-requests?timeframe=${timeframe}`
  );
  return response.data;
};

export const getOrganizationStudentParticipationAnalytics = async (
  timeframe: string = '12'
): Promise<any> => {
  const response = await api.get(
    `/organization/analytics/student-participation?timeframe=${timeframe}`
  );
  return response.data;
};

// Admin endpoints
export const adminApi = {
  getCourseStudents: (courseId: number) =>
    api.get(`/admin/courses/${courseId}/students`),
  getInstructorStats: (month: string) =>
    api.get('/admin/instructor-stats', { params: { month } }),
  getDashboardSummary: (month: string) =>
    api.get('/admin/dashboard-summary', { params: { month } }),
};

// Email Template endpoints
export const emailTemplateApi = {
  getAll: (params?: any) => {
    console.log('[emailTemplateApi.getAll] Called with params:', params);
    const queryString = params
      ? `?${new URLSearchParams(params).toString()}`
      : '';
    const url = `/email-templates${queryString}`;
    console.log('[emailTemplateApi.getAll] Making request to:', url);
    return api.get(url);
  },
  getById: (id: number) => api.get(`/email-templates/${id}`),
  create: (data: any) => api.post('/email-templates', data),
  update: (id: number, data: any) =>
    api.put(`/email-templates/${id}`, data),
  delete: (id: number) => api.delete(`/email-templates/${id}`),
  preview: (id: number, variables: any) =>
    api.post(`/email-templates/${id}/preview`, { variables }),
  sendTest: (id: number, recipientEmail: string, variables: any) =>
    api.post(`/email-templates/${id}/test`, {
      recipientEmail,
      variables,
    }),
  clone: (id: number, newName: string) =>
    api.post(`/email-templates/${id}/clone`, { name: newName }),
  getEventTriggers: () =>
    api.get('/email-templates/meta/event-triggers'),
  getTemplateVariables: () => api.get('/email-templates/meta/variables'),
};

export default api;

console.log('[Debug] api.ts - API service initialized');
