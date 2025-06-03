import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  Paper,
  useTheme,
  useMediaQuery,
  IconButton,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Avatar,
} from '@mui/material';
import {
  CalendarToday as CalendarIcon,
  Class as ClassIcon,
  People as PeopleIcon,
  Assignment as AssignmentIcon,
  Schedule as ScheduleIcon,
  EventAvailable as EventAvailableIcon,
  Download as DownloadIcon,
  ArrowForward as ArrowForwardIcon,
  LocationOn as LocationIcon,
  Group as GroupIcon,
  AccessTime as TimeIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

interface InstructorDashboardProps {
  scheduledClasses?: any[];
  availableDates?: Set<string>;
  completedClasses?: any[];
}

/**
 * Instructor Dashboard - Overview of instructor activities
 */
const InstructorDashboard: React.FC<InstructorDashboardProps> = ({
  scheduledClasses = [],
  availableDates = new Set(),
  completedClasses = [],
}) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const upcomingClasses = scheduledClasses
    .filter(cls => !cls.completed)
    .slice(0, 3);
  const recentCompleted = completedClasses.slice(0, 3);

  // Get tomorrow's date
  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  };

  // Get tomorrow's classes
  const getTomorrowClasses = () => {
    const tomorrow = getTomorrowDate();
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    return scheduledClasses.filter(cls => {
      const classDate = new Date(cls.datescheduled).toISOString().split('T')[0];
      return classDate === tomorrowStr && !cls.completed;
    });
  };

  // Handle Quick Actions
  const handleViewTomorrowSchedule = () => {
    const tomorrowClasses = getTomorrowClasses();
    if (tomorrowClasses.length === 0) {
      alert('No classes scheduled for tomorrow');
    } else {
      navigate('/instructor/classes', {
        state: { filterDate: getTomorrowDate().toISOString() },
      });
    }
  };

  const handleUpdateAvailability = () => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    navigate('/instructor/availability', {
      state: { focusWeek: nextWeek.toISOString() },
    });
  };

  const handleDownloadWeekSchedule = async () => {
    try {
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      const weekClasses = scheduledClasses.filter(cls => {
        const classDate = new Date(cls.datescheduled);
        return classDate >= startOfWeek && classDate <= endOfWeek;
      });

      if (weekClasses.length === 0) {
        alert('No classes scheduled for this week');
        return;
      }

      const response = await fetch('/api/v1/instructor/schedule/weekly-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          startDate: startOfWeek.toISOString(),
          endDate: endOfWeek.toISOString(),
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `weekly-schedule-${startOfWeek.toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Failed to generate PDF. Please try again.');
      }
    } catch (error) {
      console.error('Error downloading schedule:', error);
      alert('Error downloading schedule. Please try again.');
    }
  };

  const StatCard = ({ icon, title, value, color }: any) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            mb: 1,
            minHeight: isMobile ? 48 : 'auto', // Larger touch target on mobile
          }}
        >
          {React.cloneElement(icon, {
            sx: {
              mr: 1,
              fontSize: isMobile ? 32 : 24,
              color: `${color}.main`,
            },
          })}
          <Typography
            variant={isMobile ? 'body1' : 'h6'}
            sx={{
              flexGrow: 1,
              fontSize: isMobile ? '1rem' : 'inherit',
            }}
          >
            {title}
          </Typography>
        </Box>
        <Typography
          variant={isMobile ? 'h4' : 'h3'}
          color={`${color}.main`}
          sx={{
            textAlign: isMobile ? 'right' : 'left',
            fontSize: isMobile ? '2rem' : 'inherit',
          }}
        >
          {value}
        </Typography>
      </CardContent>
    </Card>
  );

  const ClassCard = ({ cls, isCompleted = false }: any) => (
    <Card
      sx={{
        mb: 2,
        '&:active': isMobile
          ? {
              transform: 'scale(0.98)',
              transition: 'transform 0.1s',
            }
          : {},
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
          <Avatar
            sx={{
              bgcolor: isCompleted ? 'success.main' : 'primary.main',
              mr: 2,
            }}
          >
            {isCompleted ? <AssignmentIcon /> : <ClassIcon />}
          </Avatar>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant='subtitle1' fontWeight='bold'>
              {cls.coursetypename}
            </Typography>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                color: 'text.secondary',
                mt: 0.5,
              }}
            >
              <LocationIcon sx={{ fontSize: '1rem', mr: 0.5 }} />
              <Typography variant='body2'>
                {cls.organizationname} - {cls.location}
              </Typography>
            </Box>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                color: 'text.secondary',
                mt: 0.5,
              }}
            >
              <TimeIcon sx={{ fontSize: '1rem', mr: 0.5 }} />
              <Typography variant='body2'>
                {new Date(cls.datescheduled).toLocaleDateString()}
              </Typography>
            </Box>
          </Box>
          {!isCompleted && (
            <Box sx={{ display: 'flex', alignItems: 'center', ml: 1 }}>
              <GroupIcon
                sx={{ fontSize: '1rem', mr: 0.5, color: 'primary.main' }}
              />
              <Typography variant='body2' color='primary' fontWeight='bold'>
                {cls.studentcount || 0}
              </Typography>
            </Box>
          )}
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
          <Chip
            label={
              isCompleted ? 'Completed' : `${cls.studentcount || 0} students`
            }
            size='small'
            color={isCompleted ? 'success' : 'primary'}
          />
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ p: isMobile ? 2 : 3 }}>
      <Typography variant={isMobile ? 'h5' : 'h4'} gutterBottom sx={{ mb: 3 }}>
        Instructor Dashboard
      </Typography>

      {/* Quick Actions Widget */}
      <Card
        sx={{
          mb: 4,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: isMobile ? 2 : 3,
        }}
      >
        <CardContent>
          <Typography variant='h6' color='white' gutterBottom sx={{ mb: 3 }}>
            ⚡ Quick Actions
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <Button
                fullWidth
                variant='contained'
                startIcon={<ScheduleIcon />}
                onClick={handleViewTomorrowSchedule}
                sx={{
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  color: '#667eea',
                  py: isMobile ? 1.5 : 1,
                  '&:hover': {
                    backgroundColor: 'white',
                  },
                  '&:active': isMobile
                    ? {
                        transform: 'scale(0.98)',
                      }
                    : {},
                }}
              >
                Tomorrow's Schedule
                {getTomorrowClasses().length > 0 && (
                  <Chip
                    label={getTomorrowClasses().length}
                    size='small'
                    sx={{
                      ml: 1,
                      backgroundColor: '#667eea',
                      color: 'white',
                      height: isMobile ? 24 : 20,
                    }}
                  />
                )}
              </Button>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Button
                fullWidth
                variant='contained'
                startIcon={<EventAvailableIcon />}
                onClick={handleUpdateAvailability}
                sx={{
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  color: '#764ba2',
                  py: isMobile ? 1.5 : 1,
                  '&:hover': {
                    backgroundColor: 'white',
                  },
                  '&:active': isMobile
                    ? {
                        transform: 'scale(0.98)',
                      }
                    : {},
                }}
              >
                Update Next Week
              </Button>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Button
                fullWidth
                variant='contained'
                startIcon={<DownloadIcon />}
                onClick={handleDownloadWeekSchedule}
                sx={{
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  color: '#667eea',
                  py: isMobile ? 1.5 : 1,
                  '&:hover': {
                    backgroundColor: 'white',
                  },
                  '&:active': isMobile
                    ? {
                        transform: 'scale(0.98)',
                      }
                    : {},
                }}
              >
                Download Week PDF
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <Grid container spacing={isMobile ? 2 : 3} sx={{ mb: 4 }}>
        <Grid item xs={6} md={3}>
          <StatCard
            icon={<ClassIcon />}
            title='Scheduled'
            value={scheduledClasses.filter(cls => !cls.completed).length}
            color='primary'
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard
            icon={<CalendarIcon />}
            title='Available'
            value={availableDates.size}
            color='success'
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard
            icon={<AssignmentIcon />}
            title='Completed'
            value={completedClasses.length}
            color='info'
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard
            icon={<PeopleIcon />}
            title='Students'
            value={scheduledClasses.reduce(
              (total, cls) => total + (cls.studentcount || 0),
              0
            )}
            color='warning'
          />
        </Grid>
      </Grid>

      {/* Classes Lists */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper
            sx={{
              p: isMobile ? 2 : 3,
              height: '100%',
            }}
          >
            <Typography variant='h6' gutterBottom sx={{ mb: 2 }}>
              Upcoming Classes
            </Typography>
            {upcomingClasses.length > 0 ? (
              upcomingClasses.map((cls, index) => (
                <ClassCard key={index} cls={cls} />
              ))
            ) : (
              <Typography
                variant='body2'
                color='text.secondary'
                sx={{
                  textAlign: 'center',
                  py: 4,
                }}
              >
                No upcoming classes scheduled
              </Typography>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper
            sx={{
              p: isMobile ? 2 : 3,
              height: '100%',
            }}
          >
            <Typography variant='h6' gutterBottom sx={{ mb: 2 }}>
              Recent Completed
            </Typography>
            {recentCompleted.length > 0 ? (
              recentCompleted.map((cls, index) => (
                <ClassCard key={index} cls={cls} isCompleted />
              ))
            ) : (
              <Typography
                variant='body2'
                color='text.secondary'
                sx={{
                  textAlign: 'center',
                  py: 4,
                }}
              >
                No completed classes yet
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default InstructorDashboard;
