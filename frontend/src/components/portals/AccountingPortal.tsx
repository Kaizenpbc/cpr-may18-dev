import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Container, Button } from '@mui/material';
import NotificationBell from '../common/NotificationBell';
import {
  Dashboard as DashboardIcon,
  ReceiptLong as BillingIcon,
  RequestQuote as ReceivablesIcon,
  History as HistoryIcon,
  Assessment as ReportsIcon,
  TrendingUp as AgingIcon,
  Payment as PaymentIcon,
  VerifiedUser as VerificationIcon,
  Undo as ReverseIcon,
  Logout as LogoutIcon,
  Assignment as PaymentRequestsIcon,
} from '@mui/icons-material';
import ErrorBoundary from '../common/ErrorBoundary';
import AccountingDashboard from './accounting/AccountingDashboard';
import PaymentRequestsDashboard from '../accounting/PaymentRequestsDashboard';
import CoursePricingManagement from './accounting/CoursePricingManagement';

import { NavLink, Routes, Route, Navigate, useLocation } from 'react-router-dom';

// Import all the missing components
import ReadyForBillingTable from '../tables/ReadyForBillingTable';
import AccountsReceivableTable from '../tables/AccountsReceivableTable';
import TransactionHistoryView from '../views/TransactionHistoryView';
import AgingReportView from '../views/AgingReportView';
import PaymentVerificationView from '../views/PaymentVerificationView';
import PaymentReversalView from '../views/PaymentReversalView';
import InvoiceDetailDialog from '../dialogs/InvoiceDetailDialog';
import RecordPaymentDialog from '../dialogs/RecordPaymentDialog';
import { getBillingQueue, createInvoice, getInvoices } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { NotificationProvider } from '../../contexts/NotificationContext';

