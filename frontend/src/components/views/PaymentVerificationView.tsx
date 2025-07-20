import React, { useState } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Alert,
  IconButton,
  Tooltip,
  CircularProgress,
  Snackbar,
} from '@mui/material';
import {
  Cancel as RejectIcon,
  Visibility as ViewIcon,
  HourglassEmpty as PendingIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import ServiceDetailsTable from '../common/ServiceDetailsTable';

const PaymentVerificationView = () => {
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState('view'); // 'view' or 'action'
  const [verificationAction, setVerificationAction] = useState('approve'); // 'approve' or 'reject'
  const [verificationNotes, setVerificationNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const queryClient = useQueryClient();

  // Fetch pending payment submissions
  const { data: paymentsData, isLoading } = useQuery({
    queryKey: ['pending-payment-verifications'],
    queryFn: async () => {
      const response = await api.get('/accounting/payment-verifications');
      // Filter to only show payments that are actually pending verification
      const pendingPayments = response.data.data.payments?.filter(payment => 
        payment.status === 'pending_verification' || 
        payment.status === 'pending' ||
        !payment.verified_by_accounting_at
      ) || [];
      
      return {
        ...response.data.data,
        payments: pendingPayments
      };
    },
  });

  // Verify payment mutation
  const verifyPaymentMutation = useMutation({
    mutationFn: async ({ paymentId, action, notes }) => {
      const response = await api.post(
        `/accounting/payments/${paymentId}/verify`,
        {
          action,
          notes,
        }
      );
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['pending-payment-verifications']);
      queryClient.invalidateQueries(['accounting-invoices']);
      setPaymentDialogOpen(false);
      setVerificationNotes('');
      setSuccessMessage(`Payment ${verificationAction === 'approve' ? 'approved' : 'rejected'} successfully!`);
      setErrorMessage('');
    },
    onError: (error) => {
      console.error('Payment verification error:', error);
      setErrorMessage(error.response?.data?.message || 'Failed to verify payment. Please try again.');
      setSuccessMessage('');
    },
  });

  const handleViewPayment = (payment) => {
    setSelectedPayment(payment);
    setDialogMode('view');
    setPaymentDialogOpen(true);
  };

  const handleActionPayment = (payment, action) => {
    setSelectedPayment(payment);
    setVerificationAction(action);
    setDialogMode('action');
    setPaymentDialogOpen(true);
  };

  const handleVerificationSubmit = () => {
    if (!selectedPayment) return;

    verifyPaymentMutation.mutate({
      paymentId: selectedPayment.payment_id,
      action: verificationAction,
      notes: verificationNotes,
    });
  };

  const handleCloseDialog = () => {
    setPaymentDialogOpen(false);
    setSelectedPayment(null);
    setVerificationNotes('');
    setDialogMode('view');
  };

  // Transform payment data into service details format
  const getServiceDetails = (payment: any) => {
    if (!payment) return [];
    
    // For now, create a single service detail from the payment
    // In the future, this could be expanded to show multiple courses
    return [{
      date: payment.payment_date || payment.submitted_by_org_at,
      location: payment.location || 'N/A',
      course: payment.course_type_name || payment.course_type || 'N/A',
      students: payment.students_attended || payment.registered_students || 0,
      ratePerStudent: payment.rate_per_student || 9.00, // Default rate
      baseCost: payment.base_cost || (payment.amount * 0.885), // Estimate if not available
      tax: payment.tax_amount || (payment.amount * 0.115), // Estimate if not available
      total: payment.amount || 0,
    }];
  };

  const formatCurrency = amount => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
    }).format(amount || 0);
  };

  const formatDate = dateString => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  // Check if payment can be verified (not already processed)
  const canVerifyPayment = (payment) => {
    if (!payment) return false;
    return !payment.verified_by_accounting_at && 
           (payment.status === 'pending_verification' || 
            payment.status === 'pending' ||
            !payment.status);
  };

  // Get payment status for display
  const getPaymentStatus = (payment) => {
    if (!payment) {
      return {
        label: 'UNKNOWN',
        color: 'default',
        icon: <PendingIcon />
      };
    }
    if (payment.verified_by_accounting_at) {
      return {
        label: 'VERIFIED',
        color: 'success',
        icon: <CheckCircleIcon />
      };
    }
    if (payment.status === 'rejected') {
      return {
        label: 'REJECTED',
        color: 'error',
        icon: <RejectIcon />
      };
    }
    return {
      label: 'PENDING VERIFICATION',
      color: 'warning',
      icon: <PendingIcon />
    };
  };

  if (isLoading) {
    return (
      <Box
        display='flex'
        justifyContent='center'
        alignItems='center'
        minHeight='400px'
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant='h4' gutterBottom sx={{ mb: 3, fontWeight: 'bold' }}>
        Payment Verification
      </Typography>

      <Typography variant='body1' color='text.secondary' paragraph>
        Review and verify payment submissions from organizations.
      </Typography>

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Organization</TableCell>
                <TableCell>Invoice #</TableCell>
                <TableCell>Payment Amount</TableCell>
                <TableCell>Payment Method</TableCell>
                <TableCell>Reference #</TableCell>
                <TableCell>Submitted Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align='center'>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {!paymentsData?.payments?.length ? (
                <TableRow>
                  <TableCell colSpan={8} align='center'>
                    <Box sx={{ py: 4, textAlign: 'center' }}>
                      <CheckCircleIcon color="success" sx={{ fontSize: 48, mb: 2 }} />
                      <Typography variant='h6' color='success.main' gutterBottom>
                        All Payments Verified!
                      </Typography>
                      <Typography variant='body2' color='text.secondary'>
                        There are no pending payment verifications at this time.
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                paymentsData.payments.map(payment => {
                  if (!payment) return null;
                  return (
                    <TableRow key={payment.payment_id} hover>
                      <TableCell>
                        <Typography variant='body2' fontWeight='medium'>
                          {payment.organization_name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2'>
                          {payment.invoice_number}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2' fontWeight='medium'>
                          {formatCurrency(payment.amount)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2'>
                          {payment.payment_method
                            ?.replace('_', ' ')
                            .toUpperCase()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2'>
                          {payment.reference_number || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2'>
                          {formatDate(payment.submitted_by_org_at)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={getPaymentStatus(payment).icon}
                          label={getPaymentStatus(payment).label}
                          color={getPaymentStatus(payment).color}
                          size='small'
                        />
                      </TableCell>
                      <TableCell align='center'>
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                          <Tooltip title='View Details'>
                            <IconButton
                              size='small'
                              onClick={() => handleViewPayment(payment)}
                              color='info'
                            >
                              <ViewIcon fontSize='small' />
                            </IconButton>
                          </Tooltip>
                          {canVerifyPayment(payment) && (
                            <>
                              <Tooltip title='Approve Payment'>
                                <IconButton
                                  size='small'
                                  onClick={() => handleActionPayment(payment, 'approve')}
                                  color='success'
                                >
                                  <CheckCircleIcon fontSize='small' />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title='Reject Payment'>
                                <IconButton
                                  size='small'
                                  onClick={() => handleActionPayment(payment, 'reject')}
                                  color='error'
                                >
                                  <RejectIcon fontSize='small' />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                }).filter(Boolean)
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Unified Payment Dialog */}
      <Dialog
        open={paymentDialogOpen}
        onClose={handleCloseDialog}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>
          {dialogMode === 'action' 
            ? `${verificationAction === 'approve' ? 'Approve' : 'Reject'} Payment`
            : 'Payment Details'
          }
          {selectedPayment && (
            <Typography variant='subtitle2' color='text.secondary'>
              {selectedPayment.organization_name} - {selectedPayment.invoice_number}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          {selectedPayment && (
            <Box sx={{ pt: 2 }}>
              {/* Service Details Table */}
              <ServiceDetailsTable 
                services={getServiceDetails(selectedPayment)}
                showTotals={false}
              />
              
              {/* Payment Information */}
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
                  Payment Information
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant='body2' color='text.secondary'>
                      Invoice Number
                    </Typography>
                    <Typography variant='body1' fontWeight='medium'>
                      {selectedPayment.invoice_number}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant='body2' color='text.secondary'>
                      Payment Method
                    </Typography>
                    <Typography variant='body1'>
                      {selectedPayment.payment_method?.replace('_', ' ').toUpperCase()}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant='body2' color='text.secondary'>
                      Reference Number
                    </Typography>
                    <Typography variant='body1'>
                      {selectedPayment.reference_number || '-'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant='body2' color='text.secondary'>
                      Payment Date
                    </Typography>
                    <Typography variant='body1'>
                      {formatDate(selectedPayment.payment_date)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant='body2' color='text.secondary'>
                      Submitted Date
                    </Typography>
                    <Typography variant='body1'>
                      {formatDate(selectedPayment.submitted_by_org_at)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant='body2' color='text.secondary'>
                      Status
                    </Typography>
                    <Chip
                      icon={getPaymentStatus(selectedPayment).icon}
                      label={getPaymentStatus(selectedPayment).label}
                      color={getPaymentStatus(selectedPayment).color}
                      size='small'
                    />
                  </Grid>
                  {selectedPayment.verified_by_accounting_at && (
                    <Grid item xs={12} sm={6}>
                      <Typography variant='body2' color='text.secondary'>
                        Verified By Accounting
                      </Typography>
                      <Typography variant='body1'>
                        {formatDate(selectedPayment.verified_by_accounting_at)}
                      </Typography>
                    </Grid>
                  )}
                  {selectedPayment.notes && (
                    <Grid item xs={12}>
                      <Typography variant='body2' color='text.secondary'>
                        Organization Notes
                      </Typography>
                      <Typography variant='body1' sx={{ fontStyle: 'italic' }}>
                        {selectedPayment.notes}
                      </Typography>
                    </Grid>
                  )}
                  
                  {/* Action-specific content */}
                  {dialogMode === 'action' && (
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label='Verification Notes'
                        multiline
                        rows={3}
                        value={verificationNotes}
                        onChange={e => setVerificationNotes(e.target.value)}
                        placeholder={
                          verificationAction === 'approve'
                            ? 'Optional notes about the approval...'
                            : 'Required: Reason for rejection...'
                        }
                        required={verificationAction === 'reject'}
                      />
                    </Grid>
                  )}
                </Grid>

                {dialogMode === 'action' && (
                  <Alert
                    severity={verificationAction === 'approve' ? 'success' : 'warning'}
                    sx={{ mt: 2 }}
                  >
                    {verificationAction === 'approve'
                      ? 'This payment will be marked as verified and the invoice status will be updated accordingly.'
                      : 'This payment will be rejected and the organization will be notified to resubmit.'}
                  </Alert>
                )}

                {dialogMode === 'view' && (
                  <Alert severity='info' sx={{ mt: 2 }}>
                    Review the payment details above. Use the action buttons below to approve or reject this payment.
                  </Alert>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>
            {dialogMode === 'view' ? 'Close' : 'Cancel'}
          </Button>
          
          {/* Action buttons for view mode */}
          {dialogMode === 'view' && canVerifyPayment(selectedPayment) && (
            <>
              <Button
                onClick={() => {
                  setVerificationAction('reject');
                  setDialogMode('action');
                }}
                variant='outlined'
                color='error'
                disabled={verifyPaymentMutation.isLoading}
              >
                Reject Payment
              </Button>
              <Button
                onClick={() => {
                  setVerificationAction('approve');
                  setDialogMode('action');
                }}
                variant='contained'
                color='success'
                disabled={verifyPaymentMutation.isLoading}
              >
                Approve Payment
              </Button>
            </>
          )}
          
          {/* Submit button for action mode */}
          {dialogMode === 'action' && (
            <Button
              onClick={handleVerificationSubmit}
              variant='contained'
              color={verificationAction === 'approve' ? 'success' : 'error'}
              disabled={
                verifyPaymentMutation.isLoading ||
                (verificationAction === 'reject' && !verificationNotes.trim())
              }
            >
              {verifyPaymentMutation.isLoading
                ? 'Processing...'
                : verificationAction === 'approve'
                  ? 'Approve Payment'
                  : 'Reject Payment'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Success Snackbar */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={6000}
        onClose={() => setSuccessMessage('')}
      >
        <Alert severity="success" onClose={() => setSuccessMessage('')}>
          {successMessage}
        </Alert>
      </Snackbar>

      {/* Error Snackbar */}
      <Snackbar
        open={!!errorMessage}
        autoHideDuration={6000}
        onClose={() => setErrorMessage('')}
      >
        <Alert severity="error" onClose={() => setErrorMessage('')}>
          {errorMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PaymentVerificationView;
