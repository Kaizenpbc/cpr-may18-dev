import React from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import api from '../../../services/api';

const OrganizationPortal: React.FC = () => {
  const { data: courses, isLoading, error } = useQuery({
    queryKey: ['organizationCourses'],
    queryFn: async () => {
      const response = await api.get('/courses/organization');
      return response.data;
    },
  });

  // Function to get status color based on course status
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'past_due':
        return 'error';
      case 'cancelled':
        return 'error';
      case 'confirmed':
        return 'success';
      case 'completed':
        return 'success';
      default:
        return 'warning';
    }
  };

  // Function to get status label based on course status
  const getStatusLabel = (course: any) => {
    if (isCoursePastScheduledDate(course)) {
      return 'Past Due';
    }
    return course.status.charAt(0).toUpperCase() + course.status.slice(1);
  };

  // Function to check if course is past scheduled date
  const isCoursePastScheduledDate = (course: any) => {
    const scheduledDate = new Date(course.scheduled_date);
    const today = new Date();
    // Set both dates to midnight for accurate day comparison
    scheduledDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    // Return true if today is after the scheduled date
    return today > scheduledDate;
  };

  if (isLoading) {
    return <Typography>Loading courses...</Typography>;
  }

  if (error) {
    return <Typography color="error">Error loading courses</Typography>;
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Organization Courses
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Course Type</TableCell>
              <TableCell>Scheduled Date</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Students</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Notes</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {courses?.map((course: any) => (
              <TableRow key={course.id}>
                <TableCell>{course.course_type_name}</TableCell>
                <TableCell>{course.scheduled_date}</TableCell>
                <TableCell>{course.location}</TableCell>
                <TableCell>{course.registered_students}</TableCell>
                <TableCell>
                  <Chip
                    label={getStatusLabel(course)}
                    color={getStatusColor(course.status)}
                    size='small'
                  />
                </TableCell>
                <TableCell>
                  {isCoursePastScheduledDate(course) ? (
                    <Typography color="error" variant="body2">
                      Course is past due and needs to be cancelled
                    </Typography>
                  ) : course.status === 'pending' ? (
                    <Typography color="warning" variant="body2">
                      Awaiting instructor assignment
                    </Typography>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default OrganizationPortal; 