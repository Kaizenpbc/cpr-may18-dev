import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import InvoiceHistory from '../InvoiceHistory';

// Mock the vendor API
const mockVendorApi = {
  getInvoices: jest.fn()
};

jest.mock('../../../services/api', () => ({
  vendorApi: mockVendorApi
}));

// Mock data
const mockInvoices = [
  {
    id: 1,
    invoice_number: 'INV-2025-001',
    amount: 150.75,
    description: 'CPR Training Course',
    status: 'submitted',
    created_at: '2025-01-15T10:00:00Z',
    due_date: '2025-02-15T10:00:00Z'
  },
  {
    id: 2,
    invoice_number: 'INV-2025-002',
    amount: 225.50,
    description: 'First Aid Training',
    status: 'approved',
    created_at: '2025-01-16T10:00:00Z',
    due_date: '2025-02-16T10:00:00Z'
  }
];

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

describe('InvoiceHistory Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders invoice history title', () => {
    mockVendorApi.getInvoices.mockResolvedValue({ data: [] });
    renderWithProviders(<InvoiceHistory />);
    
    expect(screen.getByText('Invoice History')).toBeInTheDocument();
  });

  test('displays loading state initially', () => {
    mockVendorApi.getInvoices.mockImplementation(() => new Promise(() => {}));
    renderWithProviders(<InvoiceHistory />);
    
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  test('displays invoices from API', async () => {
    mockVendorApi.getInvoices.mockResolvedValue({ data: mockInvoices });
    renderWithProviders(<InvoiceHistory />);

    await waitFor(() => {
      expect(screen.getByText('INV-2025-001')).toBeInTheDocument();
      expect(screen.getByText('INV-2025-002')).toBeInTheDocument();
    });
  });

  test('displays invoice amounts correctly', async () => {
    mockVendorApi.getInvoices.mockResolvedValue({ data: mockInvoices });
    renderWithProviders(<InvoiceHistory />);

    await waitFor(() => {
      expect(screen.getByText('$150.75')).toBeInTheDocument();
      expect(screen.getByText('$225.50')).toBeInTheDocument();
    });
  });

  test('displays error message when API fails', async () => {
    mockVendorApi.getInvoices.mockRejectedValue(new Error('API Error'));
    renderWithProviders(<InvoiceHistory />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load invoices')).toBeInTheDocument();
    });
  });

  test('search functionality works', async () => {
    mockVendorApi.getInvoices.mockResolvedValue({ data: mockInvoices });
    renderWithProviders(<InvoiceHistory />);

    await waitFor(() => {
      expect(screen.getByText('INV-2025-001')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search invoices');
    fireEvent.change(searchInput, { target: { value: 'INV-2025-001' } });

    expect(searchInput).toHaveValue('INV-2025-001');
    expect(screen.getByText('INV-2025-001')).toBeInTheDocument();
    expect(screen.queryByText('INV-2025-002')).not.toBeInTheDocument();
  });

  test('status filter works', async () => {
    mockVendorApi.getInvoices.mockResolvedValue({ data: mockInvoices });
    renderWithProviders(<InvoiceHistory />);

    await waitFor(() => {
      expect(screen.getByText('INV-2025-001')).toBeInTheDocument();
    });

    const statusSelect = screen.getByLabelText('Status Filter');
    fireEvent.change(statusSelect, { target: { value: 'submitted' } });

    expect(statusSelect).toHaveValue('submitted');
  });

  test('displays invoice status chips correctly', async () => {
    mockVendorApi.getInvoices.mockResolvedValue({ data: mockInvoices });
    renderWithProviders(<InvoiceHistory />);

    await waitFor(() => {
      expect(screen.getByText('SUBMITTED')).toBeInTheDocument();
      expect(screen.getByText('APPROVED')).toBeInTheDocument();
    });
  });

  test('displays created and due dates correctly', async () => {
    mockVendorApi.getInvoices.mockResolvedValue({ data: mockInvoices });
    renderWithProviders(<InvoiceHistory />);

    await waitFor(() => {
      expect(screen.getByText('1/15/2025')).toBeInTheDocument();
      expect(screen.getByText('2/15/2025')).toBeInTheDocument();
    });
  });

  test('handles empty invoice list', async () => {
    mockVendorApi.getInvoices.mockResolvedValue({ data: [] });
    renderWithProviders(<InvoiceHistory />);

    await waitFor(() => {
      expect(screen.getByText('No invoices found matching your criteria.')).toBeInTheDocument();
    });
  });

  test('download button is present for each invoice', async () => {
    mockVendorApi.getInvoices.mockResolvedValue({ data: mockInvoices });
    renderWithProviders(<InvoiceHistory />);

    await waitFor(() => {
      const downloadButtons = screen.getAllByTitle('Download PDF');
      expect(downloadButtons).toHaveLength(2);
    });
  });

  test('view button is present for each invoice', async () => {
    mockVendorApi.getInvoices.mockResolvedValue({ data: mockInvoices });
    renderWithProviders(<InvoiceHistory />);

    await waitFor(() => {
      const viewButtons = screen.getAllByTitle('View Invoice');
      expect(viewButtons).toHaveLength(2);
    });
  });
}); 