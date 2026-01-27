import React from 'react';
import { Box, Typography } from '@mui/material';
import CourseCalendar from './CourseCalendar';

const DashboardView: React.FC = () => {
  return (
    <Box>
      <Typography variant='h4' gutterBottom>
        Course Admin Dashboard
      </Typography>
      <CourseCalendar />
    </Box>
  );
};

export default DashboardView;
