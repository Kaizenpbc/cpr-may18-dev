import React from 'react';
import {
  Box,
} from '@mui/material';
import DashboardStats from '../../instructor/DashboardStats';
import WelcomeHeader from '../../instructor/WelcomeHeader';
import TodayClassesList from '../../instructor/TodayClassesList';
import QuickActionsGrid from '../../instructor/QuickActionsGrid';

interface ClassData {
  id: number;
  coursetype: string;
  location: string;
  date: string;
  studentcount: number;
}

interface DashboardStats {
  total_courses: number;
  scheduled_courses: number;
  completed_courses: number;
  cancelled_courses: number;
}

interface InstructorDashboardProps {
  scheduledClasses: ClassData[];
  completedClasses: ClassData[];
  availableDates: Set<string>;
  stats: DashboardStats;
  todayClasses: ClassData[];
}

const InstructorDashboard: React.FC<InstructorDashboardProps> = ({
  scheduledClasses,
  completedClasses,
  availableDates,
  stats,
  todayClasses,
}) => {
  return (
    <Box>
      <WelcomeHeader />
      
      <DashboardStats stats={stats} />

      <TodayClassesList classes={todayClasses} />
      
      <QuickActionsGrid />
    </Box>
  );
};

export default InstructorDashboard; 