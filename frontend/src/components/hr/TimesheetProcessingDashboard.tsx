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
  Badge
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  Schedule as ScheduleIcon,
  People as PeopleIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';
import { timesheetService, Timesheet, TimesheetStats, TimesheetFilters } from '../../services/timesheetService';
import TimesheetNotes from '../shared/TimesheetNotes';
import { format } from 'date-fns';

interface TimesheetProcessingDashboardProps {
  // Add any props if needed
}

interface CourseDetail {
  date: string;
  startTime?: string;
  endTime?: string;
  organizationName?: string;
  location?: string;
  courseType: string;
  studentCount?: number;
  status?: string;
}

type ChipColor = 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';

const TimesheetProcessingDashboard: React.FC<TimesheetProcessingDashboardProps> = () => {
  const [stats, setStats] = useState<TimesheetStats | null>(null);
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [selectedTimesheet, setSelectedTimesheet] = useState<Timesheet | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [approvalComment, setApprovalComment] = useState('');
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Pagination and filtering
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });
  const [filters, setFilters] = useState<TimesheetFilters>({
    status: '',
    instructorId: '',
    month: ''
  });

  // Load statistics
  const loadStats = async () => {
    try {
      setStatsLoading(true);
      const statsData = await timesheetService.getStats();
      setStats(statsData);
    } catch (err) {
      console.error('Error loading stats:', err);
      setError('Failed to load timesheet statistics');
    } finally {
      setStatsLoading(false);
    }
  };

  // Load timesheets
  const loadTimesheets = async () => {
    try {
      setLoading(true);
      const response = await timesheetService.getTimesheets({
        ...filters,
        page: pagination.page,
        limit: pagination.limit
      });
      setTimesheets(response.timesheets);
      setPagination(prev => ({
        ...prev,
        total: response.pagination.total,
        pages: response.pagination.pages
      }));
    } catch (err) {
      console.error('Error loading timesheets:', err);
      setError('Failed to load timesheets');
    } finally {
      setLoading(false);
    }
  };

  // Handle approval/rejection
  const handleApproval = async () => {
    if (!selectedTimesheet) return;

    try {
      setApprovalLoading(true);
      await timesheetService.approveTimesheet(selectedTimesheet.id, {
        action: approvalAction,
        comment: approvalComment
      });

      setSuccess(`Timesheet ${approvalAction}d successfully`);
      setApprovalDialogOpen(false);
      setSelectedTimesheet(null);
      setApprovalComment('');
      
      // Refresh data
      await Promise.all([loadStats(), loadTimesheets()]);
    } catch (err) {
      console.error('Error processing timesheet:', err);
      setError(`Failed to ${approvalAction} timesheet`);
    } finally {
      setApprovalLoading(false);
    }
  };

  // Handle filter changes
  const handleFilterChange = (field: keyof TimesheetFilters, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  };

  // Handle page change
  const handlePageChange = (event: React.ChangeEvent<unknown>, page: number) => {
    setPagination(prev => ({ ...prev, page }));
  };

  // Open detail dialog
  const openDetailDialog = (timesheet: Timesheet) => {
    setSelectedTimesheet(timesheet);
    setDetailDialogOpen(true);
  };

  // Open approval dialog
  const openApprovalDialog = (timesheet: Timesheet, action: 'approve' | 'reject') => {
    setSelectedTimesheet(timesheet);
    setApprovalAction(action);
    setApprovalComment('');
    setApprovalDialogOpen(true);
  };

  // Refresh all data
  const handleRefresh = async () => {
    setError(null);
    setSuccess(null);
    await Promise.all([loadStats(), loadTimesheets()]);
  };

  // Load data on component mount
  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    loadTimesheets();
  }, [filters, pagination.page, pagination.limit]);

  // Clear success message after 5 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const getStatusColor = (status: string): ChipColor => {
    switch (status) {
      case 'pending': return 'warning';
      case 'approved': return 'success';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <ScheduleIcon />;
      case 'approved': return <ApproveIcon />;
      case 'rejected': return <RejectIcon />;
      default: return <AssignmentIcon />;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Timesheet Processing
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={handleRefresh}
          disabled={loading || statsLoading}
        >
          Refresh
        </Button>
      </Box>

      {/* Error and Success Messages */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Pending Timesheets
                  </Typography>
                  <Typography variant="h4">
                    {statsLoading ? <CircularProgress size={24} /> : stats?.pendingTimesheets || 0}
                  </Typography>
                </Box>
                <Badge badgeContent={stats?.pendingTimesheets || 0} color="warning">
                  <ScheduleIcon color="warning" sx={{ fontSize: 40 }} />
                </Badge>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Approved This Month
                  </Typography>
                  <Typography variant="h4">
                    {statsLoading ? <CircularProgress size={24} /> : stats?.approvedThisMonth || 0}
                  </Typography>
                </Box>
                <TrendingUpIcon color="success" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total Hours This Month
                  </Typography>
                  <Typography variant="h4">
                    {statsLoading ? <CircularProgress size={24} /> : stats?.totalHoursThisMonth || 0}
                  </Typography>
                </Box>
                <AssignmentIcon color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Instructors with Pending
                  </Typography>
                  <Typography variant="h4">
                    {statsLoading ? <CircularProgress size={24} /> : stats?.instructorsWithPending || 0}
                  </Typography>
                </Box>
                <PeopleIcon color="info" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
            <FilterIcon sx={{ mr: 1 }} />
            Filters
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.status}
                  label="Status"
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                >
                  <MenuItem value="">All Statuses</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="approved">Approved</MenuItem>
                  <MenuItem value="rejected">Rejected</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Instructor ID"
                value={filters.instructorId}
                onChange={(e) => handleFilterChange('instructorId', e.target.value)}
                placeholder="Filter by instructor ID"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Month"
                type="number"
                value={filters.month}
                onChange={(e) => handleFilterChange('month', e.target.value)}
                placeholder="1-12"
                inputProps={{ min: 1, max: 12 }}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Timesheets Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Timesheets ({pagination.total} total)
          </Typography>
          
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Instructor</TableCell>
                      <TableCell>Week Period</TableCell>
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
                          <Box>
                            <Typography variant="body2" fontWeight="bold">
                              {timesheet.instructorName}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {timesheet.instructorEmail}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {format(new Date(timesheet.weekStartDate), 'MMM dd, yyyy')} - {format(new Date(new Date(timesheet.weekStartDate).getTime() + 6 * 24 * 60 * 60 * 1000), 'MMM dd, yyyy')}
                          </Typography>
                        </TableCell>
                        <TableCell>{timesheet.totalHours}</TableCell>
                        <TableCell>{timesheet.coursesTaught}</TableCell>
                        <TableCell>
                          <Chip
                            icon={getStatusIcon(timesheet.status)}
                            label={timesheet.status}
                            color={getStatusColor(timesheet.status)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {format(new Date(timesheet.createdAt), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Tooltip title="View Details">
                              <IconButton
                                size="small"
                                onClick={() => openDetailDialog(timesheet)}
                              >
                                <VisibilityIcon />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Pagination */}
              {pagination.pages > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                  <Pagination
                    count={pagination.pages}
                    page={pagination.page}
                    onChange={handlePageChange}
                    color="primary"
                  />
                </Box>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Timesheet Detail Dialog */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Timesheet Details
          {selectedTimesheet && (
            <Chip
              icon={getStatusIcon(selectedTimesheet.status)}
              label={selectedTimesheet.status}
              color={getStatusColor(selectedTimesheet.status)}
              sx={{ ml: 2 }}
            />
          )}
        </DialogTitle>
        <DialogContent>
          {selectedTimesheet && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Instructor
                  </Typography>
                  <Typography variant="body1">
                    {selectedTimesheet.instructorName} ({selectedTimesheet.instructorEmail})
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Week Period
                  </Typography>
                  <Typography variant="body1">
                    {format(new Date(selectedTimesheet.weekStartDate), 'EEEE, MMMM dd, yyyy')} - {format(new Date(new Date(selectedTimesheet.weekStartDate).getTime() + 6 * 24 * 60 * 60 * 1000), 'EEEE, MMMM dd, yyyy')}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Total Hours
                  </Typography>
                  <Typography variant="body1">{selectedTimesheet.totalHours}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Courses Taught
                  </Typography>
                  <Typography variant="body1">{selectedTimesheet.coursesTaught}</Typography>
                </Grid>
                {selectedTimesheet.courseDetails && selectedTimesheet.courseDetails.length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 2 }}>
                      Course Details
                    </Typography>
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Date</TableCell>
                            <TableCell>Time</TableCell>
                            <TableCell>Organization</TableCell>
                            <TableCell>Location</TableCell>
                            <TableCell>Course Type</TableCell>
                            <TableCell>Students</TableCell>
                            <TableCell>Status</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {selectedTimesheet.courseDetails.map((course: CourseDetail, index: number) => (
                            <TableRow key={index}>
                              <TableCell>{format(new Date(course.date), 'MMM dd, yyyy')}</TableCell>
                              <TableCell>
                                {course.startTime && course.endTime
                                  ? `${course.startTime} - ${course.endTime}`
                                  : 'TBD'
                                }
                              </TableCell>
                              <TableCell>{course.organizationName || 'TBD'}</TableCell>
                              <TableCell>{course.location || 'TBD'}</TableCell>
                              <TableCell>{course.courseType}</TableCell>
                              <TableCell>{course.studentCount ?? '-'}</TableCell>
                              <TableCell>
                                {course.status ? (
                                  <Chip
                                    label={course.status}
                                    color={course.status === 'completed' ? 'success' : 'primary'}
                                    size="small"
                                  />
                                ) : '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Grid>
                )}
                <Grid item xs={12}>
                  <TimesheetNotes 
                    timesheetId={selectedTimesheet.id}
                    onNotesChange={() => {
                      // Optionally refresh timesheet data if needed
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Submitted
                  </Typography>
                  <Typography variant="body1">
                    {format(new Date(selectedTimesheet.createdAt), 'MMM dd, yyyy HH:mm')}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Last Updated
                  </Typography>
                  <Typography variant="body1">
                    {format(new Date(selectedTimesheet.updatedAt), 'MMM dd, yyyy HH:mm')}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {selectedTimesheet?.status === 'pending' && (
            <>
              <Button
                color="success"
                startIcon={<ApproveIcon />}
                onClick={() => {
                  setDetailDialogOpen(false);
                  openApprovalDialog(selectedTimesheet, 'approve');
                }}
              >
                Approve
              </Button>
              <Button
                color="error"
                startIcon={<RejectIcon />}
                onClick={() => {
                  setDetailDialogOpen(false);
                  openApprovalDialog(selectedTimesheet, 'reject');
                }}
              >
                Reject
              </Button>
            </>
          )}
          <Button onClick={() => setDetailDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Approval/Rejection Dialog */}
      <Dialog
        open={approvalDialogOpen}
        onClose={() => setApprovalDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {approvalAction === 'approve' ? 'Approve' : 'Reject'} Timesheet
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ mb: 2 }}>
              {approvalAction === 'approve' 
                ? 'Are you sure you want to approve this timesheet?'
                : 'Are you sure you want to reject this timesheet?'
              }
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Comment (optional)"
              value={approvalComment}
              onChange={(e) => setApprovalComment(e.target.value)}
              placeholder={`Add a comment for the ${approvalAction === 'approve' ? 'approval' : 'rejection'}...`}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setApprovalDialogOpen(false)}
            disabled={approvalLoading}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color={approvalAction === 'approve' ? 'success' : 'error'}
            startIcon={approvalAction === 'approve' ? <ApproveIcon /> : <RejectIcon />}
            onClick={handleApproval}
            disabled={approvalLoading}
          >
            {approvalLoading ? <CircularProgress size={20} /> : approvalAction === 'approve' ? 'Approve' : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TimesheetProcessingDashboard; 