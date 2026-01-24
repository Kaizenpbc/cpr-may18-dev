import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  IconButton,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Pagination,
  Tooltip,
  Badge,
  Checkbox,
  FormControlLabel
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  Schedule as ScheduleIcon,
  Payment as PaymentIcon,
  AttachMoney as MoneyIcon,
  CheckBox as CheckBoxIcon,
  CheckBoxOutlineBlank as CheckBoxOutlineBlankIcon,
  Cancel
} from '@mui/icons-material';
import { paymentRequestService, PaymentRequest, PaymentRequestStats, PaymentRequestFilters } from '../../services/paymentRequestService';

interface PaymentRequestDetailDialogProps {
  open: boolean;
  request: PaymentRequest | null;
  onClose: () => void;
  onActionSuccess?: () => void;
}

const PaymentRequestDetailDialog: React.FC<PaymentRequestDetailDialogProps> = ({
  open,
  request,
  onClose,
  onActionSuccess
}) => {
  const [action, setAction] = useState<'approve' | 'return_to_hr'>('approve');
  const [paymentMethod, setPaymentMethod] = useState('direct_deposit');
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  const handleClose = () => {
    onClose();
    setAction('approve');
    setPaymentMethod('direct_deposit');
    setNotes('');
    setProcessing(false);
  };

  const handleProcessPayment = async () => {
    if (!request) return;
    
    if (action === 'return_to_hr' && !notes.trim()) {
      alert('Notes are required when returning to HR.');
      return;
    }
    
    setProcessing(true);
    try {
      await paymentRequestService.processPaymentRequest(request.id, {
        action,
        payment_method: action === 'approve' ? paymentMethod : undefined,
        notes: notes.trim()
      });
      
      if (onActionSuccess) {
        onActionSuccess();
      }
      handleClose();
    } catch (error) {
      console.error('Error processing payment request:', error);
      alert('Failed to process payment request. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  if (!request) return null;

  // Calculate payment breakdown if available
  const baseAmount = request.baseAmount || (request.totalHours * (request.hourlyRate || 25));
  const bonusAmount = request.bonusAmount || (request.coursesTaught * (request.courseBonus || 50));
  const totalAmount = request.amount || (baseAmount + bonusAmount);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h5">
            Payment Request Details
          </Typography>
          <Chip 
            label={request.status.toUpperCase()} 
            color={request.status === 'pending' ? 'warning' : request.status === 'approved' ? 'success' : 'error'}
            size="medium"
          />
        </Box>
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={3}>
          {/* Instructor Information */}
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary">
                  👤 Instructor Information
                </Typography>
                <Typography><strong>Name:</strong> {request.instructorName}</Typography>
                <Typography><strong>Email:</strong> {request.instructorEmail}</Typography>
                <Typography><strong>ID:</strong> {request.instructorId}</Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Payment Information */}
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary">
                  💰 Payment Information
                </Typography>
                <Typography variant="h5" color="success.main" fontWeight="bold">
                  ${Number(totalAmount).toFixed(2)}
                </Typography>
                <Typography><strong>Payment Date:</strong> {new Date(request.paymentDate).toLocaleDateString()}</Typography>
                <Typography><strong>Payment Method:</strong> {request.paymentMethod?.replace('_', ' ').toUpperCase()}</Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Timesheet Information */}
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary">
                  📅 Timesheet Information
                </Typography>
                <Typography><strong>Week Starting:</strong> {new Date(request.weekStartDate).toLocaleDateString()}</Typography>
                <Typography><strong>Total Hours:</strong> {request.totalHours} hours</Typography>
                <Typography><strong>Courses Taught:</strong> {request.coursesTaught} courses</Typography>
                {request.timesheetComment && (
                  <Typography><strong>HR Comment:</strong> {request.timesheetComment}</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Payment Breakdown */}
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary">
                  🧮 Payment Breakdown
                </Typography>
                <Typography><strong>Hourly Rate:</strong> ${request.hourlyRate || 25}/hr</Typography>
                <Typography><strong>Course Bonus:</strong> ${request.courseBonus || 50}/course</Typography>
                <Typography><strong>Base Amount:</strong> ${Number(baseAmount).toFixed(2)} ({request.totalHours}h × ${request.hourlyRate || 25})</Typography>
                <Typography><strong>Bonus Amount:</strong> ${Number(bonusAmount).toFixed(2)} ({request.coursesTaught} courses × ${request.courseBonus || 50})</Typography>
                <Typography variant="h6" color="success.main" fontWeight="bold">
                  Total: ${Number(totalAmount).toFixed(2)}
                </Typography>
                {request.tierName && (
                  <Typography><strong>Pay Tier:</strong> {request.tierName}</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Class Details */}
          {request.classDetails && request.classDetails.length > 0 && (
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom color="primary">
                    📚 Classes Covered
                  </Typography>
                  <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
                    {request.classDetails.map((classDetail, index) => (
                      <Box key={index} sx={{ mb: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                        <Typography variant="subtitle2" fontWeight="bold">
                          {classDetail.course_name}
                        </Typography>
                        <Typography variant="body2">
                          Hours: {classDetail.hours} | Date: {new Date(classDetail.date).toLocaleDateString()}
                          {classDetail.location && ` | Location: ${classDetail.location}`}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Request Information */}
          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary">
                  📋 Request Information
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography><strong>Created:</strong> {new Date(request.createdAt).toLocaleString()}</Typography>
                    <Typography><strong>Updated:</strong> {new Date(request.updatedAt).toLocaleString()}</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography><strong>Timesheet ID:</strong> {request.timesheetId}</Typography>
                    <Typography><strong>Request ID:</strong> {request.id}</Typography>
                  </Grid>
                  {request.notes && (
                    <Grid item xs={12}>
                      <Typography><strong>Notes:</strong></Typography>
                      <Typography variant="body2" sx={{ bgcolor: 'grey.50', p: 1, borderRadius: 1 }}>
                        {request.notes}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Payment Processing Section - Only show for pending requests */}
          {request.status === 'pending' && (
            <Grid item xs={12}>
              <Card variant="outlined" sx={{ bgcolor: 'primary.50' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="primary">
                    ⚙️ Process Payment Request
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
                        <InputLabel>Action</InputLabel>
                        <Select
                          value={action}
                          onChange={(e) => setAction(e.target.value as 'approve' | 'return_to_hr')}
                          label="Action"
                        >
                          <MenuItem value="approve">✅ Approve Payment</MenuItem>
                          <MenuItem value="return_to_hr">🔄 Return to HR</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    {action === 'approve' && (
                      <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                          <InputLabel>Payment Method</InputLabel>
                          <Select
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                            label="Payment Method"
                          >
                            <MenuItem value="direct_deposit">Direct Deposit</MenuItem>
                            <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                            <MenuItem value="check">Check</MenuItem>
                            <MenuItem value="cash">Cash</MenuItem>
                            <MenuItem value="credit_card">Credit Card</MenuItem>
                            <MenuItem value="other">Other</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                    )}
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        multiline
                        rows={3}
                        label={action === 'approve' ? 'Notes (Optional)' : 'Notes (Required)'}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder={
                          action === 'approve' 
                            ? 'Add optional notes about this approval...'
                            : 'Required: Explain why this payment request is being returned to HR...'
                        }
                        required={action === 'return_to_hr'}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={processing}>
          Cancel
        </Button>
        {request.status === 'pending' && (
          <Button
            onClick={handleProcessPayment}
            variant="contained"
            color={action === 'approve' ? 'success' : 'warning'}
            disabled={processing || (action === 'return_to_hr' && !notes.trim())}
            startIcon={processing ? <CircularProgress size={20} /> : undefined}
          >
            {processing 
              ? 'Processing...' 
              : action === 'approve' 
                ? 'Approve Payment' 
                : 'Return to HR'
            }
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

const PaymentRequestsDashboard: React.FC = () => {
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [stats, setStats] = useState<PaymentRequestStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<PaymentRequest | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  // Filters
  const [filters, setFilters] = useState<PaymentRequestFilters>({
    page: 1,
    limit: 10,
    status: '',
    instructor_id: undefined
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });

  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [statsData, requestsData] = await Promise.all([
        paymentRequestService.getStats(),
        paymentRequestService.getPaymentRequests(filters)
      ]);
      
      setStats(statsData);
      setRequests(requestsData.requests);
      setPagination(requestsData.pagination);
    } catch (err) {
      setError('Failed to load payment requests data');
      console.error('Error loading payment requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filters]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'approved': return 'success';
      case 'returned_to_hr': return 'info';
      case 'rejected': return 'error';
      case 'completed': return 'info';
      default: return 'default';
    }
  };

  if (loading && !stats) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Page Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          👨‍🏫 Instructor Payment Requests
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Review and process payment requests from HR for instructor compensation
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Statistics Cards */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <ScheduleIcon color="warning" sx={{ mr: 1 }} />
                  <Box>
                    <Typography variant="h4">{stats.pending.count}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      Pending Requests
                    </Typography>
                    <Typography variant="h6" color="primary">
                      ${stats.pending.amount.toFixed(2)}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <ApproveIcon color="success" sx={{ mr: 1 }} />
                  <Box>
                    <Typography variant="h4">{stats.approvedThisMonth.count}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      Approved This Month
                    </Typography>
                    <Typography variant="h6" color="success">
                      ${Number(stats.approvedThisMonth.amount).toFixed(2)}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <MoneyIcon color="primary" sx={{ mr: 1 }} />
                  <Box>
                    <Typography variant="h4">
                      ${stats.pending.amount > 0 ? (Number(stats.pending.amount) / stats.pending.count).toFixed(2) : '0.00'}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Average Request
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <Cancel color="error" sx={{ mr: 1 }} />
                  <Box>
                    <Typography variant="h4">{stats.rejectedThisMonth}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      Rejected This Month
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filters and Actions */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
                  label="Status"
                >
                  <MenuItem value="">All Statuses</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="approved">Approved</MenuItem>
                  <MenuItem value="returned_to_hr">Returned to HR</MenuItem>
                  <MenuItem value="rejected">Rejected</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                size="small"
                label="Instructor ID"
                type="number"
                value={filters.instructor_id || ''}
                onChange={(e) => setFilters({ 
                  ...filters, 
                  instructor_id: e.target.value ? parseInt(e.target.value) : undefined,
                  page: 1 
                })}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={loadData}
                disabled={loading}
              >
                Refresh
              </Button>
            </Grid>
            <Grid item xs={12} md={3}>
              <Box display="flex" gap={1}>
                {/* Removed bulk action buttons */}
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Payment Requests Table */}
      <Card>
        <CardContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      // Removed selectedRequests.length === requests.length && requests.length > 0
                      indeterminate={false} // Always false as selectedRequests is removed
                      onChange={(e) => {}} // No-op
                    />
                  </TableCell>
                  <TableCell>ID</TableCell>
                  <TableCell>Instructor</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Week Starting</TableCell>
                  <TableCell>Hours/Courses</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id} hover>
                    <TableCell padding="checkbox">
                      <Checkbox
                        // Removed selectedRequests.includes(request.id)
                        onChange={(e) => {}} // No-op
                      />
                    </TableCell>
                    <TableCell>{request.id}</TableCell>
                    <TableCell>
                      <Typography variant="body2">{request.instructorName}</Typography>
                      <Typography variant="caption" color="textSecondary">
                        ID: {request.instructorId}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        ${Number(request.amount).toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell>{request.weekStartDate}</TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {request.totalHours}h / {request.coursesTaught} courses
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={request.status.toUpperCase()}
                        color={getStatusColor(request.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(request.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Tooltip title="View Details">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setSelectedRequest(request);
                            setDetailDialogOpen(true);
                          }}
                        >
                          <VisibilityIcon />
                        </IconButton>
                      </Tooltip>
                      {/* Removed approve/reject buttons */}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <Box display="flex" justifyContent="center" mt={2}>
              <Pagination
                count={pagination.pages}
                page={pagination.page}
                onChange={(_, page) => setFilters({ ...filters, page })}
                color="primary"
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <PaymentRequestDetailDialog
        open={detailDialogOpen}
        request={selectedRequest}
        onClose={() => setDetailDialogOpen(false)}
        onActionSuccess={loadData}
      />

      {/* Removed Bulk Action Dialog */}
    </Box>
  );
};

export default PaymentRequestsDashboard; 