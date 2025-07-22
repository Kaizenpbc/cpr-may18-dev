import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import AccountingDashboard from '../AccountingDashboard';

// Mock the API
const mockApi = {
  get: jest.fn()
};

jest.mock('../../../services/api', () => ({
  api: mockApi
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

describe('AccountingDashboard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders accounting dashboard title', () => {
    mockApi.get.mockResolvedValue({ data: { data: { payments: [], invoices: [] } } });
    renderWithProviders(<AccountingDashboard />);
    
    expect(screen.getByText('Accounting Dashboard')).toBeInTheDocument();
  });

  test('displays key metrics section', () => {
    mockApi.get.mockResolvedValue({ data: { data: { payments: [], invoices: [] } } });
    renderWithProviders(<AccountingDashboard />);
    
    expect(screen.getByText('Key Metrics')).toBeInTheDocument();
  });

  test('displays pending actions section', () => {
    mockApi.get.mockResolvedValue({ data: { data: { payments: [], invoices: [] } } });
    renderWithProviders(<AccountingDashboard />);
    
    expect(screen.getByText('Pending Actions')).toBeInTheDocument();
  });

  test('displays payments pending verification', async () => {
    mockApi.get.mockResolvedValue({ 
      data: { 
        data: { 
          payments: [
            { status: 'pending_verification', verified_by_accounting_at: null }
          ], 
          invoices: [] 
        } 
      } 
    });
    
    renderWithProviders(<AccountingDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Payments Pending Verification')).toBeInTheDocument();
    });
  });

  test('displays invoices pending approval', async () => {
    mockApi.get.mockResolvedValue({ 
      data: { 
        data: { 
          payments: [], 
          invoices: [
            { approval_status: 'pending_approval' }
          ] 
        } 
      } 
    });
    
    renderWithProviders(<AccountingDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Invoices Pending Approval')).toBeInTheDocument();
    });
  });

  test('shows correct counts for pending actions', async () => {
    mockApi.get.mockResolvedValue({ 
      data: { 
        data: { 
          payments: [
            { status: 'pending_verification' },
            { status: 'pending_verification' }
          ], 
          invoices: [
            { approval_status: 'pending_approval' }
          ] 
        } 
      } 
    });
    
    renderWithProviders(<AccountingDashboard />);

    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument(); // 2 pending payments
      expect(screen.getByText('1')).toBeInTheDocument(); // 1 pending invoice
    });
  });

  test('handles API errors gracefully', async () => {
    mockApi.get.mockRejectedValue(new Error('API Error'));
    renderWithProviders(<AccountingDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Pending Actions')).toBeInTheDocument();
    });
  });

  test('displays recent transactions section', () => {
    mockApi.get.mockResolvedValue({ data: { data: { payments: [], invoices: [] } } });
    renderWithProviders(<AccountingDashboard />);
    
    expect(screen.getByText('Recent Transactions')).toBeInTheDocument();
  });

  test('displays quick actions section', () => {
    mockApi.get.mockResolvedValue({ data: { data: { payments: [], invoices: [] } } });
    renderWithProviders(<AccountingDashboard />);
    
    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
  });

  test('displays total revenue metric', () => {
    mockApi.get.mockResolvedValue({ data: { data: { payments: [], invoices: [] } } });
    renderWithProviders(<AccountingDashboard />);
    
    expect(screen.getByText(/Total Revenue/i)).toBeInTheDocument();
  });

  test('displays outstanding invoices metric', () => {
    mockApi.get.mockResolvedValue({ data: { data: { payments: [], invoices: [] } } });
    renderWithProviders(<AccountingDashboard />);
    
    expect(screen.getByText(/Outstanding Invoices/i)).toBeInTheDocument();
  });

  test('displays monthly growth metric', () => {
    mockApi.get.mockResolvedValue({ data: { data: { payments: [], invoices: [] } } });
    renderWithProviders(<AccountingDashboard />);
    
    expect(screen.getByText(/Monthly Growth/i)).toBeInTheDocument();
  });

  test('pending actions are clickable', async () => {
    mockApi.get.mockResolvedValue({ 
      data: { 
        data: { 
          payments: [{ status: 'pending_verification' }], 
          invoices: [] 
        } 
      } 
    });
    
    renderWithProviders(<AccountingDashboard />);

    await waitFor(() => {
      const actionButtons = screen.getAllByRole('button');
      actionButtons.forEach(button => {
        expect(button).not.toBeDisabled();
      });
    });
  });
}); 