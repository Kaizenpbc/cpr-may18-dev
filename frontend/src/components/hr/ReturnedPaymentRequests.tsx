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
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  CheckCircle as OverrideIcon,
  Cancel as RejectIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';
import { hrService } from '../../services/hrService';

interface ReturnedPaymentRequest {
  id: number;
  instructor_id: number;
  instructor_name: string;
  instructor_email: string;
  amount: number;
  week_start_date: string;
  total_hours: number;
  courses_taught: number;
  hourly_rate: number;
  course_bonus: number;
  base_amount: number;
  bonus_amount: number;
  tier_name: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

interface ReturnedPaymentRequestDetailDialogProps {
  open: boolean;
  request: ReturnedPaymentRequest | null;
  onClose: () => void;
  onActionSuccess?: () => void;
}

const ReturnedPaymentRequestDetailDialog: React.FC<ReturnedPaymentRequestDetailDialogProps> = ({
  open,
  request,
  onClose,
  onActionSuccess
}) => {
  const [action, setAction] = useState<'override_approve' | 'final_reject'>('override_approve');
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  const handleClose = () => {
    onClose();
    setAction('override_approve');
    setNotes('');
    setProcessing(false);
  };

  const handleProcessRequest = async () => {
    if (!request) return;
    
    if (!notes.trim()) {
      alert('Notes are required when processing returned payment request.');
      return;
    }
    
    setProcessing(true);
    try {
      await hrService.processReturnedPaymentRequest(request.id, action, notes.trim());
      
      if (onActionSuccess) {
        onActionSuccess();
      }
      handleClose();
    } catch (error) {
      console.error('Error processing returned payment request:', error);
      alert('Failed to process payment request. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  if (!request) return null;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h5">
            Review Returned Payment Request
          </Typography>
          <Chip 
            label="RETURNED TO HR" 
            color="warning"
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
                <Typography><strong>Name:</strong> {request.instructor_name}</Typography>
                <Typography><strong>Email:</strong> {request.instructor_email}</Typography>
                <Typography><strong>ID:</strong> {request.instructor_id}</Typography>
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
                  ${Number(request.amount).toFixed(2)}
                </Typography>
                <Typography><strong>Week Starting:</strong> {new Date(request.week_start_date).toLocaleDateString()}</Typography>
                <Typography><strong>Hours:</strong> {request.total_hours}h</Typography>
                <Typography><strong>Courses:</strong> {request.courses_taught}</Typography>
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
                <Typography><strong>Hourly Rate:</strong> ${request.hourly_rate}/hr</Typography>
                <Typography><strong>Course Bonus:</strong> ${request.course_bonus}/course</Typography>
                <Typography><strong>Base Amount:</strong> ${Number(request.base_amount).toFixed(2)}</Typography>
                <Typography><strong>Bonus Amount:</strong> ${Number(request.bonus_amount).toFixed(2)}</Typography>
                <Typography><strong>Pay Tier:</strong> {request.tier_name}</Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Accountant Notes */}
          <Grid item xs={12} md={6}>
            <Card variant="outlined" sx={{ bgcolor: 'warning.50' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom color="warning.main">
                  ⚠️ Accountant Notes
                </Typography>
                <Typography variant="body2" sx={{ bgcolor: 'white', p: 1, borderRadius: 1 }}>
                  {request.notes || 'No notes provided'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* HR Decision Section */}
          <Grid item xs={12}>
            <Card variant="outlined" sx={{ bgcolor: 'primary.50' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary">
                  🎯 HR Decision Required
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Action</InputLabel>
                      <Select
                        value={action}
                        onChange={(e) => setAction(e.target.value as 'override_approve' | 'final_reject')}
                        label="Action"
                      >
                        <MenuItem value="override_approve">✅ Override & Approve</MenuItem>
                        <MenuItem value="final_reject">❌ Final Rejection</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      rows={4}
                      label="HR Decision Notes (Required)"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={
                        action === 'override_approve' 
                          ? 'Explain why you are overriding the accountant\'s decision...'
                          : 'Explain why you are confirming the final rejection...'
                      }
                      required
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={processing}>
          Cancel
        </Button>
        <Button
          onClick={handleProcessRequest}
          variant="contained"
          color={action === 'override_approve' ? 'success' : 'error'}
          disabled={processing || !notes.trim()}
          startIcon={processing ? <CircularProgress size={20} /> : undefined}
        >
          {processing 
            ? 'Processing...' 
            : action === 'override_approve' 
              ? 'Override & Approve' 
              : 'Final Rejection'
          }
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const ReturnedPaymentRequests: React.FC = () => {
  const [requests, setRequests] = useState<ReturnedPaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<ReturnedPaymentRequest | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
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
      const data = await hrService.getReturnedPaymentRequests({
        page: pagination.page,
        limit: pagination.limit
      });
      
      setRequests(data.requests);
      setPagination(data.pagination);
    } catch (err) {
      setError('Failed to load returned payment requests');
      console.error('Error loading returned payment requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [pagination.page]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'returned_to_hr': return 'warning';
      default: return 'default';
    }
  };

  if (loading && requests.length === 0) {
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

      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom>
            🔄 Returned Payment Requests
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Review payment requests returned by accounting for HR decision
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={loadData}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {/* Statistics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <WarningIcon color="warning" sx={{ mr: 1 }} />
                <Box>
                  <Typography variant="h4">{requests.length}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Returned Requests
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Returned Payment Requests Table */}
      <Card>
        <CardContent>
          {requests.length === 0 ? (
            <Box textAlign="center" py={4}>
              <AssignmentIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="textSecondary">
                No Returned Payment Requests
              </Typography>
              <Typography variant="body2" color="textSecondary">
                All payment requests have been processed or are still pending
              </Typography>
            </Box>
          ) : (
            <>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>ID</TableCell>
                      <TableCell>Instructor</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell>Week Starting</TableCell>
                      <TableCell>Hours/Courses</TableCell>
                      <TableCell>Returned Date</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {requests.map((request) => (
                      <TableRow key={request.id} hover>
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
                        <TableCell>{new Date(request.week_start_date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {request.total_hours}h / {request.courses_taught} courses
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {new Date(request.updated_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Tooltip title="Review Details">
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
                    onChange={(_, page) => setPagination({ ...pagination, page })}
                    color="primary"
                  />
                </Box>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <ReturnedPaymentRequestDetailDialog
        open={detailDialogOpen}
        request={selectedRequest}
        onClose={() => setDetailDialogOpen(false)}
        onActionSuccess={loadData}
      />
    </Box>
  );
};

export default ReturnedPaymentRequests; 