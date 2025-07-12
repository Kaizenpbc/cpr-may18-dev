import React, { useState, useEffect } from 'react';
import { useParams, Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Paper,
  Grid,
  Divider,
  Link,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
} from '@mui/material';
import * as api from '../services/api'; // Import from TypeScript file
import logger from '../utils/logger';
// Import necessary table components
import OrgInvoiceHistoryTable from '../components/tables/OrgInvoiceHistoryTable';
import OrgCourseHistoryTable from '../components/tables/OrgCourseHistoryTable'; // Import course table
// TODO: Import OrgCourseHistoryTable when created

// Helper function to format currency
const formatCurrency = amount => {
  if (amount == null || isNaN(amount)) return '$0.00';
  return `$${parseFloat(amount).toFixed(2)}`;
};

const OrganizationDetailPage = () => {
  const { orgId } = useParams(); // Get orgId from URL
  const navigate = useNavigate();
  const [orgDetails, setOrgDetails] = useState(null);
  const [orgCourses, setOrgCourses] = useState([]);
  const [orgInvoices, setOrgInvoices] = useState([]);
  // const [orgPayments, setOrgPayments] = useState([]); // Fetch payments later if needed
  const [financialSummary, setFinancialSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Payment dialog state
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentData, setPaymentData] = useState({
    amount: '',
    payment_method: '',
    reference_number: '',
    payment_date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });

  useEffect(() => {
    const loadOrgData = async () => {
      if (!orgId) {
        setError('Organization ID not found in URL.');
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError('');
      logger.info(`[OrganizationDetailPage] Loading data for Org ID: ${orgId}`);
      try {
        // Fetch all data concurrently
        const [detailsRes, coursesRes, invoicesRes, summaryRes] =
          await Promise.all([
            api.getOrganizationDetails(orgId),
            api.getOrganizationCoursesAdmin(orgId),
            api.getOrganizationInvoices(orgId),
            api.getOrganizationFinancialSummary(orgId),
          ]);

        setOrgDetails(detailsRes);
        setOrgCourses(coursesRes || []);
        setOrgInvoices(invoicesRes || []);
        setFinancialSummary(summaryRes);

        logger.info('[OrganizationDetailPage] All data loaded.');
      } catch (err) {
        logger.error(`Error loading organization data for ID ${orgId}:`, err);
        setError(err.message || 'Failed to load organization data.');
        // Clear potentially partial data
        setOrgDetails(null);
        setOrgCourses([]);
        setOrgInvoices([]);
        setFinancialSummary(null);
      } finally {
        setIsLoading(false);
      }
    };
    loadOrgData();
  }, [orgId]);

  // Handler for viewing invoice details
  const handleViewInvoiceDetails = (invoiceId) => {
    logger.info(`[OrganizationDetailPage] Viewing invoice details for ID: ${invoiceId}`);
    // Navigate to invoice details page or open a dialog
    navigate(`/organization/invoice/${invoiceId}`);
  };

  // Handler for paying invoice
  const handlePayInvoice = (invoiceId) => {
    const invoice = orgInvoices.find(inv => inv.invoiceid === invoiceId);
    if (invoice) {
      setSelectedInvoice(invoice);
      setPaymentData({
        amount: invoice.amount.toString(),
        payment_method: '',
        reference_number: '',
        payment_date: new Date().toISOString().split('T')[0],
        notes: '',
      });
      setPaymentDialogOpen(true);
    }
  };

  // Handler for emailing invoice
  const handleEmailInvoice = async (invoiceId) => {
    try {
      logger.info(`[OrganizationDetailPage] Emailing invoice ID: ${invoiceId}`);
      // Call API to email invoice
      await api.emailInvoice(invoiceId);
      setSnackbar({
        open: true,
        message: 'Invoice email sent successfully!',
        severity: 'success',
      });
    } catch (error) {
      logger.error(`Error emailing invoice ${invoiceId}:`, error);
      setSnackbar({
        open: true,
        message: 'Failed to send invoice email.',
        severity: 'error',
      });
    }
  };

  // Handler for submitting payment
  const handleSubmitPayment = async () => {
    if (!selectedInvoice) return;

    try {
      logger.info(`[OrganizationDetailPage] Submitting payment for invoice ID: ${selectedInvoice.invoiceid}`);
      
      // Call API to record payment
      await api.recordInvoicePayment(selectedInvoice.invoiceid, paymentData);
      
      setSnackbar({
        open: true,
        message: 'Payment recorded successfully!',
        severity: 'success',
      });
      
      // Close dialog and refresh data
      setPaymentDialogOpen(false);
      setSelectedInvoice(null);
      
      // Reload invoice data to reflect payment
      const invoicesRes = await api.getOrganizationInvoices(orgId);
      setOrgInvoices(invoicesRes || []);
      
    } catch (error) {
      logger.error(`Error recording payment for invoice ${selectedInvoice.invoiceid}:`, error);
      setSnackbar({
        open: true,
        message: 'Failed to record payment.',
        severity: 'error',
      });
    }
  };

  // Handler for closing payment dialog
  const handleClosePaymentDialog = () => {
    setPaymentDialogOpen(false);
    setSelectedInvoice(null);
    setPaymentData({
      amount: '',
      payment_method: '',
      reference_number: '',
      payment_date: new Date().toISOString().split('T')[0],
      notes: '',
    });
  };

  // Handler for closing snackbar
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity='error' sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!orgDetails) {
    // Should have been caught by error, but safety check
    return (
      <Alert severity='warning' sx={{ m: 2 }}>
        Organization data could not be loaded.
      </Alert>
    );
  }

  return (
    <Container maxWidth='lg'>
      {/* Header Section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant='h4' gutterBottom>
          {orgDetails.organizationname}
        </Typography>
        <Grid container spacing={1}>
          <Grid item xs={12} md={6}>
            <Typography variant='subtitle1'>Contact Information</Typography>
            <Typography variant='body2'>
              Name: {orgDetails.contactname || '-'}
            </Typography>
            <Typography variant='body2'>
              Email: {orgDetails.contactemail || '-'}
            </Typography>
            <Typography variant='body2'>
              Phone: {orgDetails.contactphone || '-'}
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant='subtitle1'>Address</Typography>
            <Typography variant='body2'>
              {orgDetails.addressstreet || '-'}
            </Typography>
            <Typography variant='body2'>{`${orgDetails.addresscity || ''}, ${orgDetails.addressprovince || ''} ${orgDetails.addresspostalcode || ''}`}</Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Financial Summary Section */}
      {financialSummary && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant='h6' gutterBottom>
            Financial Summary
          </Typography>
          <Grid container spacing={1}>
            <Grid item xs={4}>
              <Typography variant='body1'>Total Invoiced:</Typography>
            </Grid>
            <Grid item xs={8}>
              <Typography variant='body1' align='right'>
                {formatCurrency(financialSummary.totalInvoiced)}
              </Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography variant='body1'>Total Paid:</Typography>
            </Grid>
            <Grid item xs={8}>
              <Typography variant='body1' align='right'>
                {formatCurrency(financialSummary.totalPaid)}
              </Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography variant='body1' sx={{ fontWeight: 'bold' }}>
                Balance Due:
              </Typography>
            </Grid>
            <Grid item xs={8}>
              <Typography
                variant='body1'
                align='right'
                sx={{ fontWeight: 'bold' }}
              >
                {formatCurrency(financialSummary.balanceDue)}
              </Typography>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Invoice History Section */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant='h6' gutterBottom>
          Invoice History
        </Typography>
        <OrgInvoiceHistoryTable 
          invoices={orgInvoices}
          onViewDetailsClick={handleViewInvoiceDetails}
          onPayInvoiceClick={handlePayInvoice}
          onEmailInvoiceClick={handleEmailInvoice}
        />
      </Paper>

      {/* Course History Section */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant='h6' gutterBottom>
          Course History
        </Typography>
        <OrgCourseHistoryTable courses={orgCourses} />
      </Paper>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onClose={handleClosePaymentDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          Pay Invoice - {selectedInvoice?.invoicenumber}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Payment Amount"
                  type="number"
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                  InputProps={{
                    startAdornment: <Typography variant="body2" sx={{ mr: 1 }}>$</Typography>,
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Payment Method</InputLabel>
                  <Select
                    value={paymentData.payment_method}
                    label="Payment Method"
                    onChange={(e) => setPaymentData({ ...paymentData, payment_method: e.target.value })}
                  >
                    <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                    <MenuItem value="check">Check</MenuItem>
                    <MenuItem value="cash">Cash</MenuItem>
                    <MenuItem value="credit_card">Credit Card</MenuItem>
                    <MenuItem value="other">Other</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Reference Number"
                  value={paymentData.reference_number}
                  onChange={(e) => setPaymentData({ ...paymentData, reference_number: e.target.value })}
                  placeholder="Transaction ID, check number, etc."
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
                <TextField
                  fullWidth
                  label="Notes"
                  multiline
                  rows={3}
                  value={paymentData.notes}
                  onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                  placeholder="Additional payment notes..."
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePaymentDialog}>Cancel</Button>
          <Button 
            onClick={handleSubmitPayment} 
            variant="contained" 
            color="success"
            disabled={!paymentData.amount || !paymentData.payment_method}
          >
            Record Payment
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default OrganizationDetailPage;
