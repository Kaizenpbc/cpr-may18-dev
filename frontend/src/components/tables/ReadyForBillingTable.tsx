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
import { useAuth } from '../../contexts/AuthContext';

const ReadyForBillingTable = ({
  courses,
  onCreateInvoice,
  isLoading,
  error,
}) => {
  const { user } = useAuth();
  const [creatingInvoice, setCreatingInvoice] = useState({});
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [invoiceSuccess, setInvoiceSuccess] = useState(false);

  const fetchStudents = async (courseId) => {
    if (!courseId) {
      console.error('No course ID provided for fetching students');
      setStudents([]);
      return;
    }
    
    setLoadingStudents(true);
    try {
      // Use different endpoints based on user role
      let endpoint;
      if (user?.role === 'instructor') {
        // For instructors, use the instructor endpoint
        endpoint = `/instructor/classes/${courseId}/students`;
      } else {
        // For accounting users, use the accounting endpoint
        endpoint = `/accounting/courses/${courseId}/students`;
      }
      
      console.log(`[ReadyForBillingTable] Fetching students using endpoint: ${endpoint} for role: ${user?.role}`);
      const response = await api.get(endpoint);
      
      // Normalize the data format based on the endpoint used
      let normalizedStudents = response.data.data || [];
      if (user?.role === 'instructor') {
        // Transform instructor endpoint format to match accounting format
        normalizedStudents = normalizedStudents.map(student => ({
          id: student.studentid,
          first_name: student.firstname,
          last_name: student.lastname,
          email: student.email,
          attended: student.attendance,
          attendance_marked: student.attendanceMarked,
        }));
      }
      
      setStudents(normalizedStudents);
    } catch (error) {
      console.error('Error fetching students:', error);
      setStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleViewInvoice = (course) => {
    if (!course || !course.course_id) {
      console.error('Invalid course data for invoice preview:', course);
      return;
    }
    setSelectedCourse(course);
    setPreviewOpen(true);
    fetchStudents(course.course_id);
  };

  const handleCreateInvoice = async () => {
    if (!selectedCourse) return;
    
    console.log('🔍 [INVOICE] Starting invoice creation for course:', selectedCourse.course_id);
    setCreatingInvoice(prev => ({ ...prev, [selectedCourse.course_id]: true }));
    setInvoiceSuccess(false);
    
    try {
      await onCreateInvoice(selectedCourse.course_id);
      console.log('✅ [INVOICE] Invoice creation completed successfully');
      
      // Show success state briefly before closing
      setInvoiceSuccess(true);
      setTimeout(() => {
        setPreviewOpen(false);
        setSelectedCourse(null);
        setStudents([]);
        setInvoiceSuccess(false);
      }, 1500); // Show success for 1.5 seconds
    } catch (error) {
      console.error('❌ [INVOICE] Invoice creation failed in table component:', error);
      // Error handling is done in the parent component, but we keep the dialog open
      // so the user can see the error message and try again if needed
    } finally {
      setCreatingInvoice(prev => ({ ...prev, [selectedCourse.course_id]: false }));
    }
  };

  const handleClosePreview = () => {
    setPreviewOpen(false);
    setSelectedCourse(null);
    setStudents([]);
    setInvoiceSuccess(false);
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

  if (!courses || !Array.isArray(courses) || courses.length === 0) {
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
              <TableCell align='right'>Base Cost</TableCell>
              <TableCell align='right'>Tax (HST)</TableCell>
              <TableCell align='right'>Total</TableCell>
              <TableCell align='center'>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {courses.map(course => {
              if (!course) {
                return (
                  <TableRow key="invalid-course">
                    <TableCell colSpan={11} align="center">
                      <Typography variant="body2" color="error.main">
                        Invalid course data
                      </Typography>
                    </TableCell>
                  </TableRow>
                );
              }
              
              return (
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
                    {course.rate_per_student ? 
                      formatCurrency(course.rate_per_student) : 
                      <Typography variant="body2" color="error.main">
                        Not Set
                      </Typography>
                    }
                  </TableCell>
                  <TableCell align='right'>
                    {course.rate_per_student && course.students_attended ? 
                      formatCurrency(course.rate_per_student * course.students_attended) : 
                      <Typography component="span" color="error.main">
                        N/A
                      </Typography>
                    }
                  </TableCell>
                  <TableCell align='right'>
                    {course.rate_per_student && course.students_attended ? 
                      formatCurrency((course.rate_per_student * course.students_attended) * 0.13) : 
                      <Typography component="span" color="error.main">
                        N/A
                      </Typography>
                    }
                  </TableCell>
                  <TableCell align='right'>
                    <Typography variant='body2' fontWeight='bold' color='primary'>
                      {course.rate_per_student && course.students_attended ? 
                        formatCurrency((course.rate_per_student * course.students_attended) * 1.13) : 
                        <Typography component="span" color="error.main">
                          N/A
                        </Typography>
                      }
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
              );
            })}
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
          {selectedCourse && selectedCourse.organization_name && (
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
                    <Typography variant="body1">{selectedCourse.course_type_name || 'N/A'}</Typography>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">Location</Typography>
                    <Typography variant="body1">{selectedCourse.location || 'N/A'}</Typography>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">Instructor</Typography>
                    <Typography variant="body1">{selectedCourse.instructor_name || 'N/A'}</Typography>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">Date Completed</Typography>
                    <Typography variant="body1">{selectedCourse.date_completed ? formatDisplayDate(selectedCourse.date_completed) : 'N/A'}</Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>Billing Summary</Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">Students Registered</Typography>
                    <Typography variant="body1" fontWeight="medium">{selectedCourse.registered_students || 0}</Typography>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">Students Attended</Typography>
                    <Typography variant="body1" fontWeight="medium" color="success.main">{selectedCourse.students_attended || 0}</Typography>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">Students Absent</Typography>
                    <Typography variant="body1" fontWeight="medium" color="error.main">
                      {(selectedCourse.registered_students || 0) - (selectedCourse.students_attended || 0)}
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
                        formatCurrency((selectedCourse.students_attended || 0) * selectedCourse.rate_per_student) : 
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
                        formatCurrency(((selectedCourse.students_attended || 0) * selectedCourse.rate_per_student) * 0.13) : 
                        <Typography component="span" color="error.main">
                          N/A
                        </Typography>
                      }
                    </Typography>
                  </Box>
                  <Divider sx={{ my: 2 }} />
                  <Box>
                    <Typography variant="h6" color="primary" fontWeight="bold">
                      {selectedCourse.rate_per_student && selectedCourse.total_amount ? 
                        `Total: ${formatCurrency(selectedCourse.total_amount)}` : 
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
          {invoiceSuccess && (
            <Alert severity="success" sx={{ flex: 1, mr: 2 }}>
              ✅ Invoice created successfully! The course has been moved to the Organizational Receivables Queue. This dialog will close automatically.
            </Alert>
          )}
          <Button onClick={handleClosePreview} disabled={creatingInvoice[selectedCourse?.course_id]}>
            {invoiceSuccess ? 'Close Now' : 'Cancel'}
          </Button>
          <Button 
            variant="contained" 
            color="primary"
            onClick={handleCreateInvoice}
            disabled={creatingInvoice[selectedCourse?.course_id] || !selectedCourse?.rate_per_student || invoiceSuccess}
            startIcon={creatingInvoice[selectedCourse?.course_id] ? <CircularProgress size={20} /> : <InvoiceIcon />}
          >
            {creatingInvoice[selectedCourse?.course_id] ? 'Creating Invoice...' : 
             !selectedCourse?.rate_per_student ? 'Pricing Not Configured' : 
             invoiceSuccess ? 'Invoice Created!' : 'Create Invoice'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ReadyForBillingTable;
