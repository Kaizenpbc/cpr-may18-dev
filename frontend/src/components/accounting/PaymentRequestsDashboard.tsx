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
}

const PaymentRequestDetailDialog: React.FC<PaymentRequestDetailDialogProps> = ({
  open,
  request,
  onClose
}) => {
  const handleClose = () => {
    onClose();
  };

  if (!request) return null;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Payment Request Details
        <Chip 
          label={request.status.toUpperCase()} 
          color={request.status === 'pending' ? 'warning' : request.status === 'approved' ? 'success' : 'error'}
          size="small"
          sx={{ ml: 2 }}
        />
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>Instructor Information</Typography>
            <Typography><strong>Name:</strong> {request.instructor_name}</Typography>
            <Typography><strong>Email:</strong> {request.instructor_email}</Typography>
            <Typography><strong>ID:</strong> {request.instructor_id}</Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>Payment Information</Typography>
            <Typography><strong>Amount:</strong> ${Number(request.amount).toFixed(2)}</Typography>
            <Typography><strong>Payment Date:</strong> {new Date(request.payment_date).toLocaleDateString()}</Typography>
            <Typography><strong>Payment Method:</strong> {request.payment_method}</Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>Timesheet Information</Typography>
            <Typography><strong>Week Starting:</strong> {request.week_start_date}</Typography>
            <Typography><strong>Total Hours:</strong> {request.total_hours}</Typography>
            <Typography><strong>Courses Taught:</strong> {request.courses_taught}</Typography>
            {request.timesheet_comment && (
              <Typography><strong>HR Comment:</strong> {request.timesheet_comment}</Typography>
            )}
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>Request Information</Typography>
            <Typography><strong>Created:</strong> {new Date(request.created_at).toLocaleString()}</Typography>
            <Typography><strong>Updated:</strong> {new Date(request.updated_at).toLocaleString()}</Typography>
            <Typography><strong>Notes:</strong> {request.notes}</Typography>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
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
                      <Typography variant="body2">{request.instructor_name}</Typography>
                      <Typography variant="caption" color="textSecondary">
                        ID: {request.instructor_id}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        ${Number(request.amount).toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell>{request.week_start_date}</TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {request.total_hours}h / {request.courses_taught} courses
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
                      {new Date(request.created_at).toLocaleDateString()}
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
      />

      {/* Removed Bulk Action Dialog */}
    </Box>
  );
};

export default PaymentRequestsDashboard; 