import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  Add as AddIcon,
  CheckCircle as CheckCircleIcon,
  Event as EventIcon,
  LocationOn as LocationIcon,
  Group as GroupIcon,
} from '@mui/icons-material';
import { timesheetService, TimesheetSubmission as TimesheetSubmissionData, WeekCourses } from '../../services/timesheetService';
import { useAuth } from '../../contexts/AuthContext';

interface TimesheetSubmissionProps {
  onTimesheetSubmitted?: () => void;
}

const TimesheetSubmission: React.FC<TimesheetSubmissionProps> = ({ onTimesheetSubmitted }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState<TimesheetSubmissionData>({
    week_start_date: '',
    total_hours: 0,
    courses_taught: 0,
    notes: '',
  });
  const [weekCourses, setWeekCourses] = useState<WeekCourses | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [existingTimesheet, setExistingTimesheet] = useState<any>(null);
  const [checkingExisting, setCheckingExisting] = useState(false);

  // Auto-populate week start date on component mount and check for existing timesheet
  useEffect(() => {
    const currentWeekStart = getCurrentWeekStart();
    setFormData(prev => ({
      ...prev,
      week_start_date: currentWeekStart,
    }));
    
    // Check if timesheet already exists for this week
    checkExistingTimesheet(currentWeekStart);
  }, []);

  const checkExistingTimesheet = async (weekStartDate: string) => {
    setCheckingExisting(true);
    try {
      const response = await timesheetService.getTimesheets();
      const existing = response.timesheets.find(ts => 
        ts.week_start_date === weekStartDate || 
        ts.week_start_date.startsWith(weekStartDate)
      );
      setExistingTimesheet(existing);
    } catch (err) {
      console.error('Error checking existing timesheet:', err);
    } finally {
      setCheckingExisting(false);
    }
  };

  const handleChange = (field: keyof TimesheetSubmissionData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = field === 'total_hours' || field === 'courses_taught' 
      ? parseFloat(event.target.value) || 0 
      : event.target.value;
    
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    
    // Clear messages on change
    setError(null);
    setSuccess(null);
  };

  // Fetch courses when week start date changes
  useEffect(() => {
    if (formData.week_start_date) {
      fetchWeekCourses(formData.week_start_date);
    } else {
      setWeekCourses(null);
      setFormData(prev => ({ ...prev, courses_taught: 0 }));
    }
  }, [formData.week_start_date]);

  const fetchWeekCourses = async (weekStartDate: string) => {
    setLoadingCourses(true);
    try {
      const courses = await timesheetService.getWeekCourses(weekStartDate);
      setWeekCourses(courses);
      // Auto-populate courses taught
      setFormData(prev => ({ ...prev, courses_taught: courses.total_courses }));
    } catch (err: any) {
      console.error('Error fetching week courses:', err);
      setWeekCourses(null);
      setFormData(prev => ({ ...prev, courses_taught: 0 }));
    } finally {
      setLoadingCourses(false);
    }
  };

  const canSubmitTimesheet = (): boolean => {
    if (!formData.week_start_date) return false;
    
    const today = new Date();
    const weekStart = new Date(formData.week_start_date);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6); // Sunday
    
    // Can submit if today is between Monday and Sunday of the week
    return today >= weekStart && today <= weekEnd;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!formData.week_start_date) {
      setError('Week start date is required');
      return;
    }

    if (!canSubmitTimesheet()) {
      setError('You can only submit timesheets during the week (Monday to Sunday)');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await timesheetService.submitTimesheet(formData);
      
      setSuccess('Timesheet submitted successfully! HR will review and approve it.');
      
      // Reset form to current week
      const currentWeekStart = getCurrentWeekStart();
      setFormData({
        week_start_date: currentWeekStart,
        total_hours: 0,
        courses_taught: 0,
        notes: '',
      });
      setWeekCourses(null);
      
      // Notify parent component
      if (onTimesheetSubmitted) {
        onTimesheetSubmitted();
      }
    } catch (err: any) {
      // Handle specific error cases with user-friendly messages
      const errorMessage = err.response?.data?.message || err.message || 'Failed to submit timesheet';
      
      if (errorMessage.includes('already exists for this week')) {
        setError('You have already submitted a timesheet for this week. You can view or update your existing timesheet in the timesheet history.');
      } else if (errorMessage.includes('Week start date must be a Monday')) {
        setError('The week start date must be a Monday. Please contact support if you see this error.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const getCurrentWeekStart = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday = 1, Sunday = 0
    const monday = new Date(today);
    monday.setDate(today.getDate() - daysToSubtract);
    
    // Format as YYYY-MM-DD in local time (not UTC)
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`;
  };

  const formatDate = (dateString: string) => {
    // Parse the date string as local time to avoid timezone issues
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day); // month is 0-indexed
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    return timeString.substring(0, 5); // Extract HH:MM
  };

  const getSubmissionStatus = () => {
    if (!formData.week_start_date) return { canSubmit: false, message: 'Loading...' };
    
    const today = new Date();
    const weekStart = new Date(formData.week_start_date);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    if (today < weekStart) {
      return { canSubmit: false, message: 'Week has not started yet' };
    } else if (today > weekEnd) {
      return { canSubmit: false, message: 'Week has ended - cannot submit' };
    } else {
      return { canSubmit: true, message: 'Can submit timesheet' };
    }
  };

  const submissionStatus = getSubmissionStatus();

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <AssignmentIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6" component="h2">
            Submit Timesheet
          </Typography>
        </Box>

        {error && (
          <Alert 
            severity="error" 
            sx={{ mb: 2 }}
            action={
              error.includes('already submitted a timesheet for this week') ? (
                <Button 
                  color="inherit" 
                  size="small" 
                  onClick={() => {
                    // This could navigate to timesheet history or trigger a callback
                    if (onTimesheetSubmitted) {
                      onTimesheetSubmitted();
                    }
                  }}
                >
                  View Timesheets
                </Button>
              ) : undefined
            }
          >
            {error}
          </Alert>
        )}

        {existingTimesheet && !checkingExisting && (
          <Alert 
            severity="warning" 
            sx={{ mb: 2 }}
            action={
              <Button 
                color="inherit" 
                size="small" 
                onClick={() => {
                  if (onTimesheetSubmitted) {
                    onTimesheetSubmitted();
                  }
                }}
              >
                View Timesheets
              </Button>
            }
          >
            You have already submitted a timesheet for this week (Week of {formatDate(existingTimesheet.week_start_date)}). 
            You can view or update your existing timesheet in the timesheet history.
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <Paper sx={{ p: 3 }}>
          <Box component="form" onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Week Start Date (Monday)"
                  type="date"
                  value={formData.week_start_date}
                  InputLabelProps={{ shrink: true }}
                  required
                  disabled={true}
                  helperText="Auto-set to Monday of current week (read-only)"
                  sx={{
                    '& .MuiInputBase-input.Mui-disabled': {
                      WebkitTextFillColor: 'rgba(0, 0, 0, 0.87)',
                      backgroundColor: 'rgba(0, 0, 0, 0.04)',
                    }
                  }}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Total Hours"
                  type="number"
                  value={formData.total_hours}
                  onChange={handleChange('total_hours')}
                  disabled={loading}
                  inputProps={{ min: 0, step: 0.5 }}
                  helperText="Total hours worked this week (optional)"
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Courses Taught"
                  type="number"
                  value={formData.courses_taught}
                  disabled={true}
                  inputProps={{ min: 0 }}
                  helperText="Auto-calculated from your scheduled courses"
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Notes"
                  multiline
                  rows={3}
                  value={formData.notes}
                  onChange={handleChange('notes')}
                  disabled={loading}
                  helperText="Additional notes about your work this week (optional)"
                  placeholder="Describe any special circumstances, extra work, or important details..."
                />
              </Grid>
              
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      Submitted by: {user?.username || 'Instructor'}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Status: <Chip label="PENDING" color="warning" size="small" />
                    </Typography>
                    <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                      {submissionStatus.message}
                    </Typography>
                  </Box>
                  
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={loading ? <CircularProgress size={20} /> : <AddIcon />}
                    disabled={loading || !submissionStatus.canSubmit || existingTimesheet}
                    size="large"
                  >
                    {loading ? 'Submitting...' : existingTimesheet ? 'Timesheet Already Submitted' : 'Submit Timesheet'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </Paper>

        {/* Week Courses Section */}
        {formData.week_start_date && (
          <Paper sx={{ p: 3, mt: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <EventIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6" component="h3">
                Courses for Week of {formatDate(formData.week_start_date)}
              </Typography>
            </Box>

            {loadingCourses ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <CircularProgress size={24} />
              </Box>
            ) : weekCourses ? (
              <Box>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Week: {formatDate(weekCourses.week_start_date)} to {formatDate(weekCourses.week_end_date)}
                </Typography>
                
                {weekCourses.courses.length > 0 ? (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Organization</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Location</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Course Type</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Students</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {weekCourses.courses.map((course) => (
                          <TableRow key={course.id} hover>
                            <TableCell>{formatDate(course.date)}</TableCell>
                            <TableCell>{course.organization_name}</TableCell>
                            <TableCell>{course.location || 'TBD'}</TableCell>
                            <TableCell>{course.course_type}</TableCell>
                            <TableCell>{course.student_count}</TableCell>
                            <TableCell>
                              <Chip 
                                label={course.status} 
                                color={course.status === 'completed' ? 'success' : 'primary'} 
                                size="small"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Alert severity="info">
                    No courses scheduled for this week.
                  </Alert>
                )}
              </Box>
            ) : (
              <Alert severity="warning">
                Unable to load courses for this week. Please try again.
              </Alert>
            )}
          </Paper>
        )}

        <Divider sx={{ my: 2 }} />
        
        <Box>
          <Typography variant="subtitle2" color="textSecondary" gutterBottom>
            Timesheet Guidelines:
          </Typography>
          <Typography variant="body2" color="textSecondary" paragraph>
            • Submit one timesheet per week (Monday to Sunday)
          </Typography>
          <Typography variant="body2" color="textSecondary" paragraph>
            • Week start date is automatically set to Monday of the current week
          </Typography>
          <Typography variant="body2" color="textSecondary" paragraph>
            • You can submit your timesheet any day from Monday to Sunday of the week
          </Typography>
          <Typography variant="body2" color="textSecondary" paragraph>
            • Courses taught is automatically calculated from your scheduled courses
          </Typography>
          <Typography variant="body2" color="textSecondary" paragraph>
            • Include all hours worked, including preparation and travel time
          </Typography>
          <Typography variant="body2" color="textSecondary" paragraph>
            • HR will review and approve your timesheet within 2-3 business days
          </Typography>
          <Typography variant="body2" color="textSecondary">
            • You'll be notified when your timesheet is approved or if changes are needed
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default TimesheetSubmission; 