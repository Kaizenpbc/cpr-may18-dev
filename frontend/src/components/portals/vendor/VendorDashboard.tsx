import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
} from '@mui/material';
import {
  PendingActions as PendingIcon,
  Receipt as InvoiceIcon,
  CheckCircle as PaidIcon,
  Timeline as TimelineIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { vendorApi } from '../../../services/api';

interface DashboardStats {
  pendingInvoices: number;
  totalInvoices: number;
  totalPaid: number;
  averagePaymentTime: number;
}

const VendorDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    pendingInvoices: 0,
    totalInvoices: 0,
    totalPaid: 0,
    averagePaymentTime: 0,
  });
  const navigate = useNavigate();

  const fetchDashboardStats = async () => {
    try {
      const response = await vendorApi.getDashboard();
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'upload':
        navigate('/vendor/upload');
        break;
      case 'history':
        navigate('/vendor/history');
        break;
      case 'profile':
        navigate('/vendor/profile');
        break;
      default:
        break;
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Vendor Dashboard
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <PendingIcon color="warning" sx={{ mr: 2, fontSize: 40 }} />
                <Box>
                  <Typography variant="h4" component="div">
                    {stats?.pendingInvoices || 0}
                  </Typography>
                  <Typography color="textSecondary">
                    Pending Invoices
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <InvoiceIcon color="primary" sx={{ mr: 2, fontSize: 40 }} />
                <Box>
                  <Typography variant="h4" component="div">
                    {stats?.totalInvoices || 0}
                  </Typography>
                  <Typography color="textSecondary">
                    Total Invoices
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <PaidIcon color="success" sx={{ mr: 2, fontSize: 40 }} />
                <Box>
                  <Typography variant="h4" component="div">
                    ${stats?.totalPaid?.toFixed(2) || '0.00'}
                  </Typography>
                  <Typography color="textSecondary">
                    Total Paid
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <TimelineIcon color="info" sx={{ mr: 2, fontSize: 40 }} />
                <Box>
                  <Typography variant="h4" component="div">
                    {stats?.averagePaymentTime || 0}
                  </Typography>
                  <Typography color="textSecondary">
                    Avg. Payment Days
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box mt={4}>
        <Typography variant="h6" gutterBottom>
          Quick Actions
        </Typography>
        <Grid container spacing={2}>
          <Grid item>
            <Chip 
              label="Upload New Invoice" 
              color="primary" 
              variant="outlined"
              clickable
              onClick={() => handleQuickAction('upload')}
            />
          </Grid>
          <Grid item>
            <Chip 
              label="View All Invoices" 
              color="secondary" 
              variant="outlined"
              clickable
              onClick={() => handleQuickAction('history')}
            />
          </Grid>
          <Grid item>
            <Chip 
              label="Update Profile" 
              color="default" 
              variant="outlined"
              clickable
              onClick={() => handleQuickAction('profile')}
            />
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default VendorDashboard; 