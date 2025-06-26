import axios from 'axios';
import logger from './utils/logger';
import { API_URL } from './config';
import { ApiResponse } from './types/api';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

interface CoursePricing {
  id: number;
  price: number;
  // Add other fields as needed
}

interface Invoice {
  id: number;
  amount: number;
  // Add other fields as needed
}

interface Payment {
  id: number;
  amount: number;
  // Add other fields as needed
}

export const getScheduledClasses = async (): Promise<ApiResponse<any>> => {
  try {
    const response = await api.get('/classes/scheduled');
    return response.data;
  } catch (error) {
    logger.error('Error fetching scheduled classes:', error);
    throw error;
  }
};

export const getAvailability = async () => {
  try {
    const response = await api.get('/api/instructors/availability');
    return response.data;
  } catch (error) {
    logger.error('Error fetching availability:', error);
    throw error;
  }
};

// Accounting Portal API Functions
export const getAccountingDashboard = async (): Promise<ApiResponse<any>> => {
  try {
    const response = await api.get('/accounting/dashboard');
    return response.data;
  } catch (error) {
    logger.error('Error fetching accounting dashboard:', error);
    throw error;
  }
};

export const getCoursePricing = async () => {
  const response = await api.get('/accounting/course-pricing');
  return response.data;
};

export const updateCoursePricing = async (pricingId: number, price: number): Promise<ApiResponse<CoursePricing>> => {
  try {
    const response = await api.put(`/accounting/course-pricing/${pricingId}`, { price });
    return response.data;
  } catch (error) {
    logger.error('Error updating course price:', error);
    throw error;
  }
};

// Invoice-related functions (placeholders for now since backend endpoints don't exist yet)
export const getInvoices = async () => {
  try {
    // This endpoint doesn't exist yet - return empty array for now
    return [];
  } catch (error) {
    logger.error('Error fetching invoices:', error);
    throw error;
  }
};

export const getInvoiceDetails = async invoiceId => {
  try {
    // This endpoint doesn't exist yet - return null for now
    return null;
  } catch (error) {
    logger.error('Error fetching invoice details:', error);
    throw error;
  }
};

export const getInvoicePayments = async invoiceId => {
  try {
    // This endpoint doesn't exist yet - return empty array for now
    return [];
  } catch (error) {
    logger.error('Error fetching invoice payments:', error);
    throw error;
  }
};

export const recordPayment = async (invoiceId: number, amount: number): Promise<ApiResponse<Payment>> => {
  try {
    const response = await api.post(`/accounting/invoices/${invoiceId}/payments`, { amount });
    return response.data;
  } catch (error) {
    logger.error('Error recording payment:', error);
    throw error;
  }
};

export const getBillingQueue = async () => {
  try {
    // This endpoint doesn't exist yet - return empty array for now
    return [];
  } catch (error) {
    logger.error('Error fetching billing queue:', error);
    throw error;
  }
};

export const createInvoice = async courseId => {
  try {
    // This endpoint doesn't exist yet - return success for now
    return { success: true, invoiceId: Date.now() };
  } catch (error) {
    logger.error('Error creating invoice:', error);
    throw error;
  }
};

// Report API functions (placeholders for now)
export const getRevenueReport = async year => {
  try {
    // This endpoint doesn't exist yet - return empty data for now
    return {
      year,
      months: [],
      totalRevenue: 0,
    };
  } catch (error) {
    logger.error('Error fetching revenue report:', error);
    throw error;
  }
};

export const getInstructorWorkloadReport = async (startDate, endDate) => {
  try {
    // This endpoint doesn't exist yet - return empty data for now
    return [];
  } catch (error) {
    logger.error('Error fetching instructor workload report:', error);
    throw error;
  }
};

export const getArAgingReport = async () => {
  try {
    // This endpoint doesn't exist yet - return empty data for now
    return {
      buckets: [],
      totalOutstanding: 0,
    };
  } catch (error) {
    logger.error('Error fetching AR aging report:', error);
    throw error;
  }
};

export default api;
