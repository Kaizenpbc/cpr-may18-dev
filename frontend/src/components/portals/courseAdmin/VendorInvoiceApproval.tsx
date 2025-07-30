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
  Receipt as InvoiceIcon,
} from '@mui/icons-material';
import { adminApi } from '../../../services/api';
import logger from '../../../utils/logger';
import { useVendorInvoiceUpdates } from '../../../hooks/useVendorInvoiceUpdates';

interface VendorInvoice {
  id: number;
  invoice_number: string;
  item?: string;
  company?: string;
  billing_company?: string;
  quantity?: number | null;
  description: string;
  rate: number;
  amount: number;
  subtotal: number;
  hst: number;
  total: number;
  status: string;
  created_at: string;
  due_date?: string;
  payment_date?: string;
  pdf_filename?: string;
  vendor_name: string;
  vendor_email: string;
  admin_notes?: string;
  approved_by?: string;
  approved_at?: string;
  rejected_by?: string;
  rejected_at?: string;
  rejection_reason?: string;
  total_paid?: number | string;
  balance_due?: number | string;
  approved_by_name?: string;
  approved_by_email?: string;
  sent_to_accounting_at?: string;
}

interface PaymentHistory {
  id: number;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference_number: string;
  notes: string;
  status: string;
  processed_at: string;
  processed_by_name: string;
}

