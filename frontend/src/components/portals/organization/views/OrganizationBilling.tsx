import React from 'react';
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
} from '@mui/material';
import {
  Receipt as ReceiptIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';

// TypeScript interfaces
interface Invoice {
  id: number;
  invoice_number: string;
  created_at: string;
  due_date: string;
  amount: number;
  status: string;
  students_billed: number;
  paid_date?: string;
  location: string;
  course_type_name: string;
  course_date: string;
  course_request_id: number;
  amount_paid: number;
  balance_due: number;
}

interface BillingSummary {
  total_invoices: number;
  pending_invoices: number;
  overdue_invoices: number;
  paid_invoices: number;
  payment_submitted: number;
  total_amount: number;
  pending_amount: number;
  overdue_amount: number;
  paid_amount: number;
  recent_invoices: Invoice[];
}

interface OrganizationBillingProps {
  invoices: Invoice[];
  billingSummary: BillingSummary | undefined;
}

const OrganizationBilling: React.FC<OrganizationBillingProps> = ({
  invoices,
  billingSummary,
}) => {
  // Get status color for invoices
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return 'success';
      case 'overdue':
        return 'error';
      case 'pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  // Check if invoice is overdue
  const isOverdue = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    return today > due;
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Bills Payable
      </Typography>

      {/* Billing Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <ReceiptIcon color="primary" sx={{ mr: 2, fontSize: 40 }} />
                <Box>
                  <Typography variant="h4" component="div">
                    {billingSummary?.total_invoices || 0}
                  </Typography>
                  <Typography color="text.secondary">
                    Total Invoices
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <ScheduleIcon color="warning" sx={{ mr: 2, fontSize: 40 }} />
                <Box>
                  <Typography variant="h4" component="div">
                    {billingSummary?.pending_invoices || 0}
                  </Typography>
                  <Typography color="text.secondary">
                    Pending
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <WarningIcon color="error" sx={{ mr: 2, fontSize: 40 }} />
                <Box>
                  <Typography variant="h4" component="div">
                    {billingSummary?.overdue_invoices || 0}
                  </Typography>
                  <Typography color="text.secondary">
                    Overdue
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CheckCircleIcon color="success" sx={{ mr: 2, fontSize: 40 }} />
                <Box>
                  <Typography variant="h4" component="div">
                    {billingSummary?.paid_invoices || 0}
                  </Typography>
                  <Typography color="text.secondary">
                    Paid
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Invoices Table */}
      <Paper sx={{ p: 3 }}>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Search invoices..."
              variant="outlined"
              size="small"
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select label="Status" defaultValue="">
                <MenuItem value="">All Statuses</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="overdue">Overdue</MenuItem>
                <MenuItem value="paid">Paid</MenuItem>
              </Select>
            </FormControl>
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
          <Grid item xs={12} md={2}>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {invoices.length} invoices found
            </Typography>
          </Grid>
        </Grid>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Invoice #</TableCell>
                <TableCell>Course Type</TableCell>
                <TableCell>Course Date</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Students</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Amount Paid</TableCell>
                <TableCell>Balance Due</TableCell>
                <TableCell>Due Date</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell>{invoice.invoice_number}</TableCell>
                  <TableCell>{invoice.course_type_name}</TableCell>
                  <TableCell>
                    {new Date(invoice.course_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>{invoice.location}</TableCell>
                  <TableCell>{invoice.students_billed}</TableCell>
                  <TableCell>${invoice.amount.toLocaleString()}</TableCell>
                  <TableCell>${invoice.amount_paid.toLocaleString()}</TableCell>
                  <TableCell>
                    <Typography
                      variant="body2"
                      color={invoice.balance_due > 0 ? 'error.main' : 'success.main'}
                    >
                      ${invoice.balance_due.toLocaleString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="body2"
                      color={isOverdue(invoice.due_date) ? 'error.main' : 'inherit'}
                    >
                      {new Date(invoice.due_date).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={invoice.status}
                      color={getStatusColor(invoice.status)}
                      size="small"
                    />
                  </TableCell>
                </TableRow>
              ))}
              {invoices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} align="center">
                    No invoices found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default OrganizationBilling; 