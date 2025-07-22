import { vendorApi } from '../api';

// Mock axios
const mockAxios = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn()
};

jest.mock('axios', () => ({
  create: () => mockAxios
}));

describe('Vendor API Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getInvoices', () => {
    test('fetches invoices successfully', async () => {
      const mockInvoices = [
        {
          id: 1,
          invoice_number: 'INV-2025-001',
          amount: 150.75,
          description: 'CPR Training',
          status: 'submitted',
          created_at: '2025-01-15T10:00:00Z'
        }
      ];

      mockAxios.get.mockResolvedValue({ data: mockInvoices });

      const result = await vendorApi.getInvoices();

      expect(mockAxios.get).toHaveBeenCalledWith('/vendor/invoices');
      expect(result).toEqual(mockInvoices);
    });

    test('handles API errors', async () => {
      const errorMessage = 'Failed to fetch invoices';
      mockAxios.get.mockRejectedValue(new Error(errorMessage));

      await expect(vendorApi.getInvoices()).rejects.toThrow(errorMessage);
    });

    test('processes invoice amounts correctly', async () => {
      const mockInvoices = [
        {
          id: 1,
          invoice_number: 'INV-2025-001',
          amount: '150.75', // String amount
          description: 'CPR Training',
          status: 'submitted'
        }
      ];

      mockAxios.get.mockResolvedValue({ data: mockInvoices });

      const result = await vendorApi.getInvoices();

      expect(result[0].amount).toBe(150.75); // Should be converted to number
    });
  });

  describe('uploadInvoice', () => {
    test('uploads invoice successfully', async () => {
      const mockInvoiceData = {
        description: 'CPR Training Course',
        amount: 150.75,
        due_date: '2025-02-15'
      };

      const mockResponse = {
        id: 1,
        invoice_number: 'INV-2025-001',
        ...mockInvoiceData
      };

      mockAxios.post.mockResolvedValue({ data: mockResponse });

      const result = await vendorApi.uploadInvoice(mockInvoiceData);

      expect(mockAxios.post).toHaveBeenCalledWith('/vendor/invoices', mockInvoiceData);
      expect(result).toEqual(mockResponse);
    });

    test('handles upload errors', async () => {
      const errorMessage = 'Upload failed';
      mockAxios.post.mockRejectedValue(new Error(errorMessage));

      await expect(vendorApi.uploadInvoice({})).rejects.toThrow(errorMessage);
    });
  });

  describe('getInvoiceById', () => {
    test('fetches single invoice successfully', async () => {
      const mockInvoice = {
        id: 1,
        invoice_number: 'INV-2025-001',
        amount: 150.75,
        description: 'CPR Training'
      };

      mockAxios.get.mockResolvedValue({ data: mockInvoice });

      const result = await vendorApi.getInvoiceById(1);

      expect(mockAxios.get).toHaveBeenCalledWith('/vendor/invoices/1');
      expect(result).toEqual(mockInvoice);
    });
  });

  describe('updateInvoice', () => {
    test('updates invoice successfully', async () => {
      const updateData = {
        description: 'Updated CPR Training',
        amount: 175.50
      };

      const mockResponse = {
        id: 1,
        invoice_number: 'INV-2025-001',
        ...updateData
      };

      mockAxios.put.mockResolvedValue({ data: mockResponse });

      const result = await vendorApi.updateInvoice(1, updateData);

      expect(mockAxios.put).toHaveBeenCalledWith('/vendor/invoices/1', updateData);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('deleteInvoice', () => {
    test('deletes invoice successfully', async () => {
      mockAxios.delete.mockResolvedValue({ data: { message: 'Invoice deleted' } });

      const result = await vendorApi.deleteInvoice(1);

      expect(mockAxios.delete).toHaveBeenCalledWith('/vendor/invoices/1');
      expect(result).toEqual({ message: 'Invoice deleted' });
    });
  });

  describe('downloadInvoicePDF', () => {
    test('downloads PDF successfully', async () => {
      const mockBlob = new Blob(['PDF content'], { type: 'application/pdf' });
      mockAxios.get.mockResolvedValue({ data: mockBlob });

      const result = await vendorApi.downloadInvoicePDF(1);

      expect(mockAxios.get).toHaveBeenCalledWith('/vendor/invoices/1/pdf', {
        responseType: 'blob'
      });
      expect(result).toEqual(mockBlob);
    });
  });

  describe('getVendorProfile', () => {
    test('fetches vendor profile successfully', async () => {
      const mockProfile = {
        id: 1,
        name: 'Test Vendor',
        email: 'vendor@test.com',
        phone: '123-456-7890'
      };

      mockAxios.get.mockResolvedValue({ data: mockProfile });

      const result = await vendorApi.getVendorProfile();

      expect(mockAxios.get).toHaveBeenCalledWith('/vendor/profile');
      expect(result).toEqual(mockProfile);
    });
  });

  describe('updateVendorProfile', () => {
    test('updates vendor profile successfully', async () => {
      const updateData = {
        name: 'Updated Vendor Name',
        email: 'updated@test.com'
      };

      const mockResponse = {
        id: 1,
        ...updateData
      };

      mockAxios.put.mockResolvedValue({ data: mockResponse });

      const result = await vendorApi.updateVendorProfile(updateData);

      expect(mockAxios.put).toHaveBeenCalledWith('/vendor/profile', updateData);
      expect(result).toEqual(mockResponse);
    });
  });
}); 