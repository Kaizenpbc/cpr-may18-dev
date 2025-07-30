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
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Alert,
  CircularProgress,
  Tooltip,
  Divider
} from '@mui/material';
import {
  Visibility as ViewIcon,
  Payment as PaymentIcon,
  Receipt as InvoiceIcon,
  Business as VendorIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  AccountBalance as BankIcon,
  CheckCircle as ApprovedIcon,
  Schedule as PendingIcon,
  AttachMoney as MoneyIcon
} from '@mui/icons-material';
import { adminApi } from '../../../services/api';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import { useVendorInvoiceUpdates } from '../../../hooks/useVendorInvoiceUpdates';

interface VendorInvoice {
  id: number;
  invoice_number: string;
  item?: string;
  company?: string;
  billing_company?: string;
  quantity?: number | null;
  description: string;
  rate: number;
  amount: number | string;
  subtotal: number | string;
  hst: number | string;
  total: number | string;
  status: string;
  created_at: string;
  invoice_date: string;
  due_date: string;
  vendor_name: string;
  vendor_email: string;
  vendor_contact: string;
  vendor_payment_method: string;
  bank_name: string;
  account_number: string;
  routing_number: string;
  approved_by_name: string;
  approved_by_email: string;
  sent_to_accounting_at: string;
  total_paid?: number | string;
  balance_due?: number | string;
  payment_status: string;
  admin_notes: string;
  rejection_reason?: string;
}

interface PaymentData {
  amount: string;
  payment_date: string;
  payment_method: string;
  reference_number: string;
  notes: string;
}

interface PaymentHistory {
  id: number;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference_number: string;
  notes: string;
  status: string;
  processed_at: string;
  processed_by_name: string;
}

