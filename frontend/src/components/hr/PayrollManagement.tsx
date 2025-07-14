import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  Card, 
  CardContent, 
  Button, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  Tabs,
  Tab
} from '@mui/material';
import { 
  Visibility as VisibilityIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  Calculate as CalculateIcon
} from '@mui/icons-material';
import { payrollService, PayrollPayment, PayrollStats, PayrollFilters, PayrollCalculation } from '../../services/payrollService';

interface PaymentDetailsDialogProps {
  open: boolean;
  payment: PayrollPayment | null;
  onClose: () => void;
  onProcess: (paymentId: number, action: 'approve' | 'reject', transactionId?: string, notes?: string) => void;
}

const PaymentDetailsDialog: React.FC<PaymentDetailsDialogProps> = ({
  open,
  payment,
  onClose,
  onProcess
}) => {
  const [action, setAction] = useState<'approve' | 'reject'>('approve');
  const [transactionId, setTransactionId] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!payment) return;
    
    setLoading(true);
    try {
      await onProcess(payment.id, action, transactionId || undefined, notes || undefined);
      onClose();
      setTransactionId('');
      setNotes('');
      setAction('approve');
    } catch (error) {
      console.error('Error processing payment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    setTransactionId('');
    setNotes('');
    setAction('approve');
  };

  if (!payment) return null;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Payment Details - {payment.instructor_name}
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="textSecondary">
              Instructor
            </Typography>
            <Typography variant="body1" gutterBottom>
              {payment.instructor_name} ({payment.instructor_email})
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="textSecondary">
              Payment Date
            </Typography>
            <Typography variant="body1" gutterBottom>
              {new Date(payment.payment_date).toLocaleDateString()}
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="textSecondary">
              Amount
            </Typography>
            <Typography variant="body1" gutterBottom>
              ${payment.amount.toFixed(2)}
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="textSecondary">
              Payment Method
            </Typography>
            <Typography variant="body1" gutterBottom>
              {payment.payment_method}
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="textSecondary">
              Notes
            </Typography>
            <Typography variant="body1" gutterBottom>
              {payment.notes || 'No notes provided'}
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="textSecondary">
              Status
            </Typography>
            <Chip 
              label={payment.status.toUpperCase()} 
              color={
                payment.status === 'completed' ? 'success' : 
                payment.status === 'rejected' ? 'error' : 
                'warning'
              }
              size="small"
            />
          </Grid>
          {payment.transaction_id && (
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="textSecondary">
                Transaction ID
              </Typography>
              <Typography variant="body1" gutterBottom>
                {payment.transaction_id}
              </Typography>
            </Grid>
          )}
          {payment.hr_notes && (
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="textSecondary">
                HR Notes
              </Typography>
              <Typography variant="body1" gutterBottom>
                {payment.hr_notes}
              </Typography>
            </Grid>
          )}
          {payment.status === 'pending' && (
            <>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Action</InputLabel>
                  <Select
                    value={action}
                    onChange={(e) => setAction(e.target.value as 'approve' | 'reject')}
                    label="Action"
                  >
                    <MenuItem value="approve">Approve</MenuItem>
                    <MenuItem value="reject">Reject</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Transaction ID (Optional)"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  placeholder="Enter transaction ID..."
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Notes (Optional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes..."
                />
              </Grid>
            </>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        {payment.status === 'pending' && (
          <Button 
            onClick={handleSubmit}
            variant="contained"
            color={action === 'approve' ? 'success' : 'error'}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : undefined}
          >
            {action === 'approve' ? 'Approve' : 'Reject'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

interface CalculatePayrollDialogProps {
  open: boolean;
  onClose: () => void;
  onCalculate: (instructorId: number, startDate: string, endDate: string, hourlyRate: number) => void;
}

const CalculatePayrollDialog: React.FC<CalculatePayrollDialogProps> = ({
  open,
  onClose,
  onCalculate
}) => {
  const [instructorId, setInstructorId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!instructorId || !startDate || !endDate || !hourlyRate) return;
    
    setLoading(true);
    try {
      await onCalculate(parseInt(instructorId), startDate, endDate, parseFloat(hourlyRate));
      onClose();
      setInstructorId('');
      setStartDate('');
      setEndDate('');
      setHourlyRate('');
    } catch (error) {
      console.error('Error calculating payroll:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    setInstructorId('');
    setStartDate('');
    setEndDate('');
    setHourlyRate('');
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Calculate Payroll
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Instructor ID"
              type="number"
              value={instructorId}
              onChange={(e) => setInstructorId(e.target.value)}
              required
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              required
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              required
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Hourly Rate ($)"
              type="number"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
              inputProps={{ min: 0, step: 0.01 }}
              required
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button 
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !instructorId || !startDate || !endDate || !hourlyRate}
          startIcon={loading ? <CircularProgress size={20} /> : <CalculateIcon />}
        >
          Calculate
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const PayrollManagement: React.FC = () => {
  const [payments, setPayments] = useState<PayrollPayment[]>([]);
  const [stats, setStats] = useState<PayrollStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<PayrollPayment | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [calculateDialogOpen, setCalculateDialogOpen] = useState(false);
  const [calculation, setCalculation] = useState<PayrollCalculation | null>(null);
  const [filters, setFilters] = useState<PayrollFilters>({
    page: 1,
    limit: 10
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });
  const [activeTab, setActiveTab] = useState(0);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [paymentsData, statsData] = await Promise.all([
        payrollService.getPayments(filters),
        payrollService.getStats()
      ]);
      
      setPayments(paymentsData.payments);
      setPagination(paymentsData.pagination);
      setStats(statsData);
    } catch (err) {
      setError('Failed to load payroll data');
      console.error('Error loading payroll data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filters]);

  const handleFilterChange = (newFilters: Partial<PayrollFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const handleViewDetails = (payment: PayrollPayment) => {
    setSelectedPayment(payment);
    setDetailsDialogOpen(true);
  };

  const handleProcessPayment = async (paymentId: number, action: 'approve' | 'reject', transactionId?: string, notes?: string) => {
    try {
      await payrollService.processPayment(paymentId, { action, transaction_id: transactionId, notes });
      await loadData(); // Refresh data
    } catch (err) {
      console.error('Error processing payment:', err);
      throw err;
    }
  };

  const handleCalculatePayroll = async (instructorId: number, startDate: string, endDate: string, hourlyRate: number) => {
    try {
      const result = await payrollService.calculatePayroll(instructorId, startDate, endDate, hourlyRate);
      setCalculation(result);
      setActiveTab(1); // Switch to calculation tab
    } catch (err) {
      console.error('Error calculating payroll:', err);
      throw err;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'rejected': return 'error';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  if (loading && payments.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Payroll Management
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Statistics Cards */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Payroll This Month
                </Typography>
                <Typography variant="h4">
                  ${stats.totalPayrollThisMonth.toFixed(2)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Pending Payments
                </Typography>
                <Typography variant="h4">
                  {stats.pendingPayments}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Instructors with Pending
                </Typography>
                <Typography variant="h4">
                  {stats.instructorsWithPending}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Average Payment
                </Typography>
                <Typography variant="h4">
                  ${stats.averagePayment.toFixed(2)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Action Buttons */}
      <Box sx={{ mb: 2 }}>
        <Button
          variant="contained"
          startIcon={<CalculateIcon />}
          onClick={() => setCalculateDialogOpen(true)}
          sx={{ mr: 2 }}
        >
          Calculate Payroll
        </Button>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={loadData}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          <Tab label="Payments" />
          <Tab label="Calculation" />
        </Tabs>
      </Box>

      {/* Payments Tab */}
      {activeTab === 0 && (
        <>
          {/* Filters */}
          <Paper sx={{ p: 2, mb: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={filters.status || ''}
                    onChange={(e) => handleFilterChange({ status: e.target.value })}
                    label="Status"
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="completed">Completed</MenuItem>
                    <MenuItem value="rejected">Rejected</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Instructor ID"
                  value={filters.instructor_id || ''}
                  onChange={(e) => handleFilterChange({ instructor_id: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Month"
                  type="number"
                  value={filters.month || ''}
                  onChange={(e) => handleFilterChange({ month: e.target.value })}
                  inputProps={{ min: 1, max: 12 }}
                />
              </Grid>
            </Grid>
          </Paper>

          {/* Payments Table */}
          <Paper>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Instructor</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Payment Date</TableCell>
                    <TableCell>Method</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {payment.instructor_name}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {payment.instructor_email}
                        </Typography>
                      </TableCell>
                      <TableCell>${payment.amount.toFixed(2)}</TableCell>
                      <TableCell>
                        {new Date(payment.payment_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{payment.payment_method}</TableCell>
                      <TableCell>
                        <Chip 
                          label={payment.status.toUpperCase()} 
                          color={getStatusColor(payment.status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(payment.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={() => handleViewDetails(payment)}
                          >
                            <VisibilityIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <Box display="flex" justifyContent="center" mt={2}>
              <Pagination
                count={pagination.pages}
                page={pagination.page}
                onChange={(_, page) => handlePageChange(page)}
                color="primary"
              />
            </Box>
          )}
        </>
      )}

      {/* Calculation Tab */}
      {activeTab === 1 && calculation && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Payroll Calculation
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="textSecondary">
                Instructor
              </Typography>
              <Typography variant="body1" gutterBottom>
                {calculation.instructor.username} ({calculation.instructor.email})
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="textSecondary">
                Period
              </Typography>
              <Typography variant="body1" gutterBottom>
                {new Date(calculation.period.start_date).toLocaleDateString()} - {new Date(calculation.period.end_date).toLocaleDateString()}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="textSecondary">
                Timesheets
              </Typography>
              <Typography variant="body1" gutterBottom>
                {calculation.timesheets.count} timesheets, {calculation.timesheets.totalHours} hours, {calculation.timesheets.totalCourses} courses
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="textSecondary">
                Rates
              </Typography>
              <Typography variant="body1" gutterBottom>
                ${calculation.rates.hourlyRate}/hour + ${calculation.rates.courseBonus} per course
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Calculation Breakdown
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Typography color="textSecondary" gutterBottom>
                        Base Amount
                      </Typography>
                      <Typography variant="h5">
                        ${calculation.calculation.baseAmount.toFixed(2)}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Typography color="textSecondary" gutterBottom>
                        Course Bonus
                      </Typography>
                      <Typography variant="h5">
                        ${calculation.calculation.courseBonus.toFixed(2)}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Typography color="textSecondary" gutterBottom>
                        Total Amount
                      </Typography>
                      <Typography variant="h5" color="primary">
                        ${calculation.calculation.totalAmount.toFixed(2)}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Dialogs */}
      <PaymentDetailsDialog
        open={detailsDialogOpen}
        payment={selectedPayment}
        onClose={() => setDetailsDialogOpen(false)}
        onProcess={handleProcessPayment}
      />

      <CalculatePayrollDialog
        open={calculateDialogOpen}
        onClose={() => setCalculateDialogOpen(false)}
        onCalculate={handleCalculatePayroll}
      />
    </Box>
  );
};

export default PayrollManagement; 