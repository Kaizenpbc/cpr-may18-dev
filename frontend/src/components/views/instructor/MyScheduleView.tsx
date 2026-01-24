import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Chip,
  Grid,
  IconButton,
  Tooltip,
  useTheme,
} from '@mui/material';
import { format, parseISO } from 'date-fns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { PickersDay, PickersDayProps } from '@mui/x-date-pickers/PickersDay';
import { Refresh } from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { formatDisplayDate } from '../../../utils/dateUtils';
import { 
  useInstructorClasses, 
  useCompletedClasses, 
  useInstructorAvailability,
  useRefreshInstructorData
} from '../../../services/instructorService';

interface ScheduleEntry {
  key: string;
  date: string;
  displayDate: string;
  status: 'AVAILABLE' | 'CONFIRMED';
  organization: string;
  courseType: string;
  location: string;
  studentCount: number;
  studentsAttendance: number;
  notes?: string;
}

interface AvailabilitySlot {
  id: number;
  date: string;
  status: string;
}

interface ScheduledClass {
  course_id: number;
  date: string;
  organizationname: string;
  course_name: string;
  name: string;
  location: string;
  studentcount: number;
  studentsattendance: number;
}

const MyScheduleView: React.FC = () => {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);

  // Use centralized service hooks instead of useInstructorData
  const { data: scheduledClasses = [], isLoading: classesLoading, error: classesError } = useInstructorClasses();
  const { data: completedClasses = [], isLoading: completedLoading, error: completedError } = useCompletedClasses();
  const { data: availableDates = [], isLoading: availabilityLoading, error: availabilityError } = useInstructorAvailability();
  const refreshData = useRefreshInstructorData();

  // Combine loading states
  const loading = classesLoading || completedLoading || availabilityLoading;
  const combinedError = classesError || completedError || availabilityError || error;

  console.log('[MyScheduleView] Component rendered with props:', {
    availableDates: JSON.stringify(availableDates, null, 2),
    scheduledClasses: JSON.stringify(scheduledClasses, null, 2),
    completedClasses: JSON.stringify(completedClasses, null, 2),
    loading,
    selectedDate,
    currentMonth
  });

  useEffect(() => {
    console.log('[MyScheduleView] useEffect triggered');
    if (!isAuthenticated) {
      console.log('[MyScheduleView] User not authenticated, redirecting to login');
      navigate('/login');
      return;
    }
    console.log('[MyScheduleView] User authenticated, loading data');
    refreshData();
  }, [isAuthenticated, navigate, refreshData]);

  // Add a refresh effect when the component is focused/visible
  useEffect(() => {
    const handleFocus = () => {
      console.log('[MyScheduleView] Window focused, checking authentication');
      if (isAuthenticated) {
        console.log('[MyScheduleView] User authenticated, refreshing data');
        refreshData();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [isAuthenticated, refreshData]);

  const handleUnauthorized = async () => {
    await logout();
    navigate('/login');
  };

  const formatDate = (dateString: string) => {
    const date = parseISO(dateString);
    return format(date, 'yyyy-MM-dd');
  };

  // Transform the data from centralized service into ScheduleEntry format
  const schedule: ScheduleEntry[] = React.useMemo(() => {
    console.log('[MyScheduleView] 🔍 DEBUG: Processing schedule data:', {
      availableDates: availableDates,
      scheduledClasses: scheduledClasses,
      completedClasses: completedClasses,
      availableDatesLength: availableDates?.length || 0,
      scheduledClassesLength: scheduledClasses?.length || 0,
      completedClassesLength: completedClasses?.length || 0
    });

    // Transform available dates into ScheduleEntry format
    const filteredAvailabilityEntries: ScheduleEntry[] = availableDates
      .filter((availability: AvailabilitySlot) => {
        // Handle both YYYY-MM-DD format and ISO format with timezone
        const dateStr = availability.date.includes('T') 
          ? availability.date.split('T')[0] 
          : availability.date;
        const date = new Date(dateStr + 'T00:00:00');
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        console.log('[MyScheduleView] 🔍 DEBUG: Filtering availability:', {
          originalDate: availability.date,
          dateStr: dateStr,
          parsedDate: date,
          today: today,
          isAfterToday: date >= today
        });
        return date >= today;
      })
      .map((availability: AvailabilitySlot): ScheduleEntry => {
        console.log('[MyScheduleView] 🔍 DEBUG: Transforming availability:', availability);
        // Handle both YYYY-MM-DD format and ISO format with timezone
        const dateStr = availability.date.includes('T') 
          ? availability.date.split('T')[0] 
          : availability.date;
        const entry = {
          key: `available-${availability.id}`,
          date: dateStr, // Store just the date part
          displayDate: formatDisplayDate(dateStr),
          status: 'AVAILABLE' as const,
          organization: 'Available',
          courseType: 'Available',
          location: 'Available',
          studentCount: 0,
          studentsAttendance: 0,
        };
        console.log('[MyScheduleView] 🔍 DEBUG: Created availability entry:', entry);
        return entry;
      });

    console.log('[MyScheduleView] 🔍 DEBUG: Filtered availability entries:', JSON.stringify(filteredAvailabilityEntries, null, 2));

    // Transform scheduled classes into ScheduleEntry format
    const classEntries: ScheduleEntry[] = scheduledClasses.map(
      (c: ScheduledClass): ScheduleEntry => {
        console.log('[MyScheduleView] 🔍 DEBUG: Processing scheduled class:', c);
        return {
          key: `scheduled-${c.course_id}`,
          date: c.date,
          displayDate: formatDisplayDate(c.date),
          status: 'CONFIRMED',
          organization: c.organizationname || 'Unassigned',
          courseType: c.course_name || c.name || 'CPR Class',
          location: c.location || 'TBD',
          studentCount: c.studentcount || 0,
          studentsAttendance: c.studentsattendance || 0,
        };
      }
    );

    console.log('[MyScheduleView] 🔍 DEBUG: Class entries:', JSON.stringify(classEntries, null, 2));

    // Combine and sort all entries
    const allEntries = [...filteredAvailabilityEntries, ...classEntries].sort(
      (a: ScheduleEntry, b: ScheduleEntry) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    console.log('[MyScheduleView] 🔍 DEBUG: Final combined schedule:', JSON.stringify(allEntries, null, 2));
    return allEntries;
  }, [availableDates, scheduledClasses, completedClasses]);

  const getScheduleForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return schedule.filter((entry: ScheduleEntry) => {
      // For availability entries, the date is already in YYYY-MM-DD format
      // For scheduled classes, handle both ISO date strings and simple date strings
      const entryDate = entry.status === 'AVAILABLE' 
        ? entry.date // Already in YYYY-MM-DD format
        : entry.date.includes('T') 
          ? format(parseISO(entry.date), 'yyyy-MM-dd')
          : entry.date;
      return entryDate === dateStr;
    });
  };

  const CustomPickersDay = (props: PickersDayProps<Date>) => {
    const { day, ...other } = props;
    const dateStr = format(day, 'yyyy-MM-dd');
    console.log('[CustomPickersDay] Rendering day:', dateStr, 'Available dates:', availableDates);
    
    const isAvailable = availableDates.some((availability: AvailabilitySlot) => {
      // Handle both YYYY-MM-DD format and ISO format with timezone
      const availabilityDate = availability.date.includes('T') 
        ? availability.date.split('T')[0] 
        : availability.date;
      const matches = availabilityDate === dateStr;
      console.log('[CustomPickersDay] Checking availability:', {
        originalAvailabilityDate: availability.date,
        availabilityDate: availabilityDate,
        currentDate: dateStr,
        matches: matches
      });
      return matches;
    });
    
    const isScheduled = scheduledClasses.some((c: ScheduledClass) => {
      // Handle both ISO date strings and simple date strings
      const classDate = c.date.includes('T') 
        ? format(parseISO(c.date), 'yyyy-MM-dd')
        : c.date;
      return classDate === dateStr;
    });
    
    const isPastDate = day < new Date(new Date().setHours(0, 0, 0, 0));
    
    console.log('[CustomPickersDay] Status for', dateStr, {
      isAvailable,
      isScheduled,
      isPastDate,
      availableDates: availableDates
    });

    // Color scheduled classes BLUE and available dates GREEN
    let backgroundColor, hoverColor, textColor;

    if (isScheduled) {
      // Blue = Scheduled Classes
      backgroundColor = theme.palette.primary.main;
      hoverColor = theme.palette.primary.dark;
      textColor = 'white';
    } else if (isAvailable) {
      // Green = Available
      backgroundColor = theme.palette.success.main;
      hoverColor = theme.palette.success.dark;
      textColor = 'white';
    } else {
      // All other dates use default styling
      backgroundColor = 'inherit';
      hoverColor = theme.palette.action.hover;
      textColor = 'inherit';
    }

    return (
      <PickersDay
        {...other}
        day={day}
        disabled={isPastDate}
        sx={{
          '&.MuiPickersDay-root': {
            backgroundColor: `${backgroundColor}!important`,
            color: `${textColor}!important`,
            cursor: isPastDate ? 'not-allowed' : 'pointer',
            '&:hover': {
              backgroundColor: `${hoverColor}!important`,
            },
            '&.Mui-disabled': {
              backgroundColor: `${backgroundColor}!important`,
              color: `${textColor}!important`,
              opacity: 0.7,
            },
          },
        }}
      />
    );
  };

  const handleMonthChange = (date: Date) => {
    setCurrentMonth(date);
  };

  const handleDateChange = (newDate: Date | null) => {
    if (newDate) {
      setSelectedDate(newDate);
    }
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

  const selectedSchedule = getScheduleForDate(selectedDate);

  return (
    <Container maxWidth='lg'>
      <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
        <Box sx={{ mb: 3 }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 1,
            }}
          >
            <Typography variant='h5'>My Schedule</Typography>
            <Tooltip title='Refresh schedule data'>
              <IconButton
                onClick={refreshData}
                disabled={loading}
                color='primary'
                size='large'
              >
                <Refresh />
              </IconButton>
            </Tooltip>
          </Box>
          <Typography variant='body1' color='text.secondary'>
            View your availability and scheduled classes. Click refresh to
            update data.
          </Typography>
        </Box>

        {combinedError && (
          <Alert severity='error' sx={{ mb: 2 }}>
            {typeof combinedError === 'string' ? combinedError : combinedError.message}
          </Alert>
        )}

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 2 }}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DateCalendar
                  value={selectedDate}
                  onChange={newDate => handleDateChange(newDate || new Date())}
                  onMonthChange={newDate =>
                    handleMonthChange(newDate || new Date())
                  }
                  slots={{
                    day: CustomPickersDay,
                  }}
                  sx={{
                    width: '100%',
                    '& .MuiPickersCalendarHeader-root': {
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      pl: 2,
                      pr: 2,
                    },
                  }}
                />
              </LocalizationProvider>
            </Paper>

            {/* Legend Panel */}
            <Paper elevation={2} sx={{ p: 2, mt: 2 }}>
              <Typography variant='h6' gutterBottom>
                Legend
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      backgroundColor: theme.palette.success.main,
                    }}
                  />
                  <Typography variant='body2' sx={{ fontWeight: 'bold' }}>Available</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      backgroundColor: theme.palette.primary.main,
                    }}
                  />
                  <Typography variant='body2'>Scheduled Classes</Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper
              elevation={2}
              sx={{ 
                p: 2, 
                height: '100%', 
                minHeight: '300px',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <Typography variant='h6' gutterBottom>
                {formatDisplayDate(selectedDate)}
              </Typography>
              {selectedSchedule.length > 0 ? (
                <Box sx={{ flex: 1 }}>
                  <Chip
                    label={selectedSchedule[0].status}
                    color={
                      selectedSchedule[0].status === 'CONFIRMED'
                        ? 'primary'
                        : 'success'
                    }
                    sx={{ mb: 2 }}
                  />
                  {selectedSchedule[0].status === 'CONFIRMED' && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant='body1'>
                        <strong>Organization:</strong>{' '}
                        {selectedSchedule[0].organization}
                      </Typography>
                      <Typography variant='body1'>
                        <strong>Location:</strong> {selectedSchedule[0].location}
                      </Typography>
                      <Typography variant='body1'>
                        <strong>Class Type:</strong>{' '}
                        {selectedSchedule[0].courseType}
                      </Typography>
                      {selectedSchedule[0].notes && (
                        <Typography variant='body1'>
                          <strong>Notes:</strong> {selectedSchedule[0].notes}
                        </Typography>
                      )}
                    </Box>
                  )}
                </Box>
              ) : (
                <Typography variant='body1' color='text.secondary'>
                  No schedule entry for this date
                </Typography>
              )}
            </Paper>
          </Grid>
          <Grid item xs={12}>
            <Typography variant='h6' gutterBottom sx={{ mt: 2 }}>
              Schedule List
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Organization</TableCell>
                    <TableCell>Location</TableCell>
                    <TableCell>Class Type</TableCell>
                    <TableCell>Notes</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {schedule.map((entry, index) => (
                    <TableRow
                      key={`${entry.date}-${entry.status}-${entry.organization || ''}-${entry.courseType || ''}-${entry.notes || ''}-${index}`}
                      onClick={() => {
                        // Handle both ISO date strings and simple date strings
                        const entryDate = entry.date.includes('T') 
                          ? parseISO(entry.date)
                          : parseISO(entry.date + 'T00:00:00');
                        setSelectedDate(entryDate);
                      }}
                      sx={{
                        cursor: 'pointer',
                        '&:hover': { backgroundColor: 'action.hover' },
                        backgroundColor: (() => {
                          // Handle both ISO date strings and simple date strings
                          const entryDate = entry.date.includes('T') 
                            ? format(parseISO(entry.date), 'yyyy-MM-dd')
                            : entry.date;
                          const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
                          return entryDate === selectedDateStr
                            ? 'action.selected'
                            : 'inherit';
                        })(),
                      }}
                    >
                      <TableCell>
                        {formatDisplayDate(entry.date)}
                      </TableCell>
                      <TableCell>{entry.organization || '-'}</TableCell>
                      <TableCell>{entry.location || '-'}</TableCell>
                      <TableCell>{entry.courseType || '-'}</TableCell>
                      <TableCell>{entry.notes || '-'}</TableCell>
                      <TableCell>
                        <Chip
                          label={entry.status}
                          color={
                            entry.status === 'CONFIRMED' ? 'primary' : 'success'
                          }
                          size='small'
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  {schedule.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align='center'>
                        <Typography variant='body1' color='text.secondary'>
                          No schedule entries found
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};

export default MyScheduleView;
