import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  Visibility as ViewIcon,
  Block as BlockIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { api } from '../../../../services/api';
import { formatDisplayDate } from '../../../../utils/dateUtils';

// TypeScript interfaces
interface Course {
  id: string | number;
  dateRequested: string;
  courseTypeName: string;
  location: string;
  registeredStudents: number;
  status: string;
  instructor: string;
  notes?: string;
  confirmedDate?: string;
  requestSubmittedDate: string;
  scheduledDate?: string;
  studentsAttended?: number;
  archivedAt?: string;
}

interface Student {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  attended?: boolean;
  attendanceMarked?: boolean;
}

interface OrganizationArchiveProps {
  courses: Course[];
  onViewStudentsClick?: (courseId: string | number) => void;
}

const OrganizationArchive: React.FC<OrganizationArchiveProps> = ({ 
  courses, 
  onViewStudentsClick
}) => {
  // State for student list dialog
  const [studentDialogOpen, setStudentDialogOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentError, setStudentError] = useState<string | null>(null);

  // Filtering and search state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [courseTypeFilter, setCourseTypeFilter] = useState('all');

  // Get status color for courses
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'success';
      case 'cancelled':
        return 'error';
      default:
        return 'warning';
    }
  };

  // Get status label
  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
  };

  // Format date helper
  const formatDate = (dateString: string) => formatDisplayDate(dateString);

  // Handle view students click
  const handleViewStudentsClick = async (course: Course) => {
    console.log('[TRACE] OrganizationArchive - handleViewStudentsClick called');
    console.log('[TRACE] OrganizationArchive - Course:', course);
    console.log('[TRACE] OrganizationArchive - Course ID:', course.id);
    
    setSelectedCourse(course);
    setStudentDialogOpen(true);
    setLoadingStudents(true);
    setStudentError(null);

    try {
      console.log('[TRACE] OrganizationArchive - Making API call to fetch students');
      const response = await api.get(`/organization/courses/${course.id}/students`);
      console.log('[TRACE] OrganizationArchive - API response:', response);
      
      if (response.data.success) {
        console.log('[TRACE] OrganizationArchive - Setting students data:', response.data.data);
        setStudents(response.data.data || []);
      } else {
        console.log('[TRACE] OrganizationArchive - API returned success: false');
        setStudentError('Failed to load students');
      }
    } catch (error: unknown) {
      const errObj = error as { response?: { data?: { error?: { message?: string } } } };
      console.error('[TRACE] OrganizationArchive - Error fetching students:', error);
      console.error('[TRACE] OrganizationArchive - Error response:', errObj.response);
      setStudentError(errObj.response?.data?.error?.message || 'Failed to load students');
    } finally {
      console.log('[TRACE] OrganizationArchive - Setting loading to false');
      setLoadingStudents(false);
    }
  };

  // Handle close student dialog
  const handleCloseStudentDialog = () => {
    setStudentDialogOpen(false);
    setSelectedCourse(null);
    setStudents([]);
    setStudentError(null);
  };

  // Filter courses based on search and filters
  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.courseTypeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.instructor.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || course.status.toLowerCase() === statusFilter.toLowerCase();
    const matchesCourseType = courseTypeFilter === 'all' || course.courseTypeName === courseTypeFilter;
    
    return matchesSearch && matchesStatus && matchesCourseType;
  });

  // Get unique course types for filter
  const courseTypes = Array.from(new Set(courses.map(course => course.courseTypeName))).sort();

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Archive
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Completed courses that have been invoiced and moved to archive
      </Typography>

      <Paper sx={{ p: 3 }}>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Search courses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="small"
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                label="Status"
              >
                <MenuItem value="all">All Statuses</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Course Type</InputLabel>
              <Select
                value={courseTypeFilter}
                onChange={(e) => setCourseTypeFilter(e.target.value)}
                label="Course Type"
              >
                <MenuItem value="all">All Course Types</MenuItem>
                {courseTypes.map(type => (
                  <MenuItem key={type} value={type}>{type}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Course Type</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Location</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Instructor</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Students</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Completed Date</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Archived Date</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredCourses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <Typography variant="body2" color="text.secondary">
                      No archived courses found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredCourses.map((course, index) => (
                  <TableRow
                    key={course.id}
                    sx={{
                      backgroundColor: index % 2 !== 0 ? '#f9f9f9' : 'inherit',
                    }}
                  >
                    <TableCell>{course.courseTypeName}</TableCell>
                    <TableCell>{course.location}</TableCell>
                    <TableCell>{course.instructor || '-'}</TableCell>
                    <TableCell>
                      {course.studentsAttended || 0} / {course.registeredStudents}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusLabel(course.status)}
                        color={getStatusColor(course.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{formatDate(course.confirmedDate || '')}</TableCell>
                    <TableCell>{formatDate(course.archivedAt || '')}</TableCell>
                    <TableCell align="center">
                      <Tooltip title="View Students">
                        <IconButton
                          color="info"
                          size="small"
                          onClick={() => handleViewStudentsClick(course)}
                        >
                          <ViewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Student List Dialog */}
      <Dialog
        open={studentDialogOpen}
        onClose={handleCloseStudentDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Students - {selectedCourse?.courseTypeName}
          <IconButton
            aria-label="close"
            onClick={handleCloseStudentDialog}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {loadingStudents ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : studentError ? (
            <Typography color="error">{studentError}</Typography>
          ) : students.length === 0 ? (
            <Typography>No students found for this course.</Typography>
          ) : (
            <List>
              {students.map((student, index) => (
                <React.Fragment key={student.id}>
                  <ListItem>
                    <ListItemText
                      primary={`${student.firstName} ${student.lastName}`}
                      secondary={student.email}
                    />
                    <Chip
                      label={student.attended ? 'Attended' : 'No Show'}
                      color={student.attended ? 'success' : 'error'}
                      size="small"
                    />
                  </ListItem>
                  {index < students.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseStudentDialog}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OrganizationArchive; 