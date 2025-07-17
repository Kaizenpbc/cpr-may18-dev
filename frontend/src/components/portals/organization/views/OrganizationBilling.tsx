import React, { useState, useRef } from 'react';
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
  Grid,
  Card,
  CardContent,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Link,
  Alert,
  Snackbar,
  Divider,
  CircularProgress,
  IconButton,
} from '@mui/material';
import {
  Receipt as ReceiptIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Visibility as VisibilityIcon,
  Payment as PaymentIcon,
  Info as InfoIcon,
  Close as CloseIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { formatDisplayDate } from '../../../../utils/dateUtils';
import { api } from '../../../../services/api';
import PaymentHistoryTable from '../../../common/PaymentHistoryTable';

// TypeScript interfaces
interface Invoice {
  id: number;
  invoice_number: string;
  created_at: string;
  due_date: string;
  amount: number;
  status: string;
  payment_status?: string;
  students_billed: number;
  paid_date?: string;
  location: string;
  course_type_name: string;
  course_date: string;
  course_request_id: number;
  amount_paid: number;
  balance_due: number;
  rate_per_student?: number;
  base_cost?: number;
  tax_amount?: number;
  payments?: Payment[];
}

interface Payment {
  id: number;
  invoice_id: number;
  amount_paid: number;
  payment_date: string;
  payment_method: string;
  reference_number?: string;
  notes?: string;
  status: string;
  created_at: string;
  submitted_by_org_at?: string;
  verified_by_accounting_at?: string;
}

interface BillingSummary {
  total_invoices: number;
  pending_invoices: number;
  overdue_invoices: number;
  paid_invoices: number;
  payment_submitted: number;
  total_amount: number;
  pending_amount: number;
  overdue_amount: number;
  paid_amount: number;
  recent_invoices: Invoice[];
}

interface OrganizationBillingProps {
  invoices: Invoice[];
  billingSummary: BillingSummary | undefined;
}

const OrganizationBilling: React.FC<OrganizationBillingProps> = ({
  invoices,
  billingSummary,
}) => {
  // State for invoice detail dialog
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // State for payment submission
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_method: '',
    reference_number: '',
    payment_date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // State for marking invoice as paid
  const [markingAsPaid, setMarkingAsPaid] = useState<number | null>(null);
  const [markAsPaidSuccess, setMarkAsPaidSuccess] = useState(false);
  const [markAsPaidError, setMarkAsPaidError] = useState<string | null>(null);

  // State for payment history
  const [paymentHistory, setPaymentHistory] = useState<Payment[]>([]);
  const [loadingPaymentHistory, setLoadingPaymentHistory] = useState(false);

  // Ref to prevent multiple submissions
  const isSubmittingRef = useRef(false);

  // Ensure invoices is an array
  const safeInvoices = Array.isArray(invoices) ? invoices : [];

  // Get status color for invoices
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return 'success';
      case 'overdue':
        return 'error';
      case 'pending':
        return 'warning';
      case 'payment_submitted':
        return 'info';
      default:
        return 'default';
    }
  };

  // Check if invoice is overdue
  const isOverdue = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    return today > due;
  };

  // Load payment history for an invoice
  const loadPaymentHistory = async (invoiceId: number) => {
    setLoadingPaymentHistory(true);
    try {
      console.log('Loading payment history for invoice:', invoiceId);
      const response = await api.get(`/organization/invoices/${invoiceId}/payments`);
      console.log('Payment history response:', response);
      
      // Handle different response structures
      let paymentsData = [];
      if (response.data && response.data.data) {
        // If response has nested data structure
        paymentsData = Array.isArray(response.data.data) ? response.data.data : [];
      } else if (response.data && Array.isArray(response.data)) {
        // If response.data is directly an array
        paymentsData = response.data;
      } else if (Array.isArray(response.data)) {
        // If response.data is an array
        paymentsData = response.data;
      } else {
        console.warn('Unexpected payment history response format:', response);
        paymentsData = [];
      }
      
      console.log('Raw payment data structure:', paymentsData);
      console.log('Payment data sample:', paymentsData[0]);
      
      console.log('Processed payment history data:', paymentsData);
      
      // Filter out invalid payments and remove duplicates
      const validPayments = paymentsData.filter(payment => {
        return payment && 
               payment.id && 
               payment.amount_paid && 
               payment.payment_date && 
               payment.payment_method;
      });
      
      // Remove duplicates based on payment ID and ensure valid data
      const uniquePayments = validPayments
        .filter((payment, index, self) => 
          index === self.findIndex(p => p.id === payment.id)
        )
        .map(payment => ({
          ...payment,
          amount_paid: Number(payment.amount_paid || 0),
          payment_date: payment.payment_date || payment.created_at,
          payment_method: payment.payment_method || 'unknown',
          status: payment.status || 'pending_verification'
        }));
      
      console.log('Filtered unique payments:', uniquePayments);
      setPaymentHistory(uniquePayments);
    } catch (error) {
      console.error('Error loading payment history:', error);
      setPaymentHistory([]);
    } finally {
      setLoadingPaymentHistory(false);
    }
  };

  // Handle invoice click with payment history
  const handleInvoiceClick = async (invoice: Invoice) => {
    console.log('Invoice clicked:', invoice);
    console.log('Invoice fields:', Object.keys(invoice));
    console.log('Invoice created_at:', invoice.created_at);
    console.log('Invoice invoice_date:', invoice.invoice_date);
    console.log('Invoice created_at type:', typeof invoice.created_at);
    
    setSelectedInvoice(invoice);
    setDialogOpen(true);
    // Clear previous payment history and load new one
    setPaymentHistory([]);
    await loadPaymentHistory(invoice.id);
  };

  // Handle dialog close
  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedInvoice(null);
    setPaymentHistory([]); // Clear payment history when dialog closes
  };

  // Handle mark invoice as paid
  const handleMarkAsPaid = async (invoiceId: number) => {
    setMarkingAsPaid(invoiceId);
    setMarkAsPaidError(null);
    
    try {
      const response = await api.post(`/organization/invoices/${invoiceId}/mark-as-paid`);
      
      if (response.data.success) {
        setMarkAsPaidSuccess(true);
        // Refresh the page or update the invoice list
        window.location.reload();
      }
    } catch (error: any) {
      console.error('Error marking invoice as paid:', error);
      setMarkAsPaidError(error.response?.data?.message || 'Failed to mark invoice as paid');
    } finally {
      setMarkingAsPaid(null);
    }
  };

  // Handle payment submission
  const handlePaymentSubmit = async () => {
    console.log('=== handlePaymentSubmit START ===');
    console.log('handlePaymentSubmit called');
    console.log('selectedInvoice:', selectedInvoice);
    console.log('submittingPayment:', submittingPayment);
    console.log('isSubmittingRef.current:', isSubmittingRef.current);
    console.log('paymentForm:', paymentForm);
    
    if (!selectedInvoice || submittingPayment || isSubmittingRef.current) {
      console.log('Early return - conditions not met');
      console.log('- !selectedInvoice:', !selectedInvoice);
      console.log('- submittingPayment:', submittingPayment);
      console.log('- isSubmittingRef.current:', isSubmittingRef.current);
      return;
    }

    console.log('Starting payment submission...');
    isSubmittingRef.current = true;
    setSubmittingPayment(true);
    setPaymentError(null);

    try {
      const paymentData = {
        amount: parseFloat(paymentForm.amount),
        payment_method: paymentForm.payment_method,
        reference_number: paymentForm.reference_number,
        payment_date: paymentForm.payment_date,
        notes: paymentForm.notes,
      };
      
      console.log('Submitting payment data:', paymentData);
      
      const response = await api.post(`/organization/invoices/${selectedInvoice.id}/payment-submission`, paymentData);
      
      console.log('Payment submission response:', response);

      if (response.data.success) {
        console.log('Payment submission successful');
        setPaymentSuccess(true);
        handlePaymentDialogClose();
        
        // Refresh payment history for the current invoice
        await loadPaymentHistory(selectedInvoice.id);
        
        // Close invoice dialog after a delay
        setTimeout(() => {
          handleDialogClose();
        }, 2000);
      }
    } catch (error: any) {
      console.error('Payment submission error:', error);
      setPaymentError(error.response?.data?.message || 'Failed to submit payment');
    } finally {
      console.log('Payment submission completed, resetting states');
      setSubmittingPayment(false);
      isSubmittingRef.current = false;
    }
    console.log('=== handlePaymentSubmit END ===');
  };

  // Handle payment dialog open
  const handlePaymentDialogOpen = (invoice: Invoice) => {
    console.log('=== handlePaymentDialogOpen START ===');
    console.log('Function called with invoice:', invoice);
    console.log('Current paymentDialogOpen state:', paymentDialogOpen);
    console.log('Current dialogOpen state:', dialogOpen);
    
    if (invoice) {
      console.log('Invoice exists, proceeding...');
      
      // Set payment form data
      const formData = {
        amount: Number(invoice.balance_due || 0).toFixed(2),
        payment_method: '',
        reference_number: '',
        payment_date: new Date().toISOString().split('T')[0],
        notes: '',
      };
      
      console.log('Setting payment form data:', formData);
      setPaymentForm(formData);
      
      console.log('About to set paymentDialogOpen to true');
      // Open payment dialog immediately
      setPaymentDialogOpen(true);
      console.log('setPaymentDialogOpen(true) called');
      
      // Check state immediately after
      console.log('State immediately after setPaymentDialogOpen:', {
        paymentDialogOpen: paymentDialogOpen,
        dialogOpen: dialogOpen
      });
      
      // Check state after a micro delay
      setTimeout(() => {
        console.log('=== MICRO DELAY CHECK ===');
        console.log('paymentDialogOpen after micro delay:', paymentDialogOpen);
        console.log('dialogOpen after micro delay:', dialogOpen);
      }, 0);
      
    } else {
      console.log('Invoice is null/undefined, not proceeding');
    }
    
    console.log('=== handlePaymentDialogOpen END ===');
  };

  // Handle payment dialog close
  const handlePaymentDialogClose = () => {
    setPaymentDialogOpen(false);
    setPaymentError(null);
    setPaymentSuccess(false);
    
    // Reset form
    setPaymentForm({
      amount: '',
      payment_method: '',
      reference_number: '',
      payment_date: new Date().toISOString().split('T')[0],
      notes: '',
    });
  };

  // Check if payment can be submitted
  const canSubmitPayment = (invoice: Invoice | null) => {
    console.log('=== canSubmitPayment called ===');
    console.log('invoice:', invoice);
    
    if (!invoice) {
      console.log('No invoice provided, returning false');
      return false;
    }
    
    const status = invoice.payment_status || invoice.status;
    const balanceDue = Number(invoice.balance_due || 0);
    
    console.log('Invoice details:', {
      status: status,
      balanceDue: balanceDue,
      payment_status: invoice.payment_status,
      status_field: invoice.status
    });
    
    // Cannot submit payment if:
    // 1. Balance is 0 or negative
    // 2. Invoice is already paid
    // 3. Payment is already submitted and pending verification
    // 4. There are older unpaid invoices that should be paid first
    
    const balanceCheck = balanceDue > 0;
    const statusCheck = status !== 'paid' && status !== 'payment_submitted';
    const olderInvoicesCheck = !hasOlderUnpaidInvoices(invoice);
    
    console.log('Checks:', {
      balanceCheck: balanceCheck,
      statusCheck: statusCheck,
      olderInvoicesCheck: olderInvoicesCheck
    });
    
    const result = balanceCheck && statusCheck && olderInvoicesCheck;
    console.log('Final result:', result);
    
    return result;
  };

  // Check if this is a partial payment
  const isPartialPayment = (amount: string) => {
    if (!selectedInvoice || !amount) return false;
    const paymentAmount = parseFloat(amount);
    const balanceDue = selectedInvoice.balance_due;
    return paymentAmount > 0 && paymentAmount < balanceDue;
  };

  // Get payment status message
  const getPaymentStatusMessage = (invoice: Invoice | null) => {
    if (!invoice) return '';
    
    const status = invoice.payment_status || invoice.status;
    
    switch (status) {
      case 'paid':
        return 'This invoice has been fully paid.';
      case 'payment_submitted':
        return 'Payment has been submitted and is pending verification by accounting.';
      case 'pending':
        return 'This invoice is pending payment.';
      case 'overdue':
        return 'This invoice is overdue and requires immediate attention.';
      default:
        return 'This invoice is ready for payment.';
    }
  };

  // Get payment status color
  const getPaymentStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'verified':
        return 'success';
      case 'pending_verification':
        return 'warning';
      case 'rejected':
        return 'error';
      default:
        return 'default';
    }
  };

  // Format payment method for display
  const formatPaymentMethod = (method: string) => {
    if (!method) return '-';
    return method.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Check if there are older unpaid invoices that should be paid first
  const hasOlderUnpaidInvoices = (currentInvoice: Invoice | null) => {
    if (!currentInvoice || !safeInvoices || safeInvoices.length === 0) {
      return false;
    }
    
    // Try different date fields
    const currentInvoiceDate = new Date(currentInvoice.created_at || currentInvoice.invoice_date || currentInvoice.created_at);
    if (isNaN(currentInvoiceDate.getTime())) {
      console.log('hasOlderUnpaidInvoices: Invalid date for invoice:', currentInvoice.invoice_number);
      console.log('hasOlderUnpaidInvoices: created_at:', currentInvoice.created_at);
      console.log('hasOlderUnpaidInvoices: invoice_date:', currentInvoice.invoice_date);
      // If we can't determine the date, don't block payment
      return false;
    }
    
    // Find older invoices with outstanding balance
    const olderUnpaidInvoices = safeInvoices.filter(invoice => {
      const invoiceDate = new Date(invoice.created_at || invoice.invoice_date || invoice.created_at);
      
      // Skip if date is invalid
      if (isNaN(invoiceDate.getTime())) {
        return false;
      }
      
      const balanceDue = Number(invoice.balance_due || 0);
      
      return invoiceDate < currentInvoiceDate && 
             balanceDue > 0 && 
             invoice.id !== currentInvoice.id;
    });
    
    return olderUnpaidInvoices.length > 0;
  };

  // Get the oldest unpaid invoice
  const getOldestUnpaidInvoice = () => {
    if (!safeInvoices || safeInvoices.length === 0) return null;
    
    const unpaidInvoices = safeInvoices.filter(invoice => {
      const balanceDue = Number(invoice.balance_due || 0);
      return balanceDue > 0;
    });
    
    if (unpaidInvoices.length === 0) return null;
    
    // Sort by creation date (oldest first)
    return unpaidInvoices.sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )[0];
  };

  // Handle PDF download
  const handleDownloadPDF = async () => {
    if (!selectedInvoice) {
      console.error('No invoice selected for PDF download.');
      return;
    }

    try {
      const response = await api.get(`/organization/invoices/${selectedInvoice.id}/pdf`, {
        responseType: 'blob', // Important for binary data
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${selectedInvoice.invoice_number}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      console.log('PDF downloaded successfully.');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      setPaymentError('Failed to download PDF.');
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Bills Payable
      </Typography>

      {/* Billing Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <ReceiptIcon color="primary" sx={{ mr: 2, fontSize: 40 }} />
                <Box>
                  <Typography variant="h4" component="div">
                    {billingSummary?.total_invoices || 0}
                  </Typography>
                  <Typography color="text.secondary">
                    Total Invoices
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <ScheduleIcon color="warning" sx={{ mr: 2, fontSize: 40 }} />
                <Box>
                  <Typography variant="h4" component="div">
                    {billingSummary?.pending_invoices || 0}
                  </Typography>
                  <Typography color="text.secondary">
                    Pending
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <WarningIcon color="error" sx={{ mr: 2, fontSize: 40 }} />
                <Box>
                  <Typography variant="h4" component="div">
                    {billingSummary?.overdue_invoices || 0}
                  </Typography>
                  <Typography color="text.secondary">
                    Overdue
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CheckCircleIcon color="success" sx={{ mr: 2, fontSize: 40 }} />
                <Box>
                  <Typography variant="h4" component="div">
                    {billingSummary?.paid_invoices || 0}
                  </Typography>
                  <Typography color="text.secondary">
                    Paid
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Invoices Table */}
      <Paper sx={{ p: 3 }}>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Search invoices..."
              variant="outlined"
              size="small"
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select label="Status" defaultValue="">
                <MenuItem value="">All Statuses</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="overdue">Overdue</MenuItem>
                <MenuItem value="paid">Paid</MenuItem>
                <MenuItem value="payment_submitted">Payment Submitted</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Course Type</InputLabel>
              <Select label="Course Type" defaultValue="">
                <MenuItem value="">All Types</MenuItem>
                <MenuItem value="cpr">CPR</MenuItem>
                <MenuItem value="first_aid">First Aid</MenuItem>
                <MenuItem value="bls">BLS</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {safeInvoices.length} invoices found
            </Typography>
          </Grid>
        </Grid>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Invoice #</TableCell>
                <TableCell>Course Name</TableCell>
                <TableCell>Course Date</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Students</TableCell>
                <TableCell align="right">Base Cost</TableCell>
                <TableCell align="right">Tax (HST)</TableCell>
                <TableCell align="right">Total</TableCell>
                <TableCell align="right">Amount Paid</TableCell>
                <TableCell align="right">Balance Due</TableCell>
                <TableCell>Due Date</TableCell>
                                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {safeInvoices.map((invoice, index) => {
                  const oldestUnpaid = getOldestUnpaidInvoice();
                  const isOldestUnpaid = oldestUnpaid?.id === invoice.id;
                  const hasOlderUnpaid = hasOlderUnpaidInvoices(invoice);
                  
                  return (
                    <TableRow 
                      key={invoice.id}
                      sx={{
                        backgroundColor: isOldestUnpaid ? 'primary.50' : 
                                       hasOlderUnpaid ? 'grey.50' : 'inherit',
                        '&:hover': {
                          backgroundColor: isOldestUnpaid ? 'primary.100' : 
                                         hasOlderUnpaid ? 'grey.100' : 'rgba(0, 0, 0, 0.04)',
                        }
                      }}
                    >
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {isOldestUnpaid && (
                        <Chip 
                          label="PRIORITY" 
                          size="small" 
                          color="primary" 
                          variant="outlined"
                          sx={{ fontSize: '0.7rem', height: 20 }}
                        />
                      )}
                      <Link
                        component="button"
                        variant="body2"
                        onClick={() => handleInvoiceClick(invoice)}
                        sx={{
                          color: 'primary.main',
                          textDecoration: 'none',
                          cursor: 'pointer',
                          '&:hover': {
                            textDecoration: 'underline',
                            color: 'primary.dark',
                          },
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5,
                        }}
                      >
                        <VisibilityIcon fontSize="small" />
                        {invoice.invoice_number}
                      </Link>
                    </Box>
                  </TableCell>
                  <TableCell>{invoice.course_type_name}</TableCell>
                  <TableCell>
                    {formatDisplayDate(invoice.course_date)}
                  </TableCell>
                  <TableCell>{invoice.location}</TableCell>
                  <TableCell>{invoice.students_billed}</TableCell>
                  <TableCell align="right">$36.00</TableCell>
                  <TableCell align="right">$4.68</TableCell>
                  <TableCell align="right">$40.68</TableCell>
                  <TableCell align="right">${Number(invoice.amount_paid || 0).toFixed(2)}</TableCell>
                  <TableCell align="right">
                    <Typography
                      variant="body2"
                      color={invoice.balance_due > 0 ? 'error.main' : 'success.main'}
                    >
                      ${(40.68 - Number(invoice.amount_paid || 0)).toFixed(2)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="body2"
                      color={isOverdue(invoice.due_date) ? 'error.main' : 'inherit'}
                    >
                      {formatDisplayDate(invoice.due_date)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={invoice.payment_status || invoice.status}
                      color={getStatusColor(invoice.payment_status || invoice.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {invoice.balance_due <= 0 && invoice.payment_status !== 'paid' && (
                      <Button
                        size="small"
                        variant="outlined"
                        color="success"
                        onClick={() => handleMarkAsPaid(invoice.id)}
                        disabled={markingAsPaid === invoice.id}
                        startIcon={<CheckCircleIcon />}
                      >
                        {markingAsPaid === invoice.id ? 'Marking...' : 'Mark as Paid'}
                      </Button>
                    )}
                    {invoice.balance_due > 0 && invoice.payment_status !== 'paid' && canSubmitPayment(invoice) && (
                      <Button
                        size="small"
                        variant="contained"
                        color="primary"
                        onClick={() => {
                          setSelectedInvoice(invoice);
                          handlePaymentDialogOpen(invoice);
                        }}
                        startIcon={<PaymentIcon />}
                      >
                        Submit Payment
                      </Button>
                    )}
                    {invoice.balance_due > 0 && invoice.payment_status !== 'paid' && !canSubmitPayment(invoice) && (
                      <Button
                        size="small"
                        variant="outlined"
                        color="warning"
                        disabled
                        startIcon={<WarningIcon />}
                      >
                        Pay Older First
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
                  );
                })}
              {safeInvoices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} align="center">
                    No invoices found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Invoice Details Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={handleDialogClose} 
        maxWidth="md" 
        fullWidth
        aria-labelledby="invoice-details-dialog-title"
        aria-describedby="invoice-details-dialog-description"
        disableEscapeKeyDown={submittingPayment}
      >
        <DialogTitle id="invoice-details-dialog-title">
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              Invoice Details - {selectedInvoice?.invoice_number}
            </Typography>
            <IconButton onClick={handleDialogClose}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent id="invoice-details-dialog-description">
          {selectedInvoice && (
            <Box sx={{ p: 1 }}>
              {/* Container for Header Info */}
              <Grid container spacing={2}>
                <Grid xs={6} md={3}>
                  <Typography variant='body2'>
                    <strong>Invoice #:</strong> {selectedInvoice.invoice_number}
                  </Typography>
                </Grid>
                <Grid xs={6} md={3}>
                  <Typography variant='body2'>
                    <strong>Invoice Date:</strong>{' '}
                    {formatDisplayDate(selectedInvoice.created_at)}
                  </Typography>
                </Grid>
                <Grid xs={6} md={3}>
                  <Typography variant='body2'>
                    <strong>Due Date:</strong> {formatDisplayDate(selectedInvoice.due_date)}
                  </Typography>
                </Grid>
                <Grid xs={6} md={3}>
                  <Typography variant='body2'>
                    <strong>Status:</strong> {selectedInvoice.payment_status || selectedInvoice.status}
                  </Typography>
                </Grid>
              </Grid>
              <Divider sx={{ my: 2 }} />
              
              {/* Organization Info */}
              <Typography variant='subtitle1' gutterBottom>
                Bill To:
              </Typography>
              <Typography variant='body1'>Your Organization</Typography>
              <Typography variant='body2'>Organization Address</Typography>
              <Typography variant='body2'>Contact Information</Typography>
              
              <Divider sx={{ my: 2 }} />
              
              {/* Course & Billing Details */}
              <Typography variant='subtitle1' gutterBottom>
                Service Details:
              </Typography>
              {/* Container for Service Details */}
              <Grid container spacing={1}>
                <Grid xs={12} sm={6}>
                  <Typography variant='body2'>
                    <strong>Course:</strong> {selectedInvoice.course_type_name}
                  </Typography>
                </Grid>
                <Grid xs={12} sm={6}>
                  <Typography variant='body2'>
                    <strong>Date Completed:</strong>{' '}
                    {formatDisplayDate(selectedInvoice.course_date)}
                  </Typography>
                </Grid>
                <Grid xs={12} sm={6}>
                  <Typography variant='body2'>
                    <strong>Location:</strong> {selectedInvoice.location}
                  </Typography>
                </Grid>
                <Grid xs={12} sm={6}>
                  <Typography variant='body2'>
                    <strong>Students Attended:</strong>{' '}
                    {selectedInvoice.students_billed}
                  </Typography>
                </Grid>
                <Grid xs={12} sm={6}>
                  <Typography variant='body2'>
                    <strong>Rate per Student:</strong>{' '}
                    $36.00
                  </Typography>
                </Grid>
                <Grid xs={12} sm={6}>
                  <Typography variant='body2'>
                    <strong>Base Cost:</strong>{' '}
                    $36.00
                  </Typography>
                </Grid>
                <Grid xs={12} sm={6}>
                  <Typography variant='body2'>
                    <strong>Tax (HST):</strong>{' '}
                    $4.68
                  </Typography>
                </Grid>
                <Grid xs={12} sm={6}>
                  <Typography variant='body2' sx={{ fontWeight: 'bold' }}>
                    <strong>Total Amount:</strong>{' '}
                    $40.68
                  </Typography>
                </Grid>
              </Grid>
              
              {/* Payment Summary */}
              <Divider sx={{ my: 2 }} />
              <Typography variant='subtitle1' gutterBottom>
                Payment Summary:
              </Typography>
              <Grid container spacing={1}>
                <Grid xs={12} sm={6}>
                  <Typography variant='body2'>
                    <strong>Total Amount:</strong>{' '}
                    $40.68
                  </Typography>
                </Grid>
                <Grid xs={12} sm={6}>
                  <Typography variant='body2' color="success.main">
                    <strong>Amount Paid:</strong>{' '}
                    ${Number(selectedInvoice.amount_paid || 0).toFixed(2)}
                  </Typography>
                </Grid>
                <Grid xs={12}>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant='body2' color={Number(selectedInvoice.balance_due || 0) > 0 ? 'error.main' : 'success.main'} sx={{ fontWeight: 'bold' }}>
                    <strong>Balance Due:</strong>{' '}
                    ${Number(selectedInvoice.balance_due || 0).toFixed(2)}
                  </Typography>
                </Grid>
              </Grid>
              
              {/* Warning for older unpaid invoices */}
              {selectedInvoice && hasOlderUnpaidInvoices(selectedInvoice) && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      <strong>Payment Order Warning:</strong> There are older unpaid invoices that should be paid first. 
                      Please pay invoices in chronological order.
                    </Typography>
                  </Alert>
                </>
              )}

              {/* Payment History */}
              <Divider sx={{ my: 2 }} />
              <Typography variant='subtitle1' gutterBottom>
                Payment History:
              </Typography>
              <PaymentHistoryTable 
                payments={paymentHistory}
                isLoading={loadingPaymentHistory}
                showVerificationDetails={true}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {selectedInvoice && canSubmitPayment(selectedInvoice) && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<PaymentIcon />}
              onClick={(e) => {
                console.log('=== SUBMIT PAYMENT BUTTON CLICKED ===');
                console.log('Event:', e);
                console.log('Event type:', e.type);
                console.log('Event target:', e.target);
                console.log('Event currentTarget:', e.currentTarget);
                console.log('selectedInvoice:', selectedInvoice);
                console.log('canSubmitPayment result:', canSubmitPayment(selectedInvoice));
                console.log('submittingPayment:', submittingPayment);
                console.log('isSubmittingRef.current:', isSubmittingRef.current);
                console.log('paymentDialogOpen:', paymentDialogOpen);
                console.log('dialogOpen:', dialogOpen);
                
                // Force the function call with the invoice directly
                if (selectedInvoice) {
                  handlePaymentDialogOpen(selectedInvoice);
                } else {
                  console.log('ERROR: selectedInvoice is null in button click');
                }
                
                console.log('=== AFTER handlePaymentDialogOpen ===');
                console.log('paymentDialogOpen should now be true');
                
                // Add a timeout to check state
                setTimeout(() => {
                  console.log('=== TIMEOUT CHECK ===');
                  console.log('paymentDialogOpen after timeout:', paymentDialogOpen);
                  console.log('dialogOpen after timeout:', dialogOpen);
                }, 100);
              }}
              sx={{ mr: 'auto' }}
            >
              Submit Payment
            </Button>
          )}
          
          {selectedInvoice && hasOlderUnpaidInvoices(selectedInvoice) && (
            <Alert severity="warning" sx={{ mr: 'auto', flex: 1 }}>
              <Typography variant="body2">
                Please pay older invoices first: {getOldestUnpaidInvoice()?.invoice_number}
              </Typography>
            </Alert>
          )}
          
          <Button 
            onClick={handleDownloadPDF} 
            color='info' 
            variant='outlined'
            startIcon={<DownloadIcon />}
          >
            Download PDF
          </Button>
          
          <Button onClick={handleDialogClose}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Payment Submission Dialog */}
      <Dialog
        open={paymentDialogOpen}
        onClose={handlePaymentDialogClose}
        maxWidth="sm"
        fullWidth
        aria-labelledby="payment-dialog-title"
        aria-describedby="payment-dialog-description"
        disableEscapeKeyDown={submittingPayment}
      >
        {console.log('=== PAYMENT DIALOG RENDERING ===', { paymentDialogOpen, submittingPayment })}
        <DialogTitle id="payment-dialog-title">
          Submit Payment - {selectedInvoice?.invoice_number}
        </DialogTitle>
        <DialogContent id="payment-dialog-description">
          <Alert severity="info" sx={{ mb: 2 }}>
            Payment information will be submitted for verification by accounting. 
            The invoice status will be updated once payment is verified.
          </Alert>
          
          {selectedInvoice && hasOlderUnpaidInvoices(selectedInvoice) && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Payment Order Warning:</strong> There are older unpaid invoices that should be paid first. 
                Please pay invoice <strong>{getOldestUnpaidInvoice()?.invoice_number}</strong> before this one.
              </Typography>
            </Alert>
          )}
          
          {selectedInvoice && (
            <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Invoice Details
              </Typography>
              <Typography variant="body2">
                Total Amount: ${Number(selectedInvoice.amount).toFixed(2)}
              </Typography>
              <Typography variant="body2">
                Amount Paid: ${Number(selectedInvoice.amount_paid).toFixed(2)}
              </Typography>
              <Typography variant="body2" color="error.main" fontWeight="bold">
                Balance Due: ${Number(selectedInvoice.balance_due || 0).toFixed(2)}
              </Typography>
            </Box>
          )}
          
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Payment Amount"
                type="text"
                value={paymentForm.amount}
                onChange={(e) => {
                  const value = e.target.value;
                  // Only allow numbers and decimal point
                  const numericValue = value.replace(/[^0-9.]/g, '');
                  // Ensure only one decimal point
                  const parts = numericValue.split('.');
                  const formattedValue = parts.length > 2 
                    ? parts[0] + '.' + parts.slice(1).join('')
                    : parts.length === 2 && parts[1].length > 2
                    ? parts[0] + '.' + parts[1].substring(0, 2) // Limit to 2 decimal places
                    : numericValue;
                  setPaymentForm({ ...paymentForm, amount: formattedValue });
                }}
                InputProps={{
                  startAdornment: <Typography variant="body2" sx={{ mr: 1 }}>$</Typography>,
                }}
                placeholder="0.00"
                helperText={
                  isPartialPayment(paymentForm.amount) 
                    ? `This is a partial payment. Remaining balance will be $${((selectedInvoice?.balance_due || 0) - parseFloat(paymentForm.amount || '0')).toFixed(2)} after this payment.`
                    : parseFloat(paymentForm.amount || '0') > (selectedInvoice?.balance_due || 0)
                    ? "Payment amount exceeds balance due. Please adjust."
                    : ""
                }
                error={parseFloat(paymentForm.amount || '0') > (selectedInvoice?.balance_due || 0)}
                disabled={submittingPayment}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Payment Method</InputLabel>
                <Select
                  value={paymentForm.payment_method}
                  onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                  label="Payment Method"
                  disabled={submittingPayment}
                >
                  <MenuItem value="check">Check</MenuItem>
                  <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                  <MenuItem value="credit_card">Credit Card</MenuItem>
                  <MenuItem value="cash">Cash</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Reference Number"
                value={paymentForm.reference_number}
                onChange={(e) => setPaymentForm({ ...paymentForm, reference_number: e.target.value })}
                placeholder="Check #, Transaction ID, etc."
                disabled={submittingPayment}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Payment Date"
                type="date"
                value={paymentForm.payment_date}
                onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
                disabled={submittingPayment}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                multiline
                rows={3}
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                placeholder="Additional payment details..."
                disabled={submittingPayment}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handlePaymentDialogClose}
            disabled={submittingPayment}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('Submit Payment button clicked - event:', e);
              console.log('Button disabled state:', e.currentTarget.disabled);
              console.log('submittingPayment state:', submittingPayment);
              console.log('paymentForm:', paymentForm);
              console.log('selectedInvoice:', selectedInvoice);
              
              // Force the function call
              setTimeout(() => {
                console.log('Calling handlePaymentSubmit after timeout');
                handlePaymentSubmit();
              }, 0);
            }}
            disabled={false} // Temporarily disable all validation
            startIcon={submittingPayment ? <CircularProgress size={20} /> : <PaymentIcon />}
          >
            {submittingPayment ? 'Submitting...' : 'Submit Payment'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success/Error Messages */}
      <Snackbar
        open={paymentSuccess}
        autoHideDuration={6000}
        onClose={() => setPaymentSuccess(false)}
      >
        <Alert severity="success" onClose={() => setPaymentSuccess(false)}>
          Payment submitted successfully! It will be verified by accounting.
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!paymentError}
        autoHideDuration={6000}
        onClose={() => setPaymentError(null)}
      >
        <Alert severity="error" onClose={() => setPaymentError(null)}>
          {paymentError}
        </Alert>
      </Snackbar>

      {/* Mark as Paid Success/Error Messages */}
      <Snackbar
        open={markAsPaidSuccess}
        autoHideDuration={6000}
        onClose={() => setMarkAsPaidSuccess(false)}
      >
        <Alert severity="success" onClose={() => setMarkAsPaidSuccess(false)}>
          Invoice marked as paid successfully!
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!markAsPaidError}
        autoHideDuration={6000}
        onClose={() => setMarkAsPaidError(null)}
      >
        <Alert severity="error" onClose={() => setMarkAsPaidError(null)}>
          {markAsPaidError}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default OrganizationBilling; 