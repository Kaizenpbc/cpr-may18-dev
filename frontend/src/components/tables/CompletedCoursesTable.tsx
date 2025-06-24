import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Box,
  Typography,
  Tooltip,
  TableSortLabel,
  IconButton,
} from '@mui/material';
import { visuallyHidden } from '@mui/utils';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import PaymentIcon from '@mui/icons-material/Payment';
import EmailIcon from '@mui/icons-material/Email';
import {
  formatCurrency,
  getStatusChipColor,
} from '../../utils/formatters';
import { formatDisplayDate } from '../../utils/dateUtils';

const CompletedCoursesTable = ({
  courses,
  onViewStudentsClick,
  onBillClick,
  sortOrder,
  sortBy,
  onSortRequest,
}) => {
  if (!courses || courses.length === 0) {
    return <Typography sx={{ mt: 2 }}>No completed courses found.</Typography>;
  }

  const createSortHandler = property => event => {
    onSortRequest(property);
  };

  return (
    <TableContainer component={Paper} sx={{ mt: 2 }}>
      <Table stickyHeader aria-label='completed courses table'>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 'bold' }}>System Date</TableCell>
            <TableCell
              key='date'
              sortDirection={sortBy === 'date' ? sortOrder : false}
              sx={{ fontWeight: 'bold' }}
            >
              <TableSortLabel
                active={sortBy === 'date'}
                direction={sortBy === 'date' ? sortOrder : 'asc'}
                onClick={createSortHandler('date')}
              >
                Date Completed
                {sortBy === 'date' ? (
                  <Box component='span' sx={visuallyHidden}>
                    {sortOrder === 'desc'
                      ? 'sorted descending'
                      : 'sorted ascending'}
                  </Box>
                ) : null}
              </TableSortLabel>
            </TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Course Number</TableCell>
            <TableCell
              key='organization'
              sortDirection={sortBy === 'organization' ? sortOrder : false}
              sx={{ fontWeight: 'bold' }}
            >
              <TableSortLabel
                active={sortBy === 'organization'}
                direction={sortBy === 'organization' ? sortOrder : 'asc'}
                onClick={createSortHandler('organization')}
              >
                Organization
                {sortBy === 'organization' ? (
                  <Box component='span' sx={visuallyHidden}>
                    {sortOrder === 'desc'
                      ? 'sorted descending'
                      : 'sorted ascending'}
                  </Box>
                ) : null}
              </TableSortLabel>
            </TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Location</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>
              Students Registered
            </TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>
              Students Attendance
            </TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Notes</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
            <TableCell
              key='instructor'
              sortDirection={sortBy === 'instructor' ? sortOrder : false}
              sx={{ fontWeight: 'bold' }}
            >
              <TableSortLabel
                active={sortBy === 'instructor'}
                direction={sortBy === 'instructor' ? sortOrder : 'asc'}
                onClick={createSortHandler('instructor')}
              >
                Instructor
                {sortBy === 'instructor' ? (
                  <Box component='span' sx={visuallyHidden}>
                    {sortOrder === 'desc'
                      ? 'sorted descending'
                      : 'sorted ascending'}
                  </Box>
                ) : null}
              </TableSortLabel>
            </TableCell>
            <TableCell align='center' sx={{ fontWeight: 'bold' }}>
              Actions
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {courses.map(course => (
            <TableRow
              key={course.courseid}
              hover
              sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
            >
              <TableCell>{formatDisplayDate(course.systemdate)}</TableCell>
              <TableCell>{formatDisplayDate(course.datescheduled)}</TableCell>
              <TableCell>{course.coursenumber || '-'}</TableCell>
              <TableCell>{course.organizationname || '-'}</TableCell>
              <TableCell>{course.location || '-'}</TableCell>
              <TableCell align='center'>
                {course.studentsregistered ?? '-'}
              </TableCell>
              <TableCell align='center'>
                {course.students_attended ?? '-'}
              </TableCell>
              <TableCell>{course.notes || '-'}</TableCell>
              <TableCell>{course.status || '-'}</TableCell>
              <TableCell>{course.instructorname || '-'}</TableCell>
              <TableCell align='center'>
                <Box
                  sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}
                >
                  <Tooltip title='View Students'>
                    <IconButton
                      color='info'
                      size='small'
                      onClick={() => onViewStudentsClick(course.courseid)}
                    >
                      <VisibilityIcon fontSize='small' />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title='Mark Ready for Billing'>
                    <IconButton
                      color='success'
                      size='small'
                      onClick={() => onBillClick(course.courseid)}
                      disabled={
                        course.status === 'Billing Ready' ||
                        course.status === 'Invoiced'
                      }
                    >
                      <ReceiptLongIcon fontSize='small' />
                    </IconButton>
                  </Tooltip>
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default CompletedCoursesTable;
