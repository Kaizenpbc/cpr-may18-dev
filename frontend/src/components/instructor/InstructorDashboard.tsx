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
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { 
  useInstructorClasses, 
  useCompletedClasses, 
  useInstructorAvailability,
  useTodayClasses,
  useRefreshInstructorData
} from '../../services/instructorService';
import { useQueryClient } from '@tanstack/react-query';
import WelcomeHeader from './WelcomeHeader';
import TodayClassesList from './TodayClassesList';
import QuickActionsGrid from './QuickActionsGrid';
import { handleError } from '../../services/errorHandler';

interface InstructorClass {
  id: number;
  coursename?: string;
  date: string;
  studentcount?: number;
  [key: string]: unknown;
}

interface DashboardData {
  instructorStats: {
    totalCourses: number;
    completedCourses: number;
    scheduledCourses: number;
    cancelledCourses: number;
  };
  dashboardSummary: {
    totalCourses: number;
    completedCourses: number;
    scheduledCourses: number;
    cancelledCourses: number;
  };
}

interface ErrorWithDetails {
  userMessage?: string;
  suggestion?: string;
  message?: string;
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
  const queryClient = useQueryClient();

  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [errorState, setErrorState] = useState<string | null>(null);
  const [forceRefresh, setForceRefresh] = useState(0);

  // Combine loading states
  const loading = classesLoading || completedLoading || availabilityLoading || todayLoading;
  const error = classesError || completedError || availabilityError || todayError || errorState;

  // Temporary debugging
  console.log('[DEBUG] Current data state:', {
    scheduledClasses: scheduledClasses,
    scheduledClassesLength: Array.isArray(scheduledClasses) ? scheduledClasses.length : 'not array',
    completedClasses: completedClasses,
    completedClassesLength: Array.isArray(completedClasses) ? completedClasses.length : 'not array',
    dashboardData: dashboardData,
    forceRefresh: forceRefresh
  });

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        // Calculate statistics from the data we already have
        const scheduled = scheduledClasses as InstructorClass[];
        const completed = completedClasses as InstructorClass[];
        const stats = {
          totalCourses: scheduled.length + completed.length,
          scheduledCourses: scheduled.length,
          completedCourses: completed.length,
          cancelledCourses: 0 // We'll need to get this from API if needed
        };

        console.log('[DEBUG] Setting dashboard stats:', stats);

