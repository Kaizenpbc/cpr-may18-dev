import { api } from './api';

export interface PayRateTier {
  id: number;
  name: string;
  description?: string;
  base_hourly_rate: number;
  course_bonus: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InstructorPayRate {
  id: number;
  instructor_id: number;
  tier_id?: number;
  hourly_rate: number;
  course_bonus: number;
  effective_date: string;
  end_date?: string;
  notes?: string;
  created_by?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  tier_name?: string;
  tier_description?: string;
}

export interface InstructorPayRateDetail {
  instructor: {
    id: number;
    username: string;
    email: string;
    phone?: string;
  };
  currentRate: InstructorPayRate | null;
  history: PayRateHistory[];
}

export interface PayRateHistory {
  id: number;
  instructor_id: number;
  old_hourly_rate?: number;
  new_hourly_rate: number;
  old_course_bonus?: number;
  new_course_bonus: number;
  old_tier_id?: number;
  new_tier_id?: number;
  change_reason?: string;
  changed_by?: number;
  effective_date: string;
  created_at: string;
  old_tier_name?: string;
  new_tier_name?: string;
  changed_by_name?: string;
}

export interface InstructorPayRateList {
  id: number;
  username: string;
  email: string;
  phone?: string;
  hourly_rate?: number;
  course_bonus?: number;
  effective_date?: string;
  rate_active?: boolean;
  tier_name?: string;
  tier_description?: string;
  rate_status: 'Set' | 'Not Set';
}

export interface PayRateTierForm {
  name: string;
  description?: string;
  base_hourly_rate: number;
  course_bonus: number;
}

export interface InstructorPayRateForm {
  hourly_rate: number;
  course_bonus?: number;
  tier_id?: number;
  effective_date?: string;
  notes?: string;
  change_reason?: string;
}

export interface BulkPayRateUpdate {
  instructor_ids: number[];
  hourly_rate: number;
  course_bonus?: number;
  tier_id?: number;
  effective_date?: string;
  notes?: string;
  change_reason?: string;
}

class PayRateService {
  // Pay Rate Tiers
  async getTiers(): Promise<PayRateTier[]> {
    const response = await api.get('/pay-rates/tiers');
    return response.data.data;
  }

  async createTier(tier: PayRateTierForm): Promise<PayRateTier> {
    const response = await api.post('/pay-rates/tiers', tier);
    return response.data.data;
  }

  async updateTier(id: number, tier: Partial<PayRateTierForm> & { is_active?: boolean }): Promise<PayRateTier> {
    const response = await api.put(`/pay-rates/tiers/${id}`, tier);
    return response.data.data;
  }

  // Instructor Pay Rates
  async getInstructors(params?: {
    page?: number;
    limit?: number;
    search?: string;
    has_rate?: 'true' | 'false';
  }): Promise<{
    instructors: InstructorPayRateList[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    const response = await api.get('/pay-rates/instructors', { params });
    return response.data.data;
  }

  async getInstructorDetail(instructorId: number): Promise<InstructorPayRateDetail> {
    const response = await api.get(`/pay-rates/instructors/${instructorId}`);
    return response.data.data;
  }

  async setInstructorRate(instructorId: number, rate: InstructorPayRateForm): Promise<InstructorPayRate> {
    const response = await api.post(`/pay-rates/instructors/${instructorId}`, rate);
    return response.data.data;
  }

  async updateInstructorRate(instructorId: number, rate: Partial<InstructorPayRateForm>): Promise<InstructorPayRate> {
    const response = await api.put(`/pay-rates/instructors/${instructorId}`, rate);
    return response.data.data;
  }

  async getCurrentRate(instructorId: number, date?: string): Promise<{
    hourly_rate: number;
    course_bonus: number;
    tier_name?: string;
    is_default: boolean;
  }> {
    const response = await api.get(`/pay-rates/instructors/${instructorId}/current`, {
      params: { date }
    });
    return response.data.data;
  }

  // Bulk Operations
  async bulkUpdateRates(update: BulkPayRateUpdate): Promise<InstructorPayRate[]> {
    const response = await api.post('/pay-rates/bulk-update', update);
    return response.data.data;
  }
}

export const payRateService = new PayRateService(); 