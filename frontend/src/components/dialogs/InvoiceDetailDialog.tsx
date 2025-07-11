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
} from '@mui/material';
import * as api from '../../services/api'; // Adjust path as needed
import EmailIcon from '@mui/icons-material/Email';
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
}) => {
  const [invoice, setInvoice] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    dueDate: '',
    status: '',
    notes: '',
  });

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
        if (response.previewUrl) {
          logger.debug('Ethereal Preview URL:', response.previewUrl);
        }
        if (onActionSuccess) onActionSuccess(message);
      } else {
        // Handle undefined or malformed response
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
                <Typography variant='body2' sx={{ fontWeight: 'bold' }}>
                  <strong>Total Amount:</strong>{' '}
                  {formatCurrency(invoice.amount)}
                </Typography>
              </Grid>
            </Grid>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        {/* Add Email button if email available */}
        {invoice?.contactemail && (
          <Button
            onClick={handleSendEmail}
            color='primary'
            variant='contained'
            disabled={
              isLoading || isSendingEmail || !invoice || !invoice.contactemail
            }
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
        <Button onClick={handlePreview}>Preview</Button>
        <Button onClick={handleDownload}>Download</Button>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default InvoiceDetailDialog;
