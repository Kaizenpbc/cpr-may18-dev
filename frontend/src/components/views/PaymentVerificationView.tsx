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
  Divider,
} from '@mui/material';
import {
  Cancel as RejectIcon,
  Visibility as ViewIcon,
  HourglassEmpty as PendingIcon,
  CheckCircle as CheckCircleIcon,
  People as PeopleIcon,
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
  
  // State for attendance data
  const [attendanceData, setAttendanceData] = useState<Array<{
    first_name: string;
    last_name: string;
    email: string;
    attended: boolean;
  }>>([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

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

  // Load attendance data for a payment
  const loadAttendanceData = async (courseRequestId: number) => {
    if (!courseRequestId) return;
    
    setLoadingAttendance(true);
    try {
      console.log('Loading attendance data for course request:', courseRequestId);
      const response = await api.get(`/accounting/courses/${courseRequestId}/students`);
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

  // Verify payment mutation
  const verifyPaymentMutation = useMutation({
    mutationFn: async ({ paymentId, action, notes }: { paymentId: string; action: string; notes: string }) => {
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
      queryClient.invalidateQueries({ queryKey: ['pending-payment-verifications'] });
      queryClient.invalidateQueries({ queryKey: ['accounting-invoices'] });
      setPaymentDialogOpen(false);
      setVerificationNotes('');
      setSuccessMessage(`Payment ${verificationAction === 'approve' ? 'approved' : 'rejected'} successfully!`);
      setErrorMessage('');
    },
    onError: (error: any) => {
      console.error('Payment verification error:', error);
      setErrorMessage(error.response?.data?.message || 'Failed to verify payment. Please try again.');
      setSuccessMessage('');
    },
  });

  const handleViewPayment = (payment) => {
    setSelectedPayment(payment);
    setDialogMode('view');
    setPaymentDialogOpen(true);
    
    // Load attendance data for this payment's course
    if (payment.course_request_id) {
      loadAttendanceData(payment.course_request_id);
    }
  };

  const handleActionPayment = (payment, action) => {
    setSelectedPayment(payment);
    setVerificationAction(action);
    setDialogMode('action');
    setPaymentDialogOpen(true);
    
    // Load attendance data for this payment's course
    if (payment.course_request_id) {
      loadAttendanceData(payment.course_request_id);
    }
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
    setAttendanceData([]); // Clear attendance data when dialog closes
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
  const getPaymentStatus = (payment: any) => {
    if (!payment) {
      return {
        label: 'UNKNOWN',
        color: 'default' as const,
        icon: <PendingIcon />
      };
    }
    if (payment.verified_by_accounting_at) {
      return {
        label: 'VERIFIED',
        color: 'success' as const,
        icon: <CheckCircleIcon />
      };
    }
    if (payment.status === 'rejected') {
      return {
        label: 'REJECTED',
        color: 'error' as const,
        icon: <RejectIcon />
      };
    }
    return {
      label: 'PENDING VERIFICATION',
      color: 'warning' as const,
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
                          <Tooltip title='View Payment Details'>
                            <IconButton
                              size='small'
                              onClick={() => handleViewPayment(payment)}
                              color='primary'
                            >
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                          {canVerifyPayment(payment) && (
                            <>
                              <Tooltip title='Reject Payment'>
                                <IconButton
                                  size='small'
                                  onClick={() => handleActionPayment(payment, 'reject')}
                                  color='error'
                                >
                                  <RejectIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title='Approve Payment'>
                                <IconButton
                                  size='small'
                                  onClick={() => handleActionPayment(payment, 'approve')}
                                  color='success'
                                >
                                  <CheckCircleIcon />
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
              
              {/* Student Attendance Section */}
              <Divider sx={{ my: 2 }} />
              <Typography variant='subtitle1' gutterBottom>
                <PeopleIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
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
                  No student attendance data available
                </Typography>
              )}
              
              {/* Payment Information */}
              <Divider sx={{ my: 2 }} />
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
                disabled={verifyPaymentMutation.isPending}
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
                disabled={verifyPaymentMutation.isPending}
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
                verifyPaymentMutation.isPending ||
                (verificationAction === 'reject' && !verificationNotes.trim())
              }
            >
              {verifyPaymentMutation.isPending
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
        <Alert severity='success' onClose={() => setSuccessMessage('')}>
          {successMessage}
        </Alert>
      </Snackbar>

      {/* Error Snackbar */}
      <Snackbar
        open={!!errorMessage}
        autoHideDuration={6000}
        onClose={() => setErrorMessage('')}
      >
        <Alert severity='error' onClose={() => setErrorMessage('')}>
          {errorMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PaymentVerificationView;