const VendorInvoiceApproval: React.FC = () => {
  const [invoices, setInvoices] = useState<VendorInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<VendorInvoice | null>(null);
  const [viewDialog, setViewDialog] = useState(false);
  const [approvalDialog, setApprovalDialog] = useState(false);
  const [action, setAction] = useState<'approve' | 'reject'>('approve');
  const [notes, setNotes] = useState('');
  const [modalNotes, setModalNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [statusFilter, setStatusFilter] = useState('pending'); // Default to pending (non-paid) invoices

  const fetchVendorInvoices = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getVendorInvoices();
      setInvoices(response.data || []);
      setError(null);
    } catch (err) {
      logger.error('Error fetching vendor invoices:', err);
      setError('Failed to load vendor invoices');
    } finally {
      setLoading(false);
    }
  };

  // Real-time updates
  const { isConnected } = useVendorInvoiceUpdates({
    onStatusUpdate: (update) => {
      logger.info(`Real-time status update: Invoice ${update.invoiceId} ${update.action}d by ${update.updatedBy}`);
    },
    onNotesUpdate: (update) => {
      logger.info(`Real-time notes update: Invoice ${update.invoiceId} notes updated by ${update.updatedBy}`);
    },
    onRefresh: fetchVendorInvoices
  });

  useEffect(() => {
    fetchVendorInvoices();
  }, []);

  const handleView = async (invoice: VendorInvoice) => {
    setSelectedInvoice(invoice);
    setModalNotes(invoice.admin_notes || '');
    
    // Fetch payment history for this invoice
    try {
      const historyResponse = await adminApi.getAccountingVendorInvoiceDetails(invoice.id);
      if (historyResponse && historyResponse.data && historyResponse.data.payments) {
        setPaymentHistory(historyResponse.data.payments);
      } else {
        setPaymentHistory([]);
      }
    } catch (error) {
      console.error('Error fetching payment history:', error);
      setPaymentHistory([]);
    }
    
    setViewDialog(true);
  };

  const handleApprove = () => {
    setAction('approve');
    setNotes('');
    setApprovalDialog(true);
  };

  const handleReject = () => {
    setAction('reject');
    setNotes('');
    setApprovalDialog(true);
  };

  const handleApprovalSubmit = async () => {
    if (!selectedInvoice) return;

    try {
      setProcessing(true);
      await adminApi.approveVendorInvoice(selectedInvoice.id, action, notes);
      
      // Refresh the invoice list
      await fetchVendorInvoices();
      
      setApprovalDialog(false);
      setViewDialog(false);
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
      const response = await adminApi.downloadVendorInvoice(invoice.id);
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

  const handleSaveNotes = async () => {
    if (!selectedInvoice) return;

    try {
      setProcessing(true);
      // Update the invoice with new notes
      await adminApi.updateVendorInvoiceNotes(selectedInvoice.id, modalNotes);
      
      // Update the local invoice data
      setSelectedInvoice({
        ...selectedInvoice,
        admin_notes: modalNotes
      });
      
      // Refresh the invoice list
      await fetchVendorInvoices();
      
      logger.info('Notes saved successfully');
    } catch (err) {
      logger.error('Error saving notes:', err);
      setError('Failed to save notes');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending_submission':
        return 'default';
      case 'submitted_to_admin':
        return 'warning';
      case 'submitted_to_accounting':
        return 'info';
      case 'rejected_by_admin':
        return 'error';
      case 'rejected_by_accountant':
        return 'error';
      case 'paid':
        return 'success';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending_submission':
        return 'Pending Submission';
      case 'submitted_to_admin':
        return 'Submitted to Admin';
      case 'submitted_to_accounting':
        return 'Submitted to Accounting';
      case 'rejected_by_admin':
        return 'Rejected by Admin';
      case 'rejected_by_accountant':
        return 'Rejected by Accountant';
      case 'paid':
        return 'Paid';
      default:
        return status.replace('_', ' ').toUpperCase();
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

  const filteredInvoices = invoices.filter(invoice => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'pending') return invoice.status !== 'paid';
    return invoice.status === statusFilter;
  });

  const stats = {
    pending_submission: invoices.filter(i => i.status === 'pending_submission').length,
    submitted_to_admin: invoices.filter(i => i.status === 'submitted_to_admin').length,
    submitted_to_accounting: invoices.filter(i => i.status === 'submitted_to_accounting').length,
    rejected: invoices.filter(i => i.status === 'rejected_by_admin' || i.status === 'rejected_by_accountant').length,
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
                 <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
           <Chip
             label={isConnected ? '🟢 Live Updates' : '🔴 Offline'}
             color={isConnected ? 'success' : 'error'}
             size="small"
             variant="outlined"
           />
           <Button
             variant="outlined"
             startIcon={<RefreshIcon />}
             onClick={fetchVendorInvoices}
             disabled={loading}
           >
             Refresh
           </Button>
         </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Statistics Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Pending Submission
              </Typography>
              <Typography variant="h4" color="default">
                {stats.pending_submission}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Submitted to Admin
              </Typography>
              <Typography variant="h4" color="warning.main">
                {stats.submitted_to_admin}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Submitted to Accounting
              </Typography>
              <Typography variant="h4" color="info.main">
                {stats.submitted_to_accounting}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
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
        <Grid item xs={12} sm={6} md={2.4}>
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
            <MenuItem value="pending">Pending Invoices (Non-Paid)</MenuItem>
            <MenuItem value="all">All Invoices</MenuItem>
            <MenuItem value="pending_submission">Pending Submission</MenuItem>
            <MenuItem value="submitted_to_admin">Submitted to Admin</MenuItem>
            <MenuItem value="submitted_to_accounting">Submitted to Accounting</MenuItem>
            <MenuItem value="rejected_by_admin">Rejected by Admin</MenuItem>
            <MenuItem value="rejected_by_accountant">Rejected by Accountant</MenuItem>
            <MenuItem value="paid">Paid</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Invoices Table */}
      <TableContainer component={Paper} sx={{ overflowX: 'auto', maxHeight: '70vh' }}>
        <Table sx={{ minWidth: 1200 }}>
          <TableHead sx={{ position: 'sticky', top: 0, backgroundColor: 'background.paper', zIndex: 1 }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', minWidth: 100, backgroundColor: 'background.paper', position: 'sticky', left: 0, zIndex: 2 }}>Date</TableCell>
              <TableCell sx={{ fontWeight: 'bold', minWidth: 150, backgroundColor: 'background.paper', position: 'sticky', left: 100, zIndex: 2 }}>Billing Company</TableCell>
              <TableCell sx={{ fontWeight: 'bold', minWidth: 120, backgroundColor: 'background.paper', position: 'sticky', left: 250, zIndex: 2 }}>Invoice #</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', minWidth: 80, backgroundColor: 'background.paper' }}>Quantity</TableCell>
              <TableCell sx={{ fontWeight: 'bold', minWidth: 120, backgroundColor: 'background.paper' }}>Item</TableCell>
              <TableCell sx={{ fontWeight: 'bold', minWidth: 200, maxWidth: 300, backgroundColor: 'background.paper' }}>Description</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', minWidth: 100, backgroundColor: 'background.paper' }}>Rate</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', minWidth: 120, backgroundColor: 'background.paper' }}>Amount</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', minWidth: 120, backgroundColor: 'background.paper' }}>Subtotal</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', minWidth: 100, backgroundColor: 'background.paper' }}>HST</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', minWidth: 120, backgroundColor: 'background.paper' }}>Total</TableCell>
              <TableCell sx={{ fontWeight: 'bold', minWidth: 120, backgroundColor: 'background.paper' }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 'bold', minWidth: 100, backgroundColor: 'background.paper' }}>Due Date</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', minWidth: 120, backgroundColor: 'background.paper', position: 'sticky', right: 0, zIndex: 2 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredInvoices.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell sx={{ position: 'sticky', left: 0, backgroundColor: 'background.paper', zIndex: 1 }}>{new Date(invoice.created_at).toLocaleDateString()}</TableCell>
                <TableCell sx={{ position: 'sticky', left: 100, backgroundColor: 'background.paper', zIndex: 1 }}>{invoice.billing_company || invoice.company || invoice.vendor_name || '-'}</TableCell>
                <TableCell sx={{ position: 'sticky', left: 250, backgroundColor: 'background.paper', zIndex: 1 }}>{invoice.invoice_number}</TableCell>
                <TableCell align="right">{invoice.quantity || '-'}</TableCell>
                <TableCell>{invoice.item || '-'}</TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={invoice.description}>
                    {invoice.description}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  {invoice.rate && !isNaN(invoice.rate) && invoice.rate > 0 ? 
                    `$${Number(invoice.rate).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                </TableCell>
                <TableCell align="right">
                  {invoice.amount && !isNaN(invoice.amount) ? 
                    `$${parseFloat(invoice.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 
                    (invoice.total && !isNaN(invoice.total) ? 
                      `$${parseFloat(invoice.total).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-')}
                </TableCell>
                <TableCell align="right">
                  {invoice.subtotal && !isNaN(invoice.subtotal) && invoice.subtotal > 0 ? 
                    `$${Number(invoice.subtotal).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                </TableCell>
                <TableCell align="right">
                  {invoice.hst && !isNaN(invoice.hst) && invoice.hst > 0 ? 
                    `$${Number(invoice.hst).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                </TableCell>
                <TableCell align="right">
                  {invoice.total && !isNaN(invoice.total) && invoice.total > 0 ? 
                    `$${Number(invoice.total).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                </TableCell>
                <TableCell>
                  <Chip label={getStatusLabel(invoice.status)} color={getStatusColor(invoice.status) as any} size="small" />
                </TableCell>
                <TableCell>{invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '-'}</TableCell>
                <TableCell align="center" sx={{ position: 'sticky', right: 0, backgroundColor: 'background.paper', zIndex: 1 }}>
                  <Tooltip title="View Invoice Details">
                    <IconButton size="small" onClick={() => handleView(invoice)} color="primary">
                      <ViewIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Download PDF">
                    <IconButton size="small" onClick={() => handleDownload(invoice)} color="secondary">
                      <DownloadIcon />
                    </IconButton>
                  </Tooltip>
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

      {/* View Invoice Dialog */}
      <Dialog open={viewDialog} onClose={() => setViewDialog(false)} maxWidth="md" fullWidth sx={{ '& .MuiDialog-paper': { maxHeight: '90vh' } }}>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              Invoice Details - #{selectedInvoice?.invoice_number}
            </Typography>
            {selectedInvoice && (
              <Chip
                label={selectedInvoice.status.replace('_', ' ').toUpperCase()}
                color={getStatusColor(selectedInvoice.status) as any}
                size="small"
              />
            )}
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedInvoice && (
            <Box>
              {/* Invoice Header */}
              <Paper sx={{ p: 3, mb: 3, backgroundColor: '#f8f9fa' }}>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                      Vendor Information
                    </Typography>
                    <Box sx={{ pl: 2 }}>
                      <Typography variant="body1" fontWeight="bold" sx={{ mb: 1 }}>
                        {selectedInvoice.vendor_name}
                      </Typography>
                      <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                        📧 {selectedInvoice.vendor_email}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                      💰 Payment Summary
                    </Typography>
                    <Box sx={{ pl: 2 }}>
                      <Typography variant="h5" color="primary" fontWeight="bold" sx={{ mb: 1 }}>
                        ${selectedInvoice.total && typeof selectedInvoice.total === 'number' && selectedInvoice.total > 0 ? 
                          selectedInvoice.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 
                          (selectedInvoice.amount && typeof selectedInvoice.amount === 'number' && selectedInvoice.amount > 0 ? 
                            selectedInvoice.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00')}
                      </Typography>
                      {selectedInvoice.total_paid && (
                        <Typography variant="body2" color="success.main" sx={{ mb: 1 }}>
                          Paid: ${typeof selectedInvoice.total_paid === 'string' ? parseFloat(selectedInvoice.total_paid).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : selectedInvoice.total_paid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Typography>
                      )}
                      {selectedInvoice.balance_due && (
                        <Typography variant="body2" color="warning.main" fontWeight="bold">
                          Balance: ${typeof selectedInvoice.balance_due === 'string' ? parseFloat(selectedInvoice.balance_due).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : selectedInvoice.balance_due.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Typography>
                      )}
                      <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                        Invoice #{selectedInvoice.invoice_number}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>

              {/* Invoice Details */}
              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold', mb: 2 }}>
                  <InvoiceIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Invoice Details
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                      Description
                    </Typography>
                    <Typography variant="body1" sx={{ 
                      p: 2, 
                      backgroundColor: '#f5f5f5', 
                      borderRadius: 1,
                      border: '1px solid #e0e0e0'
                    }}>
                      {selectedInvoice.description}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                      📅 Submission Date
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {formatDate(selectedInvoice.created_at)}
                    </Typography>
                  </Grid>
                  
                  {selectedInvoice.due_date && (
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                        ⏰ Due Date
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {formatDate(selectedInvoice.due_date)}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </Paper>

              {/* Payment Details Section */}
              <Paper sx={{ p: 3, mb: 3, backgroundColor: '#f8f9fa' }}>
                <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                  💰 Payment Details
                </Typography>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} md={4}>
                    <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                      Total Invoice Amount
                    </Typography>
                    <Typography variant="h6" color="primary" fontWeight="bold">
                      {formatCurrency(parseFloat(selectedInvoice.total?.toString() || '0') || 0)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                      Amount Paid
                    </Typography>
                    <Typography variant="h6" color="success.main" fontWeight="bold">
                      {selectedInvoice.total_paid && parseFloat(selectedInvoice.total_paid.toString()) > 0 
                        ? formatCurrency(parseFloat(selectedInvoice.total_paid.toString()))
                        : formatCurrency(parseFloat(selectedInvoice.total?.toString() || '0'))
                      }
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                      Balance Due
                    </Typography>
                    <Typography variant="h6" color="warning.main" fontWeight="bold">
                      {formatCurrency(parseFloat(selectedInvoice.balance_due?.toString() || '0'))}
                    </Typography>
                  </Grid>
                </Grid>
                
                {selectedInvoice.status === 'paid' && (
                  <Box sx={{ mt: 3 }}>
                    <Alert severity="success">
                      <Typography variant="body2">
                        <strong>✅ Payment Complete:</strong> This invoice has been fully paid.
                      </Typography>
                    </Alert>
                  </Box>
                )}
              </Paper>

                             {/* Status & Processing Information */}
               <Paper sx={{ p: 3, mb: 3 }}>
                 <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold', mb: 2 }}>
                   Processing Information
                 </Typography>
                 <Grid container spacing={3}>
                   <Grid item xs={12} md={6}>
                     <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                       📊 Current Status
                     </Typography>
                     <Chip
                       label={selectedInvoice.status.replace('_', ' ').toUpperCase()}
                       color={getStatusColor(selectedInvoice.status) as any}
                       size="medium"
                       sx={{ fontWeight: 'bold' }}
                     />
                     <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 1 }}>
                       Raw status: {selectedInvoice.status}
                     </Typography>
                   </Grid>
                  
                  {selectedInvoice.approved_by && (
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                        ✅ Approved By
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {selectedInvoice.approved_by}
                      </Typography>
                    </Grid>
                  )}
                  
                  {selectedInvoice.rejected_by && (
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                        ❌ Rejected By
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {selectedInvoice.rejected_by}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </Paper>

                             {/* Admin Notes Section */}
               <Paper sx={{ p: 3, mb: 3, backgroundColor: '#fff3e0' }}>
                 <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                   <Typography variant="h6" sx={{ color: 'warning.main', fontWeight: 'bold' }}>
                     📝 Admin Notes
                   </Typography>
                   <Button
                     variant="contained"
                     size="small"
                     onClick={handleSaveNotes}
                     disabled={processing}
                     sx={{ backgroundColor: '#ff9800', '&:hover': { backgroundColor: '#f57c00' } }}
                   >
                     {processing ? 'Saving...' : 'Save Notes'}
                   </Button>
                 </Box>
                 <TextField
                   fullWidth
                   multiline
                   rows={4}
                   value={modalNotes}
                   onChange={(e) => setModalNotes(e.target.value)}
                   placeholder="Enter admin notes here..."
                   variant="outlined"
                   sx={{ 
                     backgroundColor: '#fff8e1',
                     '& .MuiOutlinedInput-root': {
                       '& fieldset': {
                         borderColor: '#ffcc02',
                       },
                     }
                   }}
                 />
               </Paper>

               {/* Payment History Section */}
               <Paper sx={{ p: 3, mb: 3, backgroundColor: '#f8f9fa' }}>
                 <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                   📋 Payment History
                 </Typography>
                 
                 {paymentHistory.length === 0 ? (
                   <Alert severity="info">
                     <Typography variant="body2">
                       No payments have been processed for this invoice yet.
                     </Typography>
                   </Alert>
                 ) : (
                   <Box sx={{ mt: 3 }}>
                     <TableContainer component={Paper} sx={{ mt: 2 }}>
                       <Table size="small">
                         <TableHead>
                           <TableRow>
                             <TableCell>Date</TableCell>
                             <TableCell>Amount</TableCell>
                             <TableCell>Method</TableCell>
                             <TableCell>Reference</TableCell>
                             <TableCell>Processed By</TableCell>
                             <TableCell>Status</TableCell>
                           </TableRow>
                         </TableHead>
                         <TableBody>
                           {paymentHistory.map((payment) => (
                             <TableRow key={payment.id}>
                               <TableCell>{new Date(payment.payment_date).toLocaleDateString()}</TableCell>
                               <TableCell>${payment.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                               <TableCell>
                                 <Chip 
                                   label={payment.payment_method.replace('_', ' ').toUpperCase()} 
                                   size="small" 
                                   color="primary" 
                                   variant="outlined"
                                 />
                               </TableCell>
                               <TableCell>{payment.reference_number || '-'}</TableCell>
                               <TableCell>{payment.processed_by_name || 'Unknown'}</TableCell>
                               <TableCell>
                                 <Chip 
                                   label={payment.status.toUpperCase()} 
                                   size="small" 
                                   color={payment.status === 'processed' ? 'success' : 'warning'} 
                                 />
                               </TableCell>
                             </TableRow>
                           ))}
                         </TableBody>
                       </Table>
                     </TableContainer>
                   </Box>
                 )}
               </Paper>

               {/* Action Buttons */}
               <Paper sx={{ p: 3, backgroundColor: '#f8f9fa', border: '2px solid #e0e0e0' }}>
                 <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold', mb: 2 }}>
                   🎯 Available Actions
                 </Typography>
                 <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', minHeight: 60 }}>
                   {selectedInvoice.pdf_filename && (
                     <Button
                       variant="outlined"
                       startIcon={<DownloadIcon />}
                       onClick={() => handleDownload(selectedInvoice)}
                       sx={{ minWidth: 150 }}
                     >
                       📄 Download PDF
                     </Button>
                   )}
                   
                   {selectedInvoice.status === 'submitted_to_admin' && (
                     <>
                       <Button
                         variant="contained"
                         color="success"
                         startIcon={<ApproveIcon />}
                         onClick={handleApprove}
                         sx={{ minWidth: 150, height: 48 }}
                       >
                         ✅ Submit to Accounting
                       </Button>
                       <Button
                         variant="contained"
                         color="error"
                         startIcon={<RejectIcon />}
                         onClick={handleReject}
                         sx={{ minWidth: 150, height: 48 }}
                       >
                         ❌ Reject Invoice
                       </Button>
                     </>
                   )}
                   
                   {selectedInvoice.status !== 'submitted_to_admin' && (
                     <Typography variant="body2" color="textSecondary" sx={{ fontStyle: 'italic', alignSelf: 'center' }}>
                       This invoice has already been processed and cannot be modified.
                     </Typography>
                   )}
                 </Box>
               </Paper>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialog(false)} variant="outlined">
            Close
          </Button>
        </DialogActions>
      </Dialog>

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