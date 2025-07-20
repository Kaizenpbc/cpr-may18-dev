import React, { useState, useEffect, useRef } from 'react';
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
  Tooltip,
} from '@mui/material';
import api, { getInvoiceDetails, postInvoiceToOrganization } from '../../services/api';
import EmailIcon from '@mui/icons-material/Email';
import PostAddIcon from '@mui/icons-material/PostAdd';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import logger from '../../utils/logger';
import { formatDisplayDate } from '../../utils/dateUtils';
import { API_URL } from '../../config';
import ServiceDetailsTable from '../common/ServiceDetailsTable';

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
  const [isPostingToOrg, setIsPostingToOrg] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    amount: '',
    dueDate: '',
    status: '',
    notes: '',
  });
  
  // Payment request processing state

  const [paymentNotes, setPaymentNotes] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  
  // Ref to prevent multiple clicks
  const isPostingRef = useRef(false);

  // Transform invoice data into service details format
  const getServiceDetails = (invoice) => {
    if (!invoice) return [];
    
    return [{
      date: invoice.datecompleted,
      location: invoice.location,
      course: `${invoice.name} (${invoice.coursenumber})`,
      students: invoice.studentsattendance || 0,
      ratePerStudent: invoice.rate_per_student || 0,
      baseCost: invoice.rate_per_student ? (invoice.rate_per_student * invoice.studentsattendance) : 0,
      tax: invoice.rate_per_student ? (invoice.rate_per_student * invoice.studentsattendance * 0.13) : 0,
      total: invoice.rate_per_student ? (invoice.rate_per_student * invoice.studentsattendance * 1.13) : 0,
    }];
  };

  useEffect(() => {
    if (open && invoiceId) {
      const fetchInvoiceDetails = async () => {
        // Check if user is authenticated before making API call
        const token = sessionStorage.getItem('accessToken') || localStorage.getItem('accessToken');
        if (!token) {
          setError('Please log in to view invoice details. Redirecting to login...');
          setTimeout(() => {
            window.location.href = '/login';
          }, 2000);
          return;
        }

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
          
          // Handle authentication errors specifically
          if (err.message?.includes('No token provided') || err.message?.includes('Unauthorized')) {
            setError('Please log in to view invoice details. Redirecting to login...');
            // Redirect to login after a short delay
            setTimeout(() => {
              window.location.href = '/login';
            }, 2000);
          } else {
            setError(err.message || 'Failed to load invoice details');
          }
        } finally {
          setIsLoading(false);
        }
      };
      fetchInvoiceDetails();
    }
  }, [open, invoiceId]);

  const handlePostToOrganization = async () => {
    if (!invoiceId || isPostingRef.current) return; // Prevent multiple clicks
    isPostingRef.current = true;
    logger.debug(
      `[InvoiceDetailDialog] Posting invoice to organization: ${invoiceId}, isPostingToOrg: ${isPostingRef.current}`
    );
    try {
      const response = await postInvoiceToOrganization(invoiceId);
      if (response && response.success) {
        let message = response.message || 'Invoice posted to organization and complete invoice PDF with attendance sent via email.';
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
      isPostingRef.current = false;
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
        `${API_URL}/accounting/invoices/${invoice.id}/pdf`,
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
      if (onActionError) onActionError(`Failed to download PDF: ${error.message}`);
    }
  };

  // Keyboard shortcuts handler
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!open) return;
      
      // Ctrl+Enter = Approve invoice
      if (event.ctrlKey && event.key === 'Enter') {
        event.preventDefault();
        if (['pending approval', 'pending_approval', 'pending', 'draft', 'new'].includes((invoice?.approval_status || '').toLowerCase())) {
          handleProcessPayment();
        }
      }
      
      // Ctrl+D = Download PDF
      if (event.ctrlKey && event.key === 'd') {
        event.preventDefault();
        handleDownload();
      }
      
      // Escape = Close dialog
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, invoice?.approval_status]);

  const handleProcessPayment = async () => {
    if (!invoice?.id) return;
    
    setProcessingPayment(true);
    try {
      logger.info(`Processing invoice approval, posting, and email for invoice ${invoice.id}`);
      
      // Step 1: Approve the invoice
      const approveResponse = await api.put(`/accounting/invoices/${invoice.id}`, {
        approval_status: 'approved',
        notes: paymentNotes || `Invoice approved by accounting`
      });
      
      if (!approveResponse.data.success) {
        throw new Error(approveResponse.data.message || `Failed to approve invoice`);
      }
      
      // Step 2: Post to organization and send email
      logger.info(`Posting invoice ${invoice.id} to organization and sending email`);
      const postResponse = await postInvoiceToOrganization(invoice.id);
      
      if (!postResponse.success) {
        throw new Error(postResponse.message || `Failed to post invoice to organization`);
      }
      
      const message = `Invoice approved, posted to organization, and email sent successfully`;
      
      // Refresh the invoice data to show updated status
      const updatedInvoice = await getInvoiceDetails(invoice.id);
      setInvoice(updatedInvoice);
      
      if (onActionSuccess) onActionSuccess(message);
      onClose();
    } catch (err) {
      logger.error(`Error processing invoice approval, posting, and email:`, err);
      if (onActionError) onActionError(err?.message || `Failed to approve, post, and email invoice`);
    } finally {
      setProcessingPayment(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth='md' fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            Invoice Details {invoice ? `(#${invoice.invoicenumber})` : ''}
          </Typography>
          <Tooltip title="Keyboard shortcuts: Ctrl+Enter (Approve), Ctrl+D (Download), Esc (Close)">
            <Typography variant="caption" color="text.secondary" sx={{ cursor: 'help' }}>
              ⌨️ Shortcuts
            </Typography>
          </Tooltip>
        </Box>
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
            {/* Service Details Table */}
            <ServiceDetailsTable 
              services={getServiceDetails(invoice)}
              showTotals={false}
            />
            
            {/* Invoice Approval Section */}
            <Divider sx={{ my: 2 }} />
            <Typography variant='subtitle1' gutterBottom sx={{ mt: 2 }}>
              Invoice Approval:
            </Typography>
            
            {/* Show approval information if already approved */}
            {invoice?.approval_status === 'approved' && (
              <Box sx={{ mb: 2 }}>
                <Alert severity="success" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    <strong>Approved by:</strong> {invoice.approved_by_username || 'Unknown'} 
                    {invoice.approved_at && (
                      <span> on {formatDisplayDate(invoice.approved_at)}</span>
                    )}
                  </Typography>
                </Alert>
                {invoice.notes && (
                  <Typography variant="body2" sx={{ mt: 1, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                    <strong>Approval Notes:</strong><br />
                    {invoice.notes}
                  </Typography>
                )}
              </Box>
            )}
            
            {/* Show message when approval is not available */}
            {!['pending approval', 'pending_approval', 'pending', 'draft', 'new'].includes((invoice?.approval_status || '').toLowerCase()) && invoice?.approval_status !== 'approved' && (
              <Alert severity="info" sx={{ mb: 2 }}>
                {`This invoice has status "${invoice?.approval_status || 'unknown'}" and cannot be approved.`}
              </Alert>
            )}
            
            {/* Show approval controls only when available */}
            {['pending approval', 'pending_approval', 'pending', 'draft', 'new'].includes((invoice?.approval_status || '').toLowerCase()) && (
              <>
                <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
                  (Approval will post the invoice to the organization portal and send notification email)
                </Typography>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid xs={12} sm={6}>
                    <TextField
                      label="Notes (Optional)"
                      fullWidth
                      multiline
                      rows={2}
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                      disabled={processingPayment}
                    />
                  </Grid>
                </Grid>
                

              </>
            )}
            
          </Box>
        )}
      </DialogContent>
            <DialogActions>
        
        {/* Approve & Post Invoice Button - Only show when approval is available */}
        {['pending approval', 'pending_approval', 'pending', 'draft', 'new'].includes((invoice?.approval_status || '').toLowerCase()) && (
          <Button
            variant='contained'
            color='success'
            onClick={handleProcessPayment}
            disabled={processingPayment}
            startIcon={
              processingPayment
                ? <CircularProgress size={20} color='inherit' />
                : <CheckCircleIcon />
            }
          >
            {processingPayment
              ? 'Processing...'
              : 'Approve Invoice & Send Email'}
          </Button>
        )}
        

        
        {/* Email Button - Only show if already posted */}
        {invoice?.contactemail && Boolean(invoice?.posted_to_org) && (
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
