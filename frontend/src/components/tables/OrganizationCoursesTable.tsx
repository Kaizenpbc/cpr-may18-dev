import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Chip,
  Typography,
  Box,
  ButtonGroup,
} from '@mui/material';
import {
  Visibility as ViewIcon,
  Upload as UploadIcon,
  Group as GroupIcon,
  PersonAdd as RegisteredIcon,
  CheckCircle as AttendedIcon,
  Block as BlockIcon,
} from '@mui/icons-material';
import logger from '../../utils/logger';
import { formatDisplayDate } from '../../utils/dateUtils';

interface Course {
  id: string | number;
  date_requested: string;
  course_type_name: string;
  location: string;
  registered_students: number;
  status: string;
  instructor: string;
  notes?: string;
}

interface OrganizationCoursesTableProps {
  courses: Course[];
  onViewStudentsClick?: (courseId: string | number) => void;
  onUploadStudentsClick?: (courseId: string | number) => void;
  sortOrder?: 'asc' | 'desc';
  sortBy?: string;
}

const getStatusChipColor = (status: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
  switch (status?.toLowerCase()) {
    case 'scheduled':
      return 'primary';
    case 'completed':
      return 'success';
    case 'cancelled':
      return 'error';
    case 'pending':
      return 'warning';
    default:
      return 'default';
  }
};

const formatDate = dateString => {
  if (!dateString) return '-';
  try {
    return new Date(dateString).toLocaleDateString();
  } catch (error) {
    logger.error('Error formatting date:', error);
    return dateString;
  }
};

const formatTime = timeString => {
  if (!timeString) return '-';
  try {
    return timeString.slice(0, 5); // HH:MM format
  } catch (error) {
    logger.error('Error formatting time:', error);
    return timeString;
  }
};

// Helper function to check if upload should be disabled
const isUploadDisabled = course => {
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
const getUploadTooltip = course => {
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

const OrganizationCoursesTable: React.FC<OrganizationCoursesTableProps> = ({
  courses = [],
  onViewStudentsClick,
  onUploadStudentsClick,
  sortOrder,
  sortBy,
}) => {
  logger.info('OrganizationCoursesTable rendering with courses:', courses);

  if (!courses || courses.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant='h6' color='textSecondary'>
          No courses found
        </Typography>
        <Typography variant='body2' color='textSecondary' sx={{ mt: 1 }}>
          Start by requesting a new course using the "Schedule Course" option.
        </Typography>
      </Box>
    );
  }

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Course Name</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Location</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Students</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Instructor</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Notes</TableCell>
            <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>
              Class Management
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {courses.map((course: Course) => {
            const uploadDisabled = isUploadDisabled(course);
            const uploadTooltip = getUploadTooltip(course);

            return (
              <TableRow key={course.id} hover>
                <TableCell>{formatDisplayDate(course.date_requested)}</TableCell>
                <TableCell>{course.course_type_name || '-'}</TableCell>
                <TableCell>{course.location || '-'}</TableCell>
                <TableCell>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 0.5,
                    }}
                  >
                    <RegisteredIcon fontSize='small' color='primary' />
                    <Typography variant='body2' color='primary.main'>
                      {course.registered_students || 0}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={course.status || 'Unknown'}
                    color={getStatusChipColor(course.status)}
                    size='small'
                  />
                </TableCell>
                <TableCell>{course.instructor || '-'}</TableCell>
                <TableCell>
                  {course.notes ? (
                    <Tooltip title={course.notes}>
                      <Typography
                        variant='body2'
                        sx={{
                          maxWidth: 100,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {course.notes}
                      </Typography>
                    </Tooltip>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell>
                  <Box
                    sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}
                  >
                    <Tooltip title={uploadTooltip}>
                      <span>
                        <IconButton
                          onClick={() =>
                            onUploadStudentsClick &&
                            onUploadStudentsClick(course.id)
                          }
                          size='small'
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
                            <BlockIcon fontSize='small' />
                          ) : (
                            <UploadIcon fontSize='small' />
                          )}
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title='View Student List'>
                      <IconButton
                        onClick={() =>
                          onViewStudentsClick && onViewStudentsClick(course.id)
                        }
                        size='small'
                        color='secondary'
                        sx={{
                          bgcolor: 'secondary.light',
                          '&:hover': {
                            bgcolor: 'secondary.main',
                            color: 'white',
                          },
                        }}
                      >
                        <ViewIcon fontSize='small' />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default OrganizationCoursesTable;
