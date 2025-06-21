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
} from '@mui/material';

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
}

interface OrganizationCoursesProps {
  courses: Course[];
}

const OrganizationCourses: React.FC<OrganizationCoursesProps> = ({ courses }) => {
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
              </TableRow>
            </TableHead>
            <TableBody>
              {courses.map((course) => (
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
                </TableRow>
              ))}
              {courses.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center">
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