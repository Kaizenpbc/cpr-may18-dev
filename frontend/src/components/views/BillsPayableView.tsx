import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Alert,
  Divider,
  IconButton,
  Tooltip,
  CircularProgress,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Receipt as InvoiceIcon,
  Payment as PaymentIcon,
  Visibility as ViewIcon,
  PictureAsPdf as PdfIcon,
  Warning as WarningIcon,
  CheckCircle as PaidIcon,
  Schedule as PendingIcon,
  HourglassEmpty as SubmittedIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { API_URL } from '../../config';
import PaymentHistoryTable from '../common/PaymentHistoryTable';

const BillsPayableView = () => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [invoiceDetailOpen, setInvoiceDetailOpen] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: '',
    payment_method: 'bank_transfer',
    reference_number: '',
    payment_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  // State for payment history
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loadingPaymentHistory, setLoadingPaymentHistory] = useState(false);

  const queryClient = useQueryClient();

  console.log('BillsPayableView mounted');

  // Fetch billing summary
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['organization-billing-summary'],
    queryFn: async () => {
      const response = await api.get('/organization/billing-summary');
      return response.data.data;
    },
  });

  // Fetch invoices with filtering
  const {
    data: invoicesData,
    isLoading: invoicesLoading,
    refetch,
  } = useQuery({
    queryKey: ['organization-invoices', selectedTab],
    queryFn: async () => {
      const statusMap = {
        0: undefined, // All
        1: 'pending',
        2: 'overdue',
        3: 'payment_submitted',
        4: 'paid',
      };

      const params = {};
      if (statusMap[selectedTab]) {
        params.status = statusMap[selectedTab];
      }

      const response = await api.get('/organization/invoices', {
        params,
      });
      const data = response.data.data;
      // Support both { invoices: [...] } and [...] response shapes
      if (Array.isArray(data)) {
        return { invoices: data };
      }
      return data;
    },
  });

  // Submit payment mutation
  const submitPaymentMutation = useMutation({
    mutationFn: async ({ invoiceId, paymentData }: { invoiceId: string; paymentData: any }) => {
      const response = await api.post(
        `/organization/invoices/${invoiceId}/payment-submission`,
        paymentData
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['organization-billing-summary'] });
      setPaymentDialogOpen(false);
      setPaymentData({
        amount: '',
        payment_method: 'bank_transfer',
        reference_number: '',
        payment_date: new Date().toISOString().split('T')[0],
        notes: '',
      });
    },
  });

  // Load payment history for an invoice
  const loadPaymentHistory = async (invoiceId: number) => {
    if (!invoiceId) return;
    
    setLoadingPaymentHistory(true);
    try {
      console.log('Loading payment history for invoice:', invoiceId);
      const response = await api.get(`/organization/invoices/${invoiceId}/payments`);
      console.log('Payment history response:', response);
      
      if (response.data && response.data.success && Array.isArray(response.data.data)) {
        setPaymentHistory(response.data.data);
      } else if (response.data && Array.isArray(response.data)) {
        setPaymentHistory(response.data);
      } else {
        console.warn('Unexpected payment history response format:', response.data);
        setPaymentHistory([]);
      }
    } catch (error) {
      console.error('Error loading payment history:', error);
      setPaymentHistory([]);
    } finally {
      setLoadingPaymentHistory(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
  };

  const handlePaymentSubmit = () => {
    if (!paymentData.amount || parseFloat(paymentData.amount) <= 0) {
      alert('Please enter a valid payment amount');
      return;
    }

    if (!paymentData.payment_method || paymentData.payment_method.trim() === '') {
      alert('Please select a payment method');
      return;
    }

    submitPaymentMutation.mutate({
      invoiceId: selectedInvoice.invoice_id,
      paymentData: {
        ...paymentData,
        amount: parseFloat(paymentData.amount),
      },
    });
  };

  const handleViewInvoice = invoice => {
    setSelectedInvoice(invoice);
    setInvoiceDetailOpen(true);
    
    // Load payment history for this invoice
    if (invoice.invoice_id) {
      loadPaymentHistory(invoice.invoice_id);
    }
  };

  const handlePayInvoice = invoice => {
    setSelectedInvoice(invoice);
    setPaymentData(prev => ({
      ...prev,
      amount: invoice.balance_due || invoice.amount,
    }));
    setPaymentDialogOpen(true);
  };

  const handlePreviewPDF = invoiceId => {
    const previewUrl = `${API_URL}/accounting/invoices/${invoiceId}/preview`;
    window.open(previewUrl, '_blank', 'width=800,height=1000,scrollbars=yes');
  };

  const getStatusColor = status => {
    switch (status) {
      case 'paid':
        return 'success';
      case 'pending':
        return 'warning';
      case 'overdue':
        return 'error';
      case 'payment_submitted':
        return 'info';
      default:
        return 'default';
    }
  };

  const getStatusIcon = status => {
    switch (status) {
      case 'paid':
        return <PaidIcon />;
      case 'pending':
        return <PendingIcon />;
      case 'overdue':
        return <WarningIcon />;
      case 'payment_submitted':
        return <SubmittedIcon />;
      default:
        return <InvoiceIcon />;
    }
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

  if (summaryLoading) {
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

  // Debug log for invoicesData
  console.log('invoicesData:', invoicesData);

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: '100%', overflow: 'hidden' }}>
      <Typography
        variant="h4"
        gutterBottom
        sx={{ 
          mb: { xs: 2, sm: 3 }, 
          fontWeight: 'bold',
          fontSize: { xs: '1.5rem', sm: '2.125rem' }
        }}
      >
        Bills Payable
      </Typography>

      {/* Summary Cards */}
      <Grid container spacing={{ xs: 2, sm: 3 }} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} lg={3}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, #ff9800 0%, #ff5722 100%)',
              color: 'white',
              boxShadow: '0 8px 32px rgba(255, 152, 0, 0.3)',
              transition: 'transform 0.2s ease-in-out',
              height: '100%',
              minHeight: { xs: 120, sm: 140 },
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 12px 40px rgba(255, 152, 0, 0.4)',
              }
            }}
          >
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <Box
                display='flex'
                alignItems='center'
                justifyContent='space-between'
                flexDirection={{ xs: 'column', sm: 'row' }}
                textAlign={{ xs: 'center', sm: 'left' }}
                gap={{ xs: 1, sm: 0 }}
              >
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant="h6"
                    component='div'
                    fontWeight='bold'
                    sx={{ fontSize: { xs: '1.5rem', sm: '1.25rem' }, color: 'white' }}
                  >
                    {summary?.pending_invoices || 0}
                  </Typography>
                  <Typography
                    variant='body2'
                    sx={{ fontSize: { xs: '0.875rem', sm: '0.75rem' }, color: 'rgba(255,255,255,0.8)' }}
                  >
                    Pending Invoices
                  </Typography>
                </Box>
                <PendingIcon
                  sx={{ fontSize: { xs: 32, sm: 40 }, opacity: 0.8, color: 'white' }}
                />
              </Box>
              <Typography
                variant="h6"
                sx={{ mt: 1, fontWeight: 'medium', color: 'white' }}
              >
                {formatCurrency(summary?.pending_amount)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} lg={3}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)',
              color: 'white',
              boxShadow: '0 8px 32px rgba(244, 67, 54, 0.3)',
              transition: 'transform 0.2s ease-in-out',
              height: '100%',
              minHeight: { xs: 120, sm: 140 },
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 12px 40px rgba(244, 67, 54, 0.4)',
              }
            }}
          >
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <Box
                display='flex'
                alignItems='center'
                justifyContent='space-between'
                flexDirection={{ xs: 'column', sm: 'row' }}
                textAlign={{ xs: 'center', sm: 'left' }}
                gap={{ xs: 1, sm: 0 }}
              >
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant="h6"
                    component='div'
                    fontWeight='bold'
                    sx={{ fontSize: { xs: '1.5rem', sm: '1.25rem' }, color: 'white' }}
                  >
                    {summary?.overdue_invoices || 0}
                  </Typography>
                  <Typography
                    variant='body2'
                    sx={{ fontSize: { xs: '0.875rem', sm: '0.75rem' }, color: 'rgba(255,255,255,0.8)' }}
                  >
                    Overdue Invoices
                  </Typography>
                </Box>
                <WarningIcon
                  sx={{ fontSize: { xs: 32, sm: 40 }, opacity: 0.8, color: 'white' }}
                />
              </Box>
              <Typography
                variant="h6"
                sx={{ mt: 1, fontWeight: 'medium', color: 'white' }}
              >
                {formatCurrency(summary?.overdue_amount)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} lg={3}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)',
              color: 'white',
              boxShadow: '0 8px 32px rgba(33, 150, 243, 0.3)',
              transition: 'transform 0.2s ease-in-out',
              height: '100%',
              minHeight: { xs: 120, sm: 140 },
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 12px 40px rgba(33, 150, 243, 0.4)',
              }
            }}
          >
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <Box
                display='flex'
                alignItems='center'
                justifyContent='space-between'
                flexDirection={{ xs: 'column', sm: 'row' }}
                textAlign={{ xs: 'center', sm: 'left' }}
                gap={{ xs: 1, sm: 0 }}
              >
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant="h6"
                    component='div'
                    fontWeight='bold'
                    sx={{ fontSize: { xs: '1.5rem', sm: '1.25rem' }, color: 'white' }}
                  >
                    {summary?.payment_submitted || 0}
                  </Typography>
                  <Typography
                    variant='body2'
                    sx={{ fontSize: { xs: '0.875rem', sm: '0.75rem' }, color: 'rgba(255,255,255,0.8)' }}
                  >
                    Payment Submitted
                  </Typography>
                </Box>
                <SubmittedIcon
                  sx={{ fontSize: { xs: 32, sm: 40 }, opacity: 0.8, color: 'white' }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} lg={3}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)',
              color: 'white',
              boxShadow: '0 8px 32px rgba(76, 175, 80, 0.3)',
              transition: 'transform 0.2s ease-in-out',
              height: '100%',
              minHeight: { xs: 120, sm: 140 },
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 12px 40px rgba(76, 175, 80, 0.4)',
              }
            }}
          >
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <Box
                display='flex'
                alignItems='center'
                justifyContent='space-between'
                flexDirection={{ xs: 'column', sm: 'row' }}
                textAlign={{ xs: 'center', sm: 'left' }}
                gap={{ xs: 1, sm: 0 }}
              >
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant="h6"
                    component='div'
                    fontWeight='bold'
                    sx={{ fontSize: { xs: '1.5rem', sm: '1.25rem' }, color: 'white' }}
                  >
                    {summary?.paid_invoices || 0}
                  </Typography>
                  <Typography
                    variant='body2'
                    sx={{ fontSize: { xs: '0.875rem', sm: '0.75rem' }, color: 'rgba(255,255,255,0.8)' }}
                  >
                    Paid Invoices
                  </Typography>
                </Box>
                <PaidIcon
                  sx={{ fontSize: { xs: 32, sm: 40 }, opacity: 0.8, color: 'white' }}
                />
              </Box>
              <Typography
                variant="h6"
                sx={{ mt: 1, fontWeight: 'medium', color: 'white' }}
              >
                {formatCurrency(summary?.paid_amount)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Invoice Tabs and Table */}
      <Card sx={{ overflow: 'hidden' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={selectedTab}
            onChange={handleTabChange}
            variant='scrollable'
            scrollButtons='auto'
            allowScrollButtonsMobile
            sx={{
              '& .MuiTab-root': {
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                minWidth: { xs: 80, sm: 120 },
              },
            }}
          >
            <Tab label='All Invoices' />
            <Tab label='Pending' />
            <Tab label='Overdue' />
            <Tab label='Payment Submitted' />
            <Tab label='Paid' />
          </Tabs>
        </Box>

        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table sx={{ minWidth: { xs: 800, sm: 'auto' } }}>
            <TableHead>
              <TableRow>
                <TableCell
                  sx={{
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    fontWeight: 'bold',
                  }}
                >
                  Invoice #
                </TableCell>
                <TableCell
                  sx={{
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    fontWeight: 'bold',
                  }}
                >
                  Course
                </TableCell>
                <TableCell
                  sx={{
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    fontWeight: 'bold',
                  }}
                >
                  Date
                </TableCell>
                <TableCell
                  sx={{
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    fontWeight: 'bold',
                  }}
                >
                  Due Date
                </TableCell>
                <TableCell
                  align='right'
                  sx={{
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    fontWeight: 'bold',
                  }}
                >
                  Base Cost
                </TableCell>
                <TableCell
                  align='right'
                  sx={{
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    fontWeight: 'bold',
                  }}
                >
                  Tax (HST)
                </TableCell>
                <TableCell
                  align='right'
                  sx={{
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    fontWeight: 'bold',
                  }}
                >
                  Total
                </TableCell>
                <TableCell
                  align='right'
                  sx={{
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    fontWeight: 'bold',
                  }}
                >
                  Balance Due
                </TableCell>
                <TableCell
                  sx={{
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    fontWeight: 'bold',
                  }}
                >
                  Status
                </TableCell>
                <TableCell
                  align='center'
                  sx={{
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    fontWeight: 'bold',
                  }}
                >
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {invoicesLoading ? (
                <TableRow>
                  <TableCell colSpan={10} align='center'>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : invoicesData?.invoices?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align='center'>
                    <Typography variant='body2' color='text.secondary'>
                      No invoices found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                invoicesData?.invoices?.map(invoice => (
                  <TableRow key={invoice.invoice_id} hover>
                    <TableCell>
                      <Typography variant='body2' fontWeight='medium'>
                        {invoice.invoice_number}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant='body2'>
                          {invoice.course_type_name}
                        </Typography>
                        <Typography variant='caption' color='text.secondary'>
                          {invoice.location}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{formatDate(invoice.invoice_date)}</TableCell>
                    <TableCell>
                      <Typography
                        variant='body2'
                        color={
                          new Date(invoice.due_date) < new Date() &&
                          invoice.status !== 'paid'
                            ? 'error'
                            : 'inherit'
                        }
                      >
                        {formatDate(invoice.due_date)}
                      </Typography>
                    </TableCell>
                    <TableCell align='right'>
                      <Typography variant='body2' fontWeight='medium'>
                        $36.00
                      </Typography>
                    </TableCell>
                    <TableCell align='right'>
                      <Typography variant='body2' fontWeight='medium'>
                        $4.68
                      </Typography>
                    </TableCell>
                    <TableCell align='right'>
                      <Typography variant='body2' fontWeight='medium'>
                        $40.68
                      </Typography>
                    </TableCell>
                    <TableCell align='right'>
                      <Typography
                        variant='body2'
                        fontWeight='medium'
                        color={invoice.balance_due > 0 ? 'error' : 'success'}
                      >
                        {formatCurrency(invoice.balance_due)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={getStatusIcon(invoice.status)}
                        label={invoice.status.replace('_', ' ').toUpperCase()}
                        color={getStatusColor(invoice.status)}
                        size='small'
                      />
                    </TableCell>
                    <TableCell align='center'>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title='View Details'>
                          <IconButton
                            size='small'
                            onClick={() => handleViewInvoice(invoice)}
                          >
                            <ViewIcon fontSize='small' />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title='Preview PDF'>
                          <IconButton
                            size='small'
                            onClick={() => handlePreviewPDF(invoice.invoice_id)}
                          >
                            <PdfIcon fontSize='small' />
                          </IconButton>
                        </Tooltip>
                        {invoice.status !== 'paid' &&
                          invoice.status !== 'payment_submitted' && (
                            <Tooltip title='Report Payment'>
                              <IconButton
                                size='small'
                                onClick={() => handlePayInvoice(invoice)}
                                color='primary'
                              >
                                <PaymentIcon fontSize='small' />
                              </IconButton>
                            </Tooltip>
                          )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Payment Submission Dialog */}
      <Dialog
        open={paymentDialogOpen}
        onClose={() => setPaymentDialogOpen(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>
          Report Payment Information
          {selectedInvoice && (
            <Typography variant='subtitle2' color='text.secondary'>
              Invoice: {selectedInvoice.invoice_number}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label='Payment Amount'
                  type='number'
                  value={paymentData.amount}
                  onChange={e =>
                    setPaymentData(prev => ({
                      ...prev,
                      amount: e.target.value,
                    }))
                  }
                  InputProps={{
                    startAdornment: '$',
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label='Payment Date'
                  type='date'
                  value={paymentData.payment_date}
                  onChange={e =>
                    setPaymentData(prev => ({
                      ...prev,
                      payment_date: e.target.value,
                    }))
                  }
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth required>
                  <InputLabel>Payment Method *</InputLabel>
                  <Select
                    value={paymentData.payment_method}
                    label='Payment Method *'
                    onChange={e =>
                      setPaymentData(prev => ({
                        ...prev,
                        payment_method: e.target.value,
                      }))
                    }
                  >
                    <MenuItem value="">Select Payment Method</MenuItem>
                    <MenuItem value='bank_transfer'>Bank Transfer</MenuItem>
                    <MenuItem value='cheque'>Cheque</MenuItem>
                    <MenuItem value='credit_card'>Credit Card</MenuItem>
                    <MenuItem value='cash'>Cash</MenuItem>
                    <MenuItem value='other'>Other</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label='Reference Number'
                  value={paymentData.reference_number}
                  onChange={e =>
                    setPaymentData(prev => ({
                      ...prev,
                      reference_number: e.target.value,
                    }))
                  }
                  placeholder='Transaction ID, Cheque #, etc.'
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label='Notes'
                  multiline
                  rows={3}
                  value={paymentData.notes}
                  onChange={e =>
                    setPaymentData(prev => ({ ...prev, notes: e.target.value }))
                  }
                  placeholder='Additional payment details...'
                />
              </Grid>
            </Grid>

            <Alert severity='info' sx={{ mt: 2 }}>
              Report payment information after you have sent payment to GTA
              through your bank or other payment method. Our accounting team
              will verify the payment details and update the invoice status.
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handlePaymentSubmit}
            variant='contained'
            disabled={submitPaymentMutation.isLoading}
          >
            {submitPaymentMutation.isLoading
              ? 'Reporting...'
              : 'Report Payment'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Invoice Detail Dialog */}
      <Dialog
        open={invoiceDetailOpen}
        onClose={() => {
          setInvoiceDetailOpen(false);
          setPaymentHistory([]); // Clear payment history when dialog closes
        }}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>Invoice Details</DialogTitle>
        <DialogContent>
          {selectedInvoice && (
            <Box sx={{ pt: 2 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant='h6' gutterBottom>
                    Invoice Information
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant='body2' color='text.secondary'>
                      Invoice Number
                    </Typography>
                    <Typography variant='body1' fontWeight='medium'>
                      {selectedInvoice.invoice_number}
                    </Typography>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant='body2' color='text.secondary'>
                      Invoice Date
                    </Typography>
                    <Typography variant='body1'>
                      {formatDate(selectedInvoice.invoice_date)}
                    </Typography>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant='body2' color='text.secondary'>
                      Due Date
                    </Typography>
                    <Typography variant='body1'>
                      {formatDate(selectedInvoice.due_date)}
                    </Typography>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant='body2' color='text.secondary'>
                      Status
                    </Typography>
                    <Chip
                      icon={getStatusIcon(selectedInvoice.status)}
                      label={selectedInvoice.status
                        .replace('_', ' ')
                        .toUpperCase()}
                      color={getStatusColor(selectedInvoice.status)}
                      size='small'
                    />
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant='h6' gutterBottom>
                    Course Information
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant='body2' color='text.secondary'>
                      Course Name
                    </Typography>
                    <Typography variant='body1'>
                      {selectedInvoice.course_type_name}
                    </Typography>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant='body2' color='text.secondary'>
                      Location
                    </Typography>
                    <Typography variant='body1'>
                      {selectedInvoice.location}
                    </Typography>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant='body2' color='text.secondary'>
                      Course Date
                    </Typography>
                    <Typography variant='body1'>
                      {formatDate(selectedInvoice.course_date)}
                    </Typography>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant='body2' color='text.secondary'>
                      Students
                    </Typography>
                    <Typography variant='body1'>
                      {selectedInvoice.students_billed}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant='h6' gutterBottom>
                    Cost Breakdown
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={3}>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant='body2' color='text.secondary'>
                          Base Cost
                        </Typography>
                        <Typography variant='h6'>
                          {selectedInvoice.rate_per_student ? 
                            `$${(selectedInvoice.rate_per_student * selectedInvoice.students_billed).toFixed(2)}` : 
                            'N/A'
                          }
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant='body2' color='text.secondary'>
                          Tax (HST)
                        </Typography>
                        <Typography variant='h6'>
                          {selectedInvoice.rate_per_student ? 
                            `$${(selectedInvoice.rate_per_student * selectedInvoice.students_billed * 0.13).toFixed(2)}` : 
                            'N/A'
                          }
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant='body2' color='text.secondary'>
                          Total Amount
                        </Typography>
                        <Typography variant='h6'>
                          {selectedInvoice.rate_per_student ? 
                            `$${(selectedInvoice.rate_per_student * selectedInvoice.students_billed * 1.13).toFixed(2)}` : 
                            'N/A'
                          }
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant='body2' color='text.secondary'>
                          Amount Paid
                        </Typography>
                        <Typography variant='h6' color='success.main'>
                          {formatCurrency(selectedInvoice.amount_paid)}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                  <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={12} md={6}>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant='body2' color='text.secondary'>
                          Balance Due
                        </Typography>
                        <Typography 
                          variant='h6'
                          color={selectedInvoice.balance_due > 0 ? 'error.main' : 'success.main'}
                        >
                          {formatCurrency(selectedInvoice.balance_due)}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant='body2' color='text.secondary'>
                          Rate per Student
                        </Typography>
                        <Typography variant='h6'>
                          {formatCurrency(selectedInvoice.rate_per_student || (selectedInvoice.amount / selectedInvoice.students_billed))}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>

              {/* Payment History Section */}
              <Divider sx={{ my: 2 }} />
              <Typography variant='subtitle1' gutterBottom sx={{ mt: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="h6" component="span">💰</Typography>
                  Payment History
                </Box>
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
          <Button onClick={() => {
            setInvoiceDetailOpen(false);
            setPaymentHistory([]); // Clear payment history when dialog closes
          }}>
            Close
          </Button>
          {selectedInvoice && (
            <Button
              onClick={() => handlePreviewPDF(selectedInvoice.invoice_id)}
              startIcon={<PdfIcon />}
            >
              View PDF
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BillsPayableView;
