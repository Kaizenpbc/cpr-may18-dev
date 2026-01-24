import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Alert,
  CircularProgress,
  Tooltip,
  Divider,
  Card,
  CardContent,
  Button
} from '@mui/material';
import {
  Visibility as ViewIcon,
  Receipt as InvoiceIcon,
  Business as VendorIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  AccountBalance as BankIcon,
  CheckCircle as PaidIcon,
  AttachMoney as MoneyIcon,
  CalendarToday as DateIcon,
  Payment as PaymentIcon
} from '@mui/icons-material';
import { adminApi } from '../../../services/api';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import { useVendorInvoiceUpdates } from '../../../hooks/useVendorInvoiceUpdates';

interface PaidVendorInvoice {
  id: number;
  invoiceNumber: string;
  description: string;
  total: number | string;
  status: string;
  createdAt: string;
  invoiceDate: string;
  dueDate: string;
  vendorName: string;
  vendorEmail: string;
  vendorContact: string;
  vendorPaymentMethod: string;
  approvedByName: string;
  approvedByEmail: string;
  sentToAccountingAt: string;
  totalPaid: number | string;
  balanceDue: number | string;
  paidAt: string;
  adminNotes: string;
}

interface PaymentHistory {
  id: number;
  paymentDate: string;
  amount: number;
  paymentMethod: string;
  referenceNumber: string;
  notes: string;
  status: string;
  processedByName: string;
}

