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

const InstructorDashboard: React.FC<InstructorDashboardProps> = ({
  scheduledClasses = [],
  availableDates = new Set(),
  completedClasses = [],
}) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

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
                  <Typography variant="h6">{totalClasses}</Typography>
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
                  <Typography variant="h6">{upcomingClasses.length}</Typography>
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
                  <Typography variant="h6">{totalStudents}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Students
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
                  <Typography variant="h6">{availableDates.size}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Available Dates
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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Upcoming Classes</Typography>
          <Button
            endIcon={<ArrowForwardIcon />}
            onClick={() => navigate('/instructor/classes')}
          >
            View All
          </Button>
        </Box>
        <Paper variant="outlined">
          <List>
            {upcomingClasses.slice(0, 5).map((cls) => (
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
                          <CalendarIcon fontSize="small" color="action" />
                          <Typography variant="body2">
                            {formatDate(cls.datescheduled)}
                          </Typography>
                        </Box>
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
                      variant="outlined"
                      onClick={() => navigate(`/instructor/classes/${cls.course_id}`)}
                    >
                      View Details
                    </Button>
                  </ListItemSecondaryAction>
                </ListItem>
                <Divider />
              </React.Fragment>
            ))}
            {upcomingClasses.length === 0 && (
              <ListItem>
                <ListItemText
                  primary="No upcoming classes"
                  secondary="Check back later for new class assignments"
                />
              </ListItem>
            )}
          </List>
        </Paper>
      </Box>

      {/* Quick Actions */}
      <Box>
        <Typography variant="h6" gutterBottom>
          Quick Actions
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                    <EventAvailableIcon />
                  </Avatar>
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
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'info.main' }}>
                    <AssignmentIcon />
                  </Avatar>
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
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'success.main' }}>
                    <DownloadIcon />
                  </Avatar>
                  <Typography variant="subtitle1">Download Reports</Typography>
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={() => navigate('/instructor/reports')}
                  >
                    Generate Reports
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'warning.main' }}>
                    <PeopleIcon />
                  </Avatar>
                  <Typography variant="subtitle1">Student Management</Typography>
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={() => navigate('/instructor/students')}
                  >
                    View Students
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