const VendorInvoiceManagement: React.FC = () => {
  const [invoices, setInvoices] = useState<VendorInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<VendorInvoice | null>(null);
  const [viewDialog, setViewDialog] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [paymentData, setPaymentData] = useState<PaymentData>({
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: '',
    reference_number: '',
    notes: ''
  });
  const [statusFilter, setStatusFilter] = useState('all');
  const { showSuccess, showError } = useSnackbar();

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await adminApi.getAccountingVendorInvoices();
      setInvoices(response.data || []);
    } catch (error: any) {
      console.error('Error fetching vendor invoices:', error);
      setError('Failed to load vendor invoices. Please try again.');
      showError('Failed to load vendor invoices');
    } finally {
      setLoading(false);
    }
  };

  // Real-time updates
  const { isConnected } = useVendorInvoiceUpdates({
    onStatusUpdate: (update) => {
      console.log('🔄 Real-time status update received in accounting portal:', update);
    },
    onNotesUpdate: (update) => {
      console.log('📝 Real-time notes update received in accounting portal:', update);
    },
    onRefresh: fetchInvoices
  });

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleView = async (invoice: VendorInvoice) => {
    setSelectedInvoice(invoice);
    // Initialize payment data for this invoice
    setPaymentData({
      amount: (invoice.balance_due || 0) > 0 ? (invoice.balance_due || 0).toString() : '',
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: invoice.vendor_payment_method && ['check', 'direct_deposit', 'wire_transfer'].includes(invoice.vendor_payment_method) 
        ? invoice.vendor_payment_method 
        : 'check',
      reference_number: '',
      notes: ''
    });
    
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



  const handleProcessPayment = async () => {
    if (!selectedInvoice || !paymentData.amount) return;

    try {
      setProcessingPayment(true);
      const response = await adminApi.processVendorPayment(selectedInvoice.id, paymentData);
      
      showSuccess(response.message || 'Payment processed successfully');
      
      // Refresh payment history
      try {
        const historyResponse = await adminApi.getAccountingVendorInvoiceDetails(selectedInvoice.id);
        if (historyResponse.success && historyResponse.data.payments) {
          setPaymentHistory(historyResponse.data.payments);
        }
      } catch (error) {
        console.error('Error refreshing payment history:', error);
      }
      
      setViewDialog(false);
      setSelectedInvoice(null);
      fetchInvoices(); // Refresh the list
    } catch (error: any) {
      console.error('Error processing payment:', error);
      showError(error.response?.data?.message || 'Failed to process payment');
    } finally {
      setProcessingPayment(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending_submission':
        return 'default';
      case 'submitted_to_admin':
        return 'warning';
      case 'submitted_to_accounting':
        return 'info';
      case 'rejected_by_admin':
        return 'error';
      case 'rejected_by_accountant':
        return 'error';
      case 'paid':
        return 'success';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending_submission':
        return 'Pending Submission';
      case 'submitted_to_admin':
        return 'Submitted to Admin';
      case 'submitted_to_accounting':
        return 'Submitted to Accounting';
      case 'rejected_by_admin':
        return 'Rejected by Admin';
      case 'rejected_by_accountant':
        return 'Rejected by Accountant';
      case 'paid':
        return 'Paid';
      default:
        return status.replace('_', ' ').toUpperCase();
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'success';
      case 'partially_paid': return 'warning';
      case 'unpaid': return 'error';
      default: return 'default';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString();
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
          <PaymentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Vendor Invoice Management
        </Typography>
        <Chip
          label={isConnected ? '🟢 Live Updates' : '🔴 Offline'}
          color={isConnected ? 'success' : 'error'}
          size="small"
          variant="outlined"
        />
      </Box>

      <Paper sx={{ mb: 3, p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Summary
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <Box textAlign="center">
              <Typography variant="h4" color="primary">
                {invoices.length}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Pending Invoices
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={3}>
            <Box textAlign="center">
              <Typography variant="h4" color="warning.main">
                {formatCurrency(invoices.reduce((sum, inv) => {
                  const amount = typeof inv.amount === 'number' ? inv.amount : parseFloat(inv.amount) || 0;
                  const total = typeof inv.total === 'number' ? inv.total : parseFloat(inv.total) || 0;
                  const totalPaid = inv.total_paid || 0;
                  const balanceDue = total - totalPaid;
                  return sum + (isNaN(balanceDue) ? 0 : balanceDue);
                }, 0))}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Total Outstanding
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={3}>
            <Box textAlign="center">
              <Typography variant="h4" color="success.main">
                {formatCurrency(invoices.reduce((sum, inv) => {
                  const totalPaid = inv.total_paid || 0;
                  return sum + (isNaN(totalPaid) ? 0 : totalPaid);
                }, 0))}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Total Paid
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={3}>
            <Box textAlign="center">
              <Typography variant="h4" color="info.main">
                {invoices.filter(inv => inv.payment_status === 'partially_paid').length}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Partially Paid
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Status Filter */}
      <Box sx={{ mb: 2 }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Filter by Status</InputLabel>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            label="Filter by Status"
          >
            <MenuItem value="all">All Invoices</MenuItem>
            <MenuItem value="pending_submission">Pending Submission</MenuItem>
            <MenuItem value="submitted_to_admin">Submitted to Admin</MenuItem>
            <MenuItem value="submitted_to_accounting">Submitted to Accounting</MenuItem>
            <MenuItem value="rejected_by_admin">Rejected by Admin</MenuItem>
            <MenuItem value="rejected_by_accountant">Rejected by Accountant</MenuItem>
            <MenuItem value="paid">Invoices Paid</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <TableContainer component={Paper} sx={{ overflowX: 'auto', maxHeight: '70vh' }}>
        <Table sx={{ minWidth: 1200 }}>
          <TableHead sx={{ position: 'sticky', top: 0, backgroundColor: 'background.paper', zIndex: 1 }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', minWidth: 100, backgroundColor: 'background.paper', position: 'sticky', left: 0, zIndex: 2 }}>Date</TableCell>
              <TableCell sx={{ fontWeight: 'bold', minWidth: 150, backgroundColor: 'background.paper', position: 'sticky', left: 100, zIndex: 2 }}>Billing Company</TableCell>
              <TableCell sx={{ fontWeight: 'bold', minWidth: 120, backgroundColor: 'background.paper', position: 'sticky', left: 250, zIndex: 2 }}>Invoice #</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', minWidth: 80, backgroundColor: 'background.paper' }}>Quantity</TableCell>
              <TableCell sx={{ fontWeight: 'bold', minWidth: 120, backgroundColor: 'background.paper' }}>Item</TableCell>
              <TableCell sx={{ fontWeight: 'bold', minWidth: 200, maxWidth: 300, backgroundColor: 'background.paper' }}>Description</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', minWidth: 100, backgroundColor: 'background.paper' }}>Rate</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', minWidth: 120, backgroundColor: 'background.paper' }}>Amount</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', minWidth: 120, backgroundColor: 'background.paper' }}>Subtotal</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', minWidth: 100, backgroundColor: 'background.paper' }}>HST</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', minWidth: 120, backgroundColor: 'background.paper' }}>Total</TableCell>
              <TableCell sx={{ fontWeight: 'bold', minWidth: 120, backgroundColor: 'background.paper' }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 'bold', minWidth: 100, backgroundColor: 'background.paper' }}>Due Date</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', minWidth: 120, backgroundColor: 'background.paper', position: 'sticky', right: 0, zIndex: 2 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {invoices
              .filter(invoice => statusFilter === 'all' || invoice.status === statusFilter)
              .map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell sx={{ position: 'sticky', left: 0, backgroundColor: 'background.paper', zIndex: 1 }}>{new Date(invoice.created_at || invoice.invoice_date).toLocaleDateString()}</TableCell>
                <TableCell sx={{ position: 'sticky', left: 100, backgroundColor: 'background.paper', zIndex: 1 }}>{invoice.billing_company || invoice.company || invoice.vendor_name || '-'}</TableCell>
                <TableCell sx={{ position: 'sticky', left: 250, backgroundColor: 'background.paper', zIndex: 1 }}>{invoice.invoice_number}</TableCell>
                <TableCell align="right">{invoice.quantity || '-'}</TableCell>
                <TableCell>{invoice.item || '-'}</TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={invoice.description}>
                    {invoice.description}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  {invoice.rate && !isNaN(invoice.rate) && invoice.rate > 0 ? 
                    `$${Number(invoice.rate).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                </TableCell>
                <TableCell align="right">
                  {invoice.amount && !isNaN(invoice.amount) ? 
                    `$${parseFloat(invoice.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 
                    (invoice.total && !isNaN(invoice.total) ? 
                      `$${parseFloat(invoice.total).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-')}
                </TableCell>
                <TableCell align="right">
                  {invoice.subtotal && !isNaN(invoice.subtotal) && invoice.subtotal > 0 ? 
                    `$${Number(invoice.subtotal).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                </TableCell>
                <TableCell align="right">
                  {invoice.hst && !isNaN(invoice.hst) && invoice.hst > 0 ? 
                    `$${Number(invoice.hst).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                </TableCell>
                <TableCell align="right">
                  {invoice.total && !isNaN(invoice.total) && invoice.total > 0 ? 
                    `$${Number(invoice.total).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                </TableCell>
                <TableCell>
                  <Chip label={getStatusLabel(invoice.status)} color={getStatusColor(invoice.status) as any} size="small" />
                </TableCell>
                <TableCell>{invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '-'}</TableCell>
                <TableCell align="center" sx={{ position: 'sticky', right: 0, backgroundColor: 'background.paper', zIndex: 1 }}>
                  <Tooltip title="View Invoice Details">
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
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* View Invoice Dialog */}
      <Dialog open={viewDialog} onClose={() => setViewDialog(false)} maxWidth="md" fullWidth sx={{ '& .MuiDialog-paper': { maxHeight: '90vh' } }}>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              Invoice Details - #{selectedInvoice?.invoice_number}
            </Typography>
            {selectedInvoice && (
              <Chip
                label={(selectedInvoice.payment_status || 'unknown').replace('_', ' ').toUpperCase()}
                color={getPaymentStatusColor(selectedInvoice.payment_status || 'unknown') as any}
              />
            )}
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedInvoice && (
            <Box>
              <Paper sx={{ p: 3, mb: 3, backgroundColor: '#f8f9fa' }}>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                      <VendorIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                      Vendor Information
                    </Typography>
                    <Box sx={{ pl: 2 }}>
                      <Typography variant="body1" fontWeight="bold" sx={{ mb: 1 }}>
                        {selectedInvoice.vendor_name}
                      </Typography>
                      <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                        <PersonIcon sx={{ mr: 1, fontSize: 'small' }} />
                        {selectedInvoice.vendor_contact}
                      </Typography>
                      <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                        <EmailIcon sx={{ mr: 1, fontSize: 'small' }} />
                        {selectedInvoice.vendor_email}
                      </Typography>
                      {selectedInvoice.bank_name && (
                        <Typography variant="body2" color="textSecondary">
                          <BankIcon sx={{ mr: 1, fontSize: 'small' }} />
                          {selectedInvoice.bank_name}
                        </Typography>
                      )}
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                      <MoneyIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                      Payment Summary
                    </Typography>
                    <Box sx={{ pl: 2 }}>
                                       <Typography variant="h5" color="primary" fontWeight="bold" sx={{ mb: 1 }}>
                   {formatCurrency(parseFloat(selectedInvoice.total.toString()) || 0)}
                 </Typography>
                 <Typography variant="body2" color="success.main" sx={{ mb: 1 }}>
                   Paid: {formatCurrency(parseFloat(selectedInvoice.total_paid?.toString() || '0'))}
                 </Typography>
                 <Typography variant="body2" color="warning.main" fontWeight="bold">
                   Balance: {formatCurrency(parseFloat(selectedInvoice.balance_due?.toString() || '0'))}
                 </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>

              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                  <InvoiceIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Invoice Details
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                      Description
                    </Typography>
                    <Typography variant="body1" sx={{ p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                      {selectedInvoice.description}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                      Invoice Date
                    </Typography>
                    <Typography variant="body1">
                      {formatDate(selectedInvoice.invoice_date)}
                    </Typography>
                  </Grid>
                  {selectedInvoice.due_date && (
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                        Due Date
                      </Typography>
                      <Typography variant="body1">
                        {formatDate(selectedInvoice.due_date)}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </Paper>

              <Paper sx={{ p: 3, backgroundColor: '#f8f9fa' }}>
                <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                  <ApprovedIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Approval Information
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                      Approved By
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {selectedInvoice.approved_by_name}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                      Sent to Accounting
                    </Typography>
                    <Typography variant="body1">
                      {formatDate(selectedInvoice.sent_to_accounting_at)}
                    </Typography>
                  </Grid>
                  {selectedInvoice.admin_notes && (
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                        Admin Notes
                      </Typography>
                      <Typography variant="body1" sx={{ p: 2, backgroundColor: '#fff8e1', borderRadius: 1 }}>
                        {selectedInvoice.admin_notes}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </Paper>

                             {/* Payment History Section */}
               <Paper sx={{ p: 3, mb: 3, backgroundColor: '#f8f9fa' }}>
                 <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                   💰 Payment History
                 </Typography>
                 
                 {paymentHistory.length === 0 ? (
                   <Alert severity="info">
                     <Typography variant="body2">
                       No payments have been processed for this invoice yet.
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
                             <TableCell>{formatDate(payment.payment_date)}</TableCell>
                             <TableCell>{formatCurrency(payment.amount)}</TableCell>
                             <TableCell>
                               <Chip 
                                 label={payment.payment_method.replace('_', ' ').toUpperCase()} 
                                 size="small" 
                                 color="primary" 
                                 variant="outlined"
                               />
                             </TableCell>
                             <TableCell>{payment.reference_number || '-'}</TableCell>
                             <TableCell>{payment.processed_by_name || 'Unknown'}</TableCell>
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

                             {/* Payment Processing Section */}
               <Paper sx={{ p: 3, backgroundColor: '#f8f9fa', border: '2px solid #e0e0e0' }}>
                 <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold', mb: 2 }}>
                   💳 Payment Processing
                 </Typography>
                 
                 {/* Debug Info */}
                 <Alert severity="info" sx={{ mb: 2 }}>
                   <Typography variant="body2">
                     <strong>Debug Info:</strong><br />
                     Balance Due: {selectedInvoice.balance_due} (Type: {typeof selectedInvoice.balance_due})<br />
                     Total Paid: {selectedInvoice.total_paid} (Type: {typeof selectedInvoice.total_paid})<br />
                     Total Amount: {selectedInvoice.total} (Type: {typeof selectedInvoice.total})<br />
                     Status: {selectedInvoice.status}
                   </Typography>
                 </Alert>
                 
                                   {parseFloat(selectedInvoice.balance_due?.toString() || '0') > 0 ? (
                   <>
                   <Alert severity="info" sx={{ mb: 3 }}>
                     <Typography variant="body2">
                       <strong>Vendor:</strong> {selectedInvoice.vendor_name}<br />
                       <strong>Balance Due:</strong> {formatCurrency(selectedInvoice.balance_due)}
                     </Typography>
                   </Alert>

                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Payment Amount"
                        type="number"
                        value={paymentData.amount}
                        onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                        inputProps={{ min: 0, max: selectedInvoice.balance_due, step: 0.01 }}
                        helperText={`Maximum: ${formatCurrency(selectedInvoice.balance_due)}`}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Payment Date"
                        type="date"
                        value={paymentData.payment_date}
                        onChange={(e) => setPaymentData({ ...paymentData, payment_date: e.target.value })}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <FormControl fullWidth>
                        <InputLabel>Payment Method</InputLabel>
                        <Select
                          value={paymentData.payment_method}
                          onChange={(e) => setPaymentData({ ...paymentData, payment_method: e.target.value })}
                          label="Payment Method"
                        >
                          <MenuItem value="check">Check</MenuItem>
                          <MenuItem value="direct_deposit">Direct Deposit</MenuItem>
                          <MenuItem value="wire_transfer">Wire Transfer</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Reference Number"
                        value={paymentData.reference_number}
                        onChange={(e) => setPaymentData({ ...paymentData, reference_number: e.target.value })}
                        placeholder="Check number, transaction ID, etc."
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Payment Notes"
                        multiline
                        rows={3}
                        value={paymentData.notes}
                        onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                        placeholder="Optional payment notes"
                      />
                    </Grid>
                  </Grid>

                                     <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                     <Button
                       onClick={handleProcessPayment}
                       variant="contained"
                       color="success"
                       disabled={processingPayment || !paymentData.amount || parseFloat(paymentData.amount) <= 0}
                       startIcon={processingPayment ? <CircularProgress size={20} /> : <PaymentIcon />}
                       sx={{ minWidth: 150, height: 48 }}
                     >
                       {processingPayment ? 'Processing...' : '💳 Process Payment'}
                     </Button>
                   </Box>
                   </>
                                   ) : (
                    <Alert severity="success">
                      <Typography variant="body2">
                        ✅ This invoice has been fully paid. No further action required.
                      </Typography>
                    </Alert>
                  )}
               </Paper>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialog(false)} variant="outlined">
            Close
          </Button>
        </DialogActions>
      </Dialog>


    </Box>
  );
};

export default VendorInvoiceManagement; 