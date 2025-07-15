import { api } from './api';

export interface Timesheet {
  id: number;
  instructor_id: number;
  instructor_name?: string;
  instructor_email?: string;
  week_start_date: string;
  total_hours: number;
  courses_taught: number;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
  hr_comment?: string;
  created_at: string;
  updated_at: string;
}

export interface TimesheetStats {
  pendingTimesheets: number;
  approvedThisMonth: number;
  totalHoursThisMonth: number;
  instructorsWithPending: number;
}

export interface TimesheetSummary {
  total_timesheets: number;
  approved_timesheets: number;
  pending_timesheets: number;
  rejected_timesheets: number;
  total_approved_hours: number;
  total_courses_taught: number;
  last_submission_date: string;
}

export interface TimesheetFilters {
  page?: number;
  limit?: number;
  status?: string;
  instructor_id?: string;
  month?: string;
}

export interface TimesheetSubmission {
  week_start_date: string;
  total_hours?: number;
  courses_taught?: number;
  notes?: string;
}

export interface WeekCourses {
  week_start_date: string;
  week_end_date: string;
  courses: Array<{
    id: number;
    date: string;
    start_time: string;
    end_time: string;
    status: string;
    location: string;
    course_type: string;
    organization_name: string;
    student_count: number;
  }>;
  total_courses: number;
}

export interface TimesheetUpdate {
  total_hours: number;
  courses_taught?: number;
  notes?: string;
}

export interface TimesheetApproval {
  action: 'approve' | 'reject';
  comment?: string;
}

class TimesheetService {
  // Get timesheet statistics (HR only)
  async getStats(): Promise<TimesheetStats> {
    const response = await api.get('/timesheet/stats');
    return response.data.data;
  }

  // Get timesheets with filtering
  async getTimesheets(filters: TimesheetFilters = {}): Promise<{
    timesheets: Timesheet[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    const params = new URLSearchParams();
    
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.status) params.append('status', filters.status);
    if (filters.instructor_id) params.append('instructor_id', filters.instructor_id);
    if (filters.month) params.append('month', filters.month);

    const response = await api.get(`/timesheet?${params.toString()}`);
    return response.data.data;
  }

  // Get timesheet details
  async getTimesheet(timesheetId: number): Promise<Timesheet> {
    const response = await api.get(`/timesheet/${timesheetId}`);
    return response.data.data;
  }

  // Submit new timesheet (Instructors only)
  async submitTimesheet(data: TimesheetSubmission): Promise<Timesheet> {
    const response = await api.post('/timesheet', data);
    return response.data.data;
  }

  // Update timesheet (Instructors only)
  async updateTimesheet(timesheetId: number, data: TimesheetUpdate): Promise<Timesheet> {
    const response = await api.put(`/timesheet/${timesheetId}`, data);
    return response.data.data;
  }

  // Approve/reject timesheet (HR only)
  async approveTimesheet(timesheetId: number, data: TimesheetApproval): Promise<void> {
    await api.post(`/timesheet/${timesheetId}/approve`, data);
  }

  // Get instructor timesheet summary
  async getInstructorSummary(instructorId: number): Promise<{
    summary: TimesheetSummary;
    recentTimesheets: Timesheet[];
  }> {
    const response = await api.get(`/timesheet/instructor/${instructorId}/summary`);
    return response.data.data;
  }

  // Get courses for a specific week (Monday to Sunday)
  async getWeekCourses(weekStartDate: string): Promise<WeekCourses> {
    const response = await api.get(`/timesheet/week/${weekStartDate}/courses`);
    return response.data.data;
  }
}

export const timesheetService = new TimesheetService(); 