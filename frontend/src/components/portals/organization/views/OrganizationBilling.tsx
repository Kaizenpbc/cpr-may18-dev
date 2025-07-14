import React, { useState } from 'react';
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
} from '@mui/material';
import {
  Receipt as ReceiptIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Visibility as VisibilityIcon,
  Payment as PaymentIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { formatDisplayDate } from '../../../../utils/dateUtils';
import { api } from '../../../../services/api';

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

  // Handle invoice number click
  const handleInvoiceClick = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setDialogOpen(true);
  };

  // Handle dialog close
  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedInvoice(null);
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
    if (!selectedInvoice) return;

    setSubmittingPayment(true);
    setPaymentError(null);

    try {
      const response = await api.post(`/organization/invoices/${selectedInvoice.id}/payment-submission`, {
        amount: parseFloat(paymentForm.amount),
        payment_method: paymentForm.payment_method,
        reference_number: paymentForm.reference_number,
        payment_date: paymentForm.payment_date,
        notes: paymentForm.notes,
      });

      if (response.data.success) {
        setPaymentSuccess(true);
        setPaymentDialogOpen(false);
        // Reset form
        setPaymentForm({
          amount: '',
          payment_method: '',
          reference_number: '',
          payment_date: new Date().toISOString().split('T')[0],
          notes: '',
        });
        // Close invoice dialog after a delay
        setTimeout(() => {
          handleDialogClose();
        }, 2000);
      }
    } catch (error: any) {
      setPaymentError(error.response?.data?.message || 'Failed to submit payment');
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Handle payment dialog open
  const handlePaymentDialogOpen = () => {
    if (selectedInvoice) {
      setPaymentForm({
        amount: selectedInvoice.balance_due.toString(),
        payment_method: '',
        reference_number: '',
        payment_date: new Date().toISOString().split('T')[0],
        notes: '',
      });
      setPaymentDialogOpen(true);
    }
  };

  // Check if payment can be submitted
  const canSubmitPayment = (invoice: Invoice | null) => {
    if (!invoice) return false;
    const status = invoice.payment_status || invoice.status;
    return invoice.balance_due > 0 && 
           status !== 'paid' && 
           status !== 'payment_submitted';
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
                {safeInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                  <TableCell>
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
                  </TableCell>
                  <TableCell>{invoice.course_type_name}</TableCell>
                  <TableCell>
                    {formatDisplayDate(invoice.course_date)}
                  </TableCell>
                  <TableCell>{invoice.location}</TableCell>
                  <TableCell>{invoice.students_billed}</TableCell>
                  <TableCell align="right">${Number(invoice.base_cost || 0).toFixed(2)}</TableCell>
                  <TableCell align="right">${Number(invoice.tax_amount || 0).toFixed(2)}</TableCell>
                  <TableCell align="right">${(Number(invoice.base_cost || 0) + Number(invoice.tax_amount || 0)).toFixed(2)}</TableCell>
                  <TableCell align="right">${Number(invoice.amount_paid).toFixed(2)}</TableCell>
                  <TableCell align="right">
                    <Typography
                      variant="body2"
                      color={invoice.balance_due > 0 ? 'error.main' : 'success.main'}
                    >
                      ${Number(invoice.balance_due).toFixed(2)}
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
                  </TableCell>
                </TableRow>
              ))}
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

      {/* Invoice Detail Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleDialogClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Invoice Details - {selectedInvoice?.invoice_number}
        </DialogTitle>
        <DialogContent>
          {selectedInvoice && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Invoice Information
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Invoice Number
                  </Typography>
                  <Typography variant="body1">
                    {selectedInvoice.invoice_number}
                  </Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Created Date
                  </Typography>
                  <Typography variant="body1">
                    {formatDisplayDate(selectedInvoice.created_at)}
                  </Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Due Date
                  </Typography>
                  <Typography 
                    variant="body1"
                    color={isOverdue(selectedInvoice.due_date) ? 'error.main' : 'inherit'}
                  >
                    {formatDisplayDate(selectedInvoice.due_date)}
                  </Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Status
                  </Typography>
                  <Chip
                    label={selectedInvoice.payment_status || selectedInvoice.status}
                    color={getStatusColor(selectedInvoice.payment_status || selectedInvoice.status)}
                    size="small"
                  />
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Course Information
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Course Type
                  </Typography>
                  <Typography variant="body1">
                    {selectedInvoice.course_type_name}
                  </Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Course Date
                  </Typography>
                  <Typography variant="body1">
                    {formatDisplayDate(selectedInvoice.course_date)}
                  </Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Location
                  </Typography>
                  <Typography variant="body1">
                    {selectedInvoice.location}
                  </Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Students Billed
                  </Typography>
                  <Typography variant="body1">
                    {selectedInvoice.students_billed}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Cost Breakdown
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={3}>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Base Cost
                      </Typography>
                      <Typography variant="h6">
                        ${Number(selectedInvoice.base_cost || 0).toFixed(2)}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Tax (HST)
                      </Typography>
                      <Typography variant="h6">
                        ${Number(selectedInvoice.tax_amount || 0).toFixed(2)}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Total Amount
                      </Typography>
                      <Typography variant="h6">
                        ${(Number(selectedInvoice.base_cost || 0) + Number(selectedInvoice.tax_amount || 0)).toFixed(2)}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Amount Paid
                      </Typography>
                      <Typography variant="h6" color="success.main">
                        ${Number(selectedInvoice.amount_paid).toFixed(2)}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={12} md={6}>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Balance Due
                      </Typography>
                      <Typography 
                        variant="h6"
                        color={selectedInvoice.balance_due > 0 ? 'error.main' : 'success.main'}
                      >
                        ${Number(selectedInvoice.balance_due).toFixed(2)}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Rate per Student
                      </Typography>
                      <Typography variant="h6">
                        ${(Number(selectedInvoice.rate_per_student) || (Number(selectedInvoice.amount) / Number(selectedInvoice.students_billed))).toFixed(2)}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Grid>
              {selectedInvoice.paid_date && (
                <Grid item xs={12}>
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Paid Date
                    </Typography>
                    <Typography variant="body1">
                      {formatDisplayDate(selectedInvoice.paid_date)}
                    </Typography>
                  </Box>
                </Grid>
              )}
              
              {/* Payment Submission Section */}
              {canSubmitPayment(selectedInvoice) && (
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Box sx={{ 
                    p: 2, 
                    bgcolor: 'primary.light', 
                    borderRadius: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}>
                    <InfoIcon color="primary" />
                    <Typography variant="body2" color="primary.dark">
                      You can submit payment information for this invoice. Payment will be verified by accounting before being applied.
                    </Typography>
                  </Box>
                </Grid>
              )}

              {/* Payment Status Section */}
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ 
                  p: 2, 
                  bgcolor: 'grey.50', 
                  borderRadius: 1
                }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Payment Status
                  </Typography>
                  <Typography variant="body1">
                    {getPaymentStatusMessage(selectedInvoice)}
                  </Typography>
                  {selectedInvoice?.status === 'payment_submitted' && (
                    <Typography variant="body2" color="info.main" sx={{ mt: 1 }}>
                      Once verified by accounting, the invoice will be marked as paid if the full amount is covered, 
                      or revert to pending if it's a partial payment.
                    </Typography>
                  )}
                </Box>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          {selectedInvoice && canSubmitPayment(selectedInvoice) && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<PaymentIcon />}
              onClick={handlePaymentDialogOpen}
              sx={{ mr: 'auto' }}
            >
              Submit Payment
            </Button>
          )}
          <Button onClick={handleDialogClose}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Payment Submission Dialog */}
      <Dialog
        open={paymentDialogOpen}
        onClose={() => setPaymentDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Submit Payment - {selectedInvoice?.invoice_number}
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Payment information will be submitted for verification by accounting. 
            The invoice status will be updated once payment is verified.
          </Alert>
          
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
                Balance Due: ${Number(selectedInvoice.balance_due).toFixed(2)}
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
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Payment Method</InputLabel>
                <Select
                  value={paymentForm.payment_method}
                  onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                  label="Payment Method"
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
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handlePaymentSubmit}
            disabled={
              submittingPayment || 
              !paymentForm.amount || 
              !paymentForm.payment_method ||
              parseFloat(paymentForm.amount || '0') > (selectedInvoice?.balance_due || 0) ||
              parseFloat(paymentForm.amount || '0') <= 0 ||
              isNaN(parseFloat(paymentForm.amount || '0'))
            }
            startIcon={<PaymentIcon />}
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