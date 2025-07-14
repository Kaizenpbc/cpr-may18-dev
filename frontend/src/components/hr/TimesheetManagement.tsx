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
  Tooltip
} from '@mui/material';
import { 
  Visibility as VisibilityIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { timesheetService, Timesheet, TimesheetStats, TimesheetFilters } from '../../services/timesheetService';

interface TimesheetDetailsDialogProps {
  open: boolean;
  timesheet: Timesheet | null;
  onClose: () => void;
  onApprove: (timesheetId: number, action: 'approve' | 'reject', comment?: string) => void;
}

const TimesheetDetailsDialog: React.FC<TimesheetDetailsDialogProps> = ({
  open,
  timesheet,
  onClose,
  onApprove
}) => {
  const [action, setAction] = useState<'approve' | 'reject'>('approve');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!timesheet) return;
    
    setLoading(true);
    try {
      await onApprove(timesheet.id, action, comment);
      onClose();
      setComment('');
      setAction('approve');
    } catch (error) {
      console.error('Error processing timesheet:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    setComment('');
    setAction('approve');
  };

  if (!timesheet) return null;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Timesheet Details - {timesheet.instructor_name}
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="textSecondary">
              Instructor
            </Typography>
            <Typography variant="body1" gutterBottom>
              {timesheet.instructor_name} ({timesheet.instructor_email})
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="textSecondary">
              Week Starting
            </Typography>
            <Typography variant="body1" gutterBottom>
              {new Date(timesheet.week_start_date).toLocaleDateString()}
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="textSecondary">
              Total Hours
            </Typography>
            <Typography variant="body1" gutterBottom>
              {timesheet.total_hours} hours
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="textSecondary">
              Courses Taught
            </Typography>
            <Typography variant="body1" gutterBottom>
              {timesheet.courses_taught} courses
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="textSecondary">
              Notes
            </Typography>
            <Typography variant="body1" gutterBottom>
              {timesheet.notes || 'No notes provided'}
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="textSecondary">
              Status
            </Typography>
            <Chip 
              label={timesheet.status.toUpperCase()} 
              color={
                timesheet.status === 'approved' ? 'success' : 
                timesheet.status === 'rejected' ? 'error' : 
                'warning'
              }
              size="small"
            />
          </Grid>
          {timesheet.hr_comment && (
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="textSecondary">
                HR Comment
              </Typography>
              <Typography variant="body1" gutterBottom>
                {timesheet.hr_comment}
              </Typography>
            </Grid>
          )}
          {timesheet.status === 'pending' && (
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
                  multiline
                  rows={3}
                  label="Comment (Optional)"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Add a comment for the instructor..."
                />
              </Grid>
            </>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        {timesheet.status === 'pending' && (
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

const TimesheetManagement: React.FC = () => {
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [stats, setStats] = useState<TimesheetStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimesheet, setSelectedTimesheet] = useState<Timesheet | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [filters, setFilters] = useState<TimesheetFilters>({
    page: 1,
    limit: 10
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
      const [timesheetsData, statsData] = await Promise.all([
        timesheetService.getTimesheets(filters),
        timesheetService.getStats()
      ]);
      
      setTimesheets(timesheetsData.timesheets);
      setPagination(timesheetsData.pagination);
      setStats(statsData);
    } catch (err) {
      setError('Failed to load timesheet data');
      console.error('Error loading timesheet data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filters]);

  const handleFilterChange = (newFilters: Partial<TimesheetFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const handleViewDetails = (timesheet: Timesheet) => {
    setSelectedTimesheet(timesheet);
    setDetailsDialogOpen(true);
  };

  const handleApproveTimesheet = async (timesheetId: number, action: 'approve' | 'reject', comment?: string) => {
    try {
      await timesheetService.approveTimesheet(timesheetId, { action, comment });
      await loadData(); // Refresh data
    } catch (err) {
      console.error('Error processing timesheet:', err);
      throw err;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'success';
      case 'rejected': return 'error';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  if (loading && timesheets.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Timesheet Management
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
                  Pending Timesheets
                </Typography>
                <Typography variant="h4">
                  {stats.pendingTimesheets}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Approved This Month
                </Typography>
                <Typography variant="h4">
                  {stats.approvedThisMonth}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Hours This Month
                </Typography>
                <Typography variant="h4">
                  {stats.totalHoursThisMonth}
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
        </Grid>
      )}

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
                <MenuItem value="approved">Approved</MenuItem>
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
          <Grid item xs={12} sm={6} md={3}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={loadData}
              disabled={loading}
            >
              Refresh
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Timesheets Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Instructor</TableCell>
                <TableCell>Week Starting</TableCell>
                <TableCell>Hours</TableCell>
                <TableCell>Courses</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Submitted</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {timesheets.map((timesheet) => (
                <TableRow key={timesheet.id}>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {timesheet.instructor_name}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {timesheet.instructor_email}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {new Date(timesheet.week_start_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>{timesheet.total_hours}</TableCell>
                  <TableCell>{timesheet.courses_taught}</TableCell>
                  <TableCell>
                    <Chip 
                      label={timesheet.status.toUpperCase()} 
                      color={getStatusColor(timesheet.status) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(timesheet.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Tooltip title="View Details">
                      <IconButton
                        size="small"
                        onClick={() => handleViewDetails(timesheet)}
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

      {/* Details Dialog */}
      <TimesheetDetailsDialog
        open={detailsDialogOpen}
        timesheet={selectedTimesheet}
        onClose={() => setDetailsDialogOpen(false)}
        onApprove={handleApproveTimesheet}
      />
    </Box>
  );
};

export default TimesheetManagement; 