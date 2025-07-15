import { api } from './api';

export interface PaymentRequest {
  id: number;
  instructor_id: number;
  timesheet_id: number;
  amount: number;
  payment_date: string;
  payment_method: string;
  notes: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  created_at: string;
  updated_at: string;
  instructor_name?: string;
  instructor_email?: string;
  week_start_date?: string;
  total_hours?: number;
  courses_taught?: number;
  timesheet_comment?: string;
}

export interface PaymentRequestStats {
  pending: {
    count: number;
    amount: number;
  };
  approvedThisMonth: {
    count: number;
    amount: number;
  };
  rejectedThisMonth: number;
}

export interface PaymentRequestFilters {
  status?: string;
  instructor_id?: number;
  page?: number;
  limit?: number;
}

export interface PaymentRequestResponse {
  requests: PaymentRequest[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface PaymentRequestHistoryResponse {
  history: PaymentRequest[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ProcessPaymentRequestData {
  action: 'approve' | 'reject';
  notes?: string;
}

export interface BulkProcessPaymentRequestData {
  requestIds: number[];
  action: 'approve' | 'reject';
  notes?: string;
}

class PaymentRequestService {
  // Get payment request statistics
  async getStats(): Promise<PaymentRequestStats> {
    const response = await api.get<{ success: boolean; data: PaymentRequestStats }>('/payment-requests/stats');
    return response.data.data;
  }

  // Get payment requests with filtering
  async getPaymentRequests(filters: PaymentRequestFilters = {}): Promise<PaymentRequestResponse> {
    const params = new URLSearchParams();
    
    if (filters.status) params.append('status', filters.status);
    if (filters.instructor_id) params.append('instructor_id', filters.instructor_id.toString());
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    
    const response = await api.get<{ success: boolean; data: PaymentRequestResponse }>(`/payment-requests?${params.toString()}`);
    return response.data.data;
  }

  // Get payment request details
  async getPaymentRequest(requestId: number): Promise<PaymentRequest> {
    const response = await api.get<{ success: boolean; data: PaymentRequest }>(`/payment-requests/${requestId}`);
    return response.data.data;
  }

  // Process payment request (approve/reject)
  async processPaymentRequest(requestId: number, data: ProcessPaymentRequestData): Promise<void> {
    await api.post(`/payment-requests/${requestId}/process`, data);
  }

  // Bulk process payment requests
  async bulkProcessPaymentRequests(data: BulkProcessPaymentRequestData): Promise<{
    processed: Array<{ requestId: number; status: string }>;
    errors: Array<{ requestId: number; status: string; message: string }>;
  }> {
    const response = await api.post<{ 
      success: boolean; 
      data: { 
        processed: Array<{ requestId: number; status: string }>;
        errors: Array<{ requestId: number; status: string; message: string }>;
      } 
    }>('/payment-requests/bulk-process', data);
    return response.data.data;
  }

  // Get payment request history for instructor
  async getInstructorHistory(instructorId: number, page: number = 1, limit: number = 10): Promise<PaymentRequestHistoryResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });
    
    const response = await api.get<{ success: boolean; data: PaymentRequestHistoryResponse }>(
      `/payment-requests/instructor/${instructorId}/history?${params.toString()}`
    );
    return response.data.data;
  }
}

export const paymentRequestService = new PaymentRequestService(); 