import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Grid,
  Divider,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import * as api from '../../services/api'; // Adjust path as needed
import EmailIcon from '@mui/icons-material/Email';
import PostAddIcon from '@mui/icons-material/PostAdd';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import logger from '../../utils/logger';
import { getInvoiceDetails } from '../../services/api';
import { formatDisplayDate } from '../../utils/dateUtils';

// Helper function to format currency
const formatCurrency = amount => {
  if (amount == null) return 'N/A';
  return `$${parseFloat(amount).toFixed(2)}`;
};

const InvoiceDetailDialog = ({
  open,
  onClose,
  invoiceId,
  onActionSuccess,
  onActionError,
  showPostToOrgButton = true, // New prop to control Post to Org button visibility
}) => {
  const [invoice, setInvoice] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    amount: '',
    dueDate: '',
    status: '',
    notes: '',
  });
  
  // Payment request processing state
  const [paymentAction, setPaymentAction] = useState<'approve' | 'reject'>('approve');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');

  useEffect(() => {
    if (open && invoiceId) {
      const fetchInvoiceDetails = async () => {
        setIsLoading(true);
        setError('');
        setInvoice(null);
        logger.info(`Fetching invoice details for ID: ${invoiceId}`);
        try {
          const data = await getInvoiceDetails(invoiceId);
          logger.info(`Invoice details fetched successfully: ${invoiceId}`);
          setInvoice(data);
          setFormData({
            amount: data.amount || '',
            dueDate: data.duedate || '',
            status: data.paymentstatus || '',
            notes: data.notes || '',
          });
        } catch (err) {
          logger.error('Failed to fetch invoice details:', err);
          setError(err.message || 'Failed to load invoice details');
        } finally {
          setIsLoading(false);
        }
      };
      fetchInvoiceDetails();
    }
  }, [open, invoiceId]);

  const handlePostToOrganization = async () => {
    if (!invoiceId) return;
    setIsSendingEmail(true);
    logger.debug(
      `[InvoiceDetailDialog] Posting invoice to organization: ${invoiceId}`
    );
    try {
      const response = await api.postInvoiceToOrganization(invoiceId);
      if (response && response.success) {
        let message = response.message || 'Invoice posted to organization successfully. Email notification sent.';
        if (onActionSuccess) onActionSuccess(message);
        // Refresh invoice data to show updated status
        const updatedInvoice = await getInvoiceDetails(invoiceId);
        setInvoice(updatedInvoice);
      } else {
        const errorMsg = response?.message || 'Failed to post invoice to organization.';
        throw new Error(errorMsg);
      }
    } catch (err) {
      logger.error(`Error posting invoice to organization ${invoiceId}:`, err);
      if (onActionError) onActionError(err?.message || 'Failed to post invoice to organization.');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleSendEmail = async () => {
    if (!invoiceId) return;
    setIsSendingEmail(true);
    logger.debug(
      `[InvoiceDetailDialog] Attempting to send email for Invoice ID: ${invoiceId}`
    );
    try {
      const response = await api.emailInvoice(invoiceId);
      if (response && response.success) {
        let message = response.message || 'Email queued successfully.';
        setPreviewUrl(response.previewUrl || null);
        if (onActionSuccess) onActionSuccess(message);
      } else {
        const errorMsg = response?.message || 'Failed to send email via API.';
        throw new Error(errorMsg);
      }
    } catch (err) {
      logger.error(`Error sending email for invoice ${invoiceId}:`, err);
      if (onActionError) onActionError(err?.message || 'Failed to send email.');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      logger.info('Saving invoice details:', formData);
      const savedInvoice = await api.saveInvoice(invoiceId, formData);
      logger.info('Invoice saved successfully:', savedInvoice);
      onClose();
    } catch (err) {
      logger.error('Failed to save invoice:', err);
      setError(err.message || 'Failed to save invoice');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePreview = () => {
    logger.info('Generating invoice preview for:', invoice.id);
    // Add preview logic here
  };

  const handleDownload = async () => {
    if (!invoice?.id) {
      logger.error('No invoice ID available for download');
      return;
    }

    try {
      logger.info(`[PDF Download] Starting download for invoice ${invoice.id}`);

      // Get the auth token
      const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
      
      const response = await fetch(
        `http://localhost:3001/api/v1/accounting/invoices/${invoice.id}/pdf`,
        {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      logger.info(`[PDF Download] Response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`[PDF Download] Error response:`, errorText);
        throw new Error(
          `HTTP error! status: ${response.status} - ${errorText}`
        );
      }

      // Check if the response is actually a PDF
      const contentType = response.headers.get('content-type');
      logger.info(`[PDF Download] Content-Type: ${contentType}`);

      if (!contentType || !contentType.includes('application/pdf')) {
        logger.error('Response is not a PDF:', contentType);
        const text = await response.text();
        logger.error('Response body:', text);
        throw new Error('Server did not return a PDF file');
      }

      // Get the PDF blob
      const blob = await response.blob();
      logger.info(
        `[PDF Download] Blob created, size: ${blob.size} bytes, type: ${blob.type}`
      );

      // Verify the blob size
      if (blob.size === 0) {
        throw new Error('PDF file is empty');
      }

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Invoice-${invoice.invoicenumber}.pdf`;
      link.style.display = 'none';

      // Add to DOM, click, and remove
      document.body.appendChild(link);
      link.click();

      // Clean up after a short delay
      setTimeout(() => {
        if (document.body.contains(link)) {
          document.body.removeChild(link);
        }
        window.URL.revokeObjectURL(url);
        logger.info('[PDF Download] Cleanup completed');
      }, 1000);

      logger.info('[PDF Download] Download initiated successfully');
    } catch (error) {
      logger.error('[PDF Download] Error:', error);
      if (onActionError) {
        onActionError(`Failed to download PDF: ${error.message}`);
      }
    }
  };

  const handleProcessPayment = async () => {
    if (!invoice?.id) return;
    
    setProcessingPayment(true);
    try {
      logger.info(`Processing payment request for invoice ${invoice.id}: ${paymentAction}`);
      
      // For now, we'll create a simple payment record since payment requests are linked to timesheets, not invoices
      // In a real implementation, you might want to link payment requests to invoices
      const response = await api.post(`/accounting/invoices/${invoice.id}/process-payment`, {
        action: paymentAction,
        notes: paymentNotes,
        payment_method: paymentMethod
      });
      
      if (response.data.success) {
        const message = `Payment ${paymentAction}d successfully`;
        if (onActionSuccess) onActionSuccess(message);
        onClose();
      } else {
        throw new Error(response.data.message || `Failed to ${paymentAction} payment`);
      }
    } catch (err) {
      logger.error(`Error processing payment:`, err);
      if (onActionError) onActionError(err?.message || `Failed to ${paymentAction} payment`);
    } finally {
      setProcessingPayment(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth='md' fullWidth>
      <DialogTitle>
        Invoice Details {invoice ? `(#${invoice.invoicenumber})` : ''}
      </DialogTitle>
      <DialogContent dividers>
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        )}
        {error && <Alert severity='error'>{error}</Alert>}
        {invoice && !isLoading && (
          <Box sx={{ p: 1 }}>
            {/* Container for Header Info */}
            <Grid container spacing={2}>
              {/* Header Info - Remove 'item' prop */}
              <Grid xs={6} md={3}>
                <Typography variant='body2'>
                  <strong>Invoice #:</strong> {invoice.invoicenumber}
                </Typography>
              </Grid>
              <Grid xs={6} md={3}>
                <Typography variant='body2'>
                  <strong>Invoice Date:</strong>{' '}
                  {formatDisplayDate(invoice.invoicedate)}
                </Typography>
              </Grid>
              <Grid xs={6} md={3}>
                <Typography variant='body2'>
                  <strong>Due Date:</strong> {formatDisplayDate(invoice.duedate)}
                </Typography>
              </Grid>
              <Grid xs={6} md={3}>
                <Typography variant='body2'>
                  <strong>Status:</strong> {invoice.paymentstatus}
                </Typography>
              </Grid>
            </Grid>
            <Divider sx={{ my: 2 }} />
            {/* Organization Info */}
            <Typography variant='subtitle1' gutterBottom>
              Bill To:
            </Typography>
            <Typography variant='body1'>{invoice.organizationname}</Typography>
            {invoice.addressstreet && (
              <Typography variant='body2'>{invoice.addressstreet}</Typography>
            )}
            {invoice.addresscity && (
              <Typography variant='body2'>{`${invoice.addresscity}, ${invoice.addressprovince || ''} ${invoice.addresspostalcode || ''}`}</Typography>
            )}
            {invoice.contactname && (
              <Typography variant='body2'>
                Attn: {invoice.contactname}
              </Typography>
            )}
            {invoice.contactemail && (
              <Typography variant='body2'>
                Email: {invoice.contactemail}
              </Typography>
            )}
            <Divider sx={{ my: 2 }} />
            {/* Course & Billing Details */}
            <Typography variant='subtitle1' gutterBottom>
              Service Details:
            </Typography>
            {/* Container for Service Details */}
            <Grid container spacing={1}>
              {/* Service Details - Remove 'item' prop */}
              <Grid xs={12} sm={6}>
                <Typography variant='body2'>
                  <strong>Course:</strong> {invoice.name} (
                  {invoice.coursenumber})
                </Typography>
              </Grid>
              <Grid xs={12} sm={6}>
                <Typography variant='body2'>
                  <strong>Date Completed:</strong>{' '}
                  {formatDisplayDate(invoice.datecompleted)}
                </Typography>
              </Grid>
              <Grid xs={12} sm={6}>
                <Typography variant='body2'>
                  <strong>Location:</strong> {invoice.location}
                </Typography>
              </Grid>
              <Grid xs={12} sm={6}>
                <Typography variant='body2'>
                  <strong>Students Attended:</strong>{' '}
                  {invoice.studentsattendance}
                </Typography>
              </Grid>
              <Grid xs={12} sm={6}>
                <Typography variant='body2'>
                  <strong>Rate per Student:</strong>{' '}
                  {formatCurrency(invoice.rateperstudent)}
                </Typography>
              </Grid>
              <Grid xs={12} sm={6}>
                <Typography variant='body2'>
                  <strong>Base Cost:</strong>{' '}
                  {formatCurrency(invoice.amount)}
                </Typography>
              </Grid>
              <Grid xs={12} sm={6}>
                <Typography variant='body2'>
                  <strong>Tax (HST):</strong>{' '}
                  {formatCurrency(parseFloat(invoice.amount || 0) * 0.13)}
                </Typography>
              </Grid>
              <Grid xs={12} sm={6}>
                <Typography variant='body2' sx={{ fontWeight: 'bold' }}>
                  <strong>Total Amount:</strong>{' '}
                  {formatCurrency(parseFloat(invoice.amount || 0) * 1.13)}
                </Typography>
              </Grid>
            </Grid>
            
            {/* Payment Method Section */}
            <Divider sx={{ my: 2 }} />
            <Typography variant='subtitle1' gutterBottom>
              Payment Information:
            </Typography>
            <Grid container spacing={2}>
              <Grid xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Payment Method</InputLabel>
                  <Select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    label="Payment Method"
                  >
                    <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                    <MenuItem value="check">Check</MenuItem>
                    <MenuItem value="cash">Cash</MenuItem>
                    <MenuItem value="credit_card">Credit Card</MenuItem>
                    <MenuItem value="direct_deposit">Direct Deposit</MenuItem>
                    <MenuItem value="other">Other</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            
            {/* Payment Request Processing Section - Show for all invoices */}
            <Divider sx={{ my: 2 }} />
            <Typography variant='subtitle1' gutterBottom>
              Process Payment Request:
            </Typography>
            <Grid container spacing={2}>
              <Grid xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Action</InputLabel>
                  <Select
                    value={paymentAction}
                    onChange={(e) => setPaymentAction(e.target.value as 'approve' | 'reject')}
                    label="Action"
                  >
                    <MenuItem value="approve">Approve</MenuItem>
                    <MenuItem value="reject">Reject</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Notes"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Add notes about this decision..."
                />
              </Grid>
            </Grid>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        {/* Payment Request Processing Buttons - Show for all invoices */}
        <Button
          onClick={handleProcessPayment}
          variant="contained"
          color={paymentAction === 'approve' ? 'success' : 'error'}
          disabled={processingPayment}
          startIcon={processingPayment ? <CircularProgress size={20} /> : paymentAction === 'approve' ? <CheckCircleIcon /> : <CancelIcon />}
        >
          {processingPayment ? 'Processing...' : paymentAction === 'approve' ? 'Approve' : 'Reject'}
        </Button>
        
        {/* Post to Organization Button - Only show if not already posted */}
        {showPostToOrgButton && invoice && !invoice.posted_to_org && (
          <Button
            onClick={handlePostToOrganization}
            color='warning'
            variant='contained'
            disabled={isLoading || isSendingEmail || !invoice || !invoice.contactemail}
            startIcon={
              isSendingEmail ? (
                <CircularProgress size={20} color='inherit' />
              ) : (
                <PostAddIcon />
              )
            }
          >
            {isSendingEmail ? 'Posting...' : 'Post to Organization'}
          </Button>
        )}
        
        {/* Email Button - Only show if already posted */}
        {invoice?.contactemail && invoice?.posted_to_org && (
          <Button
            onClick={handleSendEmail}
            color='primary'
            variant='outlined'
            disabled={isLoading || isSendingEmail || !invoice || !invoice.contactemail}
            startIcon={
              isSendingEmail ? (
                <CircularProgress size={20} color='inherit' />
              ) : (
                <EmailIcon />
              )
            }
          >
            {isSendingEmail
              ? 'Sending...'
              : invoice?.emailsentat
                ? 'Resend Email'
                : 'Send Email'}
          </Button>
        )}
        
        {previewUrl && (
          <Button
            color='info'
            variant='outlined'
            href={previewUrl}
            target='_blank'
            rel='noopener noreferrer'
            sx={{ ml: 1 }}
          >
            View Email Preview
          </Button>
        )}
        
        <Button onClick={handleDownload} color='info' variant='outlined'>
          Download PDF
        </Button>
        
        <Button onClick={onClose} color='inherit'>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InvoiceDetailDialog;
