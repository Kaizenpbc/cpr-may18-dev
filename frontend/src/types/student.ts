export interface Student {
  id: number;
  first_name: string;
  last_name: string;
  email?: string;
  attended?: boolean;
  attendance_marked?: boolean;
  created_at?: string;
} 