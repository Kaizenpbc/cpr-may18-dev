import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  IconButton,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { api } from '../../services/api';
import logger from '../../utils/logger';
import CourseDialog from './CourseDialog';
import { formatDisplayDate } from '../../utils/dateUtils';

interface Course {
  id: number;
  name: string;
  coursecode: string;
  duration: number;
  maxstudents: number;
  createdAt: string;
  updatedAt: string;
}

interface CourseManagerProps {
  showSnackbar: (message: string, severity: 'success' | 'error') => void;
}

const CourseManager: React.FC<CourseManagerProps> = ({ showSnackbar }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const response = await api.get('/courses');
      setCourses(response.data.data || []);
      setError(null);
    } catch (err) {
      logger.error('Error fetching courses:', err);
      setError('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleAddOpen = () => {
    setEditingCourse(null);
    setDialogOpen(true);
  };

  const handleEditOpen = (course: Course) => {
    setEditingCourse(course);
    setDialogOpen(true);
  };

  const handleDelete = async (id: number, name: string) => {
    if (
      window.confirm(
        `Are you sure you want to delete Course: ${name} (ID: ${id})? This cannot be undone.`
      )
    ) {
      try {
        setError(null);
        const response = await api.delete(`/courses/${id}`);
        if (response.data.success) {
          showSnackbar(`Course ${id} deleted successfully.`, 'success');
          fetchCourses();
        } else {
          throw new Error(response.data.message || 'Failed to delete course');
        }
      } catch (err) {
        logger.error(`Error deleting course ${id}:`, err);
        showSnackbar(
          err instanceof Error ? err.message : 'Failed to delete course.',
          'error'
        );
      }
    }
  };

  const handleSave = async (courseData: Omit<Course, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      if (editingCourse) {
        await api.put(`/courses/${editingCourse.id}`, courseData);
        showSnackbar('Course updated successfully', 'success');
      } else {
        await api.post('/courses', courseData);
        showSnackbar('Course created successfully', 'success');
      }
      fetchCourses();
    } catch (err) {
      logger.error('Error saving course:', err);
      showSnackbar(
        err instanceof Error ? err.message : 'Failed to save course',
        'error'
      );
      throw err;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {error && (
        <Alert severity='error' sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
        }}
      >
        <Typography variant='h6'>Manage Courses</Typography>
        <Button
          variant='contained'
          startIcon={<AddIcon />}
          onClick={handleAddOpen}
        >
          Add Course
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Course Name</TableCell>
              <TableCell>Code</TableCell>
              <TableCell>Duration (min)</TableCell>
              <TableCell>Max Students</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Updated</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {courses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align='center'>
                  No courses found.
                </TableCell>
              </TableRow>
            ) : (
              courses.map(course => (
                <TableRow key={course.id}>
                  <TableCell>{course.id}</TableCell>
                  <TableCell>{course.name}</TableCell>
                  <TableCell>{course.coursecode}</TableCell>
                  <TableCell>{course.duration}</TableCell>
                  <TableCell>{course.maxstudents}</TableCell>
                  <TableCell>
                    {formatDisplayDate(course.createdAt)}
                  </TableCell>
                  <TableCell>
                    {formatDisplayDate(course.updatedAt)}
                  </TableCell>
                  <TableCell>
                    <IconButton
                      onClick={() => handleEditOpen(course)}
                      color='primary'
                      size='small'
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      onClick={() =>
                        handleDelete(course.id, course.name)
                      }
                      color='error'
                      size='small'
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <CourseDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingCourse(null);
        }}
        onSave={handleSave as any}
        course={editingCourse || undefined}
      />
    </Box>
  );
};

export default CourseManager;
