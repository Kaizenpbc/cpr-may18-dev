import React from 'react';
import { Box, Typography, Grid, Paper } from '@mui/material';

const DashboardView: React.FC = () => {
  return (
    <Box>
      <Typography variant='h4' gutterBottom>
        Course Admin Dashboard
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant='h6'>
              Welcome to Course Administration
            </Typography>
            <Typography variant='body1'>
              Use the tabs above to manage instructors, schedule courses, and
              customize email templates.
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardView;
