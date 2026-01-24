import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Paper,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  Stack,
  FormControlLabel,
  Snackbar,
} from '@mui/material';
import {
  Add as AddIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  LocationOn as LocationIcon,
  Group as GroupIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Comment as CommentIcon,
  Today as TodayIcon,
} from '@mui/icons-material';
import { instructorApi, collegesApi } from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { handleError } from '../../../services/errorHandler';

interface Student {
  studentid: string;
  firstname: string;
  lastname: string;
  email?: string;
  attendance: boolean;
  attendanceMarked: boolean;
}

interface ClassData {
  courseId: number;
  name: string;
  organizationname: string;
  location: string;
  startTime: string;
  endTime: string;
  maxStudents: number;
  currentStudents: number;
  studentcount: number;
  studentsattendance: number;
  date: string;
}

const ClassAttendanceView: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [todaysClasses, setTodaysClasses] = useState<ClassData[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassData | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [error, setError] = useState('');
  const [addStudentDialog, setAddStudentDialog] = useState(false);
  const [completeDialog, setCompleteDialog] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [newStudent, setNewStudent] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    college: '',
  });
  const [instructorComments, setInstructorComments] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [colleges, setColleges] = useState<{ id: number; name: string }[]>([]);

  // Load today's classes and colleges on component mount
  useEffect(() => {
    loadTodaysClasses();
    loadColleges();
  }, []);

  const loadColleges = async () => {
    try {
      const response = await collegesApi.getAll();
      setColleges(response.data?.data || response.data || []);
    } catch (error) {
      console.error('Error loading colleges:', error);
    }
  };

  // Load students when a class is selected
  useEffect(() => {
    if (selectedClass) {
      loadStudents(selectedClass.courseId);
    }
  }, [selectedClass]);

  const loadTodaysClasses = async () => {
    try {
      setLoading(true);
      console.log('[Debug] Loading today\'s classes...');
      const response = await instructorApi.getClassesToday();
      console.log('[Debug] API response:', response);
      const classes = response.data?.data || response.data || [];
      console.log('[Debug] Classes array:', classes);
      setTodaysClasses(classes);

      // Auto-select the first class if only one exists
      if (classes && classes.length === 1) {
        console.log('[Debug] Auto-selecting first class:', classes[0]);
        setSelectedClass(classes[0]);
      }

      setError('');
    } catch (error: unknown) {
      console.error('[Debug] Error loading today\'s classes:', error);
      handleError(error, { component: 'ClassAttendanceView', action: 'load today classes' });
      setError("Failed to load today's classes");
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async (classId: number) => {
    try {
      setStudentsLoading(true);
      const response = await instructorApi.getClassStudents(classId);
      console.log('[Debug] Students loaded from backend:', response.data);
      setStudents(response.data?.data || response.data || []);
      setError('');
    } catch (error: unknown) {
      handleError(error, { component: 'ClassAttendanceView', action: 'load students' });
      setError('Failed to load students for this class');
    } finally {
      setStudentsLoading(false);
    }
  };

  const handleClassChange = (event: { target: { value: number } }) => {
    const classId = event.target.value;
    const selected = todaysClasses.find(c => c.courseId === classId);
    setSelectedClass(selected || null);
    setInstructorComments(''); // Reset comments when changing classes
  };

  const handleAttendanceChange = async (studentId: string, attended: boolean) => {
    if (!selectedClass) return;

    try {
      const response = await instructorApi.updateStudentAttendance(selectedClass.courseId, studentId, attended);

      // Reload students from backend to ensure we have the latest attendance status
      await loadStudents(selectedClass.courseId);
    } catch (error: unknown) {
      handleError(error, { component: 'ClassAttendanceView', action: 'update attendance' });
      setError('Failed to update attendance');
    }
  };

  const handleAddStudent = async () => {
    if (!selectedClass || !newStudent.firstName || !newStudent.lastName || !newStudent.email || !newStudent.phone) {
      setError('Please fill in all required fields (First Name, Last Name, Email, Phone)');
      return;
    }

    try {
      const response = await instructorApi.addStudent(selectedClass.courseId, newStudent);

      // Add new student to the list
      setStudents(prev => [...prev, response.data?.data || response.data]);

      // Clear form and close dialog
      setNewStudent({ firstName: '', lastName: '', email: '', phone: '', college: '' });
      setAddStudentDialog(false);
      setError('');
      setSuccessMessage('Student added successfully!');
    } catch (error: unknown) {
      // Show the specific error message from the backend
      const axiosErr = error as { response?: { data?: { error?: string } } };
      const errorMessage = axiosErr.response?.data?.error || 'Failed to add student';
      setError(errorMessage);
      console.error('Add student error:', error);
    }
  };

  const handleCompleteClass = async () => {
    if (!selectedClass) return;

    try {
      setCompleting(true);
      const response = await instructorApi.completeClass(selectedClass.courseId, instructorComments);
      setError('');
      setSuccessMessage('Class completed successfully! It has been moved to your archive.');
      // Refresh the class list
      await loadTodaysClasses();
      setSelectedClass(null);
      setStudents([]);
      setInstructorComments('');
      setCompleteDialog(false);
    } catch (error: unknown) {
      handleError(error, { component: 'ClassAttendanceView', action: 'complete class' });
      setError('Failed to complete class');
    } finally {
      setCompleting(false);
    }
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    return timeString.slice(0, 5); // Convert "09:00:00" to "09:00"
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getAttendanceStats = () => {
    // Ensure students is always an array
    const studentsArray = Array.isArray(students) ? students : [];
    const total = studentsArray.length;
    const marked = studentsArray.filter(s => s.attendanceMarked).length;
    const present = studentsArray.filter(s => s.attendance && s.attendanceMarked).length;
    const absent = studentsArray.filter(s => !s.attendance && s.attendanceMarked).length;
    const notMarked = total - marked;
    
    console.log('[Debug] Attendance stats:', { total, marked, present, absent, notMarked });
    console.log('[Debug] Students with attendanceMarked:', studentsArray.filter(s => s.attendanceMarked));
    console.log('[Debug] Students without attendanceMarked:', studentsArray.filter(s => !s.attendanceMarked));
    
    return { total, marked, present, absent, notMarked };
  };

  const stats = getAttendanceStats();

  if (loading) {
    return (
      <Box
        display='flex'
        justifyContent='center'
        alignItems='center'
        minHeight='400px'
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography
        variant='h4'
        gutterBottom
        sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
      >
        <TodayIcon />
        Class Attendance
      </Typography>

      <Typography variant='h6' color='text.secondary' sx={{ mb: 3 }}>
        {formatDate(new Date().toISOString())}
      </Typography>

      {error && (
        <Alert severity='error' sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {successMessage && (
        <Snackbar
          open={!!successMessage}
          autoHideDuration={4000}
          onClose={() => setSuccessMessage('')}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert onClose={() => setSuccessMessage('')} severity='success' sx={{ width: '100%' }}>
            {successMessage}
          </Alert>
        </Snackbar>
      )}

            {todaysClasses.length === 0 ? (
          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant='h6' color='text.secondary' align='center'>
                No classes scheduled for today
              </Typography>
              <Typography
                variant='body2'
                color='text.secondary'
                align='center'
                sx={{ mt: 1 }}
              >
                Check back on days when you have scheduled classes.
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Class Selection */}
            <Paper sx={{ p: 2, mb: 3 }}>
              <Typography variant='h6' gutterBottom>
                Select Class for Attendance
              </Typography>
              <FormControl fullWidth>
                <InputLabel>Today's Classes</InputLabel>
                <Select
                  value={selectedClass?.courseId || ''}
                  label="Today's Classes"
                  onChange={handleClassChange}
                >
                  {todaysClasses.map(course => (
                    <MenuItem key={course.courseId} value={course.courseId}>
                      <Box>
                        <Typography variant='body1'>
                          {course.name} - {course.organizationname}
                        </Typography>
                        <Typography variant='body2' color='text.secondary'>
                          {formatTime(course.start_time)} -{' '}
                          {formatTime(course.end_time)} | {course.location}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Paper>

            {/* Student Management */}
            {selectedClass && (
              <Paper sx={{ p: 2 }}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 2,
                  }}
                >
                  <Typography variant='h6'>Student Attendance</Typography>
                  <Stack direction='row' spacing={1}>
                    <Button
                      variant='outlined'
                      startIcon={<AddIcon />}
                      onClick={() => setAddStudentDialog(true)}
                      size='small'
                    >
                      Add Student
                    </Button>
                    <Button
                      variant='contained'
                      color='success'
                      startIcon={<CheckCircleIcon />}
                      onClick={() => setCompleteDialog(true)}
                      size='small'
                      disabled={stats.notMarked > 0}
                    >
                      Complete Class
                    </Button>
                  </Stack>
                </Box>

                {/* Class Info */}
                <Box
                  sx={{
                    mb: 2,
                    p: 2,
                    bgcolor: 'background.default',
                    borderRadius: 1,
                  }}
                >
                  <Typography variant='subtitle1' gutterBottom>
                    {selectedClass.name} -{' '}
                    {selectedClass.organizationname}
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6} md={3}>
                      <Chip
                        icon={<ScheduleIcon />}
                        label={`${formatTime(selectedClass.start_time)} - ${formatTime(selectedClass.end_time)}`}
                        size='small'
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Chip
                        icon={<LocationIcon />}
                        label={selectedClass.location}
                        size='small'
                        variant='outlined'
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Chip
                        icon={<GroupIcon />}
                        label={`${stats.total} Students`}
                        size='small'
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Chip
                        icon={<CheckCircleIcon />}
                        label={`${stats.present} Present`}
                        size='small'
                        color='success'
                      />
                    </Grid>
                  </Grid>
                </Box>

                {/* Attendance Summary */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant='subtitle2' gutterBottom>
                    Attendance Summary
                  </Typography>
                  <Stack direction='row' spacing={1} flexWrap='wrap'>
                    <Chip
                      label={`Total: ${stats.total}`}
                      color='primary'
                      size='small'
                    />
                    <Chip
                      label={`Present: ${stats.present}`}
                      color='success'
                      size='small'
                    />
                    <Chip
                      label={`Absent: ${stats.absent}`}
                      color='error'
                      size='small'
                    />
                    <Chip
                      label={`Not Marked: ${stats.notMarked}`}
                      color='default'
                      size='small'
                      variant='outlined'
                    />
                  </Stack>
                </Box>

                {/* Students Table */}
                {studentsLoading ? (
                  <Box display='flex' justifyContent='center' p={2}>
                    <CircularProgress size={24} />
                  </Box>
                ) : (Array.isArray(students) ? students : []).length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <PersonIcon
                      sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }}
                    />
                    <Typography variant='h6' color='text.secondary'>
                      No Students Registered
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                      Add students to this class to mark attendance
                    </Typography>
                  </Box>
                ) : (
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 'bold' }}>
                            Student Name
                          </TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
                          <TableCell
                            sx={{ fontWeight: 'bold', textAlign: 'center' }}
                          >
                            Present
                          </TableCell>
                          <TableCell
                            sx={{ fontWeight: 'bold', textAlign: 'center' }}
                          >
                            Status
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(Array.isArray(students) ? students : []).map(student => (
                          <TableRow key={student.studentid}>
                            <TableCell>
                              {student.firstname} {student.lastname}
                            </TableCell>
                            <TableCell>{student.email || '-'}</TableCell>
                            <TableCell align='center'>
                              {student.attendanceMarked ? (
                                // Show current status with option to change
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                  <Button
                                    variant={student.attendance ? 'contained' : 'outlined'}
                                    color='success'
                                    size='small'
                                    onClick={() => handleAttendanceChange(student.studentid, true)}
                                    disabled={student.attendance}
                                  >
                                    Present
                                  </Button>
                                  <Button
                                    variant={!student.attendance ? 'contained' : 'outlined'}
                                    color='error'
                                    size='small'
                                    onClick={() => handleAttendanceChange(student.studentid, false)}
                                    disabled={!student.attendance}
                                  >
                                    Absent
                                  </Button>
                                </Box>
                              ) : (
                                // Show buttons to mark attendance for the first time
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                  <Button
                                    variant='outlined'
                                    color='success'
                                    size='small'
                                    onClick={() => handleAttendanceChange(student.studentid, true)}
                                  >
                                    Mark Present
                                  </Button>
                                  <Button
                                    variant='outlined'
                                    color='error'
                                    size='small'
                                    onClick={() => handleAttendanceChange(student.studentid, false)}
                                  >
                                    Mark Absent
                                  </Button>
                                </Box>
                              )}
                            </TableCell>
                            <TableCell align='center'>
                              <Chip
                                label={
                                  student.attendanceMarked
                                    ? student.attendance
                                      ? 'Present'
                                      : 'Absent'
                                    : 'Not Marked'
                                }
                                color={
                                  student.attendanceMarked
                                    ? student.attendance
                                      ? 'success'
                                      : 'error'
                                    : 'default'
                                }
                                size='small'
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}

                {/* Instructor Comments */}
                <Box sx={{ mt: 3 }}>
                  <Typography variant='h6' gutterBottom>
                    <CommentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Instructor Comments
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    placeholder="Add any notes about today's class (optional)"
                    value={instructorComments}
                    onChange={(e) => setInstructorComments(e.target.value)}
                    variant='outlined'
                    helperText='Comments will be visible to administrators in completed courses'
                  />
                </Box>
              </Paper>
            )}
          </>
        )}

      {/* Add Student Dialog */}
      <Dialog
        open={addStudentDialog}
        onClose={() => setAddStudentDialog(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>Add Student to Class</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              autoFocus
              fullWidth
              label='First Name'
              value={newStudent.firstName}
              onChange={e =>
                setNewStudent(prev => ({ ...prev, firstName: e.target.value }))
              }
              margin='normal'
              required
            />
            <TextField
              fullWidth
              label='Last Name'
              value={newStudent.lastName}
              onChange={e =>
                setNewStudent(prev => ({ ...prev, lastName: e.target.value }))
              }
              margin='normal'
              required
            />
            <TextField
              fullWidth
              label='Email'
              value={newStudent.email}
              onChange={e =>
                setNewStudent(prev => ({ ...prev, email: e.target.value }))
              }
              margin='normal'
              type='email'
              required
            />
            <TextField
              fullWidth
              label='Phone'
              value={newStudent.phone}
              onChange={e =>
                setNewStudent(prev => ({ ...prev, phone: e.target.value }))
              }
              margin='normal'
              type='tel'
              required
            />
            <FormControl fullWidth margin='normal'>
              <InputLabel>College/School (if from another institution)</InputLabel>
              <Select
                value={newStudent.college}
                label='College/School (if from another institution)'
                onChange={e =>
                  setNewStudent(prev => ({ ...prev, college: e.target.value }))
                }
              >
                <MenuItem value=''>
                  <em>Same organization</em>
                </MenuItem>
                {colleges.map(college => (
                  <MenuItem key={college.id} value={college.name}>
                    {college.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddStudentDialog(false)}>Cancel</Button>
          <Button onClick={handleAddStudent} variant='contained'>
            Add Student
          </Button>
        </DialogActions>
      </Dialog>

      {/* Complete Class Dialog */}
      <Dialog
        open={completeDialog}
        onClose={() => setCompleteDialog(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>Complete Class</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            Are you sure you want to mark this class as completed?
          </Box>
          
          <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
            <Typography variant='subtitle2' gutterBottom>
              Class Details:
            </Typography>
            <Box component="div" sx={{ fontSize: '0.875rem' }}>
                              Course: {selectedClass?.name}<br />
              Organization: {selectedClass?.organizationname}<br />
              Location: {selectedClass?.location}<br />
              Time: {selectedClass ? `${formatTime(selectedClass.start_time)} - ${formatTime(selectedClass.end_time)}` : ''}<br />
              Students Registered: {stats.total}<br />
              Students Present: {stats.present}<br />
              Students Absent: {stats.absent}
            </Box>
          </Box>

          <Box sx={{ mt: 2 }}>
            <Typography variant='subtitle2' gutterBottom>
              Final Comments:
            </Typography>
            <TextField
              autoFocus
              fullWidth
              multiline
              rows={3}
              placeholder="Add any final notes about this class (optional)"
              value={instructorComments}
              onChange={(e) => setInstructorComments(e.target.value)}
              variant='outlined'
            />
          </Box>

          <Box 
            sx={{ 
              mt: 2, 
              p: 2, 
              bgcolor: 'info.light', 
              color: 'info.contrastText',
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'info.main'
            }}
          >
            <strong>This action will:</strong>
            <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
              <li>Mark the class as completed</li>
              <li>Move it to your archive</li>
              <li>Update the organization and admin portals</li>
              <li>Lock the final attendance count</li>
            </ul>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCompleteDialog(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleCompleteClass} 
            color='success'
            variant='contained'
            disabled={completing}
            startIcon={completing ? <CircularProgress size={16} /> : <CheckCircleIcon />}
          >
            {completing ? 'Completing...' : 'Complete Class'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ClassAttendanceView;
