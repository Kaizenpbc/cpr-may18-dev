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
} from '@mui/material';
import {
  Add as AddIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTodayClasses, useClassStudents, useMarkAttendance } from '../../../services/instructorService';
import { instructorApi } from '../../../services/api';
import { handleError } from '../../../services/errorHandler';

const AttendanceView = ({ onAttendanceUpdate }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  
  // State
  const [selectedClass, setSelectedClass] = useState(null);
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [error, setError] = useState('');
  const [addStudentDialog, setAddStudentDialog] = useState(false);
  const [newStudent, setNewStudent] = useState({
    firstName: '',
    lastName: '',
    email: '',
  });

  // Use centralized service hooks
  const { data: todaysClasses = [], isLoading: loading, error: classesError } = useTodayClasses();
  const { data: classStudents = [], isLoading: studentsQueryLoading } = useClassStudents(selectedClass?.course_id);
  const markAttendanceMutation = useMarkAttendance();

  // Update students when class students data changes
  useEffect(() => {
    if (classStudents && selectedClass) {
      setStudents(classStudents);
    }
  }, [classStudents, selectedClass]);

  // Handle errors
  useEffect(() => {
    if (classesError) {
      setError('Failed to load today\'s classes');
    }
  }, [classesError]);

  const handleClassChange = event => {
    const classId = event.target.value;
    const selected = todaysClasses.find(c => c.course_id === classId);
    setSelectedClass(selected);
  };

  const handleAttendanceChange = async (studentId, attended) => {
    if (!selectedClass) return;

    try {
      // Update local state immediately for better UX
      setStudents(prev =>
        prev.map(student =>
          student.studentid === studentId
            ? { ...student, attendance: attended, attendanceMarked: true }
            : student
        )
      );

      // Use centralized mutation
      await markAttendanceMutation.mutateAsync({
        courseId: selectedClass.course_id,
        students: students.map(student => ({
          studentId: student.studentid,
          attended: student.studentid === studentId ? attended : student.attendance
        }))
      });

      // Call onAttendanceUpdate to refresh parent's scheduled classes data
      if (onAttendanceUpdate) {
        onAttendanceUpdate();
      }
    } catch (error) {
      handleError(error, { component: 'AttendanceView', action: 'update attendance' });
      setError('Failed to update attendance');
    }
  };

  const handleAddStudent = async () => {
    if (!selectedClass || !newStudent.firstName || !newStudent.lastName) {
      setError('Please fill in at least first and last name');
      return;
    }

    try {
      const response = await instructorApi.addStudent(selectedClass.course_id, newStudent);

      // Add new student to the list
      setStudents(prev => [...prev, response.data]);

      // Clear form and close dialog
      setNewStudent({ firstName: '', lastName: '', email: '' });
      setAddStudentDialog(false);
      setError('');

      // Call onAttendanceUpdate to refresh parent's scheduled classes data
      if (onAttendanceUpdate) {
        onAttendanceUpdate();
      }
    } catch (error) {
      handleError(error, { component: 'AttendanceView', action: 'add student' });
      setError('Failed to add student');
    }
  };

  const formatTime = timeString => {
    if (!timeString) return '';
    return timeString.slice(0, 5); // Convert "09:00:00" to "09:00"
  };

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
        <ScheduleIcon />
        Today's Attendance
      </Typography>

      {error && (
        <Alert severity='error' sx={{ mb: 2 }}>
          {error}
        </Alert>
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
                <Button
                  variant='contained'
                  startIcon={<AddIcon />}
                  onClick={() => setAddStudentDialog(true)}
                  size='small'
                >
                  Add Student
                </Button>
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
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Chip
                    icon={<ScheduleIcon />}
                    label={`${formatTime(selectedClass.start_time)} - ${formatTime(selectedClass.end_time)}`}
                    size='small'
                  />
                  <Chip
                    icon={<PersonIcon />}
                    label={`${students.length} Students`}
                    size='small'
                  />
                  <Chip
                    label={selectedClass.location}
                    size='small'
                    variant='outlined'
                  />
                </Box>
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
    </Box>
  );
};

export default AttendanceView;
