import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Alert,
  CircularProgress,
  Chip,
  Paper,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Badge,
  IconButton,
  FormControl,
  Select,
  MenuItem,
  SelectChangeEvent,
} from '@mui/material';
import {
  AccountBalance as RevenueIcon,
  Receipt as InvoiceIcon,
  Payment as PaymentIcon,
  School as CourseIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Notifications as NotificationsIcon,
  Visibility as VisibilityIcon,
  Assignment as AssignmentIcon,
  Refresh as RefreshIcon,
  CalendarMonth as CalendarIcon,
} from '@mui/icons-material';
import { fetchAccountingDashboardData } from '../../../services/api';
import { useNavigate } from 'react-router-dom';

interface DashboardData {
  monthlyRevenue: number;
  outstandingInvoices: {
    count: number;
    amount: number;
  };
  paymentsThisMonth: {
    count: number;
    amount: number;
  };
  completedCoursesThisMonth: number;
}

interface PendingAction {
  id: string;
  type: 'payment_verification' | 'invoice_approval' | 'recent_activity';
  title: string;
  description: string;
  count?: number;
  color: 'error' | 'warning' | 'success' | 'info';
  icon: React.ReactNode;
  route: string;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  color,
}) => (
  <Card elevation={3} sx={{ height: '100%' }}>
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Box
          sx={{
            backgroundColor: `${color}.light`,
            borderRadius: '50%',
            p: 1,
            mr: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </Box>
        <Typography variant='h6' component='h2' color='textSecondary'>
          {title}
        </Typography>
      </Box>
      <Typography
        variant='h4'
        component='div'
        fontWeight='bold'
        color={`${color}.main`}
      >
        {value}
      </Typography>
      {subtitle && (
        <Typography variant='body2' color='textSecondary' sx={{ mt: 1 }}>
          {subtitle}
        </Typography>
      )}
    </CardContent>
  </Card>
);

const PendingActionsSidebar: React.FC = () => {
  const navigate = useNavigate();
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchPendingActions = async () => {
      try {
        setLoading(true);
        // In a real implementation, you would fetch this data from API
        // For now, we'll simulate the data structure
        const mockData: PendingAction[] = [
          {
            id: '1',
            type: 'payment_verification',
            title: 'Payments Pending Verification',
            description: 'Organization payments waiting for review',
            count: 3,
            color: 'error',
            icon: <PaymentIcon />,
            route: '/accounting/verification'
          },
          {
            id: '2',
            type: 'invoice_approval',
            title: 'Invoices Pending Approval',
            description: 'Invoices waiting for approval',
            count: 2,
            color: 'warning',
            icon: <AssignmentIcon />,
            route: '/accounting/receivables'
          },
          {
            id: '3',
            type: 'recent_activity',
            title: 'Recent Activity',
            description: 'Invoices posted to organizations',
            count: 5,
            color: 'success',
            icon: <CheckCircleIcon />,
            route: '/accounting/history'
          }
        ];
        
        setPendingActions(mockData);
      } catch (error) {
        console.error('Error fetching pending actions:', error);
        setPendingActions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPendingActions();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchPendingActions, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const handleActionClick = (route: string) => {
    navigate(route);
  };

  const handleRefresh = async () => {
    try {
      setLoading(true);
      // In a real implementation, you would fetch this data from API
      // For now, we'll simulate the data structure
      const mockData: PendingAction[] = [
        {
          id: '1',
          type: 'payment_verification',
          title: 'Payments Pending Verification',
          description: 'Organization payments waiting for review',
          count: Math.floor(Math.random() * 5) + 1, // Random count for demo
          color: 'error',
          icon: <PaymentIcon />,
          route: '/accounting/verification'
        },
        {
          id: '2',
          type: 'invoice_approval',
          title: 'Invoices Pending Approval',
          description: 'Invoices waiting for approval',
          count: Math.floor(Math.random() * 3) + 1, // Random count for demo
          color: 'warning',
          icon: <AssignmentIcon />,
          route: '/accounting/receivables'
        },
        {
          id: '3',
          type: 'recent_activity',
          title: 'Recent Activity',
          description: 'Invoices posted to organizations',
          count: Math.floor(Math.random() * 8) + 3, // Random count for demo
          color: 'success',
          icon: <CheckCircleIcon />,
          route: '/accounting/history'
        }
      ];
      
      setPendingActions(mockData);
    } catch (error) {
      console.error('Error refreshing pending actions:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Paper elevation={2} sx={{ p: 2, height: 'fit-content', minWidth: 280 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <NotificationsIcon color="primary" sx={{ mr: 1 }} />
            <Typography variant="h6" fontWeight="bold">
              Pending Actions
            </Typography>
          </Box>
          <IconButton 
            size="small" 
            onClick={handleRefresh}
            sx={{ color: 'primary.main' }}
          >
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress size={24} />
        </Box>
      </Paper>
    );
  }

  return (
    <Paper elevation={2} sx={{ p: 2, height: 'fit-content', minWidth: 280 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <NotificationsIcon color="primary" sx={{ mr: 1 }} />
          <Typography variant="h6" fontWeight="bold">
            Pending Actions
          </Typography>
        </Box>
        <IconButton 
          size="small" 
          onClick={handleRefresh}
          sx={{ color: 'primary.main' }}
        >
          <RefreshIcon fontSize="small" />
        </IconButton>
      </Box>
      
      {pendingActions.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 3 }}>
          <CheckCircleIcon color="success" sx={{ fontSize: 48, mb: 1 }} />
          <Typography variant="body2" color="text.secondary">
            No pending actions
          </Typography>
        </Box>
      ) : (
        <>
          <List sx={{ p: 0 }}>
            {pendingActions.map((action, index) => (
              <React.Fragment key={action.id}>
                <ListItem 
                  button 
                  onClick={() => handleActionClick(action.route)}
                  sx={{ 
                    borderRadius: 1, 
                    mb: 1,
                    '&:hover': {
                      backgroundColor: `${action.color}.light`,
                      opacity: 0.8
                    }
                  }}
                >
                  <ListItemIcon sx={{ color: `${action.color}.main` }}>
                    <Badge badgeContent={action.count} color={action.color}>
                      {action.icon}
                    </Badge>
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography variant="body2" fontWeight="medium">
                        {action.title}
                      </Typography>
                    }
                    secondary={
                      <Typography variant="caption" color="text.secondary">
                        {action.description}
                      </Typography>
                    }
                  />
                </ListItem>
                {index < pendingActions.length - 1 && <Divider sx={{ my: 1 }} />}
              </React.Fragment>
            ))}
          </List>
          
          <Box sx={{ mt: 2 }}>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<VisibilityIcon />}
              onClick={() => navigate('/accounting/verification')}
              sx={{ mb: 1 }}
            >
              View All Actions
            </Button>
            <Button
              variant="contained"
              fullWidth
              startIcon={<CheckCircleIcon />}
              onClick={() => navigate('/accounting/verification')}
            >
              Review Payments
            </Button>
          </Box>
        </>
      )}
    </Paper>
  );
};

const AccountingDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('current_month');

  // Generate period options
  const getPeriodOptions = () => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    
    const options = [
      { value: 'current_month', label: `${currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} (Current Month)` },
      { value: 'previous_month', label: `${new Date(currentYear, currentMonth - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} (Previous Month)` },
      { value: 'current_quarter', label: `Q${Math.floor(currentMonth / 3) + 1} ${currentYear} (Current Quarter)` },
      { value: 'previous_quarter', label: `Q${Math.floor((currentMonth - 3) / 3) + 1} ${currentYear} (Previous Quarter)` },
      { value: 'current_year', label: `${currentYear} (Current Year)` },
      { value: 'previous_year', label: `${currentYear - 1} (Previous Year)` },
      { value: 'last_30_days', label: 'Last 30 Days' },
      { value: 'last_90_days', label: 'Last 90 Days' },
      { value: 'last_12_months', label: 'Last 12 Months' },
    ];
    
    return options;
  };

  const handlePeriodChange = (event: SelectChangeEvent) => {
    setSelectedPeriod(event.target.value);
    // In a real implementation, you would refetch data based on the selected period
    console.log('Period changed to:', event.target.value);
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const data = await fetchAccountingDashboardData();
      setDashboardData(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [selectedPeriod]); // Refetch when period changes

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getCurrentPeriodLabel = () => {
    const options = getPeriodOptions();
    const selectedOption = options.find(option => option.value === selectedPeriod);
    return selectedOption ? selectedOption.label.split(' (')[0] : 'Current Month';
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 400,
        }}
      >
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity='error' sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!dashboardData) {
    return (
      <Alert severity='info' sx={{ mb: 2 }}>
        No dashboard data available
      </Alert>
    );
  }

  return (
    <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', lg: 'row' } }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant='h5' gutterBottom>
            📊 Financial Overview
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CalendarIcon color="primary" />
            <FormControl size="small" sx={{ minWidth: 250 }}>
              <Select
                value={selectedPeriod}
                onChange={handlePeriodChange}
                displayEmpty
                sx={{ 
                  '& .MuiSelect-select': { 
                    display: 'flex', 
                    alignItems: 'center',
                    gap: 1
                  }
                }}
              >
                {getPeriodOptions().map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Box>

        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <MetricCard
              title={selectedPeriod.includes('month') ? 'Monthly Revenue' : 
                    selectedPeriod.includes('quarter') ? 'Quarterly Revenue' :
                    selectedPeriod.includes('year') ? 'Annual Revenue' : 'Revenue'}
              value={formatCurrency(dashboardData.monthlyRevenue)}
              subtitle={`Total revenue for ${getCurrentPeriodLabel()}`}
              icon={<RevenueIcon color='success' />}
              color='success'
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <MetricCard
              title='Outstanding Invoices'
              value={dashboardData.outstandingInvoices.count}
              subtitle={`Total amount: ${formatCurrency(dashboardData.outstandingInvoices.amount)}`}
              icon={<InvoiceIcon color='warning' />}
              color='warning'
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <MetricCard
              title={selectedPeriod.includes('month') ? 'Payments This Month' :
                    selectedPeriod.includes('quarter') ? 'Payments This Quarter' :
                    selectedPeriod.includes('year') ? 'Payments This Year' : 'Payments'}
              value={dashboardData.paymentsThisMonth.count}
              subtitle={`Total received: ${formatCurrency(dashboardData.paymentsThisMonth.amount)}`}
              icon={<PaymentIcon color='primary' />}
              color='primary'
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <MetricCard
              title={selectedPeriod.includes('month') ? 'Completed Courses' :
                    selectedPeriod.includes('quarter') ? 'Courses This Quarter' :
                    selectedPeriod.includes('year') ? 'Courses This Year' : 'Completed Courses'}
              value={dashboardData.completedCoursesThisMonth}
              subtitle={`Courses completed in ${getCurrentPeriodLabel()}`}
              icon={<CourseIcon color='info' />}
              color='info'
            />
          </Grid>
        </Grid>

        {/* Additional Summary Section */}
        <Card elevation={2} sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant='h6' gutterBottom>
              📈 Quick Summary
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant='body1' sx={{ mb: 1 }}>
                  <strong>Revenue Status:</strong>{' '}
                  {dashboardData.monthlyRevenue > 0
                    ? 'Revenue generated this month'
                    : 'No revenue recorded this month'}
                </Typography>
                <Typography variant='body1' sx={{ mb: 1 }}>
                  <strong>Payment Status:</strong>{' '}
                  {dashboardData.outstandingInvoices.count === 0
                    ? 'All invoices paid'
                    : `${dashboardData.outstandingInvoices.count} invoices pending`}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant='body1' sx={{ mb: 1 }}>
                  <strong>Course Activity:</strong>{' '}
                  {dashboardData.completedCoursesThisMonth} courses completed
                </Typography>
                <Typography variant='body1' sx={{ mb: 1 }}>
                  <strong>Collection Rate:</strong>{' '}
                  {dashboardData.paymentsThisMonth.count > 0
                    ? 'Active payments received'
                    : 'No payments this month'}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Box>

      <Box sx={{ 
        width: { xs: '100%', lg: 320 },
        flexShrink: 0,
        order: { xs: -1, lg: 0 }
      }}>
        <PendingActionsSidebar />
      </Box>
    </Box>
  );
};

export default AccountingDashboard;
