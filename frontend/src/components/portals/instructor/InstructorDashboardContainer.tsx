import React, { useState, useEffect } from 'react';
import { Box, CircularProgress, Alert } from '@mui/material';
import DashboardStats from '../../instructor/DashboardStats';
import WelcomeHeader from '../../instructor/WelcomeHeader';
import TodayClassesList from '../../instructor/TodayClassesList';
import QuickActionsGrid from '../../instructor/QuickActionsGrid';
import api from '../../../services/api';

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
  const [dashboardStats, setDashboardStats] = useState<any>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('[Dashboard] Starting to fetch dashboard data...');

      // Fetch all required data in parallel
      const [classesResponse, completedResponse, availabilityResponse] = await Promise.all([
        api.get('/instructor/classes/active'),
        api.get('/instructor/classes/completed'),
        api.get('/instructor/availability')
      ]);

      console.log('[Dashboard] All API calls completed');

      const classes = classesResponse.data?.data || [];
      const completed = completedResponse.data?.data || [];
      const availability = availabilityResponse.data?.data || [];

      console.log('[Dashboard] Classes data:', classes);
      console.log('[Dashboard] Completed data:', completed);
      console.log('[Dashboard] Availability data:', availability);
      
      // Calculate stats from the actual data
      const stats = {
        total_courses: classes.length + completed.length,
        scheduled_courses: classes.length,
        completed_courses: completed.length,
        cancelled_courses: 0 // We don't have cancelled courses data yet
      };

      console.log('[Dashboard] Calculated stats:', stats);

      setScheduledClasses(classes);
      setCompletedClasses(completed);
      setDashboardStats(stats);
      // Convert availability data to Set for easy lookup
      const availableDatesSet = new Set<string>(
        Array.isArray(availability) 
          ? availability.map((item: any) => item.date).filter(Boolean)
          : []
      );
      setAvailableDates(availableDatesSet);
      // Log the values used for dashboard cards
      console.log('[Dashboard] Total:', stats.total_courses, 'Scheduled:', stats.scheduled_courses, 'Completed:', stats.completed_courses, 'Cancelled:', stats.cancelled_courses);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data. Please try refreshing the page.');
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const totalClasses = Array.isArray(scheduledClasses) ? scheduledClasses.length : 0;
  const completedClassesCount = Array.isArray(completedClasses) ? completedClasses.length : 0;
  const availableDatesCount = availableDates.size;

  const todayClasses = Array.isArray(scheduledClasses) 
    ? scheduledClasses.filter((cls) => new Date(cls.date).toDateString() === new Date().toDateString())
    : [];

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
      
      <DashboardStats stats={dashboardStats || {
        total_courses: totalClasses,
        scheduled_courses: Array.isArray(scheduledClasses) ? scheduledClasses.length : 0,
        completed_courses: completedClassesCount,
        cancelled_courses: 0
      }} />

      <TodayClassesList classes={todayClasses} />
      
      <QuickActionsGrid />
    </Box>
  );
};

export default InstructorDashboardContainer; 