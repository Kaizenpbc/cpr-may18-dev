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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Undo as ReverseIcon,
  Visibility as ViewIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';

const PaymentReversalView = () => {
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [reversalDialogOpen, setReversalDialogOpen] = useState(false);
  const [viewDetailsDialogOpen, setViewDetailsDialogOpen] = useState(false);
  const [reversalReason, setReversalReason] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [filterStatus, setFilterStatus] = useState('verified');

  const queryClient = useQueryClient();

  // Fetch verified payments that can be reversed
  const { data: paymentsData, isLoading, refetch } = useQuery({
    queryKey: ['verified-payments-for-reversal', filterStatus],
    queryFn: async () => {
      const response = await api.get('/accounting/verified-payments', {
        params: { status: filterStatus }
      });
      return response.data.data;
    },
  });

  // Reverse payment mutation
  const reversePaymentMutation = useMutation({
    mutationFn: async ({ paymentId, reason }) => {
      const response = await api.post(
        `/accounting/payments/${paymentId}/reverse`,
        { reason }
      );
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['verified-payments-for-reversal']);
      queryClient.invalidateQueries(['accounting-invoices']);
      setReversalDialogOpen(false);
      setReversalReason('');
      setSuccessMessage(`Payment reversed successfully! Amount: $${data.data.reversedAmount}`);
      setErrorMessage('');
    },
    onError: (error) => {
      console.error('Payment reversal error:', error);
      setErrorMessage(error.response?.data?.message || 'Failed to reverse payment. Please try again.');
      setSuccessMessage('');
    },
  });

  const handleReversalClick = (payment) => {
    setSelectedPayment(payment);
    setReversalDialogOpen(true);
  };

  const handleViewDetails = (payment) => {
    setSelectedPayment(payment);
    setViewDetailsDialogOpen(true);
  };

  const handleReversalSubmit = () => {
    if (!selectedPayment || !reversalReason.trim()) return;

    reversePaymentMutation.mutate({
      paymentId: selectedPayment.payment_id,
      reason: reversalReason.trim(),
    });
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

  const formatDateTime = dateString => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString();
  };

  const canReversePayment = (payment) => {
    if (payment.status !== 'verified') return false;
    
    const verificationDate = new Date(payment.verified_by_accounting_at);
    const now = new Date();
    const hoursSinceVerification = (now.getTime() - verificationDate.getTime()) / (1000 * 60 * 60);
    
    return hoursSinceVerification <= 48;
  };

  const getTimeRemaining = (payment) => {
    const verificationDate = new Date(payment.verified_by_accounting_at);
    const now = new Date();
    const hoursSinceVerification = (now.getTime() - verificationDate.getTime()) / (1000 * 60 * 60);
    const hoursRemaining = Math.max(0, 48 - hoursSinceVerification);
    
    if (hoursRemaining <= 0) return 'Expired';
    if (hoursRemaining < 1) return `${Math.round(hoursRemaining * 60)} minutes`;
    if (hoursRemaining < 24) return `${Math.round(hoursRemaining)} hours`;
    return `${Math.floor(hoursRemaining / 24)} days`;
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

  const payments = paymentsData?.payments || [];

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        🔄 Payment Reversal Management
      </Typography>
      <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
        Reverse verified payments within 48 hours of verification
      </Typography>

      {/* Filter Controls */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Filter by Status</InputLabel>
          <Select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            label="Filter by Status"
          >
            <MenuItem value="verified">Verified Payments</MenuItem>
            <MenuItem value="reversed">Reversed Payments</MenuItem>
            <MenuItem value="all">All Payments</MenuItem>
          </Select>
        </FormControl>
        
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={() => refetch()}
        >
          Refresh
        </Button>
      </Box>

      {/* Payments Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Payment ID</TableCell>
              <TableCell>Invoice</TableCell>
              <TableCell>Organization</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Payment Date</TableCell>
              <TableCell>Verified At</TableCell>
              <TableCell>Time Remaining</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {payments.map((payment) => (
              <TableRow key={payment.payment_id}>
                <TableCell>{payment.payment_id}</TableCell>
                <TableCell>{payment.invoice_number}</TableCell>
                <TableCell>{payment.organization_name}</TableCell>
                <TableCell>{formatCurrency(payment.amount)}</TableCell>
                <TableCell>{formatDate(payment.payment_date)}</TableCell>
                <TableCell>{formatDateTime(payment.verified_by_accounting_at)}</TableCell>
                <TableCell>
                  <Chip
                    label={getTimeRemaining(payment)}
                    color={canReversePayment(payment) ? 'success' : 'error'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={payment.status}
                    color={payment.status === 'verified' ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="View Details">
                      <IconButton
                        size="small"
                        onClick={() => handleViewDetails(payment)}
                      >
                        <ViewIcon />
                      </IconButton>
                    </Tooltip>
                    
                    {canReversePayment(payment) && (
                      <Tooltip title="Reverse Payment">
                        <IconButton
                          size="small"
                          color="warning"
                          onClick={() => handleReversalClick(payment)}
                        >
                          <ReverseIcon />
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

      {payments.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body1" color="textSecondary">
            No payments found matching the current filter.
          </Typography>
        </Box>
      )}

      {/* Reversal Dialog */}
      <Dialog
        open={reversalDialogOpen}
        onClose={() => setReversalDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Reverse Payment - {selectedPayment?.invoice_number}
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This action will reverse the payment and recalculate the invoice balance. 
            This action cannot be undone.
          </Alert>
          
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Payment Details
              </Typography>
              <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1, mb: 2 }}>
                <Typography variant="body2">
                  <strong>Payment ID:</strong> {selectedPayment?.payment_id}
                </Typography>
                <Typography variant="body2">
                  <strong>Amount:</strong> {formatCurrency(selectedPayment?.amount)}
                </Typography>
                <Typography variant="body2">
                  <strong>Payment Date:</strong> {formatDate(selectedPayment?.payment_date)}
                </Typography>
                <Typography variant="body2">
                  <strong>Payment Method:</strong> {selectedPayment?.payment_method}
                </Typography>
                <Typography variant="body2">
                  <strong>Reference:</strong> {selectedPayment?.reference_number || 'N/A'}
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Reason for Reversal"
                multiline
                rows={4}
                value={reversalReason}
                onChange={(e) => setReversalReason(e.target.value)}
                placeholder="Please provide a detailed reason for reversing this payment..."
                required
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReversalDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handleReversalSubmit}
            disabled={!reversalReason.trim() || reversePaymentMutation.isPending}
            startIcon={<ReverseIcon />}
          >
            {reversePaymentMutation.isPending ? 'Reversing...' : 'Reverse Payment'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Payment Details Dialog */}
      <Dialog
        open={viewDetailsDialogOpen}
        onClose={() => setViewDetailsDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Payment Details - {selectedPayment?.invoice_number}
        </DialogTitle>
        <DialogContent>
          {selectedPayment && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Payment Information
                </Typography>
                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="body2">
                    <strong>Payment ID:</strong> {selectedPayment.payment_id}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Amount:</strong> {formatCurrency(selectedPayment.amount)}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Payment Date:</strong> {formatDate(selectedPayment.payment_date)}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Payment Method:</strong> {selectedPayment.payment_method}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Reference Number:</strong> {selectedPayment.reference_number || 'N/A'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Status:</strong> {selectedPayment.status}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Verified At:</strong> {formatDateTime(selectedPayment.verified_by_accounting_at)}
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Invoice Information
                </Typography>
                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="body2">
                    <strong>Invoice Number:</strong> {selectedPayment.invoice_number}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Organization:</strong> {selectedPayment.organization_name}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Contact Email:</strong> {selectedPayment.contact_email}
                  </Typography>
                </Box>
              </Grid>
              
              {selectedPayment.notes && (
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    Notes
                  </Typography>
                  <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                    <Typography variant="body2">
                      {selectedPayment.notes}
                    </Typography>
                  </Box>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDetailsDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success/Error Messages */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={6000}
        onClose={() => setSuccessMessage('')}
      >
        <Alert severity="success" onClose={() => setSuccessMessage('')}>
          {successMessage}
        </Alert>
      </Snackbar>

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

export default PaymentReversalView; 