import { api } from './api';

export interface HRDashboardStats {
  pendingApprovals: number;
  activeInstructors: number;
  organizations: number;
  expiringCertifications: number;
  recentChanges: any[];
  pendingApprovalsList: any[];
}

export interface InstructorProfile {
  id: number;
  username: string;
  email: string;
  phone: string | null;
  created_at: string;
  updated_at: string;
  total_courses: number;
  completed_courses: number;
  active_courses: number;
  last_course_date: string | null;
}

export interface OrganizationProfile {
  id: number;
  name: string;
  contact_email: string;
  contact_phone: string | null;
  address: string | null;
  created_at: string;
  updated_at: string;
  total_courses: number;
  completed_courses: number;
  active_courses: number;
  total_users: number;
  last_course_date: string | null;
}

export interface ProfileChange {
  id: number;
  user_id: number;
  change_type: string;
  field_name: string;
  old_value: string | null;
  new_value: string;
  status: 'pending' | 'approved' | 'rejected';
  hr_comment: string | null;
  created_at: string;
  updated_at: string;
  username: string;
  email: string;
  role: string;
  organization_name: string | null;
}

export interface PaginationData {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface HRDashboardResponse {
  success: boolean;
  data: HRDashboardStats;
}

export interface InstructorsResponse {
  success: boolean;
  data: {
    instructors: InstructorProfile[];
    pagination: PaginationData;
  };
}

export interface OrganizationsResponse {
  success: boolean;
  data: {
    organizations: OrganizationProfile[];
    pagination: PaginationData;
  };
}

export interface PendingChangesResponse {
  success: boolean;
  data: {
    pendingChanges: ProfileChange[];
    pagination: PaginationData;
  };
}

export interface UserProfileResponse {
  success: boolean;
  data: {
    user: any;
    profileChanges: any[];
    courseHistory: any[];
  };
}

class HRDashboardService {
  // Get HR Dashboard Statistics
  async getDashboardStats(): Promise<HRDashboardStats> {
    const response = await api.get<HRDashboardResponse>('/hr-dashboard/stats');
    return response.data.data;
  }

  // Get Instructor Profiles
  async getInstructors(page: number = 1, limit: number = 10, search: string = ''): Promise<InstructorsResponse['data']> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(search && { search })
    });
    
    const response = await api.get<InstructorsResponse>(`/hr-dashboard/instructors?${params}`);
    return response.data.data;
  }

  // Get Organization Profiles
  async getOrganizations(page: number = 1, limit: number = 10, search: string = ''): Promise<OrganizationsResponse['data']> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(search && { search })
    });
    
    const response = await api.get<OrganizationsResponse>(`/hr-dashboard/organizations?${params}`);
    return response.data.data;
  }

  // Get Pending Profile Changes
  async getPendingChanges(page: number = 1, limit: number = 10): Promise<PendingChangesResponse['data']> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });
    
    const response = await api.get<PendingChangesResponse>(`/hr-dashboard/pending-changes?${params}`);
    return response.data.data;
  }

  // Approve or Reject Profile Change
  async approveChange(changeId: number, action: 'approve' | 'reject', comment: string = ''): Promise<{ success: boolean; message: string }> {
    const response = await api.post(`/hr-dashboard/approve-change/${changeId}`, {
      action,
      comment
    });
    return response.data;
  }

  // Get User Profile Details
  async getUserProfile(userId: number): Promise<UserProfileResponse['data']> {
    const response = await api.get<UserProfileResponse>(`/hr-dashboard/user/${userId}`);
    return response.data.data;
  }
}

export const hrDashboardService = new HRDashboardService(); 