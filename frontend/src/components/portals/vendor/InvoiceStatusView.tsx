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
  Button
} from '@mui/material';
import {
  Download as DownloadIcon,
  Visibility as ViewIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Payment as PaymentIcon,
  Receipt as ReceiptIcon
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
      const blob = await vendorApi.downloadInvoice(invoiceId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${invoiceNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Failed to download invoice. Please try again.');
    }
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
    <Box>
      <Typography variant="h4" gutterBottom>
        Invoice Status Dashboard
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Status Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Badge badgeContent={statusSummary.submitted} color="warning">
                <ScheduleIcon color="warning" sx={{ fontSize: 40 }} />
              </Badge>
              <Typography variant="h6" sx={{ mt: 1 }}>
                {statusSummary.submitted}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Submitted
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Badge badgeContent={statusSummary.pending_review} color="info">
                <WarningIcon color="info" sx={{ fontSize: 40 }} />
              </Badge>
              <Typography variant="h6" sx={{ mt: 1 }}>
                {statusSummary.pending_review}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Pending Review
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Badge badgeContent={statusSummary.approved} color="success">
                <CheckCircleIcon color="success" sx={{ fontSize: 40 }} />
              </Badge>
              <Typography variant="h6" sx={{ mt: 1 }}>
                {statusSummary.approved}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Approved
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Badge badgeContent={statusSummary.paid} color="success">
                <PaymentIcon color="success" sx={{ fontSize: 40 }} />
              </Badge>
              <Typography variant="h6" sx={{ mt: 1 }}>
                {statusSummary.paid}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Paid
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Badge badgeContent={statusSummary.rejected} color="error">
                <ErrorIcon color="error" sx={{ fontSize: 40 }} />
              </Badge>
              <Typography variant="h6" sx={{ mt: 1 }}>
                {statusSummary.rejected}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Rejected
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Badge badgeContent={statusSummary.overdue} color="error">
                <WarningIcon color="error" sx={{ fontSize: 40 }} />
              </Badge>
              <Typography variant="h6" sx={{ mt: 1 }}>
                {statusSummary.overdue}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Overdue
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search and Filter */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Search invoices"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by invoice number, description, or organization..."
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
                  <Tooltip title="View Invoice">
                    <IconButton size="small">
                      <ViewIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Download PDF">
                    <IconButton 
                      size="small" 
                      onClick={() => handleDownload(invoice.id, invoice.invoice_number)}
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
    </Box>
  );
};

export default InvoiceStatusView; 