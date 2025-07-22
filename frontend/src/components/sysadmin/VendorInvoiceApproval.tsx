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
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Visibility as ViewIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { sysAdminApi } from '../../services/api';
import logger from '../../utils/logger';

interface VendorInvoice {
  id: number;
  invoice_number: string;
  amount: number;
  description: string;
  status: string;
  created_at: string;
  due_date?: string;
  pdf_filename?: string;
  vendor_name: string;
  vendor_email: string;
  admin_notes?: string;
  approved_by?: string;
  approved_at?: string;
  rejected_by?: string;
  rejected_at?: string;
}

const VendorInvoiceApproval: React.FC = () => {
  const [invoices, setInvoices] = useState<VendorInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<VendorInvoice | null>(null);
  const [approvalDialog, setApprovalDialog] = useState(false);
  const [action, setAction] = useState<'approve' | 'reject'>('approve');
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('submitted');

  useEffect(() => {
    fetchVendorInvoices();
  }, []);

  const fetchVendorInvoices = async () => {
    try {
      setLoading(true);
      const response = await sysAdminApi.getVendorInvoices();
      setInvoices(response.data || []);
      setError(null);
    } catch (err) {
      logger.error('Error fetching vendor invoices:', err);
      setError('Failed to load vendor invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = (invoice: VendorInvoice) => {
    setSelectedInvoice(invoice);
    setAction('approve');
    setNotes('');
    setApprovalDialog(true);
  };

  const handleReject = (invoice: VendorInvoice) => {
    setSelectedInvoice(invoice);
    setAction('reject');
    setNotes('');
    setApprovalDialog(true);
  };

  const handleApprovalSubmit = async () => {
    if (!selectedInvoice) return;

    try {
      setProcessing(true);
      await sysAdminApi.approveVendorInvoice(selectedInvoice.id, action, notes);
      
      // Refresh the invoice list
      await fetchVendorInvoices();
      
      setApprovalDialog(false);
      setSelectedInvoice(null);
      setNotes('');
      
      logger.info(`Vendor invoice ${action}d successfully`);
    } catch (err) {
      logger.error(`Error ${action}ing vendor invoice:`, err);
      setError(`Failed to ${action} invoice`);
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = async (invoice: VendorInvoice) => {
    try {
      const response = await sysAdminApi.downloadVendorInvoice(invoice.id);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${invoice.invoice_number}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      logger.error('Error downloading invoice:', err);
      setError('Failed to download invoice');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted':
        return 'warning';
      case 'approved':
        return 'success';
      case 'rejected':
        return 'error';
      case 'paid':
        return 'info';
      default:
        return 'default';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const filteredInvoices = invoices.filter(invoice => 
    statusFilter === 'all' || invoice.status === statusFilter
  );

  const stats = {
    submitted: invoices.filter(i => i.status === 'submitted').length,
    approved: invoices.filter(i => i.status === 'approved').length,
    rejected: invoices.filter(i => i.status === 'rejected').length,
    paid: invoices.filter(i => i.status === 'paid').length,
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" gutterBottom>
          Vendor Invoice Approval
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={fetchVendorInvoices}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Statistics Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Pending Review
              </Typography>
              <Typography variant="h4" color="warning.main">
                {stats.submitted}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Approved
              </Typography>
              <Typography variant="h4" color="success.main">
                {stats.approved}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Rejected
              </Typography>
              <Typography variant="h4" color="error.main">
                {stats.rejected}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Paid
              </Typography>
              <Typography variant="h4" color="info.main">
                {stats.paid}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filter */}
      <Box sx={{ mb: 2 }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Filter by Status</InputLabel>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            label="Filter by Status"
          >
            <MenuItem value="all">All Invoices</MenuItem>
            <MenuItem value="submitted">Pending Review</MenuItem>
            <MenuItem value="approved">Approved</MenuItem>
            <MenuItem value="rejected">Rejected</MenuItem>
            <MenuItem value="paid">Paid</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Invoices Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Invoice #</TableCell>
              <TableCell>Vendor</TableCell>
              <TableCell>Description</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Submitted</TableCell>
              <TableCell>Due Date</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredInvoices.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell>{invoice.invoice_number}</TableCell>
                <TableCell>
                  <Box>
                    <Typography variant="body2" fontWeight="bold">
                      {invoice.vendor_name}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {invoice.vendor_email}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>{invoice.description}</TableCell>
                <TableCell align="right">
                  {formatCurrency(invoice.amount)}
                </TableCell>
                <TableCell>
                  <Chip
                    label={invoice.status.replace('_', ' ').toUpperCase()}
                    color={getStatusColor(invoice.status) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell>{formatDate(invoice.created_at)}</TableCell>
                <TableCell>
                  {invoice.due_date ? formatDate(invoice.due_date) : '-'}
                </TableCell>
                <TableCell align="center">
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                    {invoice.pdf_filename && (
                      <Tooltip title="Download PDF">
                        <IconButton
                          size="small"
                          onClick={() => handleDownload(invoice)}
                        >
                          <DownloadIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                    
                    {invoice.status === 'submitted' && (
                      <>
                        <Tooltip title="Approve Invoice">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => handleApprove(invoice)}
                          >
                            <ApproveIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Reject Invoice">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleReject(invoice)}
                          >
                            <RejectIcon />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {filteredInvoices.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography color="textSecondary">
            No invoices found matching the current filter.
          </Typography>
        </Box>
      )}

      {/* Approval Dialog */}
      <Dialog open={approvalDialog} onClose={() => setApprovalDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {action === 'approve' ? 'Approve Invoice' : 'Reject Invoice'}
        </DialogTitle>
        <DialogContent>
          {selectedInvoice && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="textSecondary">
                Invoice #{selectedInvoice.invoice_number} from {selectedInvoice.vendor_name}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Amount: {formatCurrency(selectedInvoice.amount)}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Description: {selectedInvoice.description}
              </Typography>
            </Box>
          )}
          
          <TextField
            fullWidth
            multiline
            rows={4}
            label={`${action === 'approve' ? 'Approval' : 'Rejection'} Notes`}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={`Enter ${action === 'approve' ? 'approval' : 'rejection'} notes...`}
            required={action === 'reject'}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApprovalDialog(false)} disabled={processing}>
            Cancel
          </Button>
          <Button
            onClick={handleApprovalSubmit}
            variant="contained"
            color={action === 'approve' ? 'success' : 'error'}
            disabled={processing || (action === 'reject' && !notes.trim())}
            startIcon={processing ? <CircularProgress size={20} /> : null}
          >
            {processing ? 'Processing...' : `${action === 'approve' ? 'Approve' : 'Reject'} Invoice`}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default VendorInvoiceApproval; 