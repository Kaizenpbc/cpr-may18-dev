import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Paper,
} from '@mui/material';
import {
  CalendarToday as CalendarIcon,
  Class as ClassIcon,
  People as PeopleIcon,
  Assignment as AssignmentIcon,
  Schedule as ScheduleIcon,
  EventAvailable as EventAvailableIcon,
  LocationOn as LocationIcon,
  Group as GroupIcon,
  AccessTime as TimeIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { formatDisplayDate } from '../../../utils/dateUtils';

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

  // Calculate statistics
  const totalClasses = scheduledClasses.length;
  const upcomingClasses = scheduledClasses.filter(
    (cls) => new Date(cls.date) > new Date()
  );
  const todayClasses = scheduledClasses.filter(
    (cls) =>
      new Date(cls.date).toDateString() === new Date().toDateString()
  );

  return (
    <Box>
      {/* Welcome Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Welcome Back!
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage your classes and availability here.
        </Typography>
      </Box>

      {/* Quick Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <ClassIcon color="primary" />
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
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <ScheduleIcon color="info" />
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
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <CalendarIcon color="warning" />
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
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Today's Classes
        </Typography>
        <Paper variant="outlined">
          {todayClasses.length > 0 ? (
            <List>
              {todayClasses.map((cls, index) => (
                <React.Fragment key={cls.id}>
                  <ListItem>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <ClassIcon color="primary" />
                          <Typography variant="subtitle1">
                            {cls.coursetype} - {cls.location}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <TimeIcon fontSize="small" />
                            <Typography variant="body2">
                              {formatDisplayDate(cls.date)}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <GroupIcon fontSize="small" />
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
                        size="small"
                        onClick={() => navigate(`/instructor/attendance/${cls.id}`)}
                      >
                        Take Attendance
                      </Button>
                    </ListItemSecondaryAction>
                  </ListItem>
                  {index < todayClasses.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          ) : (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography color="text.secondary">No classes scheduled for today</Typography>
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
                  <PeopleIcon color="success" />
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