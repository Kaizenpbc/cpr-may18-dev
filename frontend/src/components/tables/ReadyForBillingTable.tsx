import React, { useState, useEffect } from 'react';
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
  Chip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Divider,
} from '@mui/material';
import { Receipt as InvoiceIcon, Visibility as ViewIcon, CheckCircle as PresentIcon, Cancel as AbsentIcon } from '@mui/icons-material';
import { formatCurrency } from '../../utils/formatters';
import { formatDisplayDate } from '../../utils/dateUtils';
import api from '../../services/api';

const ReadyForBillingTable = ({
  courses,
  onCreateInvoice,
  isLoading,
  error,
}) => {
  const [creatingInvoice, setCreatingInvoice] = useState({});
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const fetchStudents = async (courseId) => {
    setLoadingStudents(true);
    try {
      const response = await api.get(`/accounting/courses/${courseId}/students`);
      setStudents(response.data.data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
      setStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleViewInvoice = (course) => {
    setSelectedCourse(course);
    setPreviewOpen(true);
    fetchStudents(course.course_id);
  };

  const handleCreateInvoice = async () => {
    if (!selectedCourse) return;
    
    setCreatingInvoice(prev => ({ ...prev, [selectedCourse.course_id]: true }));
    try {
      await onCreateInvoice(selectedCourse.course_id);
      setPreviewOpen(false);
      setSelectedCourse(null);
      setStudents([]);
    } finally {
      setCreatingInvoice(prev => ({ ...prev, [selectedCourse.course_id]: false }));
    }
  };

  const handleClosePreview = () => {
    setPreviewOpen(false);
    setSelectedCourse(null);
    setStudents([]);
  };

  const presentCount = students.filter(s => s.attended).length;
  const absentCount = students.filter(s => s.attended === false).length;

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity='error' sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!courses || courses.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant='body1' color='textSecondary'>
          No courses ready for billing at this time.
        </Typography>
        <Typography variant='body2' color='textSecondary' sx={{ mt: 1 }}>
          Completed courses marked as "Ready for Billing" by Course Admin will
          appear here.
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date Completed</TableCell>
              <TableCell>Organization</TableCell>
              <TableCell>Course Name</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Instructor</TableCell>
              <TableCell align='center'>Students Attended</TableCell>
              <TableCell align='right'>Rate/Student</TableCell>
              <TableCell align='right'>Total Amount</TableCell>
              <TableCell align='center'>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {courses.map(course => (
              <TableRow key={course.course_id}>
                <TableCell>{formatDisplayDate(course.date_completed)}</TableCell>
                <TableCell>
                  <Typography variant='body2' fontWeight='medium'>
                    {course.organization_name}
                  </Typography>
                  <Typography variant='caption' color='textSecondary'>
                    {course.contact_email}
                  </Typography>
                </TableCell>
                <TableCell>{course.course_type_name}</TableCell>
                <TableCell>{course.location}</TableCell>
                <TableCell>{course.instructor_name}</TableCell>
                <TableCell align='center'>
                  <Chip
                    label={course.students_attended}
                    size='small'
                    color='primary'
                    variant='outlined'
                  />
                </TableCell>
                <TableCell align='right'>
                  {formatCurrency(course.rate_per_student)}
                </TableCell>
                <TableCell align='right'>
                  <Typography variant='body2' fontWeight='bold' color='primary'>
                    {formatCurrency(course.total_amount)}
                  </Typography>
                </TableCell>
                <TableCell align='center'>
                  <Button
                    variant='outlined'
                    color='primary'
                    size='small'
                    startIcon={<ViewIcon />}
                    onClick={() => handleViewInvoice(course)}
                  >
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Invoice Preview Dialog */}
      <Dialog 
        open={previewOpen} 
        onClose={handleClosePreview}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <InvoiceIcon color="primary" />
            Invoice Preview
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedCourse && (
            <Box sx={{ mt: 2 }}>
              {/* Course Details */}
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>Course Information</Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">Organization</Typography>
                    <Typography variant="body1" fontWeight="medium">{selectedCourse.organization_name}</Typography>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">Course Type</Typography>
                    <Typography variant="body1">{selectedCourse.course_type_name}</Typography>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">Location</Typography>
                    <Typography variant="body1">{selectedCourse.location}</Typography>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">Instructor</Typography>
                    <Typography variant="body1">{selectedCourse.instructor_name}</Typography>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">Date Completed</Typography>
                    <Typography variant="body1">{formatDisplayDate(selectedCourse.date_completed)}</Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>Billing Summary</Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">Students Registered</Typography>
                    <Typography variant="body1" fontWeight="medium">{selectedCourse.registered_students}</Typography>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">Students Attended</Typography>
                    <Typography variant="body1" fontWeight="medium" color="success.main">{selectedCourse.students_attended}</Typography>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">Students Absent</Typography>
                    <Typography variant="body1" fontWeight="medium" color="error.main">
                      {selectedCourse.registered_students - selectedCourse.students_attended}
                    </Typography>
                  </Box>
                  <Divider sx={{ my: 2 }} />
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">Rate per Student</Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {selectedCourse.rate_per_student ? 
                        formatCurrency(selectedCourse.rate_per_student) : 
                        <Typography component="span" color="error.main">
                          Pricing not configured
                        </Typography>
                      }
                    </Typography>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">Subtotal</Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {selectedCourse.rate_per_student ? 
                        formatCurrency(selectedCourse.students_attended * selectedCourse.rate_per_student) : 
                        <Typography component="span" color="error.main">
                          N/A
                        </Typography>
                      }
                    </Typography>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">HST (13%)</Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {selectedCourse.rate_per_student ? 
                        formatCurrency((selectedCourse.students_attended * selectedCourse.rate_per_student) * 0.13) : 
                        <Typography component="span" color="error.main">
                          N/A
                        </Typography>
                      }
                    </Typography>
                  </Box>
                  <Divider sx={{ my: 2 }} />
                  <Box>
                    <Typography variant="h6" color="primary" fontWeight="bold">
                      {selectedCourse.rate_per_student ? 
                        `Total: ${formatCurrency(selectedCourse.total_amount * 1.13)}` : 
                        <Typography component="span" color="error.main">
                          Pricing not configured
                        </Typography>
                      }
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
              
              <Divider sx={{ my: 3 }} />
              
              {/* Student Attendance List */}
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>Student Attendance List</Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                  Only students marked as "Present" will be billed. This list will be included in the final invoice.
                </Typography>
                
                {loadingStudents ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                    <CircularProgress />
                  </Box>
                ) : students.length > 0 ? (
                  <>
                    <TableContainer component={Paper} sx={{ mb: 2 }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Student Name</TableCell>
                            <TableCell>Email</TableCell>
                            <TableCell align="center">Attendance Status</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {students.map((student) => (
                            <TableRow key={student.id}>
                              <TableCell>
                                <Typography variant="body2" fontWeight="medium">
                                  {student.first_name} {student.last_name}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" color="textSecondary">
                                  {student.email || 'No email'}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Chip
                                  icon={student.attended ? <PresentIcon /> : <AbsentIcon />}
                                  label={student.attended ? 'Present' : 'Absent'}
                                  color={student.attended ? 'success' : 'error'}
                                  size="small"
                                  variant="outlined"
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                    
                    {/* Attendance Summary */}
                    <Box sx={{ 
                      p: 2, 
                      bgcolor: 'grey.50', 
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'grey.300'
                    }}>
                      <Typography variant="body2" fontWeight="medium">
                        <Box component="span" sx={{ color: 'success.main' }}>
                          Present: {presentCount}
                        </Box>
                        {' | '}
                        <Box component="span" sx={{ color: 'error.main' }}>
                          Absent: {absentCount}
                        </Box>
                        {' | '}
                        <Box component="span">
                          Total: {students.length}
                        </Box>
                      </Typography>
                    </Box>
                  </>
                ) : (
                  <Box sx={{ 
                    p: 2, 
                    bgcolor: 'grey.50', 
                    borderRadius: 1,
                    textAlign: 'center'
                  }}>
                    <Typography variant="body2" color="textSecondary">
                      No student attendance data available
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePreview}>Cancel</Button>
          <Button 
            variant="contained" 
            color="primary"
            onClick={handleCreateInvoice}
            disabled={creatingInvoice[selectedCourse?.course_id] || !selectedCourse.rate_per_student}
            startIcon={<InvoiceIcon />}
          >
            {creatingInvoice[selectedCourse?.course_id] ? 'Creating...' : 
             !selectedCourse.rate_per_student ? 'Pricing Not Configured' : 'Create Invoice'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ReadyForBillingTable;
