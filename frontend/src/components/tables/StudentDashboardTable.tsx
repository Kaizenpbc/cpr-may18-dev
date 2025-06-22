import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Chip,
  Box,
} from '@mui/material';
import { formatDisplayDate } from '../../utils/dateUtils';

interface Course {
  id: string | number;
  date: string;
  course_type: string;
  location: string;
  instructor: string;
  status: string;
  certificate_url?: string;
}

interface StudentDashboardTableProps {
  courses: Course[];
  onViewCertificateClick?: (courseId: string | number) => void;
}

const getStatusChipColor = (status: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
  switch (status?.toLowerCase()) {
    case 'completed':
      return 'success';
    case 'scheduled':
      return 'primary';
    case 'cancelled':
      return 'error';
    case 'pending':
      return 'warning';
    default:
      return 'default';
  }
};

const StudentDashboardTable: React.FC<StudentDashboardTableProps> = ({
  courses = [],
  onViewCertificateClick,
}) => {
  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Course Name</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Location</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Instructor</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Certificate</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {courses.map((course: Course) => (
            <TableRow key={course.id} hover>
              <TableCell>{formatDisplayDate(course.date)}</TableCell>
              <TableCell>{course.course_type || '-'}</TableCell>
              <TableCell>{course.location || '-'}</TableCell>
              <TableCell>{course.instructor || '-'}</TableCell>
              <TableCell>
                <Chip
                  label={course.status || 'Unknown'}
                  color={getStatusChipColor(course.status)}
                  size="small"
                />
              </TableCell>
              <TableCell>
                {course.certificate_url ? (
                  <Chip
                    label="View Certificate"
                    color="primary"
                    size="small"
                    onClick={() => onViewCertificateClick?.(course.id)}
                    clickable
                  />
                ) : (
                  '-'
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default StudentDashboardTable; 