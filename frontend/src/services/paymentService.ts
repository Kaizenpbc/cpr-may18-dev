import { getInvoicePayments as apiGetInvoicePayments, recordInvoicePayment } from './api';

export const getInvoicePayments = async invoiceId => {
  return apiGetInvoicePayments(invoiceId);
};

export const recordPayment = async (invoiceId, paymentData) => {
  return recordInvoicePayment(invoiceId, paymentData);
};

export default {
  getInvoicePayments,
  recordPayment,
};
