import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Paper, Container, Button, 
  Menu, MenuItem, ListItemIcon, ListItemText,
  Divider, Chip
} from '@mui/material';
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
  Store as VendorIcon,
  AccountBalance as FinancialIcon,
  Business as OrganizationIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CheckCircle as PaidIcon,
} from '@mui/icons-material';
import ErrorBoundary from '../common/ErrorBoundary';
import AccountingDashboard from './accounting/AccountingDashboard';
import PaymentRequestsDashboard from '../accounting/PaymentRequestsDashboard';
import VendorInvoiceManagement from './accounting/VendorInvoiceManagement';
import PaidVendorInvoices from './accounting/PaidVendorInvoices';

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

// Grouped menu structure
const menuGroups = [
  {
    label: 'Financial Management',
    icon: <FinancialIcon />,
    items: [
      { 
        label: 'Financial Dashboard', 
        icon: <DashboardIcon />, 
        path: 'dashboard', 
        component: <AccountingDashboard /> 
      },
      { 
        label: 'Aging Report', 
        icon: <AgingIcon />, 
        path: 'aging', 
        component: <AgingReportView /> 
      },
    ]
  },
  {
    label: 'Billing & Receivables',
    icon: <OrganizationIcon />,
    items: [
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
        label: 'Invoice History', 
        icon: <HistoryIcon />, 
        path: 'history', 
        component: <TransactionHistoryView /> 
      },
    ]
  },
  {
    label: 'Payment Processing',
    icon: <PaymentIcon />,
    items: [
      { 
        label: 'Instructor Payment Requests', 
        icon: <PaymentRequestsIcon />, 
        path: 'payment-requests', 
        component: <PaymentRequestsDashboard /> 
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
    ]
  },
  {
    label: 'Vendor Management',
    icon: <VendorIcon />,
    items: [
      { 
        label: 'Vendor Invoices', 
        icon: <VendorIcon />, 
        path: 'vendor-invoices', 
        component: <VendorInvoiceManagement /> 
      },
      { 
        label: 'Paid Vendor Invoices', 
        icon: <PaidIcon />, 
        path: 'paid-vendor-invoices', 
        component: <PaidVendorInvoices /> 
      },
    ]
  },
];

// Flatten all items for routing
const allRoutes = menuGroups.flatMap(group => group.items);

const AccountingPortal: React.FC = () => {
  const handleError = (error: Error, errorInfo: any) => {
    console.error('[AccountingPortal] Error caught by boundary:', error, errorInfo);
  };

  const { logout, user } = useAuth();
  const { showSuccess } = useSnackbar();
  const location = useLocation();
  const currentPath = location.pathname.split('/').pop();

  // Menu state management
  const [menuAnchors, setMenuAnchors] = useState<{ [key: string]: HTMLElement | null }>({});

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, groupLabel: string) => {
    setMenuAnchors(prev => ({ ...prev, [groupLabel]: event.currentTarget }));
  };

  const handleMenuClose = (groupLabel: string) => {
    setMenuAnchors(prev => ({ ...prev, [groupLabel]: null }));
  };

  // Helper function to check if a group contains the current active route
  const isGroupActive = (group: any) => {
    return group.items.some((item: any) => `/accounting/${item.path}` === location.pathname);
  };

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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
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
          <Box sx={{ borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', overflowX: 'auto', p: 1 }}>
            {menuGroups.map((group) => (
              <Box key={group.label} sx={{ position: 'relative' }}>
                <Button
                  variant="text"
                  color={isGroupActive(group) ? "primary" : "inherit"}
                  startIcon={group.icon}
                  endIcon={menuAnchors[group.label] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  onClick={(e) => handleMenuOpen(e, group.label)}
                  sx={{
                    textTransform: 'none',
                    fontWeight: isGroupActive(group) ? 'bold' : 'medium',
                    px: 2,
                    py: 1.5,
                    borderBottom: isGroupActive(group) ? '2px solid #1976d2' : 'none',
                    '&:hover': {
                      backgroundColor: 'rgba(25, 118, 210, 0.08)',
                    }
                  }}
                >
                  {group.label}
                </Button>
                <Menu
                  anchorEl={menuAnchors[group.label]}
                  open={Boolean(menuAnchors[group.label])}
                  onClose={() => handleMenuClose(group.label)}
                  anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                  }}
                  transformOrigin={{
                    vertical: 'top',
                    horizontal: 'left',
                  }}
                  PaperProps={{
                    sx: {
                      minWidth: 250,
                      mt: 1,
                      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                    }
                  }}
                >
                  {group.items.map((item) => (
                    <MenuItem
                      key={item.label}
                      component={NavLink}
                      to={`/accounting/${item.path}`}
                      onClick={() => handleMenuClose(group.label)}
                      sx={{
                        py: 1.5,
                        px: 2,
                        '&.active': {
                          backgroundColor: 'primary.light',
                          color: 'primary.contrastText',
                          '&:hover': {
                            backgroundColor: 'primary.main',
                          }
                        }
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 40 }}>
                        {item.icon}
                      </ListItemIcon>
                      <ListItemText 
                        primary={item.label}
                        primaryTypographyProps={{
                          fontSize: '0.9rem',
                          fontWeight: 'medium'
                        }}
                      />
                    </MenuItem>
                  ))}
                </Menu>
              </Box>
            ))}
          </Box>

          <Box sx={{ p: 3 }}>
            <Routes>
              <Route index element={
                <ErrorBoundary context="accounting_dashboard" onError={handleError}>
                  <AccountingDashboard />
                </ErrorBoundary>
              } />
              {allRoutes.map((route) => (
                <Route
                  key={route.path}
                  path={route.path}
                  element={
                    <ErrorBoundary context={`accounting_${route.path}`} onError={handleError}>
                      {route.component}
                    </ErrorBoundary>
                  }
                />
              ))}
              <Route path="*" element={
                <Box sx={{ p: 3 }}>
                  <Typography variant="h6">View not found</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Current path: {location.pathname}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Available routes: {allRoutes.map(r => r.path).join(', ')}
                  </Typography>
                </Box>
              } />
            </Routes>
          </Box>
        </Paper>
      </Container>
      </ErrorBoundary>
  );
};

export default AccountingPortal;
