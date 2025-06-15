import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import api from '../../../services/api';
import { formatDateWithoutTimezone } from '../../../utils/dateUtils';

const CancelledCourses: React.FC = () => {
  const { data: cancelledCourses, isLoading, error } = useQuery({
    queryKey: ['cancelledCourses'],
    queryFn: async () => {
      const response = await api.get('/courses/cancelled');
      return response.data;
    },
  });

  if (isLoading) {
    return <Typography>Loading cancelled courses...</Typography>;
  }

  if (error) {
    return <Typography color="error">Error loading cancelled courses</Typography>;
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Cancelled Courses
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Course Type</TableCell>
              <TableCell>Organization</TableCell>
              <TableCell>Scheduled Date</TableCell>
              <TableCell>Cancelled Date</TableCell>
              <TableCell>Reason</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Students</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {cancelledCourses?.map((course: any) => (
              <TableRow key={course.id}>
                <TableCell>{course.course_type_name}</TableCell>
                <TableCell>{course.organization_name}</TableCell>
                <TableCell>{formatDateWithoutTimezone(course.scheduled_date)}</TableCell>
                <TableCell>{formatDateWithoutTimezone(course.cancelled_at)}</TableCell>
                <TableCell>{course.cancellation_reason}</TableCell>
                <TableCell>{course.location}</TableCell>
                <TableCell>{course.registered_students}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default CancelledCourses; 