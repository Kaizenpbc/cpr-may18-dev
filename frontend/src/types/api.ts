export interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  organization_id?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Class {
  id: number;
  course_id: number;
  instructor_id: number;
  start_time: string;
  end_time: string;
  startTime?: string;
  endTime?: string;
  status: string;
  location: string;
  max_students: number;
  completed: boolean;
  created_at: string;
  updated_at: string;
  course_name: string;
  coursetypename: string;
  organizationname: string;
  notes: string;
  studentcount: number;
  studentsattendance: number;
  date?: string;
}

export interface Availability {
  id: string;
  instructor_id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: 'available' | 'booked' | 'unavailable';
}

export interface DashboardMetrics {
  upcomingClasses: number;
  totalStudents: number;
  completedClasses: number;
  nextClass?: {
    date: string;
    time: string;
    location: string;
    type: string;
  };
  recentClasses: Array<{
    id: string;
    date: string;
    type: string;
    students: number;
  }>;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string | { code?: string; message?: string };
  meta?: Record<string, unknown>;
  status?: number;
  message?: string;
}

// Common data types for API requests/responses
export interface CourseData {
  id?: number;
  name?: string;
  description?: string;
  course_type_id?: number;
  duration_hours?: number;
  max_students?: number;
  is_active?: boolean;
  [key: string]: unknown;
}

export interface InstructorData {
  id?: number;
  user_id?: number;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  is_active?: boolean;
  [key: string]: unknown;
}

export interface OrganizationData {
  id?: number;
  name?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  is_active?: boolean;
  [key: string]: unknown;
}

export interface VendorData {
  id?: number;
  name?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  is_active?: boolean;
  [key: string]: unknown;
}

export interface StudentData {
  id?: number;
  first_name?: string;
  last_name?: string;
  email?: string;
  attended?: boolean;
  [key: string]: unknown;
}

export interface PricingData {
  id?: number;
  organization_id?: number | string;
  course_type_id?: number | string;
  price?: number;
  price_per_student?: number;
  effective_date?: string;
  [key: string]: unknown;
}

export interface PaymentData {
  amount: number;
  payment_date?: string;
  payment_method?: string;
  reference_number?: string;
  notes?: string;
  [key: string]: unknown;
}

export interface EmailTemplateData {
  id?: number;
  name?: string;
  key?: string;
  subject?: string;
  body?: string;
  category?: string;
  is_active?: boolean;
  [key: string]: unknown;
}

export interface NotificationPreferences {
  email_enabled?: boolean;
  in_app_enabled?: boolean;
  [key: string]: unknown;
}
