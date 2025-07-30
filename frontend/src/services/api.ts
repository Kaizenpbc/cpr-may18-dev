import axios from 'axios';
import { tokenService } from './tokenService';
import type {
  DashboardMetrics,
  Class,
  Availability,
  ApiResponse,
  User,
} from '../types/api';
import { API_URL } from '../config.js';

console.log('🌐 [API] Initializing API service with base URL:', API_URL);

// Initialize API service with single base URL
console.log('[TRACE] Initializing API service at:', API_URL);

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
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
      config.headers.Authorization = token;
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

// Track refresh attempts to prevent infinite loops
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (error?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  
  failedQueue = [];
};

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
      }
    });

    const originalRequest = error.config;

    // Handle 401 errors (unauthorized)
    if (error.response?.status === 401) {
      const errorCode = error.response?.data?.error?.code;
      
      // If it's a refresh token error, don't try to refresh - just redirect to login
      if (errorCode === 'AUTH_1003' || error.response?.data?.error?.message?.includes('Refresh token')) {
        console.log('🔐 [API] Refresh token error - redirecting to login');
        tokenService.forceLogout();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      // For other 401 errors, try to refresh the token
      if (!isRefreshing) {
        isRefreshing = true;

        try {
          console.log('🔐 [API] Attempting token refresh...');
          const response = await tokenService.refreshTokenSilently();
          
          if (response) {
            console.log('🔐 [API] Token refresh successful');
            processQueue(null, response);
            
            // Retry the original request
            if (originalRequest) {
              originalRequest.headers.Authorization = response;
              return api(originalRequest);
            }
          }
        } catch (refreshError) {
          console.error('🔐 [API] Token refresh failed:', refreshError);
          processQueue(refreshError, null);
          
          // Clear tokens and redirect to login
          tokenService.forceLogout();
          window.location.href = '/login';
        } finally {
          isRefreshing = false;
        }
      } else {
        // If refresh is already in progress, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          if (originalRequest) {
            originalRequest.headers.Authorization = token;
            return api(originalRequest);
          }
        }).catch(err => {
          return Promise.reject(err);
        });
      }
    }

    // Handle 403 errors (forbidden)
    if (error.response?.status === 403) {
      console.log('🔐 [API] Access denied - insufficient permissions');
      // Don't redirect for 403 errors, just show the error
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
    // Get current user role from token service or auth context
    // For now, we'll use a more generic approach that works for all roles
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const currentDate = `${year}-${month}-${day}`;

    // Try to get dashboard data from the generic dashboard endpoint first
    try {
      const response = await api.get<ApiResponse<any>>('/dashboard');
      console.log('[Debug] api.ts - Generic dashboard data received:', response.data);
      
      if (response.data.success && response.data.data) {
        const dashboardStats = response.data.data.instructorStats;
        return {
          upcomingClasses: dashboardStats?.scheduledClasses || 0,
          totalStudents: 0, // This would need to be calculated from actual data
          completedClasses: dashboardStats?.completedClasses || 0,
          recentClasses: []
        };
      }
    } catch (dashboardError) {
      console.log('[Debug] api.ts - Generic dashboard failed, trying role-specific endpoints');
    }

    // Fallback: Try role-specific endpoints based on common patterns
    // This is a more robust approach that doesn't assume admin role
    const dashboardData: DashboardMetrics = {
      upcomingClasses: 0,
      totalStudents: 0,
      completedClasses: 0,
      recentClasses: []
    };

    // Try to get instructor-specific data if available
    try {
      const instructorResponse = await api.get<ApiResponse<any>>('/instructor/dashboard/stats');
      if (instructorResponse.data.success) {
        const stats = instructorResponse.data.data;
        dashboardData.upcomingClasses = stats.scheduledClasses || 0;
        dashboardData.completedClasses = stats.completedClasses || 0;
        dashboardData.totalStudents = stats.totalStudents || 0;
      }
    } catch (instructorError) {
      console.log('[Debug] api.ts - Instructor dashboard not available');
    }

    // If we still don't have data, try the admin endpoints (but only if user has permission)
    if (dashboardData.upcomingClasses === 0 && dashboardData.completedClasses === 0) {
      try {
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

        console.log('[Debug] api.ts - Admin dashboard data received:', data);
        return data;
      } catch (adminError) {
        console.log('[Debug] api.ts - Admin dashboard not available, returning default data');
        // Return default data instead of throwing error
        return dashboardData;
      }
    }

    console.log('[Debug] api.ts - Dashboard data received:', dashboardData);
    return dashboardData;
  } catch (error) {
    console.error('[Debug] api.ts - Error fetching dashboard data:', error);
    if (axios.isAxiosError(error)) {
      console.error(
        '[Debug] api.ts - Response status:',
        error.response?.status
      );
      console.error('[Debug] api.ts - Response data:', error.response?.data);
    }
    
    // Return default data instead of throwing error
    return {
      upcomingClasses: 0,
      totalStudents: 0,
      completedClasses: 0,
      recentClasses: []
    };
  }
};

