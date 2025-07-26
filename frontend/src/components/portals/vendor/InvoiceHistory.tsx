import React, { useState, useEffect, useCallback } from 'react';
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
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Alert,
  CircularProgress,
  Chip,
  IconButton,
  Tabs,
  Tab,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
} from '@mui/material';
import {
  Visibility as ViewIcon,
  Download as DownloadIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { vendorApi } from '../../../services/api';

interface Invoice {
  id: number;
  invoice_number: string;
  item?: string;
  company?: string;
  billing_company?: string;
  quantity?: number | null;
  description: string;
  rate: number; // Always a number (defaults to 0)
  amount: number; // Always a number (defaults to 0)
  subtotal: number; // Always a number (defaults to 0)
  hst: number; // Always a number (defaults to 0)
  total: number; // Always a number (defaults to 0)
  status: string;
  created_at: string;
  due_date?: string;
  payment_date?: string;
  pdf_filename?: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`invoice-tabpanel-${index}`}
      aria-labelledby={`invoice-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const InvoiceHistory: React.FC = () => {
  console.log('🔍 [INVOICE HISTORY] Component function called');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [tabValue, setTabValue] = useState(3); // Default to "All Invoices" tab (index 3)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [notes, setNotes] = useState('');

  console.log('🔍 [STATE DEBUG] Component initialized with tabValue:', tabValue);

  useEffect(() => {
    console.log('🔍 [STATE DEBUG] Component mounted, tabValue:', tabValue);
    // Ensure we start on "All Invoices" tab
    if (tabValue !== 3) {
      console.log('🔍 [STATE DEBUG] Forcing tabValue to 3 (All Invoices)');
      setTabValue(3);
    }
    fetchInvoices();
  }, []);

  useEffect(() => {
    console.log('🔍 [STATE DEBUG] tabValue changed to:', tabValue);
  }, [tabValue]);

  const fetchInvoices = async () => {
    try {
      console.log('🔍 [FETCH DEBUG] Starting fetchInvoices');
      setLoading(true);
      setError('');
      
      const response = await vendorApi.getInvoices();
      console.log('🔍 [FETCH DEBUG] API response:', response);
      
      if (response && Array.isArray(response)) {
        console.log('🔍 [FETCH DEBUG] Response is array, length:', response.length);
        console.log('🔍 [FETCH DEBUG] Raw invoice data:', response);
        
        const processedInvoices = response.map(invoice => ({
          ...invoice,
          rate: typeof invoice.rate === 'string' ? parseFloat(invoice.rate) : invoice.rate || 0,
          amount: typeof invoice.amount === 'string' ? parseFloat(invoice.amount) : invoice.amount || 0,
          subtotal: typeof invoice.subtotal === 'string' ? parseFloat(invoice.subtotal) : invoice.subtotal || 0,
          hst: typeof invoice.hst === 'string' ? parseFloat(invoice.hst) : invoice.hst || 0,
          total: typeof invoice.total === 'string' ? parseFloat(invoice.total) : invoice.total || 0,
          quantity: typeof invoice.quantity === 'string' ? parseInt(invoice.quantity) : invoice.quantity || null
        }));
        
        console.log('🔍 [FETCH DEBUG] Processed invoices:', processedInvoices);
        console.log('🔍 [FETCH DEBUG] Invoice statuses:', processedInvoices.map(inv => ({ id: inv.id, number: inv.invoice_number, status: inv.status })));
        
        setInvoices(processedInvoices);
      } else if (response && response.data && Array.isArray(response.data)) {
        console.log('🔍 [FETCH DEBUG] Response has data property, length:', response.data.length);
        console.log('🔍 [FETCH DEBUG] Raw invoice data:', response.data);
        
        const processedInvoices = response.data.map(invoice => ({
          ...invoice,
          rate: typeof invoice.rate === 'string' ? parseFloat(invoice.rate) : invoice.rate || 0,
          amount: typeof invoice.amount === 'string' ? parseFloat(invoice.amount) : invoice.amount || 0,
          subtotal: typeof invoice.subtotal === 'string' ? parseFloat(invoice.subtotal) : invoice.subtotal || 0,
          hst: typeof invoice.hst === 'string' ? parseFloat(invoice.hst) : invoice.hst || 0,
          total: typeof invoice.total === 'string' ? parseFloat(invoice.total) : invoice.total || 0,
          quantity: typeof invoice.quantity === 'string' ? parseInt(invoice.quantity) : invoice.quantity || null
        }));
        
        console.log('🔍 [FETCH DEBUG] Processed invoices:', processedInvoices);
        console.log('🔍 [FETCH DEBUG] Invoice statuses:', processedInvoices.map(inv => ({ id: inv.id, number: inv.invoice_number, status: inv.status })));
        
        setInvoices(processedInvoices);
      } else {
        console.log('🔍 [FETCH DEBUG] Unexpected response format:', response);
        setInvoices([]);
      }
    } catch (error) {
      console.error('❌ [FETCH DEBUG] Error fetching invoices:', error);
      setError('Failed to fetch invoices');
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  console.log('🔍 [INVOICE HISTORY] About to render - loading:', loading, 'invoices count:', invoices.length);
  
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  // Helper functions
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

  const handleDownload = async (invoiceId: number, invoiceNumber: string) => {
    try {
      console.log('📥 [INVOICE HISTORY] Downloading invoice:', invoiceId);
      const blob = await vendorApi.downloadInvoice(invoiceId);
      
      if (blob.size === 0) {
        throw new Error('Invoice file is empty');
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${invoiceNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading invoice:', error);
      alert('Failed to download invoice');
    }
  };

  const handleView = async (invoiceId: number) => {
    try {
      const response = await vendorApi.getInvoice(invoiceId);
      setSelectedInvoice(response.data || response);
      setViewDialogOpen(true);
    } catch (error) {
      console.error('Error fetching invoice details:', error);
      alert('Failed to load invoice details');
    }
  };

  const handleCloseViewDialog = () => {
    setViewDialogOpen(false);
    setSelectedInvoice(null);
  };

  const handleSubmitToAdmin = async (invoiceId: number) => {
    try {
      await vendorApi.submitToAdmin(invoiceId);
      alert('Invoice submitted to admin successfully');
      fetchInvoices(); // Refresh the list
    } catch (error) {
      console.error('Error submitting to admin:', error);
      alert('Failed to submit invoice to admin');
    }
  };

  const handleResendToAdmin = async (invoiceId: number, notes: string) => {
    try {
      await vendorApi.resendToAdmin(invoiceId, notes);
      alert('Invoice resent to admin successfully');
      fetchInvoices(); // Refresh the list
    } catch (error) {
      console.error('Error resending to admin:', error);
      alert('Failed to resend invoice to admin');
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Filter invoices based on tab and search
  const getFilteredInvoices = () => {
    console.log('🔍 [FILTER DEBUG] Starting getFilteredInvoices');
    console.log('🔍 [FILTER DEBUG] Total invoices:', invoices.length);
    console.log('🔍 [FILTER DEBUG] Current tabValue:', tabValue);
    console.log('🔍 [FILTER DEBUG] Current search:', search);
    console.log('🔍 [FILTER DEBUG] Current statusFilter:', statusFilter);
    
    let filtered = invoices;

    // Apply search filter
    if (search) {
      console.log('🔍 [FILTER DEBUG] Applying search filter for:', search);
      filtered = filtered.filter(invoice => 
        invoice.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
        (invoice.description && invoice.description.toLowerCase().includes(search.toLowerCase())) ||
        (invoice.billing_company && invoice.billing_company.toLowerCase().includes(search.toLowerCase())) ||
        (invoice.company && invoice.company.toLowerCase().includes(search.toLowerCase()))
      );
      console.log('🔍 [FILTER DEBUG] After search filter:', filtered.length, 'invoices');
    }

    // Apply status filter
    if (statusFilter) {
      console.log('🔍 [FILTER DEBUG] Applying status filter for:', statusFilter);
      filtered = filtered.filter(invoice => invoice.status === statusFilter);
      console.log('🔍 [FILTER DEBUG] After status filter:', filtered.length, 'invoices');
    }

    // Apply tab filter
    console.log('🔍 [FILTER DEBUG] Applying tab filter for tab:', tabValue);
    switch (tabValue) {
      case 0: // Pending Submission
        filtered = filtered.filter(invoice => invoice.status === 'pending_submission');
        console.log('🔍 [FILTER DEBUG] Tab 0 (Pending Submission) - filtered to:', filtered.length, 'invoices');
        break;
      case 1: // Submitted to Admin
        filtered = filtered.filter(invoice => invoice.status === 'submitted_to_admin');
        console.log('🔍 [FILTER DEBUG] Tab 1 (Submitted to Admin) - filtered to:', filtered.length, 'invoices');
        break;
      case 2: // Paid
        filtered = filtered.filter(invoice => invoice.status === 'paid');
        console.log('🔍 [FILTER DEBUG] Tab 2 (Paid) - filtered to:', filtered.length, 'invoices');
        break;
      case 3: // All Invoices
        console.log('🔍 [FILTER DEBUG] Tab 3 (All Invoices) - no additional filtering');
        break;
    }

    console.log('🔍 [FILTER DEBUG] Final filtered invoices:', filtered.map(inv => ({ id: inv.id, number: inv.invoice_number, status: inv.status })));
    return filtered;
  };

  const filteredInvoices = getFilteredInvoices();

  const renderInvoiceTable = () => {
    return (
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
                <TableCell sx={{ position: 'sticky', left: 100, backgroundColor: 'background.paper', zIndex: 1 }}>{invoice.billing_company || invoice.company || '-'}</TableCell>
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
                    <IconButton size="small" onClick={() => handleView(invoice.id)} color="primary">
                      <ViewIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Download PDF">
                    <IconButton size="small" onClick={() => handleDownload(invoice.id, invoice.invoice_number)} color="secondary">
                      <DownloadIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h4" gutterBottom>
        Invoice Management
      </Typography>
      
      {/* Invoice Workflow Diagram */}
      <Paper sx={{ p: 3, mb: 3, backgroundColor: '#f8f9fa' }}>
        <Typography variant="h6" gutterBottom>
          📋 Invoice Workflow
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: '#9e9e9e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
              1
            </Box>
            <Typography variant="body2">
              <strong>You Upload</strong><br/>
              Status: Pending Submission
            </Typography>
          </Box>
          <Box sx={{ color: '#666' }}>→</Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: '#ff9800', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
              2
            </Box>
            <Typography variant="body2">
              <strong>You Submit</strong><br/>
              Status: Submitted to Admin
            </Typography>
          </Box>
          <Box sx={{ color: '#666' }}>→</Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: '#2196f3', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
              3
            </Box>
            <Typography variant="body2">
              <strong>Admin Reviews</strong><br/>
              Status: Submitted to Accounting
            </Typography>
          </Box>
          <Box sx={{ color: '#666' }}>→</Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: '#4caf50', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
              4
            </Box>
            <Typography variant="body2">
              <strong>Accounting Pays</strong><br/>
              Status: Paid
            </Typography>
          </Box>
        </Box>
      </Paper>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {/* Summary Statistics */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={2}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">
              Pending Submission ({invoices.filter(i => i.status === 'pending_submission').length})
            </Typography>
            <Typography variant="h4" color="text.secondary">
              ${invoices.filter(i => i.status === 'pending_submission').reduce((sum, i) => {
                const amount = (i.total && !isNaN(i.total) && i.total > 0) ? i.total : 0;
                return sum + amount;
              }, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={2}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6" color="warning.main">
              Submitted to Admin ({invoices.filter(i => i.status === 'submitted_to_admin').length})
            </Typography>
            <Typography variant="h4" color="warning.main">
              ${invoices.filter(i => i.status === 'submitted_to_admin').reduce((sum, i) => {
                const amount = (i.total && !isNaN(i.total) && i.total > 0) ? i.total : 0;
                return sum + amount;
              }, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={2}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6" color="info.main">
              Submitted to Accounting ({invoices.filter(i => i.status === 'submitted_to_accounting').length})
            </Typography>
            <Typography variant="h4" color="info.main">
              ${invoices.filter(i => i.status === 'submitted_to_accounting').reduce((sum, i) => {
                const amount = (i.total && !isNaN(i.total) && i.total > 0) ? i.total : 0;
                return sum + amount;
              }, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={2}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6" color="error.main">
              Rejected ({invoices.filter(i => i.status === 'rejected_by_admin' || i.status === 'rejected_by_accountant').length})
            </Typography>
            <Typography variant="h4" color="error.main">
              ${invoices.filter(i => i.status === 'rejected_by_admin' || i.status === 'rejected_by_accountant').reduce((sum, i) => {
                const amount = (i.total && !isNaN(i.total) && i.total > 0) ? i.total : 0;
                return sum + amount;
              }, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={2}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6" color="success.main">
              Paid ({invoices.filter(i => i.status === 'paid').length})
            </Typography>
            <Typography variant="h4" color="success.main">
              ${invoices.filter(i => i.status === 'paid').reduce((sum, i) => {
                const amount = (i.total && !isNaN(i.total) && i.total > 0) ? i.total : 0;
                return sum + amount;
              }, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={2}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6" color="primary.main">
              Total ({invoices.length})
            </Typography>
            <Typography variant="h4" color="primary.main">
              ${invoices.reduce((sum, i) => {
                const amount = (i.total && !isNaN(i.total) && i.total > 0) ? i.total : 0;
                return sum + amount;
              }, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Search and Filter */}
      <Box sx={{ mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Search invoices..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by invoice #, company, item, or description"
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
                <MenuItem value="pending_submission">Pending Submission</MenuItem>
                <MenuItem value="submitted_to_admin">Submitted to Admin</MenuItem>
                <MenuItem value="submitted_to_accounting">Submitted to Accounting</MenuItem>
                <MenuItem value="rejected_by_admin">Rejected by Admin</MenuItem>
                <MenuItem value="rejected_by_accountant">Rejected by Accountant</MenuItem>
                <MenuItem value="paid">Paid</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <Button
              variant="outlined"
              onClick={() => {
                setSearch('');
                setStatusFilter('');
              }}
              fullWidth
            >
              Clear Filters
            </Button>
          </Grid>
        </Grid>
      </Box>

      {/* Invoice Workflow Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="invoice workflow tabs">
          <Tab 
            label={
              <Box>
                <Typography variant="body2">📝 Pending Submission</Typography>
                <Typography variant="caption" color="text.secondary">
                  ({invoices.filter(i => i.status === 'pending_submission').length} invoices)
                </Typography>
              </Box>
            } 
          />
          <Tab 
            label={
              <Box>
                <Typography variant="body2">📋 Submitted to Admin</Typography>
                <Typography variant="caption" color="text.secondary">
                  ({invoices.filter(i => i.status === 'submitted_to_admin').length} invoices)
                </Typography>
              </Box>
            } 
          />
          <Tab 
            label={
              <Box>
                <Typography variant="body2">✅ Paid</Typography>
                <Typography variant="caption" color="text.secondary">
                  ({invoices.filter(i => i.status === 'paid').length} invoices)
                </Typography>
              </Box>
            } 
          />
          <Tab 
            label={
              <Box>
                <Typography variant="body2">📊 All Invoices</Typography>
                <Typography variant="caption" color="text.secondary">
                  ({invoices.length} total)
                </Typography>
              </Box>
            } 
          />
        </Tabs>
      </Box>

      {/* Tab Panels */}
      <TabPanel value={tabValue} index={0}>
        <Box sx={{ mb: 2 }}>
          <Alert severity="info">
            <Typography variant="body2">
              <strong>Pending Submission:</strong> These invoices have been uploaded but not yet submitted to admin. 
              Review them and click "Submit to Admin" when ready to send for approval.
            </Typography>
          </Alert>
        </Box>
        {renderInvoiceTable()}
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Box sx={{ mb: 2 }}>
          <Alert severity="warning">
            <Typography variant="body2">
              <strong>Submitted:</strong> These invoices have been submitted to admin for review. 
              They are currently being processed by admin and accounting.
            </Typography>
          </Alert>
        </Box>
        {renderInvoiceTable()}
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <Box sx={{ mb: 2 }}>
          <Alert severity="success">
            <Typography variant="body2">
              <strong>Paid:</strong> These invoices have been fully paid by accounting. 
              The payment process is complete.
            </Typography>
          </Alert>
        </Box>
        {renderInvoiceTable()}
      </TabPanel>

      <TabPanel value={tabValue} index={3}>
        <Box sx={{ mb: 2 }}>
          <Alert severity="info">
            <Typography variant="body2">
              <strong>All Invoices:</strong> Complete view of all invoices across all statuses. 
              Use this to get an overview of your entire invoice history.
            </Typography>
          </Alert>
        </Box>
        {renderInvoiceTable()}
      </TabPanel>

      {/* Invoice Detail Dialog */}
      <Dialog open={viewDialogOpen} onClose={handleCloseViewDialog} maxWidth="md" fullWidth>
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
          {selectedInvoice ? (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="textSecondary">Invoice Number</Typography>
                <Typography variant="body1" gutterBottom>{selectedInvoice.invoice_number || 'N/A'}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="textSecondary">Status</Typography>
                <Chip label={getStatusLabel(selectedInvoice.status)} color={getStatusColor(selectedInvoice.status) as any} size="small" />
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="textSecondary">Created Date</Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedInvoice.created_at ? new Date(selectedInvoice.created_at).toLocaleDateString() : 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="textSecondary">Due Date</Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedInvoice.due_date ? new Date(selectedInvoice.due_date).toLocaleDateString() : 'Not set'}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="textSecondary">Description</Typography>
                <Typography variant="body1" gutterBottom>{selectedInvoice.description || 'N/A'}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="textSecondary">Item</Typography>
                <Typography variant="body1" gutterBottom>{selectedInvoice.item || 'N/A'}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="textSecondary">Quantity</Typography>
                <Typography variant="body1" gutterBottom>{selectedInvoice.quantity || 'N/A'}</Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" color="textSecondary">Rate</Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedInvoice.rate && typeof selectedInvoice.rate === 'number' && selectedInvoice.rate > 0 ? 
                    `$${selectedInvoice.rate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" color="textSecondary">Subtotal</Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedInvoice.subtotal && typeof selectedInvoice.subtotal === 'number' && selectedInvoice.subtotal > 0 ? 
                    `$${selectedInvoice.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" color="textSecondary">HST</Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedInvoice.hst && typeof selectedInvoice.hst === 'number' && selectedInvoice.hst > 0 ? 
                    `$${selectedInvoice.hst.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="textSecondary">Total Amount</Typography>
                <Typography variant="h6" gutterBottom>
                  {selectedInvoice.total && typeof selectedInvoice.total === 'number' && selectedInvoice.total > 0 ? 
                    `$${selectedInvoice.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="textSecondary">Billing Company</Typography>
                <Typography variant="body1" gutterBottom>{selectedInvoice.billing_company || selectedInvoice.company || 'N/A'}</Typography>
              </Grid>
            </Grid>
          ) : (
            <Typography variant="body1" color="error">
              No invoice data available. Please try again.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseViewDialog}>Close</Button>
          {selectedInvoice && (
            <>
              <Button
                onClick={() => handleDownload(selectedInvoice.id, selectedInvoice.invoice_number)}
                startIcon={<DownloadIcon />}
                variant="outlined"
                color="primary"
              >
                Download PDF
              </Button>
              
              {/* Submit to Admin button - show for pending_submission status */}
              {selectedInvoice.status === 'pending_submission' && (
                <Button
                  onClick={() => handleSubmitToAdmin(selectedInvoice.id)}
                  variant="contained"
                  color="primary"
                >
                  Submit to Admin
                </Button>
              )}
            </>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default InvoiceHistory;