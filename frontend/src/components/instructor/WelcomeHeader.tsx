import React from 'react';
import {
  Box,
  Typography,
} from '@mui/material';

interface WelcomeHeaderProps {
  title?: string;
  subtitle?: string;
}

const WelcomeHeader: React.FC<WelcomeHeaderProps> = ({ 
  title = "Welcome Back!",
  subtitle = "Manage your classes and availability here."
}) => {
  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        {title}
      </Typography>
      <Typography variant="body1" color="text.secondary">
        {subtitle}
      </Typography>
    </Box>
  );
};

export default WelcomeHeader; 