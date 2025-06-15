export interface User {
  id: number;
  username: string;
  email?: string;
  full_name?: string;
  first_name?: string;
  role:
    | 'instructor'
    | 'admin'
    | 'organization'
    | 'superadmin'
    | 'student'
    | 'accountant'
    | 'sysadmin';
  organizationId?: number;
  organizationName?: string;
}

export interface Class {
  id: string;
  type: string;
  date: string;
  time: string;
  location: string;
  instructor_id: string;
  max_students: number;
  current_students: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  organization?: string;
  notes?: string;
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
  error?: string;
  meta?: any;
  status?: number;
  message?: string;
}