const PaidVendorInvoices: React.FC = () => {
  const [invoices, setInvoices] = useState<PaidVendorInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<PaidVendorInvoice | null>(null);
  const [viewDialog, setViewDialog] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const { showSuccess, showError } = useSnackbar();

  const fetchPaidInvoices = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await adminApi.getVendorInvoices();
      // Filter to only show paid invoices
      const paidInvoices = (response.data || []).filter((invoice: { status: string }) =>
        invoice.status === 'paid'
      );
      setInvoices(paidInvoices);
    } catch (error: unknown) {
      console.error('Error fetching paid vendor invoices:', error);
      setError('Failed to load paid vendor invoices. Please try again.');
      showError('Failed to load paid vendor invoices');
    } finally {
      setLoading(false);
    }
  };

  // Real-time updates
  const { isConnected } = useVendorInvoiceUpdates({
    onStatusUpdate: (update) => {
      console.log('🔄 Real-time status update received in admin paid invoices:', update);
      // Refresh if an invoice becomes paid
      if (update.newStatus === 'paid') {
        fetchPaidInvoices();
      }
    },
    onNotesUpdate: (update) => {
      console.log('📝 Real-time notes update received in admin paid invoices:', update);
    },
    onRefresh: fetchPaidInvoices
  });

  useEffect(() => {
    fetchPaidInvoices();
  }, []);

  const handleView = async (invoice: PaidVendorInvoice) => {
    setSelectedInvoice(invoice);
    
    // Fetch payment history for this invoice
    try {
      const response = await adminApi.getAccountingVendorInvoiceDetails(invoice.id);
      if (response.success && response.data.payments) {
        setPaymentHistory(response.data.payments);
      } else {
        setPaymentHistory([]);
      }
    } catch (error) {
      console.error('Error fetching payment history:', error);
      setPaymentHistory([]);
    }
    
    setViewDialog(true);
  };

  const handleCloseDialog = () => {
    setViewDialog(false);
    setSelectedInvoice(null);
    setPaymentHistory([]);
  };

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(num || 0);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'success';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Paid';
      default:
        return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" gutterBottom>
          <PaidIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Paid Vendor Invoices
        </Typography>
        <Chip
          label={isConnected ? '🟢 Live Updates' : '🔴 Offline'}
          color={isConnected ? 'success' : 'error'}
          size="small"
          variant="outlined"
        />
      </Box>

      {/* Summary Cards */}
      <Paper sx={{ mb: 3, p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Summary
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <Box textAlign="center">
              <Typography variant="h4" color="success.main">
                {invoices.length}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Total Paid Invoices
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={3}>
            <Box textAlign="center">
              <Typography variant="h4" color="success.main">
                {formatCurrency(invoices.reduce((sum, inv) => {
                  const total = typeof inv.total === 'number' ? inv.total : parseFloat(inv.total) || 0;
                  return sum + total;
                }, 0))}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Total Amount Paid
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={3}>
            <Box textAlign="center">
              <Typography variant="h4" color="info.main">
                {formatCurrency(invoices.reduce((sum, inv) => {
                  const totalPaid = Number(inv.totalPaid) || 0;
                  return sum + (isNaN(totalPaid) ? 0 : totalPaid);
                }, 0))}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Total Payments Processed
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={3}>
            <Box textAlign="center">
              <Typography variant="h4" color="primary.main">
                {invoices.length > 0 ? 
                  formatDate(invoices[0].paidAt || invoices[0].createdAt) : 
                  'N/A'
                }
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Most Recent Payment
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Paid Invoices Table */}
      <TableContainer component={Paper} sx={{ overflowX: 'auto', maxHeight: '70vh' }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ position: 'sticky', left: 0, backgroundColor: 'background.paper', zIndex: 1 }}>
                Invoice #
              </TableCell>
              <TableCell>Vendor</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Total Amount</TableCell>
              <TableCell>Paid Amount</TableCell>
              <TableCell>Paid Date</TableCell>
              <TableCell>Status</TableCell>
              <TableCell sx={{ position: 'sticky', right: 0, backgroundColor: 'background.paper', zIndex: 1 }}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {invoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Box py={4}>
                    <PaidIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">
                      No Paid Invoices Found
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Paid vendor invoices will appear here once they are fully processed.
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              invoices.map((invoice) => (
                <TableRow key={invoice.id} hover>
                  <TableCell sx={{ position: 'sticky', left: 0, backgroundColor: 'background.paper', zIndex: 1 }}>
                    <Typography variant="body2" fontWeight="bold">
                      {invoice.invoiceNumber}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {invoice.vendorName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {invoice.vendorEmail}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                      {invoice.description}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {formatCurrency(invoice.total)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="success.main" fontWeight="bold">
                      {formatCurrency(invoice.totalPaid || invoice.total)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatDate(invoice.paidAt || invoice.sentToAccountingAt)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getStatusLabel(invoice.status)}
                      color={getStatusColor(invoice.status)}
                      size="small"
                      icon={<PaidIcon />}
                    />
                  </TableCell>
                  <TableCell sx={{ position: 'sticky', right: 0, backgroundColor: 'background.paper', zIndex: 1 }}>
                    <Tooltip title="View Details">
                      <IconButton
                        size="small"
                        onClick={() => handleView(invoice)}
                        color="primary"
                      >
                        <ViewIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Invoice Detail Dialog */}
      <Dialog 
        open={viewDialog} 
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center">
              <InvoiceIcon sx={{ mr: 1 }} />
              <Typography variant="h6">
                Paid Invoice Details - {selectedInvoice?.invoiceNumber}
              </Typography>
            </Box>
            <Chip
              label="FULLY PAID"
              color="success"
              icon={<PaidIcon />}
              size="small"
            />
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedInvoice && (
            <Box>
              {/* Vendor Information */}
              <Paper sx={{ p: 3, mb: 3, backgroundColor: '#f8f9fa' }}>
                <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                  <VendorIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Vendor Information
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Box display="flex" alignItems="center" mb={1}>
                      <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />
                      <Typography variant="body2">
                        <strong>Vendor:</strong> {selectedInvoice.vendorName}
                      </Typography>
                    </Box>
                    <Box display="flex" alignItems="center" mb={1}>
                      <EmailIcon sx={{ mr: 1, color: 'text.secondary' }} />
                      <Typography variant="body2">
                        <strong>Email:</strong> {selectedInvoice.vendorEmail}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Box display="flex" alignItems="center" mb={1}>
                      <PaymentIcon sx={{ mr: 1, color: 'text.secondary' }} />
                      <Typography variant="body2">
                        <strong>Payment Method:</strong> {selectedInvoice.vendorPaymentMethod?.replace('_', ' ').toUpperCase() || 'CHECK'}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>

              {/* Payment Summary */}
              <Paper sx={{ p: 3, mb: 3, backgroundColor: '#e8f5e8' }}>
                <Typography variant="h6" gutterBottom sx={{ color: 'success.main', fontWeight: 'bold' }}>
                  <MoneyIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Payment Summary
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <Box textAlign="center">
                      <Typography variant="h5" color="primary.main" fontWeight="bold">
                        {formatCurrency(selectedInvoice.total)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Invoice Amount
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Box textAlign="center">
                      <Typography variant="h5" color="success.main" fontWeight="bold">
                        {formatCurrency(selectedInvoice.totalPaid || selectedInvoice.total)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Amount Paid
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Box textAlign="center">
                      <Typography variant="h5" color="success.main" fontWeight="bold">
                        $0.00
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Balance Due
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
                <Box mt={2} textAlign="center">
                  <Chip
                    label="✅ Payment Complete: This invoice has been fully paid"
                    color="success"
                    icon={<PaidIcon />}
                    size="medium"
                    sx={{ fontSize: '1rem' }}
                  />
                </Box>
              </Paper>

              {/* Invoice Details */}
              <Paper sx={{ p: 3, mb: 3, backgroundColor: '#f8f9fa' }}>
                <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                  <InvoiceIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Invoice Details
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" mb={1}>
                      <strong>Description:</strong> {selectedInvoice.description}
                    </Typography>
                    <Typography variant="body2" mb={1}>
                      <strong>Invoice Date:</strong> {formatDate(selectedInvoice.invoiceDate)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" mb={1}>
                      <strong>Due Date:</strong> {formatDate(selectedInvoice.dueDate)}
                    </Typography>
                    <Typography variant="body2" mb={1}>
                      <strong>Created:</strong> {formatDate(selectedInvoice.createdAt)}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>

              {/* Approval Information */}
              <Paper sx={{ p: 3, mb: 3, backgroundColor: '#f8f9fa' }}>
                <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                  <PaidIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Payment Information
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" mb={1}>
                      <strong>Approved By:</strong> {selectedInvoice.approvedByName || 'Admin User'}
                    </Typography>
                    <Typography variant="body2" mb={1}>
                      <strong>Paid Date:</strong> {formatDate(selectedInvoice.paidAt || selectedInvoice.sentToAccountingAt)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" mb={1}>
                      <strong>Admin Notes:</strong> {selectedInvoice.adminNotes || 'No notes provided'}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>

              {/* Payment History */}
              <Paper sx={{ p: 3, backgroundColor: '#f8f9fa' }}>
                <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                  💰 Payment History
                </Typography>
                
                {paymentHistory.length === 0 ? (
                  <Alert severity="info">
                    <Typography variant="body2">
                      Payment history details are not available for this invoice.
                    </Typography>
                  </Alert>
                ) : (
                  <TableContainer component={Paper} sx={{ mt: 2 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Date</TableCell>
                          <TableCell>Amount</TableCell>
                          <TableCell>Method</TableCell>
                          <TableCell>Reference</TableCell>
                          <TableCell>Processed By</TableCell>
                          <TableCell>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {paymentHistory.map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell>{formatDate(payment.paymentDate)}</TableCell>
                            <TableCell>{formatCurrency(payment.amount)}</TableCell>
                            <TableCell>
                              <Chip 
                                label={payment.paymentMethod.replace('_', ' ').toUpperCase()} 
                                size="small" 
                                color="primary" 
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell>{payment.referenceNumber || '-'}</TableCell>
                            <TableCell>{payment.processedByName || 'Unknown'}</TableCell>
                            <TableCell>
                              <Chip 
                                label={payment.status.toUpperCase()} 
                                size="small" 
                                color={payment.status === 'processed' ? 'success' : 'warning'} 
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Paper>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PaidVendorInvoices; 