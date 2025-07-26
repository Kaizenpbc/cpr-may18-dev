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

interface VendorInvoice {
  id: number;
  invoice_number: string;
  item?: string;
  company?: string;
  billing_company?: string;
  quantity?: number | null;
  description: string;
  rate: number;
  amount: number;
  subtotal: number;
  hst: number;
  total: number;
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
  total_paid: number;
  balance_due: number;
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

const VendorInvoiceManagement: React.FC = () => {
  const [invoices, setInvoices] = useState<VendorInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<VendorInvoice | null>(null);
  const [viewDialog, setViewDialog] = useState(false);
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentData, setPaymentData] = useState<PaymentData>({
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: '',
    reference_number: '',
    notes: ''
  });
  const { showSuccess, showError } = useSnackbar();

  useEffect(() => {
    fetchInvoices();
  }, []);

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

  const handleView = (invoice: VendorInvoice) => {
    setSelectedInvoice(invoice);
    setViewDialog(true);
  };

  const handlePayment = (invoice: VendorInvoice) => {
    setSelectedInvoice(invoice);
    setPaymentData({
      amount: invoice.balance_due.toString(),
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: invoice.vendor_payment_method || 'check',
      reference_number: '',
      notes: ''
    });
    setPaymentDialog(true);
  };

  const handleProcessPayment = async () => {
    if (!selectedInvoice || !paymentData.amount) return;

    try {
      setProcessingPayment(true);
      const response = await adminApi.processVendorPayment(selectedInvoice.id, paymentData);
      
      showSuccess(response.message || 'Payment processed successfully');
      setPaymentDialog(false);
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
      <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
        <PaymentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
        Vendor Invoice Management
      </Typography>

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
                {formatCurrency(invoices.reduce((sum, inv) => sum + inv.balance_due, 0))}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Total Outstanding
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={3}>
            <Box textAlign="center">
              <Typography variant="h4" color="success.main">
                {formatCurrency(invoices.reduce((sum, inv) => sum + inv.total_paid, 0))}
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
            {invoices.map((invoice) => (
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
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="View Details">
                      <IconButton
                        size="small"
                        onClick={() => handleView(invoice)}
                        color="primary"
                      >
                        <ViewIcon />
                      </IconButton>
                    </Tooltip>
                    {invoice.balance_due > 0 && (
                      <Tooltip title="Process Payment">
                        <IconButton
                          size="small"
                          onClick={() => handlePayment(invoice)}
                          color="success"
                        >
                          <PaymentIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* View Invoice Dialog */}
      <Dialog open={viewDialog} onClose={() => setViewDialog(false)} maxWidth="md" fullWidth>
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
                        {formatCurrency(selectedInvoice.amount)}
                      </Typography>
                      <Typography variant="body2" color="success.main" sx={{ mb: 1 }}>
                        Paid: {formatCurrency(selectedInvoice.total_paid)}
                      </Typography>
                      <Typography variant="body2" color="warning.main" fontWeight="bold">
                        Balance: {formatCurrency(selectedInvoice.balance_due)}
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
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialog(false)} variant="outlined">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Process Payment Dialog */}
      <Dialog open={paymentDialog} onClose={() => setPaymentDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Typography variant="h6">
            Process Payment - Invoice #{selectedInvoice?.invoice_number}
          </Typography>
        </DialogTitle>
        <DialogContent>
          {selectedInvoice && (
            <Box sx={{ pt: 2 }}>
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
                    label="Notes"
                    multiline
                    rows={3}
                    value={paymentData.notes}
                    onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                    placeholder="Optional payment notes"
                  />
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentDialog(false)} variant="outlined">
            Cancel
          </Button>
          <Button
            onClick={handleProcessPayment}
            variant="contained"
            color="success"
            disabled={processingPayment || !paymentData.amount || parseFloat(paymentData.amount) <= 0}
            startIcon={processingPayment ? <CircularProgress size={20} /> : <PaymentIcon />}
          >
            {processingPayment ? 'Processing...' : 'Process Payment'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default VendorInvoiceManagement; 