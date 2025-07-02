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
  error?: string;
  meta?: any;
  status?: number;
  message?: string;
}
