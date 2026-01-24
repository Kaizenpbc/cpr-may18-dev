import React, { useState } from 'react';
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
  Upload as UploadIcon,
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
}

interface Student {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  attended?: boolean;
  attendance_marked?: boolean;
}

interface OrganizationCoursesProps {
  courses: Course[];
  onViewStudentsClick?: (courseId: string | number) => void;
  onUploadStudentsClick?: (courseId: string | number) => void;
}

const OrganizationCourses: React.FC<OrganizationCoursesProps> = ({ 
  courses, 
  onViewStudentsClick, 
  onUploadStudentsClick 
}) => {
  // State for student list dialog
  const [studentDialogOpen, setStudentDialogOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentError, setStudentError] = useState<string | null>(null);

  // Filtering state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [courseTypeFilter, setCourseTypeFilter] = useState('');

  // Get status color for courses
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
      case 'completed':
        return 'success';
      case 'cancelled':
      case 'past_due':
        return 'error';
      default:
        return 'warning';
    }
  };

  // Get status label
  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
  };

  // Filter courses based on search and filters
  const filteredCourses = courses.filter(course => {
    const matchesSearch = searchTerm === '' || 
      course.courseTypeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.instructor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.notes?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === '' || course.status.toLowerCase() === statusFilter.toLowerCase();
    const matchesCourseType = courseTypeFilter === '' || course.courseTypeName.toLowerCase() === courseTypeFilter.toLowerCase();
    
    return matchesSearch && matchesStatus && matchesCourseType;
  });

  // Get unique course types for filter
  // Debug: Log courses with missing or invalid course_type_name
  const coursesWithMissingType = courses.filter(course => !course.courseTypeName || typeof course.courseTypeName !== 'string');
  if (coursesWithMissingType.length > 0) {
    console.warn('[DEBUG] Courses with missing or invalid course_type_name:', coursesWithMissingType);
  }
  const courseTypes = Array.from(
    new Set(
      courses
        .map(course => course.courseTypeName)
        .filter((type): type is string => typeof type === 'string' && !!type)
    )
  ).sort();

  // Helper function to check if upload should be disabled
  const isUploadDisabled = (course: Course) => {
    // Disable if course is completed or cancelled
    if (['completed', 'cancelled'].includes(course.status?.toLowerCase())) {
      return true;
    }

    // Disable if it's the day of the class (confirmed_date)
    if (course.confirmedDate) {
      const today = new Date();
      const classDate = new Date(course.confirmedDate);

      // Set both dates to start of day for accurate comparison
      today.setHours(0, 0, 0, 0);
      classDate.setHours(0, 0, 0, 0);

      // Disable uploads on or after the class date
      return classDate <= today;
    }

    return false;
  };

  // Helper function to get upload tooltip message
  const getUploadTooltip = (course: Course) => {
    if (['completed', 'cancelled'].includes(course.status?.toLowerCase())) {
      return `Cannot upload students - Course is ${course.status?.toLowerCase()}`;
    }

    if (course.confirmedDate) {
      const today = new Date();
      const classDate = new Date(course.confirmedDate);

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

  // Handle view students click
  const handleViewStudentsClick = async (course: Course) => {
    console.log('[TRACE] OrganizationCourses - handleViewStudentsClick called');
    console.log('[TRACE] OrganizationCourses - Course:', course);
    console.log('[TRACE] OrganizationCourses - Course ID:', course.id);
    
    setSelectedCourse(course);
    setStudentDialogOpen(true);
    setLoadingStudents(true);
    setStudentError(null);

    try {
      console.log('[TRACE] OrganizationCourses - Making API call to fetch students');
      const response = await api.get(`/organization/courses/${course.id}/students`);
      console.log('[TRACE] OrganizationCourses - API response:', response);
      
      if (response.data.success) {
        console.log('[TRACE] OrganizationCourses - Setting students data:', response.data.data);
        setStudents(response.data.data || []);
      } else {
        console.log('[TRACE] OrganizationCourses - API returned success: false');
        setStudentError('Failed to load students');
      }
    } catch (error: unknown) {
      const errObj = error as { response?: { data?: { error?: { message?: string } } } };
      console.error('[TRACE] OrganizationCourses - Error fetching students:', error);
      console.error('[TRACE] OrganizationCourses - Error response:', errObj.response);
      setStudentError(errObj.response?.data?.error?.message || 'Failed to load students');
    } finally {
      console.log('[TRACE] OrganizationCourses - Setting loading to false');
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

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        My Courses
      </Typography>

      <Paper sx={{ p: 3 }}>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Search courses..."
              variant="outlined"
              size="small"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select 
                label="Status" 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="">All Statuses</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="confirmed">Confirmed</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Course Type</InputLabel>
              <Select 
                label="Course Type" 
                value={courseTypeFilter}
                onChange={(e) => setCourseTypeFilter(e.target.value)}
              >
                <MenuItem value="">All Types</MenuItem>
                {courseTypes.map(type => (
                  <MenuItem key={type} value={type.toLowerCase ? type.toLowerCase() : type}>{type}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {filteredCourses.length} courses found
            </Typography>
          </Grid>
        </Grid>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date Submitted</TableCell>
                <TableCell>Date Scheduled</TableCell>
                <TableCell>Course Name</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Students Registered</TableCell>
                <TableCell>Students Attended</TableCell>
                <TableCell>Notes</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Instructor</TableCell>
                <TableCell sx={{ textAlign: 'center' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredCourses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align="center">
                    <Typography variant="body2" color="text.secondary">
                      {courses.length === 0 ? 'No courses found' : 'No courses match your filters'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredCourses.map((course) => {
                  const uploadDisabled = isUploadDisabled(course);
                  const uploadTooltip = getUploadTooltip(course);

                  return (
                    <TableRow key={course.id}>
                      <TableCell>
                        {course.requestSubmittedDate && !isNaN(new Date(course.requestSubmittedDate).getTime())
                          ? formatDisplayDate(course.requestSubmittedDate)
                          : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {course.scheduledDate
                          ? formatDisplayDate(course.scheduledDate)
                          : '-'}
                      </TableCell>
                      <TableCell>{course.courseTypeName}</TableCell>
                      <TableCell>{course.location}</TableCell>
                      <TableCell>{course.registeredStudents || 0}</TableCell>
                      <TableCell>{course.studentsAttended || 0}</TableCell>
                      <TableCell>
                        {course.notes && (
                          <Typography variant="body2" color="text.secondary">
                            {course.notes}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getStatusLabel(course.status)}
                          color={getStatusColor(course.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{course.instructor || 'TBD'}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                          <Tooltip title={uploadTooltip}>
                            <span>
                              <IconButton
                                onClick={() => onUploadStudentsClick && onUploadStudentsClick(course.id)}
                                size="small"
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
                                  <BlockIcon fontSize="small" />
                                ) : (
                                  <UploadIcon fontSize="small" />
                                )}
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title="View Student List">
                            <IconButton
                              onClick={() => handleViewStudentsClick(course)}
                              size="small"
                              color="secondary"
                              sx={{
                                bgcolor: 'secondary.light',
                                '&:hover': {
                                  bgcolor: 'secondary.main',
                                  color: 'white',
                                },
                              }}
                            >
                              <ViewIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })
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
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              Students for {selectedCourse?.courseTypeName}
            </Typography>
            <IconButton onClick={handleCloseStudentDialog}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {loadingStudents ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : studentError ? (
            <Typography color="error" sx={{ p: 2 }}>
              {studentError}
            </Typography>
          ) : students.length === 0 ? (
            <Typography color="text.secondary" sx={{ p: 2 }}>
              No students have been uploaded for this course yet.
            </Typography>
          ) : (
            <List>
              {students.map((student, index) => (
                <React.Fragment key={student.id}>
                  <ListItem>
                    <ListItemText
                      primary={`${student.first_name} ${student.last_name}`}
                      secondary={student.email}
                    />
                    {student.attendance_marked && (
                      <Chip
                        label={student.attended ? 'Attended' : 'No Show'}
                        color={student.attended ? 'success' : 'error'}
                        size="small"
                      />
                    )}
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

export default OrganizationCourses; 