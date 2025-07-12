import React, { useState, useEffect } from 'react';
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
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { api } from '../../../services/api';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import { useQueryClient } from '@tanstack/react-query';
import { Cancel as CancelIcon } from '@mui/icons-material';
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
  registered_students?: number;
}

const CourseScheduling = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showSuccess, showError } = useSnackbar();
  const queryClient = useQueryClient();

  // State for cancel dialog
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [courseToCancel, setCourseToCancel] = useState<Course | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // Fetch courses with React Query
  const { data: courses = [] } = useQuery({
    queryKey: ['courses'],
    queryFn: async () => {
      const response = await api.get('/courses/pending');
      return response.data.data;
    },
    refetchInterval: 60000, // Poll every 60 seconds (reduced due to real-time updates)
  });

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
    } catch (err: any) {
      console.error('Error cancelling course:', err);
      showError(err.response?.data?.error?.message || 'Failed to cancel course');
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
            {courses.map((course: any) => (
              <TableRow key={course.id}>
                <TableCell>
                  {formatDateWithoutTimezone(course.scheduled_date)}
                </TableCell>
                <TableCell>{course.course_type_name || course.course_type || '-'}</TableCell>
                <TableCell>{course.organization_name}</TableCell>
                <TableCell>{course.location}</TableCell>
                <TableCell>{course.instructor_name || 'Not Assigned'}</TableCell>
                <TableCell>{course.status}</TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      startIcon={<CancelIcon />}
                      onClick={() => handleCancelClick(course)}
                    >
                      Cancel Course
                    </Button>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
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
            Students: {courseToCancel?.registered_students || 0}
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
