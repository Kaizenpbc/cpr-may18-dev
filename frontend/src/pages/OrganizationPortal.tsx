import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Box, Typography } from '@mui/material';

const OrganizationPortal: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant='h4' gutterBottom>
        Organization Portal
      </Typography>
      <Typography variant='body1'>
        Welcome to the Organization Portal. This section is under development.
      </Typography>
    </Box>
  );
};

export default OrganizationPortal;
