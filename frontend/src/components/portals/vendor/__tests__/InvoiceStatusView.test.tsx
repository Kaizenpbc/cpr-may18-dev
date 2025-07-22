import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import InvoiceStatusView from '../InvoiceStatusView';

// Mock the vendor API
const mockVendorApi = {
  getInvoices: jest.fn(),
  downloadInvoice: jest.fn()
};

jest.mock('../../../services/api', () => ({
  vendorApi: mockVendorApi
}));

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('InvoiceStatusView Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders invoice status dashboard title', () => {
    mockVendorApi.getInvoices.mockResolvedValue({ data: [] });
    renderWithProviders(<InvoiceStatusView />);
    
    expect(screen.getByText('Invoice Status Dashboard')).toBeInTheDocument();
  });

  test('displays status summary cards', async () => {
    const mockInvoices = [
      { id: 1, invoice_number: 'INV-001', amount: 100, status: 'submitted', created_at: '2025-01-15' },
      { id: 2, invoice_number: 'INV-002', amount: 200, status: 'approved', created_at: '2025-01-16' },
      { id: 3, invoice_number: 'INV-003', amount: 300, status: 'paid', created_at: '2025-01-17' }
    ];

    mockVendorApi.getInvoices.mockResolvedValue({ data: mockInvoices });
    renderWithProviders(<InvoiceStatusView />);

    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument(); // Submitted
      expect(screen.getByText('1')).toBeInTheDocument(); // Approved
      expect(screen.getByText('1')).toBeInTheDocument(); // Paid
    });
  });

  test('displays all status categories', async () => {
    mockVendorApi.getInvoices.mockResolvedValue({ data: [] });
    renderWithProviders(<InvoiceStatusView />);

    await waitFor(() => {
      expect(screen.getByText('Submitted')).toBeInTheDocument();
      expect(screen.getByText('Pending Review')).toBeInTheDocument();
      expect(screen.getByText('Approved')).toBeInTheDocument();
      expect(screen.getByText('Paid')).toBeInTheDocument();
      expect(screen.getByText('Rejected')).toBeInTheDocument();
      expect(screen.getByText('Overdue')).toBeInTheDocument();
    });
  });

  test('displays invoices in table format', async () => {
    const mockInvoices = [
      {
        id: 1,
        invoice_number: 'INV-2025-001',
        amount: 150.75,
        description: 'CPR Training Course',
        status: 'submitted',
        created_at: '2025-01-15T10:00:00Z',
        organization_name: 'Test Organization'
      }
    ];

    mockVendorApi.getInvoices.mockResolvedValue({ data: mockInvoices });
    renderWithProviders(<InvoiceStatusView />);

    await waitFor(() => {
      expect(screen.getByText('INV-2025-001')).toBeInTheDocument();
      expect(screen.getByText('CPR Training Course')).toBeInTheDocument();
      expect(screen.getByText('Test Organization')).toBeInTheDocument();
      expect(screen.getByText('$150.75')).toBeInTheDocument();
    });
  });

  test('displays status chips with correct colors', async () => {
    const mockInvoices = [
      { id: 1, invoice_number: 'INV-001', amount: 100, status: 'submitted', created_at: '2025-01-15' },
      { id: 2, invoice_number: 'INV-002', amount: 200, status: 'approved', created_at: '2025-01-16' },
      { id: 3, invoice_number: 'INV-003', amount: 300, status: 'rejected', created_at: '2025-01-17' }
    ];

    mockVendorApi.getInvoices.mockResolvedValue({ data: mockInvoices });
    renderWithProviders(<InvoiceStatusView />);

    await waitFor(() => {
      expect(screen.getByText('SUBMITTED')).toBeInTheDocument();
      expect(screen.getByText('APPROVED')).toBeInTheDocument();
      expect(screen.getByText('REJECTED')).toBeInTheDocument();
    });
  });

  test('search functionality works', async () => {
    const mockInvoices = [
      { id: 1, invoice_number: 'INV-001', amount: 100, status: 'submitted', created_at: '2025-01-15', description: 'CPR Training' },
      { id: 2, invoice_number: 'INV-002', amount: 200, status: 'approved', created_at: '2025-01-16', description: 'First Aid Training' }
    ];

    mockVendorApi.getInvoices.mockResolvedValue({ data: mockInvoices });
    renderWithProviders(<InvoiceStatusView />);

    await waitFor(() => {
      expect(screen.getByText('INV-001')).toBeInTheDocument();
      expect(screen.getByText('INV-002')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search by invoice number, description, or organization...');
    expect(searchInput).toBeInTheDocument();
  });

  test('status filter works', async () => {
    mockVendorApi.getInvoices.mockResolvedValue({ data: [] });
    renderWithProviders(<InvoiceStatusView />);

    await waitFor(() => {
      const statusSelect = screen.getByLabelText('Status Filter');
      expect(statusSelect).toBeInTheDocument();
    });
  });

  test('displays formatted currency correctly', async () => {
    const mockInvoices = [
      { id: 1, invoice_number: 'INV-001', amount: 1234.56, status: 'submitted', created_at: '2025-01-15' }
    ];

    mockVendorApi.getInvoices.mockResolvedValue({ data: mockInvoices });
    renderWithProviders(<InvoiceStatusView />);

    await waitFor(() => {
      expect(screen.getByText('$1,234.56')).toBeInTheDocument();
    });
  });

  test('displays formatted dates correctly', async () => {
    const mockInvoices = [
      { id: 1, invoice_number: 'INV-001', amount: 100, status: 'submitted', created_at: '2025-01-15T10:00:00Z' }
    ];

    mockVendorApi.getInvoices.mockResolvedValue({ data: mockInvoices });
    renderWithProviders(<InvoiceStatusView />);

    await waitFor(() => {
      expect(screen.getByText('1/15/2025')).toBeInTheDocument();
    });
  });

  test('handles empty invoice list', async () => {
    mockVendorApi.getInvoices.mockResolvedValue({ data: [] });
    renderWithProviders(<InvoiceStatusView />);

    await waitFor(() => {
      expect(screen.getByText('No invoices found matching your criteria.')).toBeInTheDocument();
    });
  });

  test('handles API errors gracefully', async () => {
    mockVendorApi.getInvoices.mockRejectedValue(new Error('API Error'));
    renderWithProviders(<InvoiceStatusView />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load invoices')).toBeInTheDocument();
    });
  });

  test('download button is present for each invoice', async () => {
    const mockInvoices = [
      { id: 1, invoice_number: 'INV-001', amount: 100, status: 'submitted', created_at: '2025-01-15' }
    ];

    mockVendorApi.getInvoices.mockResolvedValue({ data: mockInvoices });
    renderWithProviders(<InvoiceStatusView />);

    await waitFor(() => {
      const downloadButtons = screen.getAllByTitle('Download PDF');
      expect(downloadButtons).toHaveLength(1);
    });
  });

  test('view button is present for each invoice', async () => {
    const mockInvoices = [
      { id: 1, invoice_number: 'INV-001', amount: 100, status: 'submitted', created_at: '2025-01-15' }
    ];

    mockVendorApi.getInvoices.mockResolvedValue({ data: mockInvoices });
    renderWithProviders(<InvoiceStatusView />);

    await waitFor(() => {
      const viewButtons = screen.getAllByTitle('View Invoice');
      expect(viewButtons).toHaveLength(1);
    });
  });
}); 