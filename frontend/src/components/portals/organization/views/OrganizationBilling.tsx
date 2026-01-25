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
  FormHelperText,
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
  Tooltip,
} from '@mui/material';
import {
  Receipt as ReceiptIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Visibility as VisibilityIcon,
  Payment as PaymentIcon,
  MonetizationOn as MonetizationOnIcon,
  Info as InfoIcon,
  Close as CloseIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { formatDisplayDate } from '../../../../utils/dateUtils';
import { api } from '../../../../services/api';
import PaymentHistoryTable from '../../../common/PaymentHistoryTable';
import ServiceDetailsTable from '../../../common/ServiceDetailsTable';

// TypeScript interfaces
interface Invoice {
  id: number;
  invoice_number: string;
  created_at: string;
  invoice_date?: string;
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
  invoiceId: number;
  amount?: number;
  amountPaid?: number;
  paymentDate: string;
  paymentMethod: string;
  referenceNumber?: string;
  notes?: string;
  status: string;
  createdAt: string;
  submittedByOrgAt?: string;
  verifiedByAccountingAt?: string;
  // Legacy snake_case aliases for backward compatibility
  invoice_id?: number;
  amount_paid?: number;
  payment_date?: string;
  payment_method?: string;
  reference_number?: string;
  created_at?: string;
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
  onPaymentSuccess?: () => void;
}

const OrganizationBilling: React.FC<OrganizationBillingProps> = ({
  invoices,
  billingSummary,
  onPaymentSuccess,
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
  const [paymentSuccessMessage, setPaymentSuccessMessage] = useState<string>('');
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [showPaymentConfirmation, setShowPaymentConfirmation] = useState(false);
  
  // State for real-time balance calculation
  const [balanceCalculation, setBalanceCalculation] = useState<{
    current_outstanding_balance: number;
    remaining_balance_after_payment: number;
    is_valid_payment: boolean;
    is_overpayment: boolean;
    is_full_payment: boolean;
    can_submit_payment: boolean;
  } | null>(null);
  const [calculatingBalance, setCalculatingBalance] = useState(false);

  // State for marking invoice as paid
  const [markingAsPaid, setMarkingAsPaid] = useState<number | null>(null);
  const [markAsPaidSuccess, setMarkAsPaidSuccess] = useState(false);
  const [markAsPaidError, setMarkAsPaidError] = useState<string | null>(null);

  // State for payment history
  const [paymentHistory, setPaymentHistory] = useState<Payment[]>([]);
  const [loadingPaymentHistory, setLoadingPaymentHistory] = useState(false);
  
  // State for attendance data
  const [attendanceData, setAttendanceData] = useState<Array<{
    first_name: string;
    last_name: string;
    email: string;
    attended: boolean;
  }>>([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  // Ref to prevent multiple submissions
  const isSubmittingRef = useRef(false);
  
  // Debounce timer for balance calculation
  const balanceCalculationTimer = useRef<NodeJS.Timeout | null>(null);

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

  // Load attendance data for an invoice
  const loadAttendanceData = async (courseRequestId: number) => {
    setLoadingAttendance(true);
    try {
      console.log('Loading attendance data for course request:', courseRequestId);
      const response = await api.get(`/organization/courses/${courseRequestId}/students`);
      console.log('Attendance data response:', response);
      
      if (response.data && response.data.data) {
        const students = Array.isArray(response.data.data) ? response.data.data : [];
        setAttendanceData(students);
      } else {
        setAttendanceData([]);
      }
    } catch (error) {
      console.error('Error loading attendance data:', error);
      setAttendanceData([]);
    } finally {
      setLoadingAttendance(false);
    }
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
               (payment.amount_paid || payment.amount) && 
               payment.payment_date;
      });
      
      // Remove duplicates based on payment ID and ensure valid data
      const uniquePayments = validPayments
        .filter((payment, index, self) => 
          index === self.findIndex(p => p.id === payment.id)
        )
        .map(payment => ({
          ...payment,
          amount_paid: Number(payment.amount_paid || payment.amount || 0),
          payment_date: payment.payment_date || payment.created_at,
          payment_method: payment.payment_method || 'Not specified',
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
    
    // Load attendance data for this invoice's course
    if (invoice.course_request_id) {
      await loadAttendanceData(invoice.course_request_id);
    }
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
        // Refresh invoice list using React Query instead of page reload
        if (onPaymentSuccess) {
          onPaymentSuccess();
        }
        // Close any open dialogs
        handleDialogClose();
      }
    } catch (error: unknown) {
      console.error('Error marking invoice as paid:', error);
      const errObj = error as { response?: { data?: { message?: string } } };
      setMarkAsPaidError(errObj.response?.data?.message || 'Failed to mark invoice as paid');
    } finally {
      setMarkingAsPaid(null);
    }
  };

  // Handle payment submission with proper race condition prevention
  const handlePaymentSubmit = async () => {
    // CRITICAL: Set ref FIRST to prevent race condition from rapid clicks
    if (isSubmittingRef.current) {
      console.log('Payment already in progress, ignoring duplicate click');
      return;
    }
    isSubmittingRef.current = true;

    // Now check other conditions
    if (!selectedInvoice || submittingPayment) {
      isSubmittingRef.current = false;
      return;
    }

    // Validate required fields
    if (!paymentForm.payment_method || paymentForm.payment_method.trim() === '') {
      setPaymentError('Payment Method is required. Please select a payment method.');
      isSubmittingRef.current = false;
      return;
    }

    if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) {
      setPaymentError('Valid payment amount is required. Please enter an amount greater than $0.00.');
      isSubmittingRef.current = false;
      return;
    }

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

      const response = await api.post(`/organization/invoices/${selectedInvoice.id}/payment-submission`, paymentData);

      if (response.data.success) {
        const responseData = response.data.data;
        const message = responseData?.is_full_payment
          ? 'Full payment submitted successfully! Awaiting verification.'
          : `Partial payment of $${parseFloat(paymentForm.amount).toFixed(2)} submitted. Remaining balance: $${responseData?.remaining_balance?.toFixed(2) || '0.00'}`;

        setPaymentSuccessMessage(message);
        setPaymentSuccess(true);
        handlePaymentDialogClose();

        // Refresh invoice list to update status and balance
        if (onPaymentSuccess) {
          onPaymentSuccess();
        }

        // Refresh payment history for the current invoice
        await loadPaymentHistory(selectedInvoice.id);

        // Close invoice dialog after user can read message
        setTimeout(() => {
          handleDialogClose();
        }, 3000);
      }
    } catch (error: unknown) {
      console.error('Payment submission error:', error);

      // Extract meaningful error message from response
      const err = error as { response?: { data?: { message?: string }; status?: number } };
      let errorMessage = 'Payment submission failed. Please try again.';

      if (err.response?.status === 409) {
        errorMessage = err.response?.data?.message || 'Duplicate payment detected. Please wait or refresh the page.';
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }

      setPaymentError(errorMessage);
    } finally {
      setSubmittingPayment(false);
      isSubmittingRef.current = false;
    }
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
    setPaymentSuccessMessage('');
    setBalanceCalculation(null);
    
    // Clear balance calculation timer
    if (balanceCalculationTimer.current) {
      clearTimeout(balanceCalculationTimer.current);
    }
    
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

  // Real-time balance calculation
  const calculateBalance = async (invoiceId: number, paymentAmount: string) => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      setBalanceCalculation(null);
      return;
    }

    // Clear existing timer
    if (balanceCalculationTimer.current) {
      clearTimeout(balanceCalculationTimer.current);
    }

    // Set new timer for debounced calculation
    balanceCalculationTimer.current = setTimeout(async () => {
      try {
        setCalculatingBalance(true);
        const response = await api.get(`/invoices/${invoiceId}/calculate-balance`, { params: { amount: parseFloat(paymentAmount) } });
        
        if (response.data.success) {
          setBalanceCalculation(response.data.data);
        }
      } catch (error) {
        console.error('Error calculating balance:', error);
        setBalanceCalculation(null);
      } finally {
        setCalculatingBalance(false);
      }
    }, 300); // 300ms debounce
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

  // Transform invoice data into service details format
  const getServiceDetails = (invoice: Invoice) => {
    if (!invoice) return [];
    
    return [{
      date: invoice.course_date,
      location: invoice.location,
      course: invoice.course_type_name,
      students: invoice.students_billed,
      ratePerStudent: invoice.rate_per_student || 9.00,
      baseCost: invoice.base_cost || (invoice.amount * 0.885),
      tax: invoice.tax_amount || (invoice.amount * 0.115),
      total: invoice.amount,
    }];
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Bills Payable
      </Typography>

      {/* Billing Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)',
            transition: 'transform 0.2s ease-in-out',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 12px 40px rgba(102, 126, 234, 0.4)',
            }
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <ReceiptIcon sx={{ mr: 2, fontSize: 40, color: 'white' }} />
                <Box>
                  <Typography variant="h4" component="div" sx={{ color: 'white', fontWeight: 600 }}>
                    {billingSummary?.total_invoices || 0}
                  </Typography>
                  <Typography sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    Total Invoices
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #ff9800 0%, #ff5722 100%)',
            color: 'white',
            boxShadow: '0 8px 32px rgba(255, 152, 0, 0.3)',
            transition: 'transform 0.2s ease-in-out',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 12px 40px rgba(255, 152, 0, 0.4)',
            }
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <ScheduleIcon sx={{ mr: 2, fontSize: 40, color: 'white' }} />
                <Box>
                  <Typography variant="h4" component="div" sx={{ color: 'white', fontWeight: 600 }}>
                    {billingSummary?.pending_invoices || 0}
                  </Typography>
                  <Typography sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    Pending
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)',
            color: 'white',
            boxShadow: '0 8px 32px rgba(244, 67, 54, 0.3)',
            transition: 'transform 0.2s ease-in-out',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 12px 40px rgba(244, 67, 54, 0.4)',
            }
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <WarningIcon sx={{ mr: 2, fontSize: 40, color: 'white' }} />
                <Box>
                  <Typography variant="h4" component="div" sx={{ color: 'white', fontWeight: 600 }}>
                    {billingSummary?.overdue_invoices || 0}
                  </Typography>
                  <Typography sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    Overdue
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)',
            color: 'white',
            boxShadow: '0 8px 32px rgba(76, 175, 80, 0.3)',
            transition: 'transform 0.2s ease-in-out',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 12px 40px rgba(76, 175, 80, 0.4)',
            }
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CheckCircleIcon sx={{ mr: 2, fontSize: 40, color: 'white' }} />
                <Box>
                  <Typography variant="h4" component="div" sx={{ color: 'white', fontWeight: 600 }}>
                    {billingSummary?.paid_invoices || 0}
                  </Typography>
                  <Typography sx={{ color: 'rgba(255,255,255,0.8)' }}>
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
                <TableCell align="center">Students</TableCell>
                <TableCell align="right">Base Cost</TableCell>
                <TableCell align="right">Tax (HST)</TableCell>
                <TableCell align="right">Total</TableCell>
                <TableCell align="right">Amount Paid</TableCell>
                <TableCell align="right">Balance Due</TableCell>
                <TableCell>Due Date</TableCell>
                <TableCell align="center">Status</TableCell>
                <TableCell align="right">Actions</TableCell>
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
                    {invoice.invoice_number}
                  </TableCell>
                  <TableCell>{invoice.course_type_name}</TableCell>
                  <TableCell>
                    {formatDisplayDate(invoice.course_date)}
                  </TableCell>
                  <TableCell>{invoice.location}</TableCell>
                  <TableCell align="center">{invoice.students_billed}</TableCell>
                  <TableCell align="right">
                    {invoice.base_cost ? 
                      `$${Number(invoice.base_cost).toFixed(2)}` : 
                      <Typography variant="body2" color="error.main" fontSize="small">
                        Pricing not configured
                      </Typography>
                    }
                  </TableCell>
                  <TableCell align="right">
                    {invoice.tax_amount ? 
                      `$${Number(invoice.tax_amount).toFixed(2)}` : 
                      <Typography variant="body2" color="error.main" fontSize="small">
                        N/A
                      </Typography>
                    }
                  </TableCell>
                  <TableCell align="right">
                    {invoice.amount ? 
                      `$${Number(invoice.amount).toFixed(2)}` : 
                      <Typography variant="body2" color="error.main" fontSize="small">
                        N/A
                      </Typography>
                    }
                  </TableCell>
                  <TableCell align="right">
                    <Typography
                      variant="body2"
                      color={invoice.amount_paid > 0 ? 'success.main' : 'text.secondary'}
                    >
                      {`$${Number(invoice.amount_paid || 0).toFixed(2)}`}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography
                      variant="body2"
                      color={invoice.balance_due > 0 ? 'error.main' : 'success.main'}
                    >
                      {`$${Number(invoice.balance_due || 0).toFixed(2)}`}
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
                  <TableCell align="center">
                    <Chip
                      label={invoice.payment_status || invoice.status}
                      color={getStatusColor(invoice.payment_status || invoice.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <Tooltip title="View Details">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleInvoiceClick(invoice)}
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
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
                    </Box>
                  </TableCell>
                </TableRow>
                  );
                })}
              {safeInvoices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={13} align="center">
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
              
              {/* Service Details Table */}
              <ServiceDetailsTable 
                services={getServiceDetails(selectedInvoice)}
                showTotals={false}
              />
              
              {/* Class Attendance */}
              <Divider sx={{ my: 2 }} />
              <Typography variant='subtitle1' gutterBottom>
                Class Attendance:
              </Typography>
              {loadingAttendance ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : attendanceData.length > 0 ? (
                <Box sx={{ mb: 2 }}>
                  <Grid container spacing={1}>
                    <Grid xs={12}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Total Students: {attendanceData.length} | 
                        Present: {attendanceData.filter(s => s.attended).length} | 
                        Absent: {attendanceData.filter(s => !s.attended).length}
                      </Typography>
                    </Grid>
                  </Grid>
                  <TableContainer component={Paper} variant="outlined" sx={{ mt: 1 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Name</TableCell>
                          <TableCell>Email</TableCell>
                          <TableCell align="center">Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {attendanceData.map((student, index) => (
                          <TableRow key={index}>
                            <TableCell>{student.first_name} {student.last_name}</TableCell>
                            <TableCell>{student.email || 'N/A'}</TableCell>
                            <TableCell align="center">
                              <Chip
                                label={student.attended ? 'Present' : 'Absent'}
                                color={student.attended ? 'success' : 'error'}
                                size="small"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No attendance data available
                </Typography>
              )}
              
              {/* Payment Summary */}
              <Divider sx={{ my: 2 }} />
              <Typography variant='subtitle1' gutterBottom>
                Payment Summary:
              </Typography>
              <Grid container spacing={1}>
                <Grid xs={12} sm={6}>
                  <Typography variant='body2'>
                    <strong>Total Amount:</strong>{' '}
                    {selectedInvoice.amount ? 
                      `$${Number(selectedInvoice.amount).toFixed(2)}` : 
                      <Typography variant="body2" color="error.main" fontSize="small">
                        N/A
                      </Typography>
                    }
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
                onViewInvoice={() => {}} // Already showing invoice details in this dialog
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
        {/* Payment Dialog Rendering */}
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
                Total Amount: {selectedInvoice.amount ? 
                  `$${Number(selectedInvoice.amount).toFixed(2)}` : 
                  <Typography component="span" color="error.main" fontSize="small">
                    N/A
                  </Typography>
                }
              </Typography>
              <Typography variant="body2">
                Amount Paid: ${Number(selectedInvoice.amount_paid || 0).toFixed(2)}
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
                  
                  // Trigger real-time balance calculation
                  if (selectedInvoice) {
                    calculateBalance(selectedInvoice.id, formattedValue);
                  }
                }}
                InputProps={{
                  startAdornment: <Typography variant="body2" sx={{ mr: 1 }}>$</Typography>,
                  endAdornment: calculatingBalance ? <CircularProgress size={20} /> : null,
                }}
                placeholder="0.00"
                helperText={
                  balanceCalculation ? (
                    balanceCalculation.is_overpayment ? (
                      `❌ Payment exceeds outstanding balance ($${balanceCalculation.current_outstanding_balance.toFixed(2)})`
                    ) : balanceCalculation.is_full_payment ? (
                      `✅ This will complete the payment. Remaining balance: $${balanceCalculation.remaining_balance_after_payment.toFixed(2)}`
                    ) : (
                      `💰 Partial payment. Remaining balance: $${balanceCalculation.remaining_balance_after_payment.toFixed(2)}`
                    )
                  ) : paymentForm.amount ? (
                    "Calculating balance..."
                  ) : ""
                }
                error={balanceCalculation ? balanceCalculation.is_overpayment : false}
                disabled={submittingPayment}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Payment Method *</InputLabel>
                <Select
                  value={paymentForm.payment_method}
                  onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                  label="Payment Method *"
                  disabled={submittingPayment}
                  error={!paymentForm.payment_method && paymentError?.includes('Payment Method')}
                >
                  <MenuItem value="">Select Payment Method</MenuItem>
                  <MenuItem value="check">Check</MenuItem>
                  <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                  <MenuItem value="credit_card">Credit Card</MenuItem>
                  <MenuItem value="cash">Cash</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
                {!paymentForm.payment_method && paymentError?.includes('Payment Method') && (
                  <FormHelperText error>Payment Method is required</FormHelperText>
                )}
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
              // Call directly without setTimeout to prevent multiple submissions
              handlePaymentSubmit();
            }}
            disabled={
              submittingPayment || 
              !paymentForm.payment_method || 
              !paymentForm.amount || 
              parseFloat(paymentForm.amount || '0') <= 0 || 
              (balanceCalculation ? !balanceCalculation.can_submit_payment : false)
            }
            startIcon={submittingPayment ? <CircularProgress size={20} /> : <PaymentIcon />}
          >
            {submittingPayment ? 'Submitting...' : (selectedInvoice?.balance_due || 0) <= 0 ? 'Invoice Paid' : 'Submit Payment'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success/Error Messages */}
      <Snackbar
        open={paymentSuccess}
        autoHideDuration={5000}
        onClose={() => {
          setPaymentSuccess(false);
          setPaymentSuccessMessage('');
        }}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          severity="success"
          onClose={() => {
            setPaymentSuccess(false);
            setPaymentSuccessMessage('');
          }}
          sx={{
            maxWidth: 500,
            whiteSpace: 'pre-line',
            fontSize: '1rem',
          }}
        >
          {paymentSuccessMessage || 'Payment submitted successfully! Awaiting verification.'}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!paymentError}
        autoHideDuration={6000}
        onClose={() => setPaymentError(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setPaymentError(null)} sx={{ maxWidth: 500 }}>
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