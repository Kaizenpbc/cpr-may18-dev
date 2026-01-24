import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Typography,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { api } from '../../../services/api';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import {
  LocalizationProvider,
  DatePicker,
  TimePicker,
} from '@mui/x-date-pickers';

interface Course {
  id: number;
  name: string;
}

interface Instructor {
  id: number;
  username: string;
  email: string;
}

interface Class {
  id: number;
  courseId: number;
  instructorId: number;
  date: string;
  startTime: string;
  capacity: number;
  location: string;
  course: Course;
  instructor: Instructor;
}

const ClassManagement: React.FC = () => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [open, setOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [formData, setFormData] = useState({
    courseId: '',
    instructorId: '',
    date: new Date(),
    startTime: new Date(),
    capacity: 10,
    location: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchClasses();
    fetchCourses();
    fetchInstructors();
  }, []);

  const fetchClasses = async () => {
    try {
      const response = await api.get('/classes');
      setClasses(response.data.data);
    } catch (err) {
      setError('Failed to fetch classes');
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await api.get('/courses');
      setCourses(response.data.data);
    } catch (err) {
      setError('Failed to fetch courses');
    }
  };

  const fetchInstructors = async () => {
    try {
      const response = await api.get('/instructors');
      setInstructors(response.data.data);
    } catch (err) {
      setError('Failed to fetch instructors');
    }
  };

  const handleOpen = (classItem?: Class) => {
    if (classItem) {
      setEditingClass(classItem);
      setFormData({
        courseId: classItem.courseId.toString(),
        instructorId: classItem.instructorId.toString(),
        date: new Date(classItem.date),
        startTime: new Date(`2000-01-01T${classItem.startTime}`),
        capacity: classItem.capacity,
        location: classItem.location,
      });
    } else {
      setEditingClass(null);
      setFormData({
        courseId: '',
        instructorId: '',
        date: new Date(),
        startTime: new Date(),
        capacity: 10,
        location: '',
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingClass(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'capacity' ? parseInt(value) || 0 : value,
    }));
  };

  const handleSelectChange = (e: { target: { name: string; value: string } }) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleDateChange = (date: Date | null) => {
    if (date) {
      setFormData(prev => ({
        ...prev,
        date,
      }));
    }
  };

  const handleTimeChange = (time: Date | null) => {
    if (time) {
      setFormData(prev => ({
        ...prev,
        startTime: time,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const formattedData = {
        date: formData.date.toISOString().split('T')[0],
        start_time: formData.startTime.toTimeString().slice(0, 5),
        course_id: parseInt(formData.courseId),
        instructor_id: parseInt(formData.instructorId),
        capacity: formData.capacity,
        location: formData.location,
      };

      if (editingClass) {
        await api.put(`/classes/${editingClass.id}`, formattedData);
        setSuccess('Class updated successfully');
      } else {
        await api.post('/classes', formattedData);
        setSuccess('Class created successfully');
      }
      fetchClasses();
      handleClose();
    } catch (err) {
      setError('Failed to save class');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this class?')) return;

    try {
      await api.delete(`/classes/${id}`);
      setSuccess('Class deleted successfully');
      fetchClasses();
    } catch (err) {
      setError('Failed to delete class');
    }
  };

  return (
    <Box>
      {error && (
        <Alert severity='error' sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert
          severity='success'
          sx={{ mb: 2 }}
          onClose={() => setSuccess(null)}
        >
          {success}
        </Alert>
      )}

      <Box
        sx={{
          mb: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Typography variant='h6'>Classes</Typography>
        <Button
          variant='contained'
          color='primary'
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
        >
          Schedule Class
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Course</TableCell>
              <TableCell>Instructor</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Time</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Capacity</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {classes.map(classItem => (
              <TableRow key={classItem.id}>
                <TableCell>{classItem.course.name}</TableCell>
                <TableCell>{classItem.instructor.username}</TableCell>
                <TableCell>
                  {new Date(classItem.date).toLocaleDateString()}
                </TableCell>
                <TableCell>{classItem.startTime}</TableCell>
                <TableCell>{classItem.location}</TableCell>
                <TableCell>{classItem.capacity}</TableCell>
                <TableCell>
                  <IconButton
                    onClick={() => handleOpen(classItem)}
                    color='primary'
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    onClick={() => handleDelete(classItem.id)}
                    color='error'
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleClose} maxWidth='sm' fullWidth>
        <DialogTitle>
          {editingClass ? 'Edit Class' : 'Schedule New Class'}
        </DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin='dense'>
            <InputLabel>Course</InputLabel>
            <Select
              name='courseId'
              value={formData.courseId}
              onChange={handleSelectChange}
              label='Course'
            >
              {courses.map(course => (
                <MenuItem key={course.id} value={course.id}>
                  {course.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth margin='dense'>
            <InputLabel>Instructor</InputLabel>
            <Select
              name='instructorId'
              value={formData.instructorId}
              onChange={handleSelectChange}
              label='Instructor'
            >
              {instructors.map(instructor => (
                <MenuItem key={instructor.id} value={instructor.id}>
                  {instructor.username}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Box sx={{ mt: 2 }}>
              <DatePicker
                label='Date'
                value={formData.date}
                onChange={handleDateChange}
                sx={{ width: '100%' }}
              />
            </Box>
            <Box sx={{ mt: 2 }}>
              <TimePicker
                label='Start Time'
                value={formData.startTime}
                onChange={handleTimeChange}
                sx={{ width: '100%' }}
              />
            </Box>
          </LocalizationProvider>

          <TextField
            margin='dense'
            name='location'
            label='Location'
            type='text'
            fullWidth
            value={formData.location}
            onChange={handleInputChange}
          />

          <TextField
            margin='dense'
            name='capacity'
            label='Capacity'
            type='number'
            fullWidth
            value={formData.capacity}
            onChange={handleInputChange}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} color='primary'>
            {editingClass ? 'Update' : 'Schedule'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ClassManagement;
