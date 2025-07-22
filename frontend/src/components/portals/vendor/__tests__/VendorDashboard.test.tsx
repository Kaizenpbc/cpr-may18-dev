import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import VendorDashboard from '../VendorDashboard';

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('VendorDashboard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders vendor dashboard title', () => {
    renderWithRouter(<VendorDashboard />);
    expect(screen.getByText('Vendor Dashboard')).toBeInTheDocument();
  });

  test('renders welcome message', () => {
    renderWithRouter(<VendorDashboard />);
    expect(screen.getByText(/Welcome to your vendor portal/i)).toBeInTheDocument();
  });

  test('displays quick actions section', () => {
    renderWithRouter(<VendorDashboard />);
    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
  });

  test('displays all quick action buttons', () => {
    renderWithRouter(<VendorDashboard />);
    
    expect(screen.getByText('Upload New Invoice')).toBeInTheDocument();
    expect(screen.getByText('View All Invoices')).toBeInTheDocument();
    expect(screen.getByText('Update Profile')).toBeInTheDocument();
  });

  test('upload invoice button navigates correctly', () => {
    renderWithRouter(<VendorDashboard />);
    
    const uploadButton = screen.getByText('Upload New Invoice');
    fireEvent.click(uploadButton);
    
    expect(mockNavigate).toHaveBeenCalledWith('/vendor/upload');
  });

  test('view invoices button navigates correctly', () => {
    renderWithRouter(<VendorDashboard />);
    
    const viewButton = screen.getByText('View All Invoices');
    fireEvent.click(viewButton);
    
    expect(mockNavigate).toHaveBeenCalledWith('/vendor/history');
  });

  test('update profile button navigates correctly', () => {
    renderWithRouter(<VendorDashboard />);
    
    const profileButton = screen.getByText('Update Profile');
    fireEvent.click(profileButton);
    
    expect(mockNavigate).toHaveBeenCalledWith('/vendor/profile');
  });

  test('quick action buttons are clickable', () => {
    renderWithRouter(<VendorDashboard />);
    
    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button).not.toBeDisabled();
    });
  });

  test('displays recent activity section', () => {
    renderWithRouter(<VendorDashboard />);
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
  });

  test('displays statistics section', () => {
    renderWithRouter(<VendorDashboard />);
    expect(screen.getByText('Statistics')).toBeInTheDocument();
  });

  test('displays pending invoices count', () => {
    renderWithRouter(<VendorDashboard />);
    expect(screen.getByText(/Pending Invoices/i)).toBeInTheDocument();
  });

  test('displays total invoices count', () => {
    renderWithRouter(<VendorDashboard />);
    expect(screen.getByText(/Total Invoices/i)).toBeInTheDocument();
  });

  test('displays total amount billed', () => {
    renderWithRouter(<VendorDashboard />);
    expect(screen.getByText(/Total Amount Billed/i)).toBeInTheDocument();
  });
}); 