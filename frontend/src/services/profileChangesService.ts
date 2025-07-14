import api from './api';

export interface ProfileChangeRequest {
  field_name: string;
  new_value: string;
  change_type: 'instructor' | 'organization';
}

export interface ProfileChange {
  id: number;
  change_type: 'instructor' | 'organization';
  field_name: string;
  old_value: string | null;
  new_value: string;
  status: 'pending' | 'approved' | 'rejected';
  hr_comment?: string;
  created_at: string;
  updated_at: string;
}

export const profileChangesService = {
  // Submit a profile change request
  async submitChangeRequest(data: ProfileChangeRequest): Promise<any> {
    const response = await api.post('/profile-changes', data);
    return response.data;
  },

  // Get user's own profile change requests
  async getUserProfileChanges(): Promise<ProfileChange[]> {
    const response = await api.get('/profile-changes');
    return response.data.data;
  },

  // Get pending profile changes (HR only)
  async getPendingChanges(): Promise<ProfileChange[]> {
    const response = await api.get('/hr/profile-changes');
    return response.data.data;
  },

  // Approve or reject a profile change (HR only)
  async approveChange(changeId: number, action: 'approve' | 'reject', comment?: string): Promise<void> {
    await api.post(`/hr/profile-changes/${changeId}/approve`, {
      action,
      comment: comment || ''
    });
  }
};

export default profileChangesService; 