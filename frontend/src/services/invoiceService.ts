import {
  getInvoices as apiGetInvoices,
  getInvoiceDetails as apiGetInvoiceDetails,
  createInvoice as apiCreateInvoice,
  updateInvoice as apiUpdateInvoice,
  emailInvoice as apiEmailInvoice,
} from './api';

export const getInvoices = async () => {
  return apiGetInvoices();
};

export const getInvoiceDetails = async (invoiceId: number) => {
  return apiGetInvoiceDetails(invoiceId);
};

export const createInvoice = async (courseId: number) => {
  return apiCreateInvoice(courseId);
};

export const saveInvoice = async (invoiceId: number, invoiceData: Record<string, unknown>) => {
  return apiUpdateInvoice(invoiceId, invoiceData);
};

export const emailInvoice = async (invoiceId: number) => {
  return apiEmailInvoice(invoiceId);
};

export default {
  getInvoices,
  getInvoiceDetails,
  createInvoice,
  saveInvoice,
  emailInvoice,
};
