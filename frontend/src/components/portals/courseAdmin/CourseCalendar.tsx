import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Chip,
  Grid,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Circle as CircleIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import api from '../../../services/api';

interface Course {
  id: number;
  organizationName?: string;
  courseTypeName?: string;
  instructorName?: string;
  status: string;
  scheduledDate?: string;
  confirmedDate?: string;
  confirmedStartTime?: string;
  confirmedEndTime?: string;
  registeredStudents?: number;
  studentsAttended?: number;
  location?: string;
  notes?: string;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  courses: Course[];
}

const CourseCalendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Fetch pending courses
  const { data: pendingCourses = [], isLoading: loadingPending } = useQuery({
    queryKey: ['pendingCourses'],
    queryFn: async () => {
      const response = await api.get('/courses/pending');
      return response.data.data || [];
    },
  });

  // Fetch confirmed courses
  const { data: confirmedCourses = [], isLoading: loadingConfirmed } = useQuery({
    queryKey: ['confirmedCourses'],
    queryFn: async () => {
      const response = await api.get('/courses/confirmed');
      return response.data.data || [];
    },
  });

  const isLoading = loadingPending || loadingConfirmed;

  // Combine all courses
  const allCourses = useMemo(() => {
    return [...pendingCourses, ...confirmedCourses];
  }, [pendingCourses, confirmedCourses]);

  // Get calendar days for current month
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // First day of month
    const firstDay = new Date(year, month, 1);
    // Last day of month
    const lastDay = new Date(year, month + 1, 0);

    // Start from Sunday of the week containing the first day
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay());

    // End on Saturday of the week containing the last day
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

    const days: CalendarDay[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      const dateStr = current.toISOString().split('T')[0];

      // Find courses for this day
      const coursesForDay = allCourses.filter((course) => {
        const courseDate = course.confirmedDate || course.scheduledDate;
        if (!courseDate) return false;
        const courseDateStr = new Date(courseDate).toISOString().split('T')[0];
        return courseDateStr === dateStr;
      });

      days.push({
        date: new Date(current),
        isCurrentMonth: current.getMonth() === month,
        courses: coursesForDay,
      });

      current.setDate(current.getDate() + 1);
    }

    return days;
  }, [currentDate, allCourses]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleCourseClick = (course: Course) => {
    setSelectedCourse(course);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedCourse(null);
  };

  const formatTime = (time: string | undefined) => {
    if (!time) return '';
    try {
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      return `${hour12}:${minutes} ${ampm}`;
    } catch {
      return time;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
        return '#4caf50'; // Green
      case 'pending':
      case 'past_due':
        return '#ff9800'; // Orange/Yellow
      default:
        return '#9e9e9e'; // Grey
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
        return 'Confirmed';
      case 'pending':
        return 'Pending';
      case 'past_due':
        return 'Past Due';
      default:
        return status;
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Paper sx={{ p: 2 }}>
      {/* Calendar Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <IconButton onClick={handlePrevMonth}>
          <ChevronLeftIcon />
        </IconButton>
        <Typography variant="h5" fontWeight="bold">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </Typography>
        <IconButton onClick={handleNextMonth}>
          <ChevronRightIcon />
        </IconButton>
      </Box>

      {/* Legend */}
      <Box display="flex" gap={3} mb={2} justifyContent="center">
        <Box display="flex" alignItems="center" gap={0.5}>
          <CircleIcon sx={{ fontSize: 12, color: '#ff9800' }} />
          <Typography variant="caption">Pending</Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={0.5}>
          <CircleIcon sx={{ fontSize: 12, color: '#4caf50' }} />
          <Typography variant="caption">Confirmed</Typography>
        </Box>
      </Box>

      {/* Day Headers */}
      <Grid container>
        {dayNames.map((day) => (
          <Grid item xs={12 / 7} key={day}>
            <Box
              sx={{
                textAlign: 'center',
                py: 1,
                fontWeight: 'bold',
                backgroundColor: 'grey.100',
                borderBottom: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography variant="body2" fontWeight="bold">
                {day}
              </Typography>
            </Box>
          </Grid>
        ))}
      </Grid>

      {/* Calendar Grid */}
      <Grid container>
        {calendarDays.map((day, index) => {
          const isToday = day.date.toDateString() === new Date().toDateString();

          return (
            <Grid item xs={12 / 7} key={index}>
              <Box
                sx={{
                  minHeight: 100,
                  border: '1px solid',
                  borderColor: 'divider',
                  p: 0.5,
                  backgroundColor: day.isCurrentMonth
                    ? isToday
                      ? 'primary.50'
                      : 'background.paper'
                    : 'grey.50',
                }}
              >
                {/* Date Number */}
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: isToday ? 'bold' : 'normal',
                    color: day.isCurrentMonth ? 'text.primary' : 'text.disabled',
                    mb: 0.5,
                  }}
                >
                  {day.date.getDate()}
                </Typography>

                {/* Courses for this day */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  {day.courses.slice(0, 3).map((course) => (
                    <Box
                      key={course.id}
                      onClick={() => handleCourseClick(course)}
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        cursor: 'pointer',
                        p: 0.5,
                        borderRadius: 0.5,
                        backgroundColor: `${getStatusColor(course.status)}20`,
                        borderLeft: `3px solid ${getStatusColor(course.status)}`,
                        '&:hover': {
                          backgroundColor: `${getStatusColor(course.status)}30`,
                        },
                        overflow: 'hidden',
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          fontSize: '0.65rem',
                          lineHeight: 1.2,
                          fontWeight: 'bold',
                        }}
                      >
                        {course.organizationName?.substring(0, 12) || 'N/A'}
                      </Typography>
                      {course.status?.toLowerCase() === 'confirmed' && (
                        <Typography
                          variant="caption"
                          sx={{
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            fontSize: '0.6rem',
                            lineHeight: 1.1,
                            color: 'text.secondary',
                          }}
                        >
                          {course.instructorName?.split(' ')[0] || 'No Instr'} • {course.registeredStudents || 0} students
                        </Typography>
                      )}
                    </Box>
                  ))}
                  {day.courses.length > 3 && (
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>
                      +{day.courses.length - 3} more
                    </Typography>
                  )}
                </Box>
              </Box>
            </Grid>
          );
        })}
      </Grid>

      {/* Course Details Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <CircleIcon sx={{ fontSize: 16, color: getStatusColor(selectedCourse?.status || '') }} />
            <Typography variant="h6">Course Details</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedCourse && (
            <Box sx={{ pt: 1 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Chip
                    label={getStatusLabel(selectedCourse.status)}
                    sx={{
                      backgroundColor: getStatusColor(selectedCourse.status),
                      color: 'white',
                      fontWeight: 'bold',
                    }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Divider />
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Organization
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {selectedCourse.organizationName || 'N/A'}
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Course Type
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {selectedCourse.courseTypeName || 'N/A'}
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Date
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {selectedCourse.confirmedDate || selectedCourse.scheduledDate
                      ? new Date(selectedCourse.confirmedDate || selectedCourse.scheduledDate || '').toLocaleDateString()
                      : 'Not scheduled'}
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Time
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {selectedCourse.confirmedStartTime
                      ? `${formatTime(selectedCourse.confirmedStartTime)} - ${formatTime(selectedCourse.confirmedEndTime)}`
                      : 'Not set'}
                  </Typography>
                </Grid>

                {selectedCourse.status === 'confirmed' && (
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Instructor
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {selectedCourse.instructorName || 'Not assigned'}
                    </Typography>
                  </Grid>
                )}

                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Students
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {selectedCourse.registeredStudents || 0} registered
                  </Typography>
                </Grid>

                {selectedCourse.location && (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">
                      Location
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {selectedCourse.location}
                    </Typography>
                  </Grid>
                )}

                {selectedCourse.notes && (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">
                      Notes
                    </Typography>
                    <Typography variant="body1">
                      {selectedCourse.notes}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Close</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default CourseCalendar;
