import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from '../AuthContext';

// Mock the API
const mockApi = {
  post: jest.fn(),
  get: jest.fn()
};

jest.mock('../../services/api', () => ({
  api: mockApi
}));

const TestComponent = () => {
  const { user, login, logout, isAuthenticated } = useAuth();
  
  return (
    <div>
      <div data-testid="user-info">
        {user ? `Logged in as ${user.name}` : 'Not logged in'}
      </div>
      <div data-testid="auth-status">
        {isAuthenticated ? 'Authenticated' : 'Not authenticated'}
      </div>
      <button onClick={() => login('test@example.com', 'password')}>
        Login
      </button>
      <button onClick={logout}>Logout</button>
    </div>
  );
};

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
        <AuthProvider>
          {component}
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  test('provides initial unauthenticated state', () => {
    renderWithProviders(<TestComponent />);
    
    expect(screen.getByTestId('user-info')).toHaveTextContent('Not logged in');
    expect(screen.getByTestId('auth-status')).toHaveTextContent('Not authenticated');
  });

  test('login function calls API correctly', async () => {
    const mockUser = {
      id: 1,
      name: 'Test User',
      email: 'test@example.com',
      role: 'vendor'
    };

    mockApi.post.mockResolvedValue({ 
      data: { 
        user: mockUser, 
        token: 'mock-jwt-token' 
      } 
    });

    renderWithProviders(<TestComponent />);
    
    const loginButton = screen.getByText('Login');
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalledWith('/auth/login', {
        email: 'test@example.com',
        password: 'password'
      });
    });
  });

  test('stores token in localStorage on successful login', async () => {
    const mockUser = {
      id: 1,
      name: 'Test User',
      email: 'test@example.com',
      role: 'vendor'
    };

    mockApi.post.mockResolvedValue({ 
      data: { 
        user: mockUser, 
        token: 'mock-jwt-token' 
      } 
    });

    renderWithProviders(<TestComponent />);
    
    const loginButton = screen.getByText('Login');
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(localStorage.getItem('token')).toBe('mock-jwt-token');
    });
  });

  test('handles login errors', async () => {
    mockApi.post.mockRejectedValue(new Error('Invalid credentials'));

    renderWithProviders(<TestComponent />);
    
    const loginButton = screen.getByText('Login');
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(screen.getByTestId('user-info')).toHaveTextContent('Not logged in');
    });
  });

  test('logout function clears user state', async () => {
    // First login
    const mockUser = {
      id: 1,
      name: 'Test User',
      email: 'test@example.com',
      role: 'vendor'
    };

    mockApi.post.mockResolvedValue({ 
      data: { 
        user: mockUser, 
        token: 'mock-jwt-token' 
      } 
    });

    renderWithProviders(<TestComponent />);
    
    const loginButton = screen.getByText('Login');
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(screen.getByTestId('user-info')).toHaveTextContent('Logged in as Test User');
    });

    // Then logout
    const logoutButton = screen.getByText('Logout');
    fireEvent.click(logoutButton);

    await waitFor(() => {
      expect(screen.getByTestId('user-info')).toHaveTextContent('Not logged in');
      expect(localStorage.getItem('token')).toBeNull();
    });
  });

  test('validates token on mount', async () => {
    localStorage.setItem('token', 'existing-token');
    
    const mockUser = {
      id: 1,
      name: 'Test User',
      email: 'test@example.com',
      role: 'vendor'
    };

    mockApi.get.mockResolvedValue({ data: { user: mockUser } });

    renderWithProviders(<TestComponent />);

    await waitFor(() => {
      expect(mockApi.get).toHaveBeenCalledWith('/auth/validate');
    });
  });

  test('handles token validation errors', async () => {
    localStorage.setItem('token', 'invalid-token');
    
    mockApi.get.mockRejectedValue(new Error('Invalid token'));

    renderWithProviders(<TestComponent />);

    await waitFor(() => {
      expect(localStorage.getItem('token')).toBeNull();
      expect(screen.getByTestId('user-info')).toHaveTextContent('Not logged in');
    });
  });

  test('provides user role information', async () => {
    const mockUser = {
      id: 1,
      name: 'Test User',
      email: 'test@example.com',
      role: 'vendor'
    };

    mockApi.post.mockResolvedValue({ 
      data: { 
        user: mockUser, 
        token: 'mock-jwt-token' 
      } 
    });

    renderWithProviders(<TestComponent />);
    
    const loginButton = screen.getByText('Login');
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(screen.getByTestId('user-info')).toHaveTextContent('Logged in as Test User');
    });
  });

  test('handles network errors gracefully', async () => {
    mockApi.post.mockRejectedValue(new Error('Network error'));

    renderWithProviders(<TestComponent />);
    
    const loginButton = screen.getByText('Login');
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(screen.getByTestId('user-info')).toHaveTextContent('Not logged in');
    });
  });
});
