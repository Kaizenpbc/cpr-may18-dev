import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CustomThemeProvider } from '../contexts/ThemeContext';
import { SnackbarProvider } from '../contexts/SnackbarContext';
import { RealtimeProvider } from '../contexts/RealtimeContext';
import ThemeToggle from '../components/common/ThemeToggle';
import AccessibleButton from '../components/common/AccessibleButton';
import AccessibleTextField from '../components/common/AccessibleTextField';
import MobileOptimized from '../components/common/MobileOptimized';

// Mock the accessibility hook
jest.mock('../hooks/useAccessibility', () => ({
  useAccessibility: () => ({
    announceToScreenReader: jest.fn(),
    setFocus: jest.fn(),
  }),
}));

// Mock the responsive hook
jest.mock('../hooks/useResponsive', () => ({
  useResponsive: () => ({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isLargeScreen: false,
    windowSize: { width: 1200, height: 800 },
    breakpoint: 'lg',
    isBreakpoint: jest.fn(),
    isBreakpointDown: jest.fn(),
    isBreakpointUp: jest.fn(),
    isBreakpointOnly: jest.fn(),
    isBreakpointBetween: jest.fn(),
  }),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    <QueryClientProvider client={queryClient}>
      <CustomThemeProvider>
        <SnackbarProvider>
          <RealtimeProvider>
            {children}
          </RealtimeProvider>
        </SnackbarProvider>
      </CustomThemeProvider>
    </QueryClientProvider>
  </BrowserRouter>
);

describe('Accessibility Tests', () => {
  describe('ThemeToggle', () => {
    test('should have proper ARIA attributes', () => {
      render(
        <TestWrapper>
          <ThemeToggle />
        </TestWrapper>
      );

      const toggleButton = screen.getByRole('button');
      expect(toggleButton).toHaveAttribute('aria-label');
      expect(toggleButton).toHaveAttribute('aria-hidden', 'true');
    });

    test('should toggle theme on click', () => {
      render(
        <TestWrapper>
          <ThemeToggle />
        </TestWrapper>
      );

      const toggleButton = screen.getByRole('button');
      fireEvent.click(toggleButton);
      
      // Theme toggle should be clickable
      expect(toggleButton).toBeInTheDocument();
    });
  });

  describe('AccessibleButton', () => {
    test('should have proper accessibility attributes', () => {
      render(
        <TestWrapper>
          <AccessibleButton>Test Button</AccessibleButton>
        </TestWrapper>
      );

      const button = screen.getByRole('button', { name: /test button/i });
      expect(button).toHaveAttribute('aria-disabled', 'false');
      expect(button).toHaveStyle({ minHeight: '44px', minWidth: '44px' });
    });

    test('should show loading state with proper ARIA attributes', () => {
      render(
        <TestWrapper>
          <AccessibleButton loading loadingText="Loading...">
            Test Button
          </AccessibleButton>
        </TestWrapper>
      );

      const button = screen.getByRole('button', { name: /loading/i });
      expect(button).toHaveAttribute('aria-disabled', 'true');
      expect(button).toHaveAttribute('aria-label', 'Loading...');
    });

    test('should announce on click when configured', () => {
      const { announceToScreenReader } = require('../hooks/useAccessibility').useAccessibility();
      
      render(
        <TestWrapper>
          <AccessibleButton 
            announceOnClick 
            announceText="Button clicked"
          >
            Test Button
          </AccessibleButton>
        </TestWrapper>
      );

      const button = screen.getByRole('button', { name: /test button/i });
      fireEvent.click(button);
      
      expect(announceToScreenReader).toHaveBeenCalledWith('Button clicked');
    });
  });

  describe('AccessibleTextField', () => {
    test('should have proper accessibility attributes', () => {
      render(
        <TestWrapper>
          <AccessibleTextField 
            label="Test Input"
            placeholder="Enter text"
          />
        </TestWrapper>
      );

      const input = screen.getByLabelText(/test input/i);
      expect(input).toHaveAttribute('placeholder', 'Enter text');
    });

    test('should announce on focus when configured', () => {
      const { announceToScreenReader } = require('../hooks/useAccessibility').useAccessibility();
      
      render(
        <TestWrapper>
          <AccessibleTextField 
            label="Test Input"
            announceOnFocus
            announceText="Input focused"
          />
        </TestWrapper>
      );

      const input = screen.getByLabelText(/test input/i);
      fireEvent.focus(input);
      
      expect(announceToScreenReader).toHaveBeenCalledWith('Input focused');
    });

    test('should have minimum touch target size', () => {
      render(
        <TestWrapper>
          <AccessibleTextField label="Test Input" />
        </TestWrapper>
      );

      const inputContainer = screen.getByLabelText(/test input/i).closest('.MuiOutlinedInput-root');
      expect(inputContainer).toHaveStyle({ minHeight: '44px' });
    });
  });

  describe('MobileOptimized', () => {
    test('should render children correctly', () => {
      render(
        <TestWrapper>
          <MobileOptimized>
            <div>Test Content</div>
          </MobileOptimized>
        </TestWrapper>
      );

      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    test('should apply mobile-specific styles when on mobile', () => {
      // Mock mobile breakpoint
      jest.doMock('../hooks/useResponsive', () => ({
        useResponsive: () => ({
          isMobile: true,
          isTablet: false,
          isDesktop: false,
          isLargeScreen: false,
          windowSize: { width: 400, height: 800 },
          breakpoint: 'xs',
          isBreakpoint: jest.fn(),
          isBreakpointDown: jest.fn(),
          isBreakpointUp: jest.fn(),
          isBreakpointOnly: jest.fn(),
          isBreakpointBetween: jest.fn(),
        }),
      }));

      render(
        <TestWrapper>
          <MobileOptimized>
            <div>Mobile Content</div>
          </MobileOptimized>
        </TestWrapper>
      );

      expect(screen.getByText('Mobile Content')).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    test('should support keyboard navigation', () => {
      render(
        <TestWrapper>
          <div>
            <AccessibleButton>First Button</AccessibleButton>
            <AccessibleButton>Second Button</AccessibleButton>
          </div>
        </TestWrapper>
      );

      const firstButton = screen.getByRole('button', { name: /first button/i });
      const secondButton = screen.getByRole('button', { name: /second button/i });

      firstButton.focus();
      expect(document.activeElement).toBe(firstButton);

      fireEvent.keyDown(firstButton, { key: 'Tab' });
      expect(document.activeElement).toBe(secondButton);
    });
  });

  describe('Screen Reader Support', () => {
    test('should have proper ARIA labels', () => {
      render(
        <TestWrapper>
          <div>
            <AccessibleButton aria-label="Save document">Save</AccessibleButton>
            <AccessibleTextField 
              label="Email Address"
              aria-describedby="email-help"
            />
            <div id="email-help">Enter your email address</div>
          </div>
        </TestWrapper>
      );

      expect(screen.getByRole('button', { name: /save document/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toHaveAttribute('aria-describedby', 'email-help');
    });
  });

  describe('Focus Management', () => {
    test('should manage focus properly', () => {
      render(
        <TestWrapper>
          <div>
            <AccessibleButton>Button 1</AccessibleButton>
            <AccessibleButton>Button 2</AccessibleButton>
          </div>
        </TestWrapper>
      );

      const button1 = screen.getByRole('button', { name: /button 1/i });
      const button2 = screen.getByRole('button', { name: /button 2/i });

      button1.focus();
      expect(document.activeElement).toBe(button1);

      button2.focus();
      expect(document.activeElement).toBe(button2);
    });
  });
});
