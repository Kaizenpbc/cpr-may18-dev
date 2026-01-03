import React from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Paper, 
  Button,
  IconButton,
  Card,
  CardContent,
  CardActions,
} from '@mui/material';
import {
  Home as HomeIcon,
  Settings as SettingsIcon,
  Favorite as FavoriteIcon,
  Star as StarIcon,
  Refresh as RefreshIcon,
  Notifications as NotificationsIcon,
} from '@mui/icons-material';
import AnimatedButton from './AnimatedButton';
import AnimatedCard from './AnimatedCard';
import AnimatedIcon from './AnimatedIcon';
import { SkeletonLoader, ProgressBar, CircularLoader, CardSkeleton } from './LoadingStates';

const AnimationDemo: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        🎬 Animation Demo
      </Typography>
      
      {/* Animated Buttons */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          🎯 Animated Buttons
        </Typography>
        <Grid container spacing={2}>
          <Grid item>
            <AnimatedButton animationType="lift" variant="contained">
              Lift Effect
            </AnimatedButton>
          </Grid>
          <Grid item>
            <AnimatedButton animationType="glow" variant="contained">
              Glow Effect
            </AnimatedButton>
          </Grid>
          <Grid item>
            <AnimatedButton animationType="scale" variant="contained">
              Scale Effect
            </AnimatedButton>
          </Grid>
          <Grid item>
            <AnimatedButton animationType="bounce" variant="contained">
              Bounce Effect
            </AnimatedButton>
          </Grid>
          <Grid item>
            <AnimatedButton animationType="ripple" variant="contained">
              Ripple Effect
            </AnimatedButton>
          </Grid>
        </Grid>
      </Paper>

      {/* Animated Cards */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          🃏 Animated Cards
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <AnimatedCard animationType="lift" sx={{ p: 2 }}>
              <Typography variant="h6">Lift Card</Typography>
              <Typography variant="body2">
                Hover to see the lift effect
              </Typography>
            </AnimatedCard>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <AnimatedCard animationType="glow" sx={{ p: 2 }}>
              <Typography variant="h6">Glow Card</Typography>
              <Typography variant="body2">
                Hover to see the glow effect
              </Typography>
            </AnimatedCard>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <AnimatedCard animationType="scale" sx={{ p: 2 }}>
              <Typography variant="h6">Scale Card</Typography>
              <Typography variant="body2">
                Hover to see the scale effect
              </Typography>
            </AnimatedCard>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <AnimatedCard animationType="tilt" sx={{ p: 2 }}>
              <Typography variant="h6">Tilt Card</Typography>
              <Typography variant="body2">
                Hover to see the tilt effect
              </Typography>
            </AnimatedCard>
          </Grid>
        </Grid>
      </Paper>

      {/* Animated Icons */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          🎨 Animated Icons
        </Typography>
        <Grid container spacing={2}>
          <Grid item>
            <AnimatedIcon animationType="rotate">
              <RefreshIcon />
            </AnimatedIcon>
          </Grid>
          <Grid item>
            <AnimatedIcon animationType="pulse">
              <FavoriteIcon />
            </AnimatedIcon>
          </Grid>
          <Grid item>
            <AnimatedIcon animationType="bounce">
              <StarIcon />
            </AnimatedIcon>
          </Grid>
          <Grid item>
            <AnimatedIcon animationType="scale">
              <HomeIcon />
            </AnimatedIcon>
          </Grid>
          <Grid item>
            <AnimatedIcon animationType="shake">
              <NotificationsIcon />
            </AnimatedIcon>
          </Grid>
          <Grid item>
            <AnimatedIcon animationType="glow">
              <SettingsIcon />
            </AnimatedIcon>
          </Grid>
        </Grid>
      </Paper>

      {/* Loading States */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          ⏳ Loading States
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom>
              Skeleton Loaders
            </Typography>
            <SkeletonLoader count={3} />
            <Box sx={{ mt: 2 }}>
              <CardSkeleton showAvatar showActions />
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom>
              Progress Indicators
            </Typography>
            <ProgressBar value={75} label="Loading Progress" showPercentage />
            <Box sx={{ mt: 2 }}>
              <CircularLoader label="Processing..." />
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Interactive Demo Card */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          🎪 Interactive Demo
        </Typography>
        <AnimatedCard 
          animationType="lift" 
          clickable 
          sx={{ maxWidth: 400, mx: 'auto' }}
        >
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Interactive Card
            </Typography>
            <Typography variant="body2" color="text.secondary">
              This card has hover effects and is clickable. Try hovering over it!
            </Typography>
          </CardContent>
          <CardActions>
            <AnimatedButton animationType="glow" size="small">
              Action
            </AnimatedButton>
            <AnimatedIcon animationType="pulse">
              <FavoriteIcon />
            </AnimatedIcon>
          </CardActions>
        </AnimatedCard>
      </Paper>
    </Box>
  );
};

export default AnimationDemo;
