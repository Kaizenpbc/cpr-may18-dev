import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Badge,
  Divider,
  Tooltip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Visibility as ViewIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Payment as PaymentIcon,
  Receipt as ReceiptIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { vendorApi } from '../../../services/api';
import { useLocation } from 'react-router-dom';

interface Invoice {
  id: number;
  invoice_number: string;
  amount: number;
  description: string;
  status: string;
  created_at: string;
  due_date?: string;
  payment_date?: string;
  pdf_filename?: string;
  organization_name?: string;
  notes?: string;
  approval_date?: string;
  rejection_reason?: string;
}

interface StatusSummary {
  submitted: number;
  pending_review: number;
  approved: number;
  paid: number;
  rejected: number;
  overdue: number;
}

const InvoiceStatusView: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [statusSummary, setStatusSummary] = useState<StatusSummary>({
    submitted: 0,
    pending_review: 0,
    approved: 0,
    paid: 0,
    rejected: 0,
    overdue: 0
  });
  const location = useLocation();

  useEffect(() => {
    fetchInvoices();
  }, []);

  useEffect(() => {
    if (location.state && (location.state as any).refresh) {
      fetchInvoices();
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const response = await vendorApi.getInvoices();
      
      const processedInvoices = response.data.map((invoice: any) => ({
        ...invoice,
        amount: typeof invoice.amount === 'string' ? parseFloat(invoice.amount) : invoice.amount || 0
      }));
      
      setInvoices(processedInvoices);
      calculateStatusSummary(processedInvoices);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      setError('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const calculateStatusSummary = (invoiceList: Invoice[]) => {
    const summary = {
      submitted: 0,
      pending_review: 0,
      approved: 0,
      paid: 0,
      rejected: 0,
      overdue: 0
    };

    invoiceList.forEach(invoice => {
      summary[invoice.status as keyof StatusSummary]++;
      
      // Check for overdue invoices
      if (invoice.due_date && new Date(invoice.due_date) < new Date() && invoice.status !== 'paid') {
        summary.overdue++;
      }
    });

    setStatusSummary(summary);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted':
        return 'warning';
      case 'pending_review':
        return 'info';
      case 'approved':
        return 'success';
      case 'paid':
        return 'success';
      case 'rejected':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'submitted':
        return <ScheduleIcon />;
      case 'pending_review':
        return <WarningIcon />;
      case 'approved':
        return <CheckCircleIcon />;
      case 'paid':
        return <PaymentIcon />;
      case 'rejected':
        return <ErrorIcon />;
      default:
        return <ReceiptIcon />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(amount);
  };

  const handleDownload = async (invoiceId: number, invoiceNumber: string) => {
    try {
      console.log('📥 [INVOICE STATUS VIEW] Downloading invoice:', invoiceId);
      
      // Use the vendorApi method which handles authentication automatically
      const blob = await vendorApi.downloadInvoice(invoiceId);
      
      console.log('📥 [INVOICE STATUS VIEW] Blob received, size:', blob.size, 'bytes, type:', blob.type);

      // Verify the blob size
      if (blob.size === 0) {
        throw new Error('Invoice file is empty');
      }

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${invoiceNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log('✅ [INVOICE STATUS VIEW] Download completed successfully');
    } catch (err: any) {
      console.error('❌ [INVOICE STATUS VIEW] Download error:', err);
      console.error('❌ [INVOICE STATUS VIEW] Error details:', {
        message: err.message,
        stack: err.stack,
        name: err.name
      });
      alert(`Failed to download invoice: ${err.message}`);
    }
  };

  const handleView = async (invoiceId: number) => {
    try {
      console.log('👁️ [INVOICE STATUS VIEW] Viewing invoice:', invoiceId);
      const response = await vendorApi.getInvoice(invoiceId);
      setSelectedInvoice(response.data);
      setViewDialogOpen(true);
      console.log('✅ [INVOICE STATUS VIEW] Invoice details loaded');
    } catch (err: any) {
      console.error('❌ [INVOICE STATUS VIEW] View error:', err);
      alert('Failed to load invoice details. Please try again.');
    }
  };

  const handleCloseViewDialog = () => {
    setViewDialogOpen(false);
    setSelectedInvoice(null);
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = invoice.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
                         invoice.description.toLowerCase().includes(search.toLowerCase()) ||
                         (invoice.organization_name && invoice.organization_name.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = !statusFilter || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h4" gutterBottom>
        Invoice Status Overview
      </Typography>

      {/* Status Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {Object.entries(statusSummary).map(([status, count]) => (
          <Grid item xs={12} sm={6} md={3} key={status}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="h4" component="div">
                      {count}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {status.replace('_', ' ').toUpperCase()}
                    </Typography>
                  </Box>
                  <Badge badgeContent={count} color="primary">
                    {getStatusIcon(status)}
                  </Badge>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Search and Filter Controls */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Search invoices..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by invoice number, description, or organization"
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Status Filter</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                label="Status Filter"
              >
                <MenuItem value="">All Statuses</MenuItem>
                <MenuItem value="submitted">Submitted</MenuItem>
                <MenuItem value="pending_review">Pending Review</MenuItem>
                <MenuItem value="approved">Approved</MenuItem>
                <MenuItem value="paid">Paid</MenuItem>
                <MenuItem value="rejected">Rejected</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <Button
              variant="outlined"
              onClick={fetchInvoices}
              fullWidth
            >
              Refresh
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Invoices Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Invoice #</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Organization</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Due Date</TableCell>
              <TableCell>Payment Date</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredInvoices.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell>
                  <Typography variant="body2" fontWeight="bold">
                    {invoice.invoice_number}
                  </Typography>
                </TableCell>
                <TableCell>{invoice.description}</TableCell>
                <TableCell>{invoice.organization_name || 'N/A'}</TableCell>
                <TableCell align="right">
                  <Typography variant="body2" fontWeight="bold">
                    {formatCurrency(invoice.amount)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    icon={getStatusIcon(invoice.status)}
                    label={invoice.status.replace('_', ' ').toUpperCase()}
                    color={getStatusColor(invoice.status) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell>{formatDate(invoice.created_at)}</TableCell>
                <TableCell>
                  {invoice.due_date ? formatDate(invoice.due_date) : '-'}
                </TableCell>
                <TableCell>
                  {invoice.payment_date ? formatDate(invoice.payment_date) : '-'}
                </TableCell>
                <TableCell align="center">
                  <Tooltip title="View Invoice Details">
                    <IconButton 
                      size="small" 
                      onClick={() => handleView(invoice.id)}
                      color="primary"
                    >
                      <ViewIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Download PDF">
                    <IconButton 
                      size="small" 
                      onClick={() => handleDownload(invoice.id, invoice.invoice_number)}
                      color="secondary"
                    >
                      <DownloadIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {filteredInvoices.length === 0 && !loading && (
        <Box textAlign="center" py={4}>
          <Typography color="textSecondary">
            No invoices found matching your criteria.
          </Typography>
        </Box>
      )}

      {/* Invoice Detail Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={handleCloseViewDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              Invoice Details - {selectedInvoice?.invoice_number}
            </Typography>
            <IconButton onClick={handleCloseViewDialog}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedInvoice && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="textSecondary">Invoice Number</Typography>
                <Typography variant="body1" gutterBottom>{selectedInvoice.invoice_number}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="textSecondary">Status</Typography>
                <Chip
                  icon={getStatusIcon(selectedInvoice.status)}
                  label={selectedInvoice.status.replace('_', ' ').toUpperCase()}
                  color={getStatusColor(selectedInvoice.status) as any}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="textSecondary">Created Date</Typography>
                <Typography variant="body1" gutterBottom>
                  {formatDate(selectedInvoice.created_at)}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="textSecondary">Due Date</Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedInvoice.due_date ? formatDate(selectedInvoice.due_date) : 'Not set'}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="textSecondary">Organization</Typography>
                <Typography variant="body1" gutterBottom>{selectedInvoice.organization_name || 'N/A'}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="textSecondary">Payment Date</Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedInvoice.payment_date ? formatDate(selectedInvoice.payment_date) : 'Not paid'}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="textSecondary">Description</Typography>
                <Typography variant="body1" gutterBottom>{selectedInvoice.description}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="textSecondary">Amount</Typography>
                <Typography variant="body1" fontWeight="bold" gutterBottom>
                  {formatCurrency(selectedInvoice.amount)}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="textSecondary">Notes</Typography>
                <Typography variant="body1" gutterBottom>{selectedInvoice.notes || 'No notes'}</Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseViewDialog}>Close</Button>
          {selectedInvoice && (
            <Button
              onClick={() => handleDownload(selectedInvoice.id, selectedInvoice.invoice_number)}
              startIcon={<DownloadIcon />}
              variant="contained"
              color="primary"
            >
              Download PDF
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InvoiceStatusView; 