// Role-specific dashboard data fetching
export const fetchRoleSpecificDashboardData = async (userRole: string): Promise<DashboardMetrics> => {
  console.log('[Debug] api.ts - Fetching role-specific dashboard data for role:', userRole);
  
  try {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const currentDate = `${year}-${month}-${day}`;

    let dashboardData: DashboardMetrics = {
      upcomingClasses: 0,
      totalStudents: 0,
      completedClasses: 0,
      recentClasses: []
    };

    switch (userRole) {
      case 'instructor':
        try {
          const response = await api.get<ApiResponse<any>>('/instructor/dashboard/stats');
          if (response.data.success) {
            const stats = response.data.data;
            dashboardData = {
              upcomingClasses: stats.scheduledClasses || 0,
              totalStudents: stats.totalStudents || 0,
              completedClasses: stats.completedClasses || 0,
              recentClasses: stats.recentClasses || []
            };
          }
        } catch (error) {
          console.log('[Debug] api.ts - Instructor dashboard not available, using fallback');
        }
        break;

      case 'admin':
      case 'courseadmin':
        try {
          const [instructorStats, dashboardSummary] = await Promise.all([
            api.get<ApiResponse<any>>(`/admin/instructor-stats?month=${currentDate}`),
            api.get<ApiResponse<any>>(`/admin/dashboard-summary?month=${currentDate}`)
          ]);

          dashboardData = {
            upcomingClasses: extractLegacyData(dashboardSummary)?.upcomingClasses || 0,
            totalStudents: extractLegacyData(dashboardSummary)?.totalStudents || 0,
            completedClasses: extractLegacyData(dashboardSummary)?.completedClasses || 0,
            recentClasses: extractLegacyData(dashboardSummary)?.recentClasses || []
          };
        } catch (error) {
          console.log('[Debug] api.ts - Admin dashboard not available, using fallback');
        }
        break;

      case 'organization':
        try {
          const response = await api.get<ApiResponse<any>>('/organization/dashboard');
          if (response.data.success) {
            const stats = response.data.data;
            dashboardData = {
              upcomingClasses: stats.upcomingCourses || 0,
              totalStudents: stats.totalStudents || 0,
              completedClasses: stats.completedCourses || 0,
              recentClasses: stats.recentCourses || []
            };
          }
        } catch (error) {
          console.log('[Debug] api.ts - Organization dashboard not available, using fallback');
        }
        break;

      case 'accountant':
        try {
          const response = await api.get<ApiResponse<any>>('/accounting/dashboard');
          if (response.data.success) {
            const stats = response.data.data;
            dashboardData = {
              upcomingClasses: stats.pendingInvoices || 0,
              totalStudents: stats.totalRevenue || 0,
              completedClasses: stats.completedCoursesThisMonth || 0,
              recentClasses: []
            };
          }
        } catch (error) {
          console.log('[Debug] api.ts - Accounting dashboard not available, using fallback');
        }
        break;

      case 'hr':
        try {
          const response = await api.get<ApiResponse<any>>('/hr/dashboard');
          if (response.data.success) {
            const stats = response.data.data;
            dashboardData = {
              upcomingClasses: stats.pendingApprovals || 0,
              totalStudents: stats.activeInstructors || 0,
              completedClasses: stats.organizations || 0,
              recentClasses: []
            };
          }
        } catch (error) {
          console.log('[Debug] api.ts - HR dashboard not available, using fallback');
        }
        break;

      case 'sysadmin':
        try {
          const response = await api.get<ApiResponse<any>>('/sysadmin/dashboard');
          if (response.data.success) {
            const stats = response.data.data.summary;
            dashboardData = {
              upcomingClasses: stats.totalUsers || 0,
              totalStudents: stats.totalOrganizations || 0,
              completedClasses: stats.totalCourses || 0,
              recentClasses: []
            };
          }
        } catch (error) {
          console.log('[Debug] api.ts - Sysadmin dashboard not available, using fallback');
        }
        break;

      default:
        // Try generic dashboard endpoint
        try {
          const response = await api.get<ApiResponse<any>>('/dashboard');
          if (response.data.success && response.data.data) {
            const dashboardStats = response.data.data.instructorStats;
            dashboardData = {
              upcomingClasses: dashboardStats?.scheduledClasses || 0,
              totalStudents: 0,
              completedClasses: dashboardStats?.completedClasses || 0,
              recentClasses: []
            };
          }
        } catch (error) {
          console.log('[Debug] api.ts - Generic dashboard not available, using default data');
        }
        break;
    }

    console.log('[Debug] api.ts - Role-specific dashboard data received:', dashboardData);
    return dashboardData;
  } catch (error) {
    console.error('[Debug] api.ts - Error fetching role-specific dashboard data:', error);
    
    // Return default data instead of throwing error
    return {
      upcomingClasses: 0,
      totalStudents: 0,
      completedClasses: 0,
      recentClasses: []
    };
  }
};

