import React, { useState } from 'react';
import { Box, Typography, Paper, Container, Button } from '@mui/material';
import {
  Dashboard as DashboardIcon,
  ReceiptLong as BillingIcon,
  RequestQuote as ReceivablesIcon,
  History as HistoryIcon,
  Assessment as ReportsIcon,
  TrendingUp as AgingIcon,
  Payment as PaymentIcon,
  VerifiedUser as VerificationIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material';
import ErrorBoundary from '../common/ErrorBoundary';
import AccountingDashboard from './accounting/AccountingDashboard';

import { NavLink, Routes, Route, Navigate, useLocation } from 'react-router-dom';

// Import all the missing components
import ReadyForBillingTable from '../tables/ReadyForBillingTable';
import AccountsReceivableTable from '../tables/AccountsReceivableTable';
import TransactionHistoryView from '../views/TransactionHistoryView';
import AgingReportView from '../views/AgingReportView';
import PaymentVerificationView from '../views/PaymentVerificationView';
import InvoiceDetailDialog from '../dialogs/InvoiceDetailDialog';
import RecordPaymentDialog from '../dialogs/RecordPaymentDialog';
import { getBillingQueue, createInvoice, getInvoices } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useSnackbar } from '../../contexts/SnackbarContext';

// Billing Ready View Component
const ReadyForBillingView: React.FC = () => {
  const [billingQueue, setBillingQueue] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

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
      const response = await createInvoice(courseId as number);
      console.log('Invoice created successfully:', response);
      // Refresh the billing queue after creating invoice
      const updatedQueue = await getBillingQueue();
      setBillingQueue(updatedQueue.data || []);
    } catch (error) {
      console.error('Error creating invoice:', error);
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
        setInvoices(data || []);
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
        💰 Accounts Receivable
      </Typography>
      <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
        Manage outstanding invoices and payment tracking
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
        showPostToOrgButton={false} // Hide Post to Org button in AR section
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
    label: 'Accounts Receivable', 
    icon: <ReceivablesIcon />, 
    path: 'receivables', 
    component: <AccountsReceivableView /> 
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
];

const AccountingPortal: React.FC = () => {
  const handleError = (error: Error, errorInfo: any) => {
    console.error('[AccountingPortal] Error caught by boundary:', error, errorInfo);
  };

  const { logout, user } = useAuth();
  const { showSuccess } = useSnackbar();
  const location = useLocation();
  const currentPath = location.pathname.split('/').pop();

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
              {tabRoutes.map((tab) => (
                <Route key={tab.path} path={tab.path} element={tab.component} />
              ))}
              <Route path="" element={<Navigate to="dashboard" replace />} />
              <Route path="*" element={<Box sx={{ p: 3 }}><Typography variant="h6">View not found</Typography></Box>} />
            </Routes>
          </Box>
        </Paper>
      </Container>
    </ErrorBoundary>
  );
};

export default AccountingPortal;
