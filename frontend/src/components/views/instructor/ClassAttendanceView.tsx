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
import api from '../../../services/api';
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
  course_id: number;
  name: string;
  organizationname: string;
  location: string;
  start_time: string;
  end_time: string;
  max_students: number;
  current_students: number;
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
  });
  const [instructorComments, setInstructorComments] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Load today's classes on component mount
  useEffect(() => {
    loadTodaysClasses();
  }, []);

  // Load students when a class is selected
  useEffect(() => {
    if (selectedClass) {
      loadStudents(selectedClass.course_id);
    }
  }, [selectedClass]);

  const loadTodaysClasses = async () => {
    try {
      setLoading(true);
      const response = await api.get('/instructor/classes/today');
      setTodaysClasses(response.data.data || []);

      // Auto-select the first class if only one exists
      if (response.data.data && response.data.data.length === 1) {
        setSelectedClass(response.data.data[0]);
      }

      setError('');
    } catch (error: any) {
      handleError(error, { component: 'ClassAttendanceView', action: 'load today classes' });
      setError("Failed to load today's classes");
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async (classId: number) => {
    try {
      setStudentsLoading(true);
      const response = await api.get(
        `/instructor/classes/${classId}/students`
      );
      console.log('[Debug] Students loaded from backend:', response.data.data);
      setStudents(response.data.data || []);
      setError('');
    } catch (error: any) {
      handleError(error, { component: 'ClassAttendanceView', action: 'load students' });
      setError('Failed to load students for this class');
    } finally {
      setStudentsLoading(false);
    }
  };

  const handleClassChange = (event: any) => {
    const classId = event.target.value;
    const selected = todaysClasses.find(c => c.course_id === classId);
    setSelectedClass(selected || null);
    setInstructorComments(''); // Reset comments when changing classes
  };

  const handleAttendanceChange = async (studentId: string, attended: boolean) => {
    if (!selectedClass) return;

    try {
      const response = await api.put(
        `/instructor/classes/${selectedClass.course_id}/students/${studentId}/attendance`,
        { attended }
      );

      // Reload students from backend to ensure we have the latest attendance status
      await loadStudents(selectedClass.course_id);
    } catch (error: any) {
      handleError(error, { component: 'ClassAttendanceView', action: 'update attendance' });
      setError('Failed to update attendance');
    }
  };

  const handleAddStudent = async () => {
    if (!selectedClass || !newStudent.firstName || !newStudent.lastName) {
      setError('Please fill in at least first and last name');
      return;
    }

    try {
      const response = await api.post(
        `/instructor/classes/${selectedClass.course_id}/students`,
        newStudent
      );

      // Add new student to the list
      setStudents(prev => [...prev, response.data.data]);

      // Clear form and close dialog
      setNewStudent({ firstName: '', lastName: '', email: '' });
      setAddStudentDialog(false);
      setError('');
    } catch (error: any) {
      handleError(error, { component: 'ClassAttendanceView', action: 'add student' });
      setError('Failed to add student');
    }
  };

  const handleCompleteClass = async () => {
    if (!selectedClass) return;

    try {
      setCompleting(true);
      const response = await api.put(
        `/instructor/classes/${selectedClass.course_id}/complete`,
        { instructor_comments: instructorComments }
      );
      setError('');
      setSuccessMessage('Class completed successfully! It has been moved to your archive.');
      // Refresh the class list
      await loadTodaysClasses();
      setSelectedClass(null);
      setStudents([]);
      setInstructorComments('');
      setCompleteDialog(false);
    } catch (error: any) {
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
    const total = students.length;
    const marked = students.filter(s => s.attendanceMarked).length;
    const present = students.filter(s => s.attendance && s.attendanceMarked).length;
    const absent = students.filter(s => !s.attendance && s.attendanceMarked).length;
    const notMarked = total - marked;
    
    console.log('[Debug] Attendance stats:', { total, marked, present, absent, notMarked });
    console.log('[Debug] Students with attendanceMarked:', students.filter(s => s.attendanceMarked));
    console.log('[Debug] Students without attendanceMarked:', students.filter(s => !s.attendanceMarked));
    
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
                value={selectedClass?.course_id || ''}
                label="Today's Classes"
                onChange={handleClassChange}
              >
                {todaysClasses.map(course => (
                  <MenuItem key={course.course_id} value={course.course_id}>
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
              ) : students.length === 0 ? (
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
                      {students.map(student => (
                        <TableRow key={student.studentid}>
                          <TableCell>
                            {student.firstname} {student.lastname}
                          </TableCell>
                          <TableCell>{student.email || '-'}</TableCell>
                          <TableCell align='center'>
                            <Checkbox
                              checked={student.attendance || false}
                              onChange={e =>
                                handleAttendanceChange(
                                  student.studentid,
                                  e.target.checked
                                )
                              }
                              color='primary'
                            />
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
              label='Email (Optional)'
              value={newStudent.email}
              onChange={e =>
                setNewStudent(prev => ({ ...prev, email: e.target.value }))
              }
              margin='normal'
              type='email'
            />
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
