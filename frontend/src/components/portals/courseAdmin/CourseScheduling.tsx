import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import { 
  Cancel as CancelIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { api } from '../../../services/api';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import { useQueryClient } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { formatDateWithoutTimezone } from '../../../utils/dateUtils';

interface Course {
  id: number;
  courseType: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  organization: string;
  status: string;
  instructor?: string;
  registeredStudents?: number;
}

const CourseScheduling = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showSuccess, showError } = useSnackbar();
  const queryClient = useQueryClient();

  // Filter states
  const [instructorFilter, setInstructorFilter] = useState('');
  const [organizationFilter, setOrganizationFilter] = useState('');
  const [dateFilter, setDateFilter] = useState<Date | null>(null);

  // State for cancel dialog
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [courseToCancel, setCourseToCancel] = useState<Course | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // Fetch courses with React Query
  const { data: courses = [] } = useQuery({
    queryKey: ['courses'],
    queryFn: async () => {
      const response = await api.get('/courses/confirmed');
      return response.data.data;
    },
    refetchInterval: 60000, // Poll every 60 seconds (reduced due to real-time updates)
  });

  // Get unique instructors and organizations for filter options
  const uniqueInstructors = useMemo((): string[] => {
    const instructors = courses
      .map((course: Record<string, unknown>) => course.instructorName as string)
      .filter((name): name is string => !!name && name !== 'Not Assigned');
    return Array.from(new Set<string>(instructors)).sort();
  }, [courses]);

  const uniqueOrganizations = useMemo((): string[] => {
    const organizations = courses
      .map((course: Record<string, unknown>) => course.organizationName as string)
      .filter((name): name is string => !!name);
    return Array.from(new Set<string>(organizations)).sort();
  }, [courses]);

  // Filter courses based on selected filters
  const filteredCourses = useMemo(() => {
    return courses.filter((course: Record<string, unknown>) => {
      // Instructor filter
      if (instructorFilter && course.instructorName !== instructorFilter) {
        return false;
      }

      // Organization filter
      if (organizationFilter && course.organizationName !== organizationFilter) {
        return false;
      }

      // Date filter
      if (dateFilter) {
        const courseDate = new Date(course.scheduledDate as string);
        const filterDate = new Date(dateFilter);
        if (courseDate.toDateString() !== filterDate.toDateString()) {
          return false;
        }
      }

      return true;
    });
  }, [courses, instructorFilter, organizationFilter, dateFilter]);

  // Clear all filters
  const clearFilters = () => {
    setInstructorFilter('');
    setOrganizationFilter('');
    setDateFilter(null);
  };

  // Check if any filters are active
  const hasActiveFilters = instructorFilter || organizationFilter || dateFilter;

  const handleCancelClick = (course: Course) => {
    setCourseToCancel(course);
    setCancelReason('');
    setCancelDialogOpen(true);
  };

  const handleCancelClose = () => {
    setCancelDialogOpen(false);
    setCourseToCancel(null);
    setCancelReason('');
  };

  const handleCancelSubmit = async () => {
    if (!courseToCancel || !cancelReason.trim()) {
      showError('Please provide a reason for cancellation');
      return;
    }

    try {
      await api.put(`/courses/${courseToCancel.id}/cancel`, {
        reason: cancelReason,
      });

      showSuccess('Course cancelled successfully');
      
      // Refresh all relevant data
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      
      handleCancelClose();
    } catch (err: unknown) {
      console.error('Error cancelling course:', err);
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
      showError(axiosErr.response?.data?.error?.message || 'Failed to cancel course');
    }
  };

  return (
    <Box>
      <Typography variant='h5' gutterBottom>
        Course Scheduling
      </Typography>

      {error && (
        <Alert severity='error' sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Filters Section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <FilterIcon sx={{ mr: 1 }} />
          <Typography variant='h6'>Filters</Typography>
          {hasActiveFilters && (
            <Chip
              label={`${filteredCourses.length} of ${courses.length} courses`}
              color="primary"
              size="small"
              sx={{ ml: 2 }}
            />
          )}
        </Box>
        
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Instructor</InputLabel>
              <Select
                value={instructorFilter}
                onChange={(e) => setInstructorFilter(e.target.value)}
                label="Instructor"
              >
                <MenuItem value="">All Instructors</MenuItem>
                {uniqueInstructors.map((instructor) => (
                  <MenuItem key={instructor} value={instructor}>
                    {instructor}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Organization</InputLabel>
              <Select
                value={organizationFilter}
                onChange={(e) => setOrganizationFilter(e.target.value)}
                label="Organization"
              >
                <MenuItem value="">All Organizations</MenuItem>
                {uniqueOrganizations.map((organization) => (
                  <MenuItem key={organization} value={organization}>
                    {organization}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              label="Date"
              type="date"
              value={dateFilter ? dateFilter.toISOString().slice(0, 10) : ''}
              onChange={(e) => setDateFilter(e.target.value ? new Date(e.target.value) : null)}
              InputLabelProps={{
                shrink: true,
              }}
              fullWidth
              size="small"
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                size="small"
                onClick={clearFilters}
                disabled={!hasActiveFilters}
                startIcon={<ClearIcon />}
              >
                Clear Filters
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Course Name</TableCell>
              <TableCell>Organization</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Instructor</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredCourses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  {hasActiveFilters ? 'No courses match the selected filters' : 'No courses found'}
                </TableCell>
              </TableRow>
            ) : (
              filteredCourses.map((course: Record<string, unknown>) => (
                <TableRow key={course.id as number}>
                  <TableCell>
                    {formatDateWithoutTimezone(course.scheduledDate as string)}
                  </TableCell>
                  <TableCell>{(course.courseTypeName || course.courseType || '-') as string}</TableCell>
                  <TableCell>{course.organizationName as string}</TableCell>
                  <TableCell>{course.location as string}</TableCell>
                  <TableCell>{(course.instructorName || 'Not Assigned') as string}</TableCell>
                  <TableCell>{course.status as string}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        startIcon={<CancelIcon />}
                        onClick={() => handleCancelClick(course as unknown as Course)}
                      >
                        Cancel Course
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Cancel Course Dialog */}
      <Dialog
        open={cancelDialogOpen}
        onClose={handleCancelClose}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>Cancel Course</DialogTitle>
        <DialogContent>
          <Typography variant='subtitle1' gutterBottom sx={{ mb: 2 }}>
            Course Name: {courseToCancel?.courseType}
            <br />
            Organization: {courseToCancel?.organization}
            <br />
            Location: {courseToCancel?.location}
            <br />
            Students: {courseToCancel?.registeredStudents || 0}
          </Typography>

          <Typography variant='body2' color='error' sx={{ mb: 2 }}>
            Are you sure you want to cancel this course? This action cannot be
            undone.
          </Typography>

          <TextField
            label='Reason for Cancellation'
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            fullWidth
            multiline
            rows={4}
            required
            placeholder='Please provide a detailed reason for cancelling this course...'
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelClose}>Cancel</Button>
          <Button
            onClick={handleCancelSubmit}
            variant='contained'
            color='error'
            disabled={!cancelReason.trim()}
          >
            Cancel Course
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CourseScheduling;
