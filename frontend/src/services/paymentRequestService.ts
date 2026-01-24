import { api } from './api';

export interface PaymentRequest {
  id: number;
  instructorId: number;
  timesheetId: number;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  notes: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  createdAt: string;
  updatedAt: string;
  instructorName?: string;
  instructorEmail?: string;
  weekStartDate?: string;
  totalHours?: number;
  coursesTaught?: number;
  timesheetComment?: string;
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