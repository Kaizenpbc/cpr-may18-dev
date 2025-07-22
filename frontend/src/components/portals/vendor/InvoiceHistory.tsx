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
} from '@mui/material';
import {
  Visibility as ViewIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { vendorApi } from '../../../services/api';

interface Invoice {
  id: number;
  invoice_number: string;
  item?: string;
  company?: string;
  quantity?: number;
  description: string;
  rate?: number;
  amount: number; // Ensure this is always a number
  subtotal?: number;
  hst?: number;
  total?: number;
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
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const response = await vendorApi.getInvoices();
      console.log('🔍 [INVOICE HISTORY] Raw invoice data:', response);
      
      // Handle different response structures
      let invoiceData = response;
      if (response && response.data) {
        invoiceData = response.data;
      }
      
      if (!invoiceData || !Array.isArray(invoiceData)) {
        console.error('🔍 [INVOICE HISTORY] Invalid invoice data structure:', response);
        setError('Invalid data format received from server');
        return;
      }
      
      // Ensure amount is properly converted to number
      const processedInvoices = invoiceData.map((invoice: any) => ({
        ...invoice,
        amount: typeof invoice.amount === 'string' ? parseFloat(invoice.amount) : invoice.amount || 0
      }));
      
      console.log('🔍 [INVOICE HISTORY] Processed invoice data:', processedInvoices);
      setInvoices(processedInvoices);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      setError('Failed to load invoices');
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
      case 'sent_to_accounting':
        return 'primary';
      case 'partially_paid':
        return 'warning';
      case 'paid':
        return 'success';
      case 'rejected':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'submitted':
        return 'Submitted';
      case 'pending_review':
        return 'Pending Review';
      case 'approved':
        return 'Approved';
      case 'sent_to_accounting':
        return 'Sent to Accounting';
      case 'partially_paid':
        return 'Partially Paid';
      case 'paid':
        return 'Paid';
      case 'rejected':
        return 'Rejected';
      default:
        return status.replace('_', ' ').toUpperCase();
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

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Filter invoices based on tab
  const getFilteredInvoices = () => {
    const searchLower = search.toLowerCase();
    const baseFiltered = invoices.filter(invoice => {
      const matchesSearch = 
        invoice.invoice_number.toLowerCase().includes(searchLower) ||
        (invoice.item && invoice.item.toLowerCase().includes(searchLower)) ||
        (invoice.company && invoice.company.toLowerCase().includes(searchLower)) ||
        invoice.description.toLowerCase().includes(searchLower);
      const matchesStatus = !statusFilter || invoice.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    switch (tabValue) {
      case 0: // Bills Payable (submitted and sent to accounting)
        return baseFiltered.filter(invoice => 
          ['submitted', 'sent_to_accounting'].includes(invoice.status)
        );
      case 1: // Invoice History (approved and sent to accounting)
        return baseFiltered.filter(invoice => 
          ['approved', 'sent_to_accounting', 'partially_paid'].includes(invoice.status)
        );
      case 2: // Invoices Paid (fully paid)
        return baseFiltered.filter(invoice => 
          invoice.status === 'paid'
        );
      case 3: // All Invoices
        return baseFiltered;
      default:
        return baseFiltered;
    }
  };

  const filteredInvoices = getFilteredInvoices();

  const renderInvoiceTable = () => (
    <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
      <Table sx={{ minWidth: 1200 }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Company</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Invoice #</TableCell>
            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Quantity</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Item</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Description</TableCell>
            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Rate</TableCell>
            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Amount</TableCell>
            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Subtotal</TableCell>
            <TableCell align="right" sx={{ fontWeight: 'bold' }}>HST</TableCell>
            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Total</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Due Date</TableCell>
            <TableCell align="center" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredInvoices.map((invoice) => (
            <TableRow key={invoice.id}>
              <TableCell>{new Date(invoice.created_at).toLocaleDateString()}</TableCell>
              <TableCell>{invoice.company || '-'}</TableCell>
              <TableCell>{invoice.invoice_number}</TableCell>
              <TableCell align="right">{invoice.quantity || '-'}</TableCell>
              <TableCell>{invoice.item || '-'}</TableCell>
              <TableCell>{invoice.description}</TableCell>
              <TableCell align="right">
                {invoice.rate ? `$${invoice.rate.toFixed(2)}` : '-'}
              </TableCell>
              <TableCell align="right">
                ${invoice.amount.toFixed(2)}
              </TableCell>
              <TableCell align="right">
                {invoice.subtotal ? `$${invoice.subtotal.toFixed(2)}` : '-'}
              </TableCell>
              <TableCell align="right">
                {invoice.hst ? `$${invoice.hst.toFixed(2)}` : '-'}
              </TableCell>
              <TableCell align="right">
                {invoice.total ? `$${invoice.total.toFixed(2)}` : '-'}
              </TableCell>
              <TableCell>
                <Chip
                  label={getStatusLabel(invoice.status)}
                  color={getStatusColor(invoice.status) as any}
                  size="small"
                />
              </TableCell>
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
  );

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
        Invoice Management
      </Typography>
      
      {/* Invoice Workflow Diagram */}
      <Paper sx={{ p: 3, mb: 3, backgroundColor: '#f8f9fa' }}>
        <Typography variant="h6" gutterBottom>
          📋 Invoice Workflow
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ 
              width: 40, 
              height: 40, 
              borderRadius: '50%', 
              backgroundColor: '#ff9800', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold'
            }}>
              1
            </Box>
            <Typography variant="body2">
              <strong>You Upload</strong><br/>
              Submit invoice PDF
            </Typography>
          </Box>
          
          <Box sx={{ color: '#666' }}>→</Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ 
              width: 40, 
              height: 40, 
              borderRadius: '50%', 
              backgroundColor: '#2196f3', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold'
            }}>
              2
            </Box>
            <Typography variant="body2">
              <strong>Admin Reviews</strong><br/>
              Approves or rejects
            </Typography>
          </Box>
          
          <Box sx={{ color: '#666' }}>→</Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ 
              width: 40, 
              height: 40, 
              borderRadius: '50%', 
              backgroundColor: '#4caf50', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold'
            }}>
              3
            </Box>
            <Typography variant="body2">
              <strong>Sent to Accounting</strong><br/>
              Ready for payment
            </Typography>
          </Box>
          
          <Box sx={{ color: '#666' }}>→</Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ 
              width: 40, 
              height: 40, 
              borderRadius: '50%', 
              backgroundColor: '#9c27b0', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold'
            }}>
              4
            </Box>
            <Typography variant="body2">
              <strong>Payment Processed</strong><br/>
              Full or partial payment
            </Typography>
          </Box>
        </Box>
      </Paper>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <CircularProgress />
        </Box>
      )}
      
      {/* Summary Statistics */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6" color="warning.main">
              Pending Review ({invoices.filter(i => i.status === 'submitted').length})
            </Typography>
            <Typography variant="h4" color="warning.main">
              ${invoices.filter(i => i.status === 'submitted').reduce((sum, i) => sum + i.amount, 0).toFixed(2)}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6" color="info.main">
              Approved ({invoices.filter(i => i.status === 'approved').length})
            </Typography>
            <Typography variant="h4" color="info.main">
              ${invoices.filter(i => i.status === 'approved').reduce((sum, i) => sum + i.amount, 0).toFixed(2)}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6" color="success.main">
              Paid ({invoices.filter(i => i.status === 'paid').length})
            </Typography>
            <Typography variant="h4" color="success.main">
              ${invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.amount, 0).toFixed(2)}
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
                <Typography variant="body2">📋 Pending Review</Typography>
                <Typography variant="caption" color="text.secondary">
                  ({invoices.filter(i => i.status === 'submitted').length} invoices)
                </Typography>
              </Box>
            } 
          />
          <Tab 
            label={
              <Box>
                <Typography variant="body2">✅ Approved</Typography>
                <Typography variant="caption" color="text.secondary">
                  ({invoices.filter(i => i.status === 'approved').length} invoices)
                </Typography>
              </Box>
            } 
          />
          <Tab 
            label={
              <Box>
                <Typography variant="body2">💰 Paid</Typography>
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
              <strong>Pending Review:</strong> These invoices have been submitted and are waiting for admin approval. 
              You'll be notified when they are approved or rejected.
            </Typography>
          </Alert>
        </Box>
        {renderInvoiceTable()}
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Box sx={{ mb: 2 }}>
          <Alert severity="success">
            <Typography variant="body2">
              <strong>Approved:</strong> These invoices have been approved by admin and are ready for payment processing. 
              Payment will be processed by administrators and the status will change to "Paid" when complete.
            </Typography>
          </Alert>
        </Box>
        {renderInvoiceTable()}
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <Box sx={{ mb: 2 }}>
          <Alert severity="success">
            <Typography variant="body2">
              <strong>Paid:</strong> These invoices have been fully paid by administrators. 
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
              <strong>All Invoices:</strong> Complete view of all your invoices across all statuses. 
              Use this to get an overview of your entire invoice history.
            </Typography>
          </Alert>
        </Box>
        {renderInvoiceTable()}
      </TabPanel>
    </Box>
  );
};

export default InvoiceHistory; 