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
import { tokenService } from '../../../services/tokenService';
import { fetchDashboardData } from '../../../services/api';

interface InstructorDashboardProps {
  scheduledClasses?: any[];
  availableDates?: Set<string>;
  completedClasses?: any[];
}

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

const InstructorDashboard: React.FC<InstructorDashboardProps> = ({
  scheduledClasses = [],
  availableDates = new Set(),
  completedClasses = [],
}) => {
  console.log('[DEBUG] InstructorDashboard rendered');
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const data = await fetchDashboardData();
        setDashboardData(data);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data. Please try again later.');
      }
    };

    loadDashboardData();
  }, []);

  // Calculate statistics
  const totalClasses = scheduledClasses.length;
  const upcomingClasses = scheduledClasses.filter(
    (cls) => new Date(cls.datescheduled) > new Date()
  );
  const todayClasses = scheduledClasses.filter(
    (cls) =>
      new Date(cls.datescheduled).toDateString() === new Date().toDateString()
  );
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

  return (
    <Box>
      {/* Welcome Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Welcome Back!
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Here's your teaching schedule and upcoming classes.
        </Typography>
      </Box>

      {error && (
        <Box sx={{ mb: 4 }}>
          <Typography color="error">{error}</Typography>
        </Box>
      )}

      {/* Quick Stats */}
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
                    {dashboardData?.instructorStats.cancelled_courses || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Cancelled Classes
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Today's Classes */}
      {todayClasses.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Today's Classes
          </Typography>
          <Paper variant="outlined">
            <List>
              {todayClasses.map((cls) => (
                <React.Fragment key={cls.course_id}>
                  <ListItem>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <ClassIcon color="primary" />
                          <Typography variant="subtitle1">
                            {cls.coursetypename}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Box sx={{ mt: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LocationIcon fontSize="small" color="action" />
                            <Typography variant="body2">{cls.location}</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <GroupIcon fontSize="small" color="action" />
                            <Typography variant="body2">
                              {cls.studentcount} Students
                            </Typography>
                          </Box>
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={() => navigate(`/instructor/attendance/${cls.course_id}`)}
                      >
                        Take Attendance
                      </Button>
                    </ListItemSecondaryAction>
                  </ListItem>
                  <Divider />
                </React.Fragment>
              ))}
            </List>
          </Paper>
        </Box>
      )}

      {/* Upcoming Classes */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Upcoming Classes
        </Typography>
        <Paper variant="outlined">
          <List>
            {upcomingClasses.slice(0, 5).map((cls, index) => (
              <React.Fragment key={cls.course_id}>
                <ListItem>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <ClassIcon color="primary" />
                        <Typography variant="subtitle1">
                          {cls.coursetypename}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Box sx={{ mt: 1 }}>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                          }}
                        >
                          <LocationIcon fontSize="small" color="action" />
                          <Typography variant="body2">
                            {cls.location}
                          </Typography>
                        </Box>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                          }}
                        >
                          <GroupIcon fontSize="small" color="action" />
                          <Typography variant="body2">
                            {cls.studentcount} Students
                          </Typography>
                        </Box>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Chip label={formatDate(cls.datescheduled)} />
                      <IconButton onClick={() => navigate('/instructor/schedule')}>
                        <ArrowForwardIcon />
                      </IconButton>
                    </Box>
                  </ListItemSecondaryAction>
                </ListItem>
                {index < upcomingClasses.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
          {upcomingClasses.length === 0 && (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography color="text.secondary">
                No upcoming classes in your schedule.
              </Typography>
            </Box>
          )}
        </Paper>
      </Box>

      {/* Quick Actions */}
      <Box>
        <Typography variant="h6" gutterBottom>
          Quick Actions
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <EventAvailableIcon color="primary" />
                  <Typography variant="subtitle1">Set Availability</Typography>
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={() => navigate('/instructor/availability')}
                  >
                    Manage Schedule
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <AssignmentIcon color="info" />
                  <Typography variant="subtitle1">View Archive</Typography>
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={() => navigate('/instructor/archive')}
                  >
                    Past Classes
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <DownloadIcon color="success" />
                  <Typography variant="subtitle1">Download Reports</Typography>
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={() => navigate('/reports')}
                  >
                    View Reports
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default InstructorDashboard; 