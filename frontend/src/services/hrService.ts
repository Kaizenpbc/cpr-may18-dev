import api from './api';

export interface HRDashboardData {
  pendingApprovals: number;
  activeInstructors: number;
  organizations: number;
  expiringCertifications: number;
}

export interface ProfileChange {
  id: number;
  user_id: number;
  change_type: 'instructor' | 'organization';
  field_name: string;
  old_value: string;
  new_value: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  username: string;
  role: string;
  display_name: string;
}

export const hrService = {
  // Get HR dashboard data
  async getDashboard(): Promise<HRDashboardData> {
    const response = await api.get('/hr/dashboard');
    return response.data.data;
  },

  // Get pending profile changes
  async getProfileChanges(): Promise<ProfileChange[]> {
    const response = await api.get('/hr/profile-changes');
    return response.data.data;
  },

  // Approve or reject a profile change
  async approveProfileChange(
    changeId: number, 
    action: 'approve' | 'reject', 
    comment?: string
  ): Promise<void> {
    await api.post(`/hr/profile-changes/${changeId}/approve`, {
      action,
      comment: comment || ''
    });
  },

  // Get instructor profiles for management
  async getInstructorProfiles(): Promise<any[]> {
    const response = await api.get('/hr/instructors');
    return response.data.data;
  },

  // Get organization profiles for management
  async getOrganizationProfiles(): Promise<any[]> {
    const response = await api.get('/hr/organizations');
    return response.data.data;
  },

  // Update instructor profile (HR can edit directly)
  async updateInstructorProfile(instructorId: number, data: any): Promise<void> {
    await api.put(`/hr/instructors/${instructorId}`, data);
  },

  // Update organization profile (HR can edit directly)
  async updateOrganizationProfile(organizationId: number, data: any): Promise<void> {
    await api.put(`/hr/organizations/${organizationId}`, data);
  },

  // Get compliance alerts
  async getComplianceAlerts(): Promise<any[]> {
    const response = await api.get('/hr/compliance-alerts');
    return response.data.data;
  },

  // Get returned payment requests for HR review
  async getReturnedPaymentRequests(filters?: { page?: number; limit?: number }): Promise<any> {
    const response = await api.get('/hr-dashboard/returned-payment-requests', { params: filters });
    return response.data.data;
  },

  // Process returned payment request (override/final reject)
  async processReturnedPaymentRequest(
    requestId: number, 
    action: 'override_approve' | 'final_reject', 
    notes: string
  ): Promise<void> {
    await api.post(`/hr-dashboard/returned-payment-requests/${requestId}/process`, {
      action,
      notes
    });
  },

  // Get HR reports
  async getReports(reportType: string, filters?: any): Promise<any> {
    const response = await api.get(`/hr/reports/${reportType}`, { params: filters });
    return response.data.data;
  }
};

export default hrService; 