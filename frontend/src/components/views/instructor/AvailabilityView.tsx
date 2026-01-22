import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Button,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Snackbar,
} from '@mui/material';
import {
  Event as EventIcon,
  EventAvailable as EventAvailableIcon,
  EventBusy as EventBusyIcon,
  HolidayVillage as HolidayVillageIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { PickersDay } from '@mui/x-date-pickers/PickersDay';
import type { Class, Availability, ApiResponse } from '../../../types/api';
import api, { instructorApi } from '../../../api/index';
import { useAuth } from '../../../contexts/AuthContext';
import { useInstructorClasses, useInstructorAvailability, useAddAvailability, useRemoveAvailability } from '../../../services/instructorService';
import { useNavigate } from 'react-router-dom';
import { formatDisplayDate } from '../../../utils/dateUtils';
import { handleError } from '../../../services/errorHandler';

interface AvailabilitySlot {
  id: number;
  date: string;
  status?: string;
}

interface ScheduledClassItem {
  course_id?: number;
  date: string;
  datescheduled?: string;
  organizationname?: string;
  organization_name?: string;
  location?: string;
  course_name?: string;
  course_type?: string;
  studentcount?: number;
  studentsattendance?: number;
  status?: string;
}

interface AvailabilityViewProps {
  availableDates?: (string | AvailabilitySlot)[];
  scheduledClasses?: ScheduledClassItem[];
  onAddAvailability?: (
    date: string
  ) => Promise<{ success: boolean; error?: string } | void>;
  onRemoveAvailability?: (
    date: string
  ) => Promise<{ success: boolean; error?: string } | void>;
  onRefresh?: () => void;
  ontarioHolidays2024?: string[];
  isLoading?: boolean;
}

interface ConfirmationState {
  open: boolean;
  date: string;
  action: 'add' | 'remove';
  isAvailable: boolean;
}

const AvailabilityView: React.FC<AvailabilityViewProps> = ({
  availableDates: propAvailableDates = [],
  scheduledClasses: propScheduledClasses = [],
  onAddAvailability,
  onRemoveAvailability,
  onRefresh,
  ontarioHolidays2024 = [],
  isLoading = false,
}) => {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [holidays, setHolidays] = useState<string[]>(ontarioHolidays2024);

  // Fetch data using service hooks
  const { data: rawFetchedClasses, isLoading: classesLoading } = useInstructorClasses();
  const { data: rawFetchedAvailability, isLoading: availabilityLoading } = useInstructorAvailability();
  const addAvailabilityMutation = useAddAvailability();
  const removeAvailabilityMutation = useRemoveAvailability();

  // Type cast the fetched data
  const fetchedClasses = (Array.isArray(rawFetchedClasses) ? rawFetchedClasses : []) as ScheduledClassItem[];
  const fetchedAvailability = (Array.isArray(rawFetchedAvailability) ? rawFetchedAvailability : []) as AvailabilitySlot[];

  // Use fetched data if no props provided, otherwise use props
  const scheduledClasses = (propScheduledClasses && propScheduledClasses.length > 0) ? propScheduledClasses : fetchedClasses;

  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationState>({
    open: false,
    date: '',
    action: 'add',
    isAvailable: false,
  });
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Ensure availableDates is always an array and extract dates
  // Use fetched availability if no props provided
  const availabilitySource = (propAvailableDates && propAvailableDates.length > 0) ? propAvailableDates : fetchedAvailability;

  const availableDates = React.useMemo(() => {
    return (Array.isArray(availabilitySource) ? availabilitySource : [])
      .map(item => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object' && 'date' in item) {
          // Handle both YYYY-MM-DD and ISO date formats
          const dateStr = item.date;
          return dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
        }
        return null;
      })
      .filter((date): date is string => date !== null);
  }, [availabilitySource]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
  }, [isAuthenticated]);

  const handleUnauthorized = async () => {
    await logout();
    navigate('/login');
  };

  const handleDateClick = async (date: Date | null) => {
    if (!date || !isAuthenticated) {
      return;
    }

    const dateStr = format(date, 'yyyy-MM-dd');
    const isAvailable = availableDates.some(d => {
      if (!d) return false;
      const dStr = typeof d === 'string' ? d.slice(0, 10) : '';
      return dStr.length === 10 && !isNaN(new Date(dStr).getTime()) && dStr === dateStr;
    });

    // Check if the date is less than 11 days from now
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (isAvailable && diffDays < 11) {
      setError('Cannot remove availability: Dates less than 11 days in the future cannot be modified');
      return;
    }

    // Show confirmation dialog
    setConfirmation({
      open: true,
      date: dateStr,
      action: isAvailable ? 'remove' : 'add',
      isAvailable,
    });
  };

  const handleConfirmationClose = () => {
    setConfirmation(prev => ({ ...prev, open: false }));
  };

  const handleConfirmationConfirm = async () => {
    try {
      if (confirmation.action === 'add') {
        // Use prop callback if provided, otherwise use mutation hook
        if (onAddAvailability) {
          await onAddAvailability(confirmation.date);
        } else {
          await addAvailabilityMutation.mutateAsync(confirmation.date);
        }
        setSuccessMessage('Availability added successfully');
      } else {
        // Use prop callback if provided, otherwise use mutation hook
        if (onRemoveAvailability) {
          await onRemoveAvailability(confirmation.date);
        } else {
          await removeAvailabilityMutation.mutateAsync(confirmation.date);
        }
        setSuccessMessage('Availability removed successfully');
      }
    } catch (err: any) {
      handleError(err, { component: 'AvailabilityView', action: 'update availability' });
      setError(err.message || 'Failed to update availability');
    } finally {
      handleConfirmationClose();
    }
  };

  const CustomDay = (props: any) => {
    const { day, ...other } = props;
    const dateStr = format(day, 'yyyy-MM-dd');
    const isAvailable = availableDates.some(d => {
      if (!d) return false;
      const dStr = typeof d === 'string' ? d.slice(0, 10) : '';
      return dStr.length === 10 && !isNaN(new Date(dStr).getTime()) && dStr === dateStr;
    });

    const isScheduled = scheduledClasses.some(c => {
      // Check multiple possible date field names from backend
      const classDate = c.date || c.datescheduled;
      return classDate === dateStr;
    });

    const isHoliday = holidays.includes(dateStr);
    const isPastDate = day < new Date(new Date().setHours(0, 0, 0, 0));
    
    // Check if date is within 11 days
    const today = new Date();
    const diffTime = day.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const isWithin11Days = diffDays < 11;

    // Color available dates GREEN
    let backgroundColor, hoverColor, tooltipTitle, textColor;

    if (isScheduled) {
      // Blue = Scheduled Classes
      backgroundColor = theme.palette.primary.main;
      hoverColor = theme.palette.primary.dark;
      textColor = 'white';
      const classInfo = scheduledClasses.find(
        c => (c.date || c.datescheduled) === dateStr
      );
      tooltipTitle = `Scheduled: ${classInfo?.organizationname || 'Class'}`;
    } else if (isAvailable) {
      // Green = Available
      backgroundColor = theme.palette.success.main;
      hoverColor = theme.palette.success.dark;
      textColor = 'white';
      tooltipTitle = isWithin11Days 
        ? 'Cannot unmark availability within 11 days'
        : isPastDate
        ? 'Cannot unmark past availability'
        : 'Available - Click to remove';
    } else {
      // All other dates use default styling
      backgroundColor = 'inherit';
      hoverColor = theme.palette.action.hover;
      textColor = 'inherit';

      if (isHoliday) {
        tooltipTitle = 'Holiday';
      } else if (isPastDate) {
        tooltipTitle = 'Past Date';
      } else {
        tooltipTitle = 'Click to mark as available';
      }
    }

    return (
      <Tooltip title={tooltipTitle} arrow>
        <span style={{ display: 'inline-block' }}>
          <PickersDay
            {...other}
            day={day}
            onClick={() => {
              if (isAvailable) {
                if (isPastDate) {
                  setError('Cannot unmark past availability');
                  return;
                }
                if (isWithin11Days) {
                  setError('Cannot unmark availability within 11 days');
                  return;
                }
              }
              handleDateClick(day);
            }}
            sx={{
              backgroundColor: `${backgroundColor}!important`,
              color: `${textColor}!important`,
              cursor: isScheduled ? 'not-allowed' : 'pointer',
              '&:hover': {
                backgroundColor: `${hoverColor}!important`,
              },
              '&.Mui-disabled': {
                backgroundColor: `${backgroundColor}!important`,
                color: `${textColor}!important`,
                opacity: 0.7,
              },
            }}
          />
        </span>
      </Tooltip>
    );
  };

  // Combine loading states
  const combinedLoading = isLoading || classesLoading || availabilityLoading;

  if (combinedLoading) {
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
    <Container maxWidth='lg'>
      <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant='h5' gutterBottom>
            Manage Your Availability
          </Typography>
          <Typography variant='body1' color='text.secondary'>
            Click on dates to mark them as available or unavailable for
            teaching.
          </Typography>
        </Box>

        {error && (
          <Alert severity='error' sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            gap: 3,
          }}
        >
          <Box sx={{ flex: '1 1 auto' }}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DateCalendar
                value={currentDate}
                onMonthChange={date => date && setCurrentDate(date)}
                slots={{
                  day: CustomDay,
                }}
              />
            </LocalizationProvider>
          </Box>
          <Box sx={{ flex: '0 0 auto', width: { xs: '100%', md: '300px' } }}>
            <Paper elevation={2} sx={{ p: 2 }}>
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
                  <Typography variant='body2'>Available</Typography>
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
                <Box
                  sx={{
                    mt: 1,
                    pt: 1,
                    borderTop: `1px solid ${theme.palette.divider}`,
                  }}
                >
                  <Typography variant='caption' color='text.secondary'>
                    Click on any date to toggle availability
                  </Typography>
                </Box>
              </Box>
            </Paper>

            {/* Additional Info Panel */}
            <Paper elevation={2} sx={{ p: 2, mt: 2 }}>
              <Typography variant='h6' gutterBottom>
                Quick Stats
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography variant='body2'>
                  Available Days: <strong>{availableDates.length}</strong>
                </Typography>
                <Typography variant='body2'>
                  Scheduled Classes: <strong>{scheduledClasses.length}</strong>
                </Typography>
              </Box>
            </Paper>
          </Box>
        </Box>
      </Paper>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmation.open}
        onClose={handleConfirmationClose}
        aria-labelledby='confirmation-dialog-title'
        aria-describedby='confirmation-dialog-description'
      >
        <DialogTitle id='confirmation-dialog-title'>
          {confirmation.action === 'add'
            ? 'Add Availability'
            : 'Remove Availability'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id='confirmation-dialog-description'>
            {confirmation.action === 'add'
              ? `Are you sure you want to mark ${confirmation.date} as available for teaching?`
              : `Are you sure you want to remove your availability for ${confirmation.date}?`}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleConfirmationClose} color='inherit'>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmationConfirm}
            color={confirmation.action === 'add' ? 'success' : 'error'}
            variant='contained'
            autoFocus
          >
            {confirmation.action === 'add'
              ? 'Add Availability'
              : 'Remove Availability'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Snackbar */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={6000}
        onClose={() => setSuccessMessage('')}
        message={successMessage}
      />
    </Container>
  );
};

export default AvailabilityView;
