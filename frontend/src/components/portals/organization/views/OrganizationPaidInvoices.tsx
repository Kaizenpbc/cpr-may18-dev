import React, { useState } from 'react';
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
  Grid,
  Card,
  CardContent,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Link,
  Alert,
  Snackbar,
  Divider,
} from '@mui/material';
import {
  Receipt as ReceiptIcon,
  CheckCircle as CheckCircleIcon,
  Visibility as VisibilityIcon,
  Payment as PaymentIcon,
  Info as InfoIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { formatDisplayDate } from '../../../../utils/dateUtils';
import { api } from '../../../../services/api';

// TypeScript interfaces
interface Invoice {
  id: number;
  invoice_number: string;
  created_at: string;
  due_date: string;
  amount: number;
  status: string;
  payment_status?: string;
  students_billed: number;
  paid_date?: string;
  location: string;
  course_type_name: string;
  course_date: string;
  course_request_id: number;
  amount_paid: number;
  balance_due: number;
  rate_per_student?: number;
  base_cost?: number;
  tax_amount?: number;
}

interface PaidInvoicesSummary {
  total_paid_invoices: number;
  total_paid_amount: number;
  average_paid_amount: number;
  paid_last_30_days: number;
  amount_paid_last_30_days: number;
}

interface OrganizationPaidInvoicesProps {
  invoices: Invoice[];
  paidInvoicesSummary: PaidInvoicesSummary | undefined;
}

const OrganizationPaidInvoices: React.FC<OrganizationPaidInvoicesProps> = ({
  invoices,
  paidInvoicesSummary,
}) => {
  // State for invoice detail dialog
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // State for success/error messages
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Ensure invoices is an array
  const safeInvoices = Array.isArray(invoices) ? invoices : [];

  // Get status color for invoices
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return 'success';
      case 'overdue':
        return 'error';
      case 'pending':
        return 'warning';
      case 'payment_submitted':
        return 'info';
      default:
        return 'default';
    }
  };

  // Handle invoice number click
  const handleInvoiceClick = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setDialogOpen(true);
  };

  // Handle dialog close
  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedInvoice(null);
  };

  // Handle download invoice PDF
  const handleDownloadPDF = async (invoiceId: number) => {
    try {
      const response = await api.get(`/accounting/invoices/${invoiceId}/pdf`, {
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Invoice-${selectedInvoice?.invoice_number}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      setMessage({ type: 'error', text: 'Failed to download invoice PDF' });
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Paid Invoices
      </Typography>

      {/* Paid Invoices Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)',
            color: 'white',
            boxShadow: '0 8px 32px rgba(76, 175, 80, 0.3)',
            transition: 'transform 0.2s ease-in-out',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 12px 40px rgba(76, 175, 80, 0.4)',
            }
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CheckCircleIcon sx={{ mr: 2, fontSize: 40, color: 'white' }} />
                <Box>
                  <Typography variant="h4" component="div" sx={{ color: 'white', fontWeight: 600 }}>
                    {paidInvoicesSummary?.total_paid_invoices || 0}
                  </Typography>
                  <Typography sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    Total Paid Invoices
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
            color: 'white',
            boxShadow: '0 8px 32px rgba(67, 233, 123, 0.3)',
            transition: 'transform 0.2s ease-in-out',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 12px 40px rgba(67, 233, 123, 0.4)',
            }
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <PaymentIcon sx={{ mr: 2, fontSize: 40, color: 'white' }} />
                <Box>
                  <Typography variant="h4" component="div" sx={{ color: 'white', fontWeight: 600 }}>
                    ${Number(paidInvoicesSummary?.total_paid_amount || 0).toLocaleString()}
                  </Typography>
                  <Typography sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    Total Amount Paid
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)',
            transition: 'transform 0.2s ease-in-out',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 12px 40px rgba(102, 126, 234, 0.4)',
            }
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <InfoIcon sx={{ mr: 2, fontSize: 40, color: 'white' }} />
                <Box>
                  <Typography variant="h4" component="div" sx={{ color: 'white', fontWeight: 600 }}>
                    ${Number(paidInvoicesSummary?.average_paid_amount || 0).toFixed(2)}
                  </Typography>
                  <Typography sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    Average Invoice Amount
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            color: 'white',
            boxShadow: '0 8px 32px rgba(240, 147, 251, 0.3)',
            transition: 'transform 0.2s ease-in-out',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 12px 40px rgba(240, 147, 251, 0.4)',
            }
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <ReceiptIcon sx={{ mr: 2, fontSize: 40, color: 'white' }} />
                <Box>
                  <Typography variant="h4" component="div" sx={{ color: 'white', fontWeight: 600 }}>
                    {paidInvoicesSummary?.paid_last_30_days || 0}
                  </Typography>
                  <Typography sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    Paid Last 30 Days
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Paid Invoices Table */}
      <Paper sx={{ p: 3 }}>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Search paid invoices..."
              variant="outlined"
              size="small"
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Course Type</InputLabel>
              <Select label="Course Type" defaultValue="">
                <MenuItem value="">All Types</MenuItem>
                <MenuItem value="cpr">CPR</MenuItem>
                <MenuItem value="first_aid">First Aid</MenuItem>
                <MenuItem value="bls">BLS</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Payment Date</InputLabel>
              <Select label="Payment Date" defaultValue="">
                <MenuItem value="">All Dates</MenuItem>
                <MenuItem value="last_30">Last 30 Days</MenuItem>
                <MenuItem value="last_90">Last 90 Days</MenuItem>
                <MenuItem value="last_year">Last Year</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {safeInvoices.length} paid invoices found
            </Typography>
          </Grid>
        </Grid>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Invoice #</TableCell>
                <TableCell>Course Name</TableCell>
                <TableCell>Course Date</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Students</TableCell>
                <TableCell align="right">Base Cost</TableCell>
                <TableCell align="right">Tax (HST)</TableCell>
                <TableCell align="right">Total</TableCell>
                <TableCell align="right">Amount Paid</TableCell>
                <TableCell>Paid Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {safeInvoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell>
                    <Link
                      component="button"
                      variant="body2"
                      onClick={() => handleInvoiceClick(invoice)}
                      sx={{
                        color: 'primary.main',
                        textDecoration: 'none',
                        cursor: 'pointer',
                        '&:hover': {
                          textDecoration: 'underline',
                          color: 'primary.dark',
                        },
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                      }}
                    >
                      <VisibilityIcon fontSize="small" />
                      {invoice.invoice_number}
                    </Link>
                  </TableCell>
                  <TableCell>{invoice.course_type_name}</TableCell>
                  <TableCell>
                    {formatDisplayDate(invoice.course_date)}
                  </TableCell>
                  <TableCell>{invoice.location}</TableCell>
                  <TableCell>{invoice.students_billed}</TableCell>
                  <TableCell align="right">$36.00</TableCell>
                  <TableCell align="right">$4.68</TableCell>
                  <TableCell align="right">$40.68</TableCell>
                  <TableCell align="right">${Number(invoice.amount_paid).toFixed(2)}</TableCell>
                  <TableCell>
                    {invoice.paid_date ? formatDisplayDate(invoice.paid_date) : 'N/A'}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={invoice.payment_status || invoice.status}
                      color={getStatusColor(invoice.payment_status || invoice.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      startIcon={<DownloadIcon />}
                      onClick={() => handleDownloadPDF(invoice.id)}
                      variant="outlined"
                    >
                      PDF
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {safeInvoices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={12} align="center">
                    No paid invoices found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Invoice Detail Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleDialogClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Paid Invoice Details - {selectedInvoice?.invoice_number}
        </DialogTitle>
        <DialogContent>
          {selectedInvoice && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Invoice Information
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Invoice Number
                  </Typography>
                  <Typography variant="body1">
                    {selectedInvoice.invoice_number}
                  </Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Created Date
                  </Typography>
                  <Typography variant="body1">
                    {formatDisplayDate(selectedInvoice.created_at)}
                  </Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Due Date
                  </Typography>
                  <Typography variant="body1">
                    {formatDisplayDate(selectedInvoice.due_date)}
                  </Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Paid Date
                  </Typography>
                  <Typography variant="body1" color="success.main">
                    {selectedInvoice.paid_date ? formatDisplayDate(selectedInvoice.paid_date) : 'N/A'}
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Course Information
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Course Type
                  </Typography>
                  <Typography variant="body1">
                    {selectedInvoice.course_type_name}
                  </Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Course Date
                  </Typography>
                  <Typography variant="body1">
                    {formatDisplayDate(selectedInvoice.course_date)}
                  </Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Location
                  </Typography>
                  <Typography variant="body1">
                    {selectedInvoice.location}
                  </Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Students Billed
                  </Typography>
                  <Typography variant="body1">
                    {selectedInvoice.students_billed}
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Payment Details
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Base Cost
                      </Typography>
                      <Typography variant="h6">
                        {selectedInvoice.rate_per_student ? 
                          `$${(selectedInvoice.rate_per_student * selectedInvoice.students_billed).toFixed(2)}` : 
                          'N/A'
                        }
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Tax (HST)
                      </Typography>
                      <Typography variant="h6">
                        {selectedInvoice.rate_per_student ? 
                          `$${(selectedInvoice.rate_per_student * selectedInvoice.students_billed * 0.13).toFixed(2)}` : 
                          'N/A'
                        }
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Total Amount
                      </Typography>
                      <Typography variant="h6" color="success.main">
                        {selectedInvoice.rate_per_student ? 
                          `$${(selectedInvoice.rate_per_student * selectedInvoice.students_billed * 1.13).toFixed(2)}` : 
                          'N/A'
                        }
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Amount Paid
                      </Typography>
                      <Typography variant="h6" color="success.main">
                        ${Number(selectedInvoice.amount_paid).toFixed(2)}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Balance Due
                      </Typography>
                      <Typography variant="h6" color="success.main">
                        ${Number(selectedInvoice.balance_due || 0).toFixed(2)}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>Close</Button>
          <Button
            onClick={() => selectedInvoice && handleDownloadPDF(selectedInvoice.id)}
            variant="contained"
            startIcon={<DownloadIcon />}
          >
            Download PDF
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success/Error Messages */}
      <Snackbar
        open={!!message}
        autoHideDuration={6000}
        onClose={() => setMessage(null)}
      >
        <Alert
          onClose={() => setMessage(null)}
          severity={message?.type}
          sx={{ width: '100%' }}
        >
          {message?.text}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default OrganizationPaidInvoices; 