// Billing Ready View Component
const ReadyForBillingView: React.FC = () => {
  const [billingQueue, setBillingQueue] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const { showSuccess, showError } = useSnackbar();

  React.useEffect(() => {
    const fetchBillingQueue = async () => {
      try {
        setIsLoading(true);
        setError('');
        const response = await getBillingQueue();
        setBillingQueue(response.data || []);
      } catch (error) {
        console.error('Error fetching billing queue:', error);
        setError('Failed to load billing queue. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBillingQueue();
  }, []);

  const handleCreateInvoice = async (courseId: string | number) => {
    try {
      console.log('🔍 [INVOICE] Creating invoice for course:', courseId);
      const response = await createInvoice(courseId as number);
      console.log('✅ [INVOICE] Invoice created successfully:', response);
      
      // Show success message
      showSuccess(response.data.message || 'Invoice created successfully! The course has been removed from the billing queue and moved to the Organizational Receivables Queue.');
      
      // Refresh the billing queue after creating invoice
      const updatedQueue = await getBillingQueue();
      setBillingQueue(updatedQueue.data || []);
    } catch (error: any) {
      console.error('❌ [INVOICE] Error creating invoice:', error);
      
      // Show error message to user
      const errorMessage = error.response?.data?.error?.message || 
                          error.response?.data?.message || 
                          error.message || 
                          'Failed to create invoice. Please try again.';
      showError(`Invoice creation failed: ${errorMessage}`);
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        📋 Ready for Billing
      </Typography>
      <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
        Review completed courses and create invoices for billing
      </Typography>
      
      <ReadyForBillingTable
        courses={billingQueue}
        onCreateInvoice={handleCreateInvoice}
        isLoading={isLoading}
        error={error}
      />
    </Box>
  );
};

// Accounts Receivable View Component
const AccountsReceivableView: React.FC = () => {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showInvoiceDetailDialog, setShowInvoiceDetailDialog] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);
  const [showRecordPaymentDialog, setShowRecordPaymentDialog] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<any>(null);
  const { showSuccess, showError } = useSnackbar();

  React.useEffect(() => {
    const fetchInvoices = async () => {
      setIsLoading(true);
      setError('');
      try {
        const data = await getInvoices();
        // Filter to show only invoices with outstanding balances for AR
        const arInvoices = (data || []).filter((invoice: any) => {
          const balanceDue = parseFloat(invoice.balancedue || 0);
          const paymentStatus = invoice.paymentstatus?.toLowerCase();
          return balanceDue > 0 && paymentStatus !== 'paid';
        });
        setInvoices(arInvoices);
      } catch (err: any) {
        setError(err.message || 'Failed to load invoices.');
        setInvoices([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvoices();
  }, []);

  const handleRecordPaymentClick = (invoice: any) => {
    console.log('Record payment for invoice:', invoice);
    setSelectedInvoiceForPayment(invoice);
    setShowRecordPaymentDialog(true);
  };

  const handleViewDetailsClick = (invoiceId: string | number) => {
    console.log('View details for invoice:', invoiceId);
    setSelectedInvoiceId(invoiceId as number);
    setShowInvoiceDetailDialog(true);
  };



  const handleInvoiceDetailDialogClose = () => {
    setShowInvoiceDetailDialog(false);
    setSelectedInvoiceId(null);
  };

  const handleInvoiceActionSuccess = (message: string) => {
    showSuccess(message);
    // Refresh invoices after approval action
    const fetchInvoices = async () => {
      setIsLoading(true);
      setError('');
      try {
        const data = await getInvoices();
        // Filter to show only invoices with outstanding balances for AR
        const arInvoices = (data || []).filter((invoice: any) => {
          const balanceDue = parseFloat(invoice.balancedue || 0);
          const paymentStatus = invoice.paymentstatus?.toLowerCase();
          return balanceDue > 0 && paymentStatus !== 'paid';
        });
        setInvoices(arInvoices);
      } catch (err: any) {
        setError(err.message || 'Failed to load invoices.');
        setInvoices([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInvoices();
  };

  const handleInvoiceActionError = (message: string) => {
    showError(message);
  };

  const handleRecordPaymentSuccess = (message: string) => {
    showSuccess(message);
    setShowRecordPaymentDialog(false);
    setSelectedInvoiceForPayment(null);
    // Refresh invoices after payment record
    const fetchInvoices = async () => {
      setIsLoading(true);
      setError('');
      try {
        const data = await getInvoices();
        setInvoices(data || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load invoices.');
        setInvoices([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInvoices();
  };

  const handleRecordPaymentError = (message: string) => {
    showError(message);
  };

  const handleRecordPaymentDialogClose = () => {
    setShowRecordPaymentDialog(false);
    setSelectedInvoiceForPayment(null);
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        💰 Organization Receivables
      </Typography>
      <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
        Manage outstanding invoices from organizations and payment tracking
      </Typography>
      
      <AccountsReceivableTable
        invoices={invoices}
        onRecordPaymentClick={handleRecordPaymentClick}
        onViewDetailsClick={handleViewDetailsClick}
      />

      {/* Invoice Detail Dialog */}
      <InvoiceDetailDialog
        open={showInvoiceDetailDialog}
        onClose={handleInvoiceDetailDialogClose}
        invoiceId={selectedInvoiceId}
        onActionSuccess={handleInvoiceActionSuccess}
        onActionError={handleInvoiceActionError}
        showPostToOrgButton={true} // Show Post to Org button in AR section
      />

      {/* Record Payment Dialog */}
      <RecordPaymentDialog
        open={showRecordPaymentDialog}
        onClose={handleRecordPaymentDialogClose}
        invoice={selectedInvoiceForPayment}
        onSuccess={handleRecordPaymentSuccess}
        onError={handleRecordPaymentError}
      />
    </Box>
  );
};

// Test component to debug routing
const TestDashboard: React.FC = () => {
  console.log('[TestDashboard] Component rendered');
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4">Test Dashboard</Typography>
      <Typography>This is a test to see if routing works</Typography>
    </Box>
  );
};

const tabRoutes = [
  { 
    label: 'Financial Dashboard', 
    icon: <DashboardIcon />, 
    path: 'dashboard', 
    component: <AccountingDashboard /> 
  },

  { 
    label: 'Ready for Billing', 
    icon: <BillingIcon />, 
    path: 'billing', 
    component: <ReadyForBillingView /> 
  },
  { 
    label: 'Organization Receivables', 
    icon: <ReceivablesIcon />, 
    path: 'receivables', 
    component: <AccountsReceivableView /> 
  },
  { 
    label: 'Instructor Payment Requests', 
    icon: <PaymentRequestsIcon />, 
    path: 'payment-requests', 
    component: <PaymentRequestsDashboard /> 
  },
  { 
    label: 'Invoice History', 
    icon: <HistoryIcon />, 
    path: 'history', 
    component: <TransactionHistoryView /> 
  },
  { 
    label: 'Aging Report', 
    icon: <AgingIcon />, 
    path: 'aging', 
    component: <AgingReportView /> 
  },
  { 
    label: 'Payment Verification', 
    icon: <VerificationIcon />, 
    path: 'verification', 
    component: <PaymentVerificationView /> 
  },
  { 
    label: 'Payment Reversal', 
    icon: <ReverseIcon />, 
    path: 'reversal', 
    component: <PaymentReversalView /> 
  },
];

const AccountingPortal: React.FC = () => {
  const handleError = (error: Error, errorInfo: any) => {
    console.error('[AccountingPortal] Error caught by boundary:', error, errorInfo);
  };

  const { logout, user } = useAuth();
  const { showSuccess } = useSnackbar();
  const location = useLocation();
  const currentPath = location.pathname.split('/').pop();

  // Debug logging
  console.log('[AccountingPortal] Current location:', location.pathname);
  console.log('[AccountingPortal] Current path segment:', currentPath);

  const handleLogout = async () => {
    try {
      const firstName = user?.username || 'Accounting User';
      const logoutMessage = `Goodbye ${firstName}, Have a Great Day!`;
      showSuccess(logoutMessage);
      
      setTimeout(() => {
        logout();
      }, 1500);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <NotificationProvider>
      <ErrorBoundary context="accounting_portal" onError={handleError}>
        <Container maxWidth='xl' sx={{ mt: 2, mb: 4 }}>
        <Paper elevation={1} sx={{ mb: 3, p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant='h4' component='h1' gutterBottom>
                🏦 Accounting Portal
              </Typography>
              <Typography variant='subtitle1' color='textSecondary'>
                Financial management and course pricing administration
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <NotificationBell size="medium" color="primary" />
              <Button
                variant="outlined"
                color="secondary"
                startIcon={<LogoutIcon />}
                onClick={handleLogout}
                sx={{ minWidth: 120 }}
              >
                Logout
              </Button>
            </Box>
          </Box>
        </Paper>

        <Paper elevation={1}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', overflowX: 'auto' }}>
            {tabRoutes.map((tab) => (
              <NavLink
                key={tab.label}
                to={`/accounting/${tab.path}`}
                style={({ isActive }) => ({
                  textDecoration: 'none',
                  color: isActive ? '#1976d2' : 'inherit',
                  fontWeight: isActive ? 'bold' : 'normal',
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  borderBottom: isActive ? '2px solid #1976d2' : 'none',
                  whiteSpace: 'nowrap',
                  minWidth: 'fit-content',
                })}
              >
                {tab.icon}
                <span style={{ marginLeft: 8 }}>{tab.label}</span>
              </NavLink>
            ))}
          </Box>

          <Box sx={{ p: 3 }}>
            <Routes>
              <Route path="dashboard" element={
                <ErrorBoundary context="accounting_dashboard" onError={handleError}>
                  <AccountingDashboard />
                </ErrorBoundary>
              } />
              <Route path="history" element={
                <ErrorBoundary context="accounting_history" onError={handleError}>
                  <TransactionHistoryView />
                </ErrorBoundary>
              } />
              <Route path="billing" element={
                <ErrorBoundary context="accounting_billing" onError={handleError}>
                  <ReadyForBillingView />
                </ErrorBoundary>
              } />
              <Route path="pricing" element={
                <ErrorBoundary context="accounting_pricing" onError={handleError}>
                  <CoursePricingManagement />
                </ErrorBoundary>
              } />
              <Route path="receivables" element={
                <ErrorBoundary context="accounting_receivables" onError={handleError}>
                  <AccountsReceivableView />
                </ErrorBoundary>
              } />
              <Route path="payment-requests" element={
                <ErrorBoundary context="accounting_payment_requests" onError={handleError}>
                  <PaymentRequestsDashboard />
                </ErrorBoundary>
              } />
              <Route path="verification" element={
                <ErrorBoundary context="accounting_verification" onError={handleError}>
                  <PaymentVerificationView />
                </ErrorBoundary>
              } />
              <Route path="reversal" element={
                <ErrorBoundary context="accounting_reversal" onError={handleError}>
                  <PaymentReversalView />
                </ErrorBoundary>
              } />
              <Route path="" element={
                <ErrorBoundary context="accounting_dashboard" onError={handleError}>
                  <AccountingDashboard />
                </ErrorBoundary>
              } />
              <Route path="*" element={<Box sx={{ p: 3 }}><Typography variant="h6">View not found</Typography></Box>} />
            </Routes>
          </Box>
        </Paper>
      </Container>
      </ErrorBoundary>
    </NotificationProvider>
  );
};

export default AccountingPortal;
