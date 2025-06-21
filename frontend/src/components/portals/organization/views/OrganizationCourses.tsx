import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Visibility as ViewIcon,
  Upload as UploadIcon,
  Block as BlockIcon,
} from '@mui/icons-material';

// TypeScript interfaces
interface Course {
  id: string | number;
  date_requested: string;
  course_type_name: string;
  location: string;
  students_registered: number;
  status: string;
  instructor: string;
  notes?: string;
  confirmed_date?: string;
}

interface OrganizationCoursesProps {
  courses: Course[];
  onViewStudentsClick?: (courseId: string | number) => void;
  onUploadStudentsClick?: (courseId: string | number) => void;
}

const OrganizationCourses: React.FC<OrganizationCoursesProps> = ({ 
  courses, 
  onViewStudentsClick, 
  onUploadStudentsClick 
}) => {
  // Get status color for courses
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
      case 'completed':
        return 'success';
      case 'cancelled':
      case 'past_due':
        return 'error';
      default:
        return 'warning';
    }
  };

  // Get status label
  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
  };

  // Helper function to check if upload should be disabled
  const isUploadDisabled = (course: Course) => {
    // Disable if course is completed or cancelled
    if (['completed', 'cancelled'].includes(course.status?.toLowerCase())) {
      return true;
    }

    // Disable if it's the day of the class (confirmed_date)
    if (course.confirmed_date) {
      const today = new Date();
      const classDate = new Date(course.confirmed_date);

      // Set both dates to start of day for accurate comparison
      today.setHours(0, 0, 0, 0);
      classDate.setHours(0, 0, 0, 0);

      // Disable uploads on or after the class date
      return classDate <= today;
    }

    return false;
  };

  // Helper function to get upload tooltip message
  const getUploadTooltip = (course: Course) => {
    if (['completed', 'cancelled'].includes(course.status?.toLowerCase())) {
      return `Cannot upload students - Course is ${course.status?.toLowerCase()}`;
    }

    if (course.confirmed_date) {
      const today = new Date();
      const classDate = new Date(course.confirmed_date);

      today.setHours(0, 0, 0, 0);
      classDate.setHours(0, 0, 0, 0);

      if (classDate < today) {
        return 'Cannot upload students - Class has already occurred';
      } else if (classDate.getTime() === today.getTime()) {
        return "Cannot upload students - It's the day of the class";
      }
    }

    return 'Upload Student List (CSV)';
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        My Courses
      </Typography>

      <Paper sx={{ p: 3 }}>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Search courses..."
              variant="outlined"
              size="small"
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select label="Status" defaultValue="">
                <MenuItem value="">All Statuses</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="confirmed">Confirmed</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Course Type</InputLabel>
              <Select label="Course Type" defaultValue="">
                <MenuItem value="">All Types</MenuItem>
                <MenuItem value="cpr">CPR</MenuItem>
                <MenuItem value="first_aid">First Aid</MenuItem>
                <MenuItem value="bls">BLS</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {courses.length} courses found
            </Typography>
          </Grid>
        </Grid>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Course Type</TableCell>
                <TableCell>Date Requested</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Students Registered</TableCell>
                <TableCell>Instructor</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Notes</TableCell>
                <TableCell sx={{ textAlign: 'center' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {courses.map((course) => {
                const uploadDisabled = isUploadDisabled(course);
                const uploadTooltip = getUploadTooltip(course);

                return (
                  <TableRow key={course.id}>
                    <TableCell>{course.course_type_name}</TableCell>
                    <TableCell>
                      {new Date(course.date_requested).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{course.location}</TableCell>
                    <TableCell>{course.students_registered}</TableCell>
                    <TableCell>{course.instructor || 'TBD'}</TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusLabel(course.status)}
                        color={getStatusColor(course.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {course.notes && (
                        <Typography variant="body2" color="text.secondary">
                          {course.notes}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                        <Tooltip title={uploadTooltip}>
                          <span>
                            <IconButton
                              onClick={() => onUploadStudentsClick && onUploadStudentsClick(course.id)}
                              size="small"
                              color={uploadDisabled ? 'default' : 'primary'}
                              disabled={uploadDisabled}
                              sx={{
                                bgcolor: uploadDisabled
                                  ? 'action.disabledBackground'
                                  : 'primary.light',
                                '&:hover': {
                                  bgcolor: uploadDisabled
                                    ? 'action.disabledBackground'
                                    : 'primary.main',
                                  color: uploadDisabled
                                    ? 'action.disabled'
                                    : 'white',
                                },
                                '&.Mui-disabled': {
                                  bgcolor: 'action.disabledBackground',
                                  color: 'action.disabled',
                                },
                              }}
                            >
                              {uploadDisabled ? (
                                <BlockIcon fontSize="small" />
                              ) : (
                                <UploadIcon fontSize="small" />
                              )}
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="View Student List">
                          <IconButton
                            onClick={() => onViewStudentsClick && onViewStudentsClick(course.id)}
                            size="small"
                            color="secondary"
                            sx={{
                              bgcolor: 'secondary.light',
                              '&:hover': {
                                bgcolor: 'secondary.main',
                                color: 'white',
                              },
                            }}
                          >
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
              {courses.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    No courses found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default OrganizationCourses; 