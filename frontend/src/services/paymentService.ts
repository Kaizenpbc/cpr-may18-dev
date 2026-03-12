import { getInvoicePayments as apiGetInvoicePayments, recordInvoicePayment } from './api';

export const getInvoicePayments = async (invoiceId: any) => {
  return apiGetInvoicePayments(invoiceId);
};

export const recordPayment = async (invoiceId: any, paymentData: any) => {
  return recordInvoicePayment(invoiceId, paymentData);
};

export default {
  getInvoicePayments,
  recordPayment,
};
