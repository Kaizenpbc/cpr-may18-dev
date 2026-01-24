import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Avatar,
} from '@mui/material';
import {
  CalendarToday as CalendarIcon,
  Class as ClassIcon,
  People as PeopleIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';

interface DashboardStatsProps {
  stats: {
    totalCourses: number;
    scheduledCourses: number;
    completedCourses: number;
    cancelledCourses: number;
  } | null;
}

const StatCard: React.FC<{ icon: React.ReactNode; title: string; value: number | string; color: string }> = ({ icon, title, value, color }) => (
    <Card>
        <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: color }}>
                    {icon}
                </Avatar>
                <Box>
                    <Typography variant="h6">
                        {value}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {title}
                    </Typography>
                </Box>
            </Box>
        </CardContent>
    </Card>
);

const DashboardStats: React.FC<DashboardStatsProps> = ({ stats }) => {
  console.log('[DashboardStats] Received stats:', stats);
  console.log('[DashboardStats] Stats type:', typeof stats);
  console.log('[DashboardStats] Stats keys:', stats ? Object.keys(stats) : 'null');
  console.log('[DashboardStats] Individual values:', {
    totalCourses: stats?.totalCourses,
    scheduledCourses: stats?.scheduledCourses,
    completedCourses: stats?.completedCourses,
    cancelledCourses: stats?.cancelledCourses
  });

  return (
    <Grid container spacing={3} sx={{ mb: 4 }}>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard 
            icon={<ClassIcon />}
            title="Total Classes"
            value={stats?.totalCourses || 0}
            color="primary.main"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard 
            icon={<ScheduleIcon />}
            title="Upcoming Classes"
            value={stats?.scheduledCourses || 0}
            color="info.main"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard 
            icon={<PeopleIcon />}
            title="Completed Classes"
            value={stats?.completedCourses || 0}
            color="success.main"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard 
            icon={<CalendarIcon />}
            title="Cancelled Classes"
            value={stats?.cancelledCourses || 0}
            color="warning.main"
        />
      </Grid>
    </Grid>
  );
};

export default DashboardStats; 