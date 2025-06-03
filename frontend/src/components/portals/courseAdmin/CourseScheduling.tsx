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
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { api } from '../../../services/api';
import { useSnackbar } from '../../../contexts/SnackbarContext';

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
}

const CourseScheduling = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showSuccess, showError } = useSnackbar();

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/v1/courses');
      setCourses(response.data.data);
    } catch (err) {
      setError('Failed to fetch courses');
      showError('Failed to fetch courses');
    } finally {
      setLoading(false);
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

      {loading ? (
        <Box display='flex' justifyContent='center' p={3}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Typography variant='h6' gutterBottom>
                Upcoming Courses
              </Typography>
              {courses.length === 0 ? (
                <Typography color='textSecondary'>
                  No courses scheduled
                </Typography>
              ) : (
                courses.map(course => (
                  <Box
                    key={course.id}
                    sx={{ mb: 2, p: 2, border: '1px solid #eee' }}
                  >
                    <Typography variant='subtitle1'>
                      {course.courseType}
                    </Typography>
                    <Typography variant='body2' color='textSecondary'>
                      Date: {new Date(course.date).toLocaleDateString()}
                    </Typography>
                    <Typography variant='body2' color='textSecondary'>
                      Time: {course.startTime} - {course.endTime}
                    </Typography>
                    <Typography variant='body2' color='textSecondary'>
                      Location: {course.location}
                    </Typography>
                    <Typography variant='body2' color='textSecondary'>
                      Organization: {course.organization}
                    </Typography>
                    <Typography variant='body2' color='textSecondary'>
                      Status: {course.status}
                    </Typography>
                    {course.instructor && (
                      <Typography variant='body2' color='textSecondary'>
                        Instructor: {course.instructor}
                      </Typography>
                    )}
                  </Box>
                ))
              )}
            </Paper>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default CourseScheduling;
