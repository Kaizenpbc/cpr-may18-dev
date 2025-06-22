export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'instructor' | 'student';
  status: 'active' | 'inactive';
}

export interface CourseType {
  id: string;
  name: string;
  description: string;
  duration: number;
  maxStudents: number;
  price: number;
}

export interface Organization {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  status: 'active' | 'inactive';
}

export interface CourseRequest {
  id: string;
  requestSubmittedDate: string;
  scheduledDate: string;
  location: string;
  registeredStudents: number;
  notes: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  courseType: CourseType;
  organization: Organization;
  instructor?: User;
  createdAt: string;
  confirmedDate?: string;
  confirmedStartTime?: string;
  confirmedEndTime?: string;
  actualStudents?: number;
  studentsAttended?: number;
}

export interface InstructorAvailability {
  id: string;
  instructorId: string;
  date: string;
  status: 'available' | 'completed' | 'unavailable';
  createdAt: string;
  updatedAt: string;
}

export interface Class {
  id: string;
  instructorId: string;
  typeId: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  maxStudents: number;
  currentStudents: number;
  status: 'scheduled' | 'completed' | 'cancelled';
  courseType: CourseType;
  organization?: Organization;
  notes?: string;
}

export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  organizationId: string;
  status: 'active' | 'inactive';
  attendance?: boolean;
} 