        setDashboardData({
          instructorStats: stats,
          dashboardSummary: stats
        });
      } catch (err) {
        handleError(err, { component: 'InstructorDashboard', action: 'process dashboard data' });
        setErrorState(err instanceof Error ? err.message : 'Failed to process dashboard data.');
      }
    };

    // Clear dashboard data first
    setDashboardData(null);
    
    if (scheduledClasses && completedClasses) {
      loadDashboardData();
    }
  }, [scheduledClasses, completedClasses]);

  // Calculate additional statistics
  const classesArray = scheduledClasses as InstructorClass[];
  const todayArray = todayClasses as InstructorClass[];
  const totalClasses = classesArray.length;
  const upcomingClasses = classesArray.filter(
    (cls) => new Date(cls.date) > new Date()
  );
  const todayClassesCount = todayArray.length;
  const totalStudents = classesArray.reduce(
    (sum: number, cls) => sum + (cls.studentcount || 0),
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
    const errorObj = error as ErrorWithDetails;
    return (
      <Alert severity="error" sx={{ mb: 4 }}>
        <Typography variant="h6">
          {typeof error === 'object' && error !== null && 'userMessage' in error ? errorObj.userMessage : 'Error Loading Dashboard'}
        </Typography>
        <Typography>
          {typeof error === 'object' && error !== null && 'suggestion' in error ? errorObj.suggestion :
           typeof error === 'object' && error !== null && 'message' in error ? errorObj.message :
           typeof error === 'string' ? error : 'An unexpected error occurred'}
        </Typography>
      </Alert>
    );
  }

  return (
    <Box>
      {/* Welcome Section */}
      <WelcomeHeader />
      
      {/* Force Refresh Button */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={() => {
            console.log('[DEBUG] Force refreshing all data');
            queryClient.clear();
            setDashboardData(null);
            setForceRefresh(prev => prev + 1);
            refreshData();
          }}
        >
          Force Refresh
        </Button>
      </Box>
      
      {errorState && (
        <Box sx={{ mb: 4 }}>
          <Typography color="error" component="div">{errorState}</Typography>
        </Box>
      )}

      {/* Quick Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)',
            transition: 'transform 0.2s ease-in-out',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 12px 40px rgba(102, 126, 234, 0.4)',
            }
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <ClassIcon sx={{ mr: 1, color: 'white', fontSize: 28 }} />
                <Box>
                  <Typography color="rgba(255,255,255,0.8)" gutterBottom sx={{ fontSize: '0.875rem' }}>
                    Total Classes
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600, color: 'white' }}>
                    {totalClasses}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            color: 'white',
            boxShadow: '0 8px 32px rgba(240, 147, 251, 0.3)',
            transition: 'transform 0.2s ease-in-out',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 12px 40px rgba(240, 147, 251, 0.4)',
            }
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <ScheduleIcon sx={{ mr: 1, color: 'white', fontSize: 28 }} />
                <Box>
                  <Typography color="rgba(255,255,255,0.8)" gutterBottom sx={{ fontSize: '0.875rem' }}>
                    Today's Classes
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600, color: 'white' }}>
                    {todayClassesCount}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            color: 'white',
            boxShadow: '0 8px 32px rgba(79, 172, 254, 0.3)',
            transition: 'transform 0.2s ease-in-out',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 12px 40px rgba(79, 172, 254, 0.4)',
            }
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <PeopleIcon sx={{ mr: 1, color: 'white', fontSize: 28 }} />
                <Box>
                  <Typography color="rgba(255,255,255,0.8)" gutterBottom sx={{ fontSize: '0.875rem' }}>
                    Total Students
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600, color: 'white' }}>
                    {totalStudents}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
            color: 'white',
            boxShadow: '0 8px 32px rgba(67, 233, 123, 0.3)',
            transition: 'transform 0.2s ease-in-out',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 12px 40px rgba(67, 233, 123, 0.4)',
            }
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <EventAvailableIcon sx={{ mr: 1, color: 'white', fontSize: 28 }} />
                <Box>
                  <Typography color="rgba(255,255,255,0.8)" gutterBottom sx={{ fontSize: '0.875rem' }}>
                    Available Dates
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600, color: 'white' }}>
                    {(availableDates as unknown[]).length}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <QuickActionsGrid />

      {/* Today's Classes */}
      <Box sx={{ mb: 4 }}>
        <TodayClassesList classes={todayClasses || []} />
      </Box>

      {/* Recent Classes */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Upcoming Classes
              </Typography>
              {upcomingClasses.length > 0 ? (
                <List>
                  {upcomingClasses.slice(0, 5).map((cls, index: number) => (
                    <ListItem key={index} divider>
                      <ListItemText
                        primary={cls.coursename || 'Course'}
                        secondary={`${formatDate(cls.date)} • ${cls.studentcount || 0} students`}
                      />
                      <ListItemSecondaryAction>
                        <IconButton
                          edge="end"
                          onClick={() => navigate(`/instructor/classes/${cls.id}`)}
                        >
                          <ArrowForwardIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography color="textSecondary">
                  No upcoming classes scheduled.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Completed Classes
              </Typography>
              {(completedClasses as InstructorClass[]).length > 0 ? (
                <List>
                  {(completedClasses as InstructorClass[]).slice(0, 5).map((cls, index: number) => (
                    <ListItem key={index} divider>
                      <ListItemText
                        primary={cls.coursename || 'Course'}
                        secondary={`${formatDate(cls.date)} • ${cls.studentcount || 0} students`}
                      />
                      <Chip
                        label="Completed"
                        color="success"
                        size="small"
                        sx={{ ml: 1 }}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography color="textSecondary">
                  No completed classes yet.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default InstructorDashboard;
