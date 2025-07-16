import React, { useState, useEffect } from 'react';
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
  IconButton,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Download as DownloadIcon,
  Visibility as ViewIcon
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
}

const InvoiceHistory: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const location = useLocation();

  useEffect(() => {
    fetchInvoices();
  }, [search, statusFilter]);

  // Best-in-class: refresh on navigation with state.refresh
  useEffect(() => {
    if (location.state && (location.state as any).refresh) {
      fetchInvoices();
      // Optionally, clear the refresh flag so it doesn't refetch on every render
      window.history.replaceState({}, document.title);
    }
    // eslint-disable-next-line
  }, [location.state]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      console.log('🔄 [INVOICE HISTORY] Fetching invoices...');
      
      const response = await vendorApi.getInvoices({
        status: statusFilter || undefined,
        search: search || undefined
      });
      
      console.log('✅ [INVOICE HISTORY] Invoices received:', response);
      setInvoices(response);
    } catch (err: any) {
      console.error('❌ [INVOICE HISTORY] Error fetching invoices:', err);
      setError(err.response?.data?.error || 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
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

  const handleDownload = async (invoiceId: number, invoiceNumber: string) => {
    try {
      console.log('📥 [INVOICE HISTORY] Downloading invoice:', invoiceId);
      const blob = await vendorApi.downloadInvoice(invoiceId);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${invoiceNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log('✅ [INVOICE HISTORY] Download completed');
    } catch (err: any) {
      console.error('❌ [INVOICE HISTORY] Download error:', err);
      alert('Failed to download invoice. Please try again.');
    }
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = invoice.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
                         invoice.description.toLowerCase().includes(search.toLowerCase());
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
    <Box>
      <Typography variant="h4" gutterBottom>
        Invoice History
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Search invoices"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by invoice number or description..."
            />
          </Grid>
          <Grid item xs={12} md={6}>
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
        </Grid>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Invoice #</TableCell>
              <TableCell>Description</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Due Date</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredInvoices.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell>{invoice.invoice_number}</TableCell>
                <TableCell>{invoice.description}</TableCell>
                <TableCell align="right">${invoice.amount.toFixed(2)}</TableCell>
                <TableCell>
                  <Chip
                    label={invoice.status.replace('_', ' ').toUpperCase()}
                    color={getStatusColor(invoice.status) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell>{new Date(invoice.created_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '-'}
                </TableCell>
                <TableCell align="center">
                  <IconButton size="small" title="View Invoice">
                    <ViewIcon />
                  </IconButton>
                  <IconButton 
                    size="small" 
                    title="Download PDF"
                    onClick={() => handleDownload(invoice.id, invoice.invoice_number)}
                  >
                    <DownloadIcon />
                  </IconButton>
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
    </Box>
  );
};

export default InvoiceHistory; 