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
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

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
      
             // Ensure all numeric fields are properly converted to numbers
       const processedInvoices = invoiceData.map((invoice: any) => ({
         ...invoice,
         amount: typeof invoice.amount === 'string' ? parseFloat(invoice.amount) : invoice.amount || 0,
         rate: typeof invoice.rate === 'string' ? parseFloat(invoice.rate) : invoice.rate || 0,
         subtotal: typeof invoice.subtotal === 'string' ? parseFloat(invoice.subtotal) : invoice.subtotal || 0,
         hst: typeof invoice.hst === 'string' ? parseFloat(invoice.hst) : invoice.hst || 0,
         total: typeof invoice.total === 'string' ? parseFloat(invoice.total) : invoice.total || 0,
         quantity: typeof invoice.quantity === 'string' ? parseInt(invoice.quantity) : invoice.quantity || null
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
      
      // Use the vendorApi method which handles authentication automatically
      const blob = await vendorApi.downloadInvoice(invoiceId);
      
      console.log('📥 [INVOICE HISTORY] Blob received, size:', blob.size, 'bytes, type:', blob.type);

      // Verify the blob size
      if (blob.size === 0) {
        throw new Error('PDF file is empty');
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
      
      console.log('✅ [INVOICE HISTORY] Download completed successfully');
    } catch (err: any) {
      console.error('❌ [INVOICE HISTORY] Download error:', err);
      console.error('❌ [INVOICE HISTORY] Error details:', {
        message: err.message,
        stack: err.stack,
        name: err.name
      });
      alert(`Failed to download invoice: ${err.message}`);
    }
  };

  const handleView = async (invoiceId: number) => {
    try {
      console.log('👁️ [INVOICE HISTORY] Viewing invoice:', invoiceId);
      const response = await vendorApi.getInvoice(invoiceId);
      setSelectedInvoice(response.data);
      setViewDialogOpen(true);
      console.log('✅ [INVOICE HISTORY] Invoice details loaded');
    } catch (err: any) {
      console.error('❌ [INVOICE HISTORY] View error:', err);
      alert('Failed to load invoice details. Please try again.');
    }
  };

  const handleCloseViewDialog = () => {
    setViewDialogOpen(false);
    setSelectedInvoice(null);
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
            <TableCell sx={{ fontWeight: 'bold' }}>Billing Company</TableCell>
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
              <TableCell>{invoice.billing_company || invoice.company || '-'}</TableCell>
              <TableCell>{invoice.invoice_number}</TableCell>
              <TableCell align="right">{invoice.quantity || '-'}</TableCell>
              <TableCell>{invoice.item || '-'}</TableCell>
              <TableCell>{invoice.description}</TableCell>
              <TableCell align="right">
                {invoice.rate !== undefined && invoice.rate !== null ? 
                  (invoice.rate > 0 ? `$${invoice.rate.toFixed(2)}` : '-') : 
                  'DEBUG: ' + JSON.stringify(invoice.rate)
                }
              </TableCell>
              <TableCell align="right">
                {invoice.amount !== undefined && invoice.amount !== null ? 
                  `$${invoice.amount.toFixed(2)}` : 
                  'DEBUG: ' + JSON.stringify(invoice.amount)
                }
              </TableCell>
              <TableCell align="right">
                {invoice.subtotal !== undefined && invoice.subtotal !== null ? 
                  (invoice.subtotal > 0 ? `$${invoice.subtotal.toFixed(2)}` : '-') : 
                  'DEBUG: ' + JSON.stringify(invoice.subtotal)
                }
              </TableCell>
              <TableCell align="right">
                {invoice.hst !== undefined && invoice.hst !== null ? 
                  (invoice.hst > 0 ? `$${invoice.hst.toFixed(2)}` : '-') : 
                  'DEBUG: ' + JSON.stringify(invoice.hst)
                }
              </TableCell>
              <TableCell align="right">
                {invoice.total !== undefined && invoice.total !== null ? 
                  (invoice.total > 0 ? `$${invoice.total.toFixed(2)}` : '-') : 
                  'DEBUG: ' + JSON.stringify(invoice.total)
                }
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
              <strong>Payment Processed</strong><br/>
              Invoice is paid
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
                <MenuItem value="sent_to_accounting">Sent to Accounting</MenuItem>
                <MenuItem value="partially_paid">Partially Paid</MenuItem>
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
                  label={getStatusLabel(selectedInvoice.status)}
                  color={getStatusColor(selectedInvoice.status) as any}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="textSecondary">Created Date</Typography>
                <Typography variant="body1" gutterBottom>
                  {new Date(selectedInvoice.created_at).toLocaleDateString()}
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
                <Typography variant="body1" gutterBottom>{selectedInvoice.description}</Typography>
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
                  {selectedInvoice.rate > 0 ? `$${selectedInvoice.rate.toFixed(2)}` : 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" color="textSecondary">Amount</Typography>
                <Typography variant="body1" fontWeight="bold" gutterBottom>
                  ${selectedInvoice.amount.toFixed(2)}
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" color="textSecondary">Total</Typography>
                <Typography variant="body1" fontWeight="bold" gutterBottom>
                  ${selectedInvoice.total > 0 ? selectedInvoice.total.toFixed(2) : selectedInvoice.amount.toFixed(2)}
                </Typography>
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

export default InvoiceHistory; 