import React, { useState, useEffect } from 'react';
import { Box, CircularProgress, Alert } from '@mui/material';
import DashboardStats from '../../instructor/DashboardStats';
import WelcomeHeader from '../../instructor/WelcomeHeader';
import TodayClassesList from '../../instructor/TodayClassesList';
import QuickActionsGrid from '../../instructor/QuickActionsGrid';
import { api } from '../../../services/api';

interface ClassData {
  id: number;
  coursetype: string;
  location: string;
  date: string;
  studentcount: number;
}

interface AvailabilityData {
  date: string;
  available: boolean;
}

interface DashboardStats {
  total_courses: number;
  scheduled_courses: number;
  completed_courses: number;
  cancelled_courses: number;
}

const InstructorDashboardContainer: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scheduledClasses, setScheduledClasses] = useState<ClassData[]>([]);
  const [completedClasses, setCompletedClasses] = useState<ClassData[]>([]);
  const [availableDates, setAvailableDates] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState<DashboardStats>({
    total_courses: 0,
    scheduled_courses: 0,
    completed_courses: 0,
    cancelled_courses: 0
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all required data in parallel
      const [classesResponse, completedResponse, availabilityResponse] = await Promise.all([
        api.get('/instructor/classes'),
        api.get('/instructor/classes/completed'),
        api.get('/instructor/availability')
      ]);

      const classes = classesResponse.data || [];
      const completed = completedResponse.data || [];
      const availability = availabilityResponse.data || [];

      setScheduledClasses(classes);
      setCompletedClasses(completed);

      // Convert availability data to Set for efficient lookup
      const availableDatesSet = new Set(
        availability
          .filter((item: AvailabilityData) => item.available)
          .map((item: AvailabilityData) => item.date)
      );
      setAvailableDates(availableDatesSet);

      // Calculate stats
      const upcomingClasses = classes.filter(
        (cls: ClassData) => new Date(cls.date) > new Date()
      );

      setStats({
        total_courses: classes.length,
        scheduled_courses: upcomingClasses.length,
        completed_courses: completed.length,
        cancelled_courses: 0 // This would need to come from the API if available
      });

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data. Please try refreshing the page.');
    } finally {
      setLoading(false);
    }
  };

  const todayClasses = scheduledClasses.filter(
    (cls) => new Date(cls.date).toDateString() === new Date().toDateString()
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
        <WelcomeHeader 
          title="Dashboard Unavailable"
          subtitle="There was an error loading your dashboard data."
        />
      </Box>
    );
  }

  return (
    <Box>
      <WelcomeHeader />
      
      <DashboardStats stats={stats} />

      <TodayClassesList classes={todayClasses} />
      
      <QuickActionsGrid />
    </Box>
  );
};

export default InstructorDashboardContainer; 