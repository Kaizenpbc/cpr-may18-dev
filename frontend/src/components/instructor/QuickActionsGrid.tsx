import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
} from '@mui/material';
import {
  EventAvailable as EventAvailableIcon,
  Assignment as AssignmentIcon,
  People as PeopleIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

interface ActionItem {
  icon: React.ReactNode;
  title: string;
  buttonText: string;
  route: string;
  color: 'primary' | 'info' | 'success' | 'warning' | 'error';
}

interface QuickActionsGridProps {
  actions?: ActionItem[];
}

const QuickActionsGrid: React.FC<QuickActionsGridProps> = ({ 
  actions = [
    {
      icon: <EventAvailableIcon />,
      title: 'Set Availability',
      buttonText: 'Manage Schedule',
      route: '/instructor/availability',
      color: 'primary'
    },
    {
      icon: <AssignmentIcon />,
      title: 'View Archive',
      buttonText: 'Past Classes',
      route: '/instructor/archive',
      color: 'info'
    },
    {
      icon: <PeopleIcon />,
      title: 'Student Management',
      buttonText: 'View Students',
      route: '/instructor/students',
      color: 'success'
    }
  ]
}) => {
  const navigate = useNavigate();

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Quick Actions
      </Typography>
      <Grid container spacing={2}>
        {actions.map((action, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ color: `${action.color}.main` }}>
                    {action.icon}
                  </Box>
                  <Typography variant="subtitle1">{action.title}</Typography>
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={() => navigate(action.route)}
                  >
                    {action.buttonText}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default QuickActionsGrid; 