import React, { useEffect, useState } from 'react';
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
  Alert,
  CircularProgress,
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
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { 
  useInstructorClasses, 
  useCompletedClasses, 
  useInstructorAvailability,
  useTodayClasses,
  useRefreshInstructorData
} from '../../services/instructorService';
import WelcomeHeader from './WelcomeHeader';
import TodayClassesList from './TodayClassesList';
import QuickActionsGrid from './QuickActionsGrid';
import { handleError } from '../../services/errorHandler';

interface DashboardData {
  instructorStats: {
    total_courses: number;
    completed_courses: number;
    scheduled_courses: number;
    cancelled_courses: number;
  };
  dashboardSummary: {
    total_courses: number;
    completed_courses: number;
    scheduled_courses: number;
    cancelled_courses: number;
  };
}

const InstructorDashboard: React.FC = () => {
  console.log('[DEBUG] Consolidated InstructorDashboard rendered');
  
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Use centralized service hooks instead of useInstructorData
  const { data: scheduledClasses = [], isLoading: classesLoading, error: classesError } = useInstructorClasses();
  const { data: completedClasses = [], isLoading: completedLoading, error: completedError } = useCompletedClasses();
  const { data: availableDates = [], isLoading: availabilityLoading, error: availabilityError } = useInstructorAvailability();
  const { data: todayClasses = [], isLoading: todayLoading, error: todayError } = useTodayClasses();
  const refreshData = useRefreshInstructorData();

  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [errorState, setErrorState] = useState<string | null>(null);

  // Combine loading states
  const loading = classesLoading || completedLoading || availabilityLoading || todayLoading;
  const error = classesError || completedError || availabilityError || todayError || errorState;

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        // Calculate statistics from the data we already have
        const stats = {
          total_courses: scheduledClasses.length + completedClasses.length,
          scheduled_courses: scheduledClasses.length,
          completed_courses: completedClasses.length,
          cancelled_courses: 0 // We'll need to get this from API if needed
        };

        setDashboardData({
          instructorStats: stats,
          dashboardSummary: stats
        });
      } catch (err) {
        handleError(err, { component: 'InstructorDashboard', action: 'process dashboard data' });
        setErrorState(err instanceof Error ? err.message : 'Failed to process dashboard data.');
      }
    };

    if (scheduledClasses && completedClasses) {
      loadDashboardData();
    }
  }, [scheduledClasses, completedClasses]);

  // Calculate additional statistics
  const totalClasses = scheduledClasses.length;
  const upcomingClasses = scheduledClasses.filter(
    (cls) => new Date(cls.date) > new Date()
  );
  const todayClassesCount = todayClasses.length;
  const totalStudents = scheduledClasses.reduce(
    (sum, cls) => sum + (cls.studentcount || 0),
    0
  );

  // Format date helper
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 4 }}>
        <Typography variant="h6">
          {error.userMessage || 'Error Loading Dashboard'}
        </Typography>
        <Typography>
          {error.suggestion || error.message || 'An unexpected error occurred'}
        </Typography>
      </Alert>
    );
  }

  return (
    <Box>
      {/* Welcome Section */}
      <WelcomeHeader />
      
      {errorState && (
        <Box sx={{ mb: 4 }}>
          <Typography color="error">{errorState}</Typography>
        </Box>
      )}

      {/* Dashboard Stats Component */}

      {/* Quick Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  <ClassIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6">
                    {dashboardData?.instructorStats.total_courses || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Classes
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'info.main' }}>
                  <ScheduleIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6">
                    {dashboardData?.instructorStats.scheduled_courses || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Upcoming Classes
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'success.main' }}>
                  <PeopleIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6">
                    {dashboardData?.instructorStats.completed_courses || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Completed Classes
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'warning.main' }}>
                  <CalendarIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6">
                    {totalStudents}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Students
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Today's Classes */}
      <TodayClassesList classes={todayClasses} />

      {/* Quick Actions */}
      <QuickActionsGrid />

      {/* Upcoming Classes Section */}
      {upcomingClasses.length > 0 && (
        <Paper sx={{ p: 3, mt: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Upcoming Classes</Typography>
            <Button
              variant="outlined"
              endIcon={<ArrowForwardIcon />}
              onClick={() => navigate('/instructor/classes')}
            >
              View All
            </Button>
          </Box>
          
          <List>
            {upcomingClasses.slice(0, 5).map((cls) => (
              <ListItem key={cls.course_id} divider>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle1">
                        {cls.coursetypename}
                      </Typography>
                      <Chip
                        label={cls.status || 'Scheduled'}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(cls.date)} • {cls.location} • {cls.organizationname}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Students: {cls.studentcount || 0}
                      </Typography>
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    onClick={() => navigate(`/instructor/attendance/${cls.course_id}`)}
                    color="primary"
                  >
                    <AssignmentIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </Paper>
      )}
    </Box>
  );
};

export default InstructorDashboard;