// Auth endpoints
export const authApi = {
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }),
  logout: () => api.post('/auth/logout'),
  refreshToken: () => api.post('/auth/refresh'),
};

// SYSADMIN endpoints
export const sysadminApi = {
  getConfigurations: () => api.get('/sysadmin/configurations'),
  updateConfiguration: (key: string, value: string) => 
    api.put(`/sysadmin/configurations/${key}`, { value }),
  getConfiguration: (key: string) => 
    api.get(`/sysadmin/configurations/${key}`),
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
  getBalanceCalculation: (invoiceId: string, paymentAmount: number) => 
    api.get(`/organization/invoices/${invoiceId}/balance-calculation`, {
      params: { payment_amount: paymentAmount }
    }),
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
  // Basic instructor data
  getSchedule: () => api.get('/instructor/schedule'),
  getAvailability: () => api.get('/instructor/availability'),
  updateAvailability: (data: any) =>
    api.put('/instructor/availability', data),
  
  // Classes and courses
  getClasses: () => api.get('/instructor/classes'),
  getClassesToday: () => api.get('/instructor/classes/today'),
  getClassesCompleted: () => api.get('/instructor/classes/completed'),
  getClassesActive: () => api.get('/instructor/classes/active'),
  getClassStudents: (courseId: number) => api.get(`/instructor/classes/${courseId}/students`),
  completeClass: (courseId: number, instructorComments?: string) => 
    api.post(`/instructor/classes/${courseId}/complete`, { instructor_comments: instructorComments || '' }),
  updateAttendance: (courseId: number, students: any[]) => 
    api.put(`/instructor/classes/${courseId}/attendance`, { students }),
  updateStudentAttendance: (courseId: number, studentId: string, attended: boolean) =>
    api.put(`/instructor/classes/${courseId}/students/${studentId}/attendance`, { attended }),
  addStudent: (courseId: number, studentData: any) =>
    api.post(`/instructor/classes/${courseId}/students`, studentData),
  updateClassNotes: (courseId: number, notes: string) => 
    api.post('/instructor/classes/notes', { courseId, notes }),
  
  // Availability management
  addAvailability: (date: string) => api.post('/instructor/availability', { date }),
  removeAvailability: (date: string) => api.delete(`/instructor/availability/${date}`),
  
  // Attendance
  getAttendance: () => api.get('/instructor/attendance'),
  markAttendance: (courseId: number, students: any[]) => 
    api.post(`/instructor/classes/${courseId}/attendance`, { students }),
  
  // Dashboard data
  getDashboardStats: () => api.get('/instructor/dashboard/stats'),
  getTodayClasses: () => api.get('/instructor/classes/today'),
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
  return response.data.data || [];
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

export const deleteCoursePricing = async (id: number) => {
  const response = await api.delete(`/accounting/course-pricing/${id}`);
  return response.data;
};

export const getOrganizations = async () => {
  const response = await api.get('/accounting/organizations');
  return response.data.data || [];
};

// Organization Pricing API endpoints
export const getOrganizationPricing = async () => {
  const response = await api.get('/organization-pricing/admin');
  return response.data.data || [];
};

// Get organization pricing for organization users (read-only)
export const getOrganizationPricingForOrg = async (organizationId: number) => {
  const response = await api.get(`/organization-pricing/organization/${organizationId}`);
  return response.data;
};

export const getOrganizationPricingById = async (id: number) => {
  const response = await api.get(`/organization-pricing/admin/${id}`);
  return response.data.data;
};

export const createOrganizationPricing = async (data: any) => {
  const response = await api.post('/organization-pricing/admin', data);
  return response.data.data;
};

export const updateOrganizationPricing = async (id: number, data: any) => {
  const response = await api.put(`/organization-pricing/admin/${id}`, data);
  return response.data.data;
};

export const deleteOrganizationPricing = async (id: number) => {
  const response = await api.delete(`/organization-pricing/admin/${id}`);
  return response.data.data;
};

// Get class types for pricing setup
export const getClassTypes = async () => {
  const response = await api.get('/course-types');
  const data = response.data.data || [];
  // Transform the data to match expected format
  return data.map((item: any) => ({
    id: item.id,
    name: item.name
  }));
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
  return extractData(response);
};

export const updateInvoice = async (invoiceId: number, data: any) => {
  const response = await api.put(
    `/accounting/invoices/${invoiceId}`,
    data
  );
  return extractData(response);
};

export const emailInvoice = async (invoiceId: number) => {
  const response = await api.post(
    `/accounting/invoices/${invoiceId}/email`
  );
  return response.data;
};

export const postInvoiceToOrganization = async (invoiceId: number) => {
  const response = await api.put(
    `/accounting/invoices/${invoiceId}/post-to-org`
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

  // Vendor Management
  getVendors: async () => {
    const response = await api.get('/sysadmin/vendors');
    return response.data;
  },
  createVendor: async (vendorData: any) => {
    const response = await api.post('/sysadmin/vendors', vendorData);
    return response.data;
  },
  updateVendor: async (id: number, vendorData: any) => {
    const response = await api.put(`/sysadmin/vendors/${id}`, vendorData);
    return response.data;
  },
  deleteVendor: async (id: number) => {
    const response = await api.delete(`/sysadmin/vendors/${id}`);
    return response.data;
  },

  // User Management
  getUsers: async () => {
    const response = await api.get('/sysadmin/users');
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
  updateCourse: async (id: number, courseData: any) => {
    const response = await api.put(`/sysadmin/courses/${id}`, courseData);
    return response.data;
  },
  deleteCourse: async (id: number) => {
    const response = await api.delete(`/sysadmin/courses/${id}`);
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
  updateOrganization: async (id: number, orgData: any) => {
    const response = await api.put(`/sysadmin/organizations/${id}`, orgData);
    return response.data;
  },
  deleteOrganization: async (id: number) => {
    const response = await api.delete(`/sysadmin/organizations/${id}`);
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
  // Dashboard
  getDashboard: async () => {
    const response = await api.get('/admin/dashboard');
    return response.data;
  },

  // Instructor Management
  getInstructors: async () => {
    const response = await api.get('/admin/instructors');
    return response.data;
  },
  createInstructor: async (instructorData: any) => {
    const response = await api.post('/admin/instructors', instructorData);
    return response.data;
  },
  updateInstructor: async (id: number, instructorData: any) => {
    const response = await api.put(`/admin/instructors/${id}`, instructorData);
    return response.data;
  },
  deleteInstructor: async (id: number) => {
    const response = await api.delete(`/admin/instructors/${id}`);
    return response.data;
  },

  // Course Management
  getCourses: async () => {
    const response = await api.get('/admin/courses');
    return response.data;
  },
  createCourse: async (courseData: any) => {
    const response = await api.post('/admin/courses', courseData);
    return response.data;
  },
  updateCourse: async (id: number, courseData: any) => {
    const response = await api.put(`/admin/courses/${id}`, courseData);
    return response.data;
  },
  deleteCourse: async (id: number) => {
    const response = await api.delete(`/admin/courses/${id}`);
    return response.data;
  },

  // Vendor Invoice Approval
  getVendorInvoices: async () => {
    const response = await api.get('/admin/vendor-invoices');
    return response.data;
  },
  approveVendorInvoice: async (invoiceId: number, action: 'approve' | 'reject', notes: string) => {
    const response = await api.post(`/admin/vendor-invoices/${invoiceId}/approve`, {
      action,
      notes
    });
    return response.data;
  },
  downloadVendorInvoice: async (invoiceId: number) => {
    const response = await api.get(`/admin/vendor-invoices/${invoiceId}/download`, {
      responseType: 'blob'
    });
    return response;
  },
  updateVendorInvoiceNotes: async (invoiceId: number, notes: string) => {
    const response = await api.put(`/admin/vendor-invoices/${invoiceId}/notes`, {
      notes
    });
    return response.data;
  },

  // Accounting Vendor Invoice Management
  getAccountingVendorInvoices: async () => {
    const response = await api.get('/accounting/vendor-invoices');
    return response.data;
  },
  getAccountingVendorInvoiceDetails: async (invoiceId: number) => {
    const response = await api.get(`/accounting/vendor-invoices/${invoiceId}`);
    return response.data;
  },
  processVendorPayment: async (invoiceId: number, paymentData: any) => {
    const response = await api.post(`/accounting/vendor-invoices/${invoiceId}/payments`, paymentData);
    return response.data;
  },
  getVendorPaymentHistory: async () => {
    const response = await api.get('/accounting/vendor-payments');
    return response.data;
  },

  // Email Templates
  getEmailTemplates: async () => {
    const response = await api.get('/admin/email-templates');
    return response.data;
  },
  createEmailTemplate: async (templateData: any) => {
    const response = await api.post('/admin/email-templates', templateData);
    return response.data;
  },
  updateEmailTemplate: async (id: number, templateData: any) => {
    const response = await api.put(`/admin/email-templates/${id}`, templateData);
    return response.data;
  },
  deleteEmailTemplate: async (id: number) => {
    const response = await api.delete(`/admin/email-templates/${id}`);
    return response.data;
  },
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

// Course Admin Dashboard endpoints
export const fetchCourseAdminDashboardData = async (month: string) => {
  console.log('[Debug] api.ts - Fetching course admin dashboard data for month:', month);
  try {
    const [statsResponse, summaryResponse] = await Promise.all([
      api.get<ApiResponse<any>>(`/admin/instructor-stats?month=${month}`),
      api.get<ApiResponse<any>>(`/admin/dashboard-summary?month=${month}`)
    ]);

    const data = {
      instructorStats: extractLegacyData(statsResponse) || [],
      dashboardSummary: extractLegacyData(summaryResponse) || null
    };

    console.log('[Debug] api.ts - Course admin dashboard data received:', data);
    return data;
  } catch (error) {
    console.error('[Debug] api.ts - Error fetching course admin dashboard data:', error);
    if (axios.isAxiosError(error)) {
      console.error('[Debug] api.ts - Response status:', error.response?.status);
      console.error('[Debug] api.ts - Response data:', error.response?.data);
    }
    throw error;
  }
};

// Instructor Workload Report endpoint
export const getInstructorWorkloadReport = async (startDate: string, endDate: string) => {
  console.log('[Debug] api.ts - Fetching instructor workload report for:', { startDate, endDate });
  try {
    const response = await api.get<ApiResponse<any>>('/admin/instructor-workload-report', {
      params: { startDate, endDate }
    });
    const data = extractLegacyData(response);
    
    console.log('[Debug] api.ts - Instructor workload report data received:', data);
    return data || [];
  } catch (error) {
    console.error('[Debug] api.ts - Error fetching instructor workload report:', error);
    if (axios.isAxiosError(error)) {
      console.error('[Debug] api.ts - Response status:', error.response?.status);
      console.error('[Debug] api.ts - Response data:', error.response?.data);
    }
    throw error;
  }
};

// Accounting Dashboard endpoints
export const fetchAccountingDashboardData = async () => {
  console.log('[Debug] api.ts - Fetching accounting dashboard data');
  try {
    const response = await api.get<ApiResponse<any>>('/accounting/dashboard');
    const data = extractLegacyData(response);
    
    console.log('[Debug] api.ts - Accounting dashboard data received:', data);
    return data;
  } catch (error) {
    console.error('[Debug] api.ts - Error fetching accounting dashboard data:', error);
    if (axios.isAxiosError(error)) {
      console.error('[Debug] api.ts - Response status:', error.response?.status);
      console.error('[Debug] api.ts - Response data:', error.response?.data);
    }
    throw error;
  }
};

// Vendor API functions
export const vendorApi = {
  // Dashboard
  getDashboard: async () => {
    const response = await api.get('/vendor/dashboard');
    return response.data;
  },

  // Profile
  getProfile: async () => {
    const response = await api.get('/vendor/profile');
    return response.data;
  },
  updateProfile: async (profileData: any) => {
    const response = await api.put('/vendor/profile', profileData);
    return response.data;
  },

  // Get all vendors for dropdown selection
  getVendors: async () => {
    const response = await api.get('/vendor/vendors');
    return response.data;
  },

  // Invoices
  getInvoices: async (params?: { status?: string; search?: string }) => {
    const response = await api.get('/vendor/invoices', { params });
    return response.data;
  },
  uploadInvoice: async (formData: FormData) => {
    console.log('🚀 [VENDOR API] uploadInvoice called with FormData:', formData);
    console.log('📁 [VENDOR API] FormData entries:');
    for (let [key, value] of formData.entries()) {
      console.log(`  ${key}:`, value instanceof File ? `File(${value.name}, ${value.size} bytes)` : value);
    }
    
    const response = await api.post('/vendor/invoices', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    console.log('✅ [VENDOR API] uploadInvoice response:', response.data);
    return response.data;
  },
  getInvoice: async (invoiceId: number) => {
    const response = await api.get(`/vendor/invoices/${invoiceId}`);
    return response.data;
  },
  downloadInvoice: async (invoiceId: number) => {
    const response = await api.get(`/vendor/invoices/${invoiceId}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },
  
  // OCR functions
  scanInvoice: async (file: File): Promise<any> => {
    const formData = new FormData();
    formData.append('invoice_pdf', file);
    
    const response = await api.post('/vendor/invoices/scan', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Workflow functions
  submitToAdmin: async (invoiceId: number) => {
    const response = await api.post(`/vendor/invoices/${invoiceId}/submit-to-admin`);
    return response.data;
  },
  
  resendToAdmin: async (invoiceId: number, notes: string) => {
    const response = await api.post(`/vendor/invoices/${invoiceId}/resend-to-admin`, { notes });
    return response.data;
  },
  
  getInvoicePaymentHistory: async (invoiceId: number) => {
    const response = await api.get(`/vendor/invoices/${invoiceId}/payments`);
    return response.data;
  },
  
  getInvoiceDetailsWithPayments: async (invoiceId: number) => {
    const response = await api.get(`/vendor/invoices/${invoiceId}/details`);
    return response.data;
  },
};

// Notification API methods
export const getNotifications = async (limit = 50, offset = 0, unreadOnly = false) => {
  try {
    const response = await api.get('/notifications', {
      params: { limit, offset, unread_only: unreadOnly }
    });
    return extractData(response);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    throw error;
  }
};

export const getUnreadNotificationCount = async () => {
  try {
    const response = await api.get('/notifications/unread-count');
    return extractData(response);
  } catch (error) {
    console.error('Error fetching unread notification count:', error);
    throw error;
  }
};

export const markNotificationAsRead = async (notificationId: number) => {
  try {
    const response = await api.post(`/notifications/${notificationId}/read`);
    return extractData(response);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

export const markAllNotificationsAsRead = async () => {
  try {
    const response = await api.post('/notifications/mark-all-read');
    return extractData(response);
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
};

export const deleteNotification = async (notificationId: number) => {
  try {
    const response = await api.delete(`/notifications/${notificationId}`);
    return extractData(response);
  } catch (error) {
    console.error('Error deleting notification:', error);
    throw error;
  }
};

export const getNotificationPreferences = async () => {
  try {
    const response = await api.get('/notifications/preferences');
    return extractData(response);
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    throw error;
  }
};

export const updateNotificationPreferences = async (type: string, preferences: any) => {
  try {
    const response = await api.put(`/notifications/preferences/${type}`, preferences);
    return extractData(response);
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    throw error;
  }
};

export default api;

console.log('[Debug] api.ts - API service initialized');
