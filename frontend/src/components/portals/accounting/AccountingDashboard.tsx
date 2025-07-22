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
import { fetchAccountingDashboardData, api } from '../../../services/api';
import { useNavigate } from 'react-router-dom';

interface DashboardData {
  totalBilled: number;
  totalPaid: number;
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
}) => {
  // Define color schemes for different metrics
  const colorSchemes = {
    success: {
      bg: 'linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)',
      iconBg: 'rgba(76, 175, 80, 0.1)',
      iconColor: '#2e7d32',
      textColor: '#fff',
      subtitleColor: 'rgba(255, 255, 255, 0.8)'
    },
    warning: {
      bg: 'linear-gradient(135deg, #ff9800 0%, #ffb74d 100%)',
      iconBg: 'rgba(255, 152, 0, 0.1)',
      iconColor: '#e65100',
      textColor: '#fff',
      subtitleColor: 'rgba(255, 255, 255, 0.8)'
    },
    error: {
      bg: 'linear-gradient(135deg, #f44336 0%, #ef5350 100%)',
      iconBg: 'rgba(244, 67, 54, 0.1)',
      iconColor: '#c62828',
      textColor: '#fff',
      subtitleColor: 'rgba(255, 255, 255, 0.8)'
    },
    primary: {
      bg: 'linear-gradient(135deg, #2196f3 0%, #42a5f5 100%)',
      iconBg: 'rgba(33, 150, 243, 0.1)',
      iconColor: '#1565c0',
      textColor: '#fff',
      subtitleColor: 'rgba(255, 255, 255, 0.8)'
    },
    info: {
      bg: 'linear-gradient(135deg, #00bcd4 0%, #26c6da 100%)',
      iconBg: 'rgba(0, 188, 212, 0.1)',
      iconColor: '#00695c',
      textColor: '#fff',
      subtitleColor: 'rgba(255, 255, 255, 0.8)'
    },
    secondary: {
      bg: 'linear-gradient(135deg, #9c27b0 0%, #ba68c8 100%)',
      iconBg: 'rgba(156, 39, 176, 0.1)',
      iconColor: '#6a1b9a',
      textColor: '#fff',
      subtitleColor: 'rgba(255, 255, 255, 0.8)'
    }
  };

  const scheme = colorSchemes[color] || colorSchemes.primary;

  return (
    <Card
      elevation={3}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.3s ease-in-out',
        background: scheme.bg,
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 6,
        },
      }}
    >
      <CardContent sx={{ flexGrow: 1, p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2,
              backgroundColor: scheme.iconBg,
              color: scheme.iconColor,
              mr: 2,
            }}
          >
            {icon}
          </Box>
          <Typography 
            variant='h6' 
            sx={{ 
              fontWeight: 600,
              color: scheme.textColor
            }}
          >
            {title}
          </Typography>
        </Box>
        <Typography 
          variant='h4' 
          component='div' 
          sx={{ 
            fontWeight: 'bold', 
            mb: 1,
            color: scheme.textColor
          }}
        >
          {value}
        </Typography>
        {subtitle && (
          <Typography 
            variant='body2' 
            sx={{ 
              color: scheme.subtitleColor,
              fontWeight: 500
            }}
          >
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

const PendingActionsSidebar: React.FC = () => {
  const navigate = useNavigate();
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchPendingActions = async () => {
      try {
        setLoading(true);
        console.log('🔍 [PENDING ACTIONS] Fetching real pending actions data...');
        
        // Fetch real data from API
        const [paymentsResponse, invoicesResponse] = await Promise.all([
          api.get('/accounting/payment-verifications'),
          api.get('/accounting/invoices')
        ]);
        
        const paymentsData = paymentsResponse.data;
        const invoicesData = invoicesResponse.data;
        
        console.log('🔍 [PENDING ACTIONS] Payments data:', paymentsData);
        console.log('🔍 [PENDING ACTIONS] Invoices data:', invoicesData);
        
        // Count pending payments
        const pendingPaymentsCount = paymentsData.data?.payments?.filter((p: any) => 
          p.status === 'pending_verification' || !p.verified_by_accounting_at
        ).length || 0;
        
        // Count pending invoices
        const pendingInvoicesCount = invoicesData.data?.invoices?.filter((i: any) => 
          ['pending_approval', 'pending', 'draft'].includes(i.approval_status?.toLowerCase())
        ).length || 0;
        
        console.log('🔍 [PENDING ACTIONS] Counts:', {
          pendingPayments: pendingPaymentsCount,
          pendingInvoices: pendingInvoicesCount
        });
        
        const realData: PendingAction[] = [
          {
            id: '1',
            type: 'payment_verification',
            title: 'Payments Pending Verification',
            description: 'Organization payments waiting for review',
            count: pendingPaymentsCount,
            color: 'error',
            icon: <PaymentIcon />,
            route: '/accounting/verification'
          },
          {
            id: '2',
            type: 'invoice_approval',
            title: 'Invoices Pending Approval',
            description: 'Invoices waiting for approval',
            count: pendingInvoicesCount,
            color: 'warning',
            icon: <AssignmentIcon />,
            route: '/accounting/receivables'
          }
        ];
        
        console.log('🔍 [PENDING ACTIONS] Setting real data:', realData);
        setPendingActions(realData);
      } catch (error) {
        console.error('🔍 [PENDING ACTIONS] Error fetching pending actions:', error);
        setPendingActions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPendingActions();
    
    // Auto-refresh every 2 minutes instead of 30 seconds
    const interval = setInterval(fetchPendingActions, 120000);
    
    return () => clearInterval(interval);
  }, []);

  const handleActionClick = (route: string) => {
    navigate(route);
  };

  const handleRefresh = async () => {
    try {
      setLoading(true);
      console.log('🔍 [PENDING ACTIONS] Manual refresh triggered...');
      
      // Fetch real data from API
      const [paymentsResponse, invoicesResponse] = await Promise.all([
        api.get('/accounting/payment-verifications'),
        api.get('/accounting/invoices')
      ]);
      
      const paymentsData = paymentsResponse.data;
      const invoicesData = invoicesResponse.data;
      
      console.log('🔍 [PENDING ACTIONS] Refresh - Payments data:', paymentsData);
      console.log('🔍 [PENDING ACTIONS] Refresh - Invoices data:', invoicesData);
      
      // Count pending payments
      const pendingPaymentsCount = paymentsData.data?.payments?.filter((p: any) => 
        p.status === 'pending_verification' || !p.verified_by_accounting_at
      ).length || 0;
      
      // Count pending invoices
      const pendingInvoicesCount = invoicesData.data?.invoices?.filter((i: any) => 
        ['pending_approval', 'pending', 'draft'].includes(i.approval_status?.toLowerCase())
      ).length || 0;
      
      console.log('🔍 [PENDING ACTIONS] Refresh - Counts:', {
        pendingPayments: pendingPaymentsCount,
        pendingInvoices: pendingInvoicesCount
      });
      
      const realData: PendingAction[] = [
        {
          id: '1',
          type: 'payment_verification',
          title: 'Payments Pending Verification',
          description: 'Organization payments waiting for review',
          count: pendingPaymentsCount,
          color: 'error',
          icon: <PaymentIcon />,
          route: '/accounting/verification'
        },
        {
          id: '2',
          type: 'invoice_approval',
          title: 'Invoices Pending Approval',
          description: 'Invoices waiting for approval',
          count: pendingInvoicesCount,
          color: 'warning',
          icon: <AssignmentIcon />,
          route: '/accounting/receivables'
        }
      ];
      
      console.log('🔍 [PENDING ACTIONS] Refresh - Setting real data:', realData);
      setPendingActions(realData);
    } catch (error) {
      console.error('🔍 [PENDING ACTIONS] Error refreshing pending actions:', error);
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
  console.log('[AccountingDashboard] Component starting to render');
  
  try {
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
              title='Total Billed'
              value={formatCurrency(dashboardData.totalBilled)}
              subtitle='Total amount invoiced to organizations'
              icon={<RevenueIcon sx={{ color: 'inherit' }} />}
              color='success'
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <MetricCard
              title='Total Paid'
              value={formatCurrency(dashboardData.totalPaid)}
              subtitle='Total payments received and verified'
              icon={<PaymentIcon sx={{ color: 'inherit' }} />}
              color='primary'
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <MetricCard
              title='Outstanding Amount'
              value={formatCurrency(dashboardData.outstandingInvoices.amount)}
              subtitle={`${dashboardData.outstandingInvoices.count} invoices pending`}
              icon={<InvoiceIcon sx={{ color: 'inherit' }} />}
              color='error'
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <MetricCard
              title='Completed Courses'
              value={dashboardData.completedCoursesThisMonth}
              subtitle={`Courses completed this month`}
              icon={<CourseIcon sx={{ color: 'inherit' }} />}
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
                  <strong>Billing Status:</strong>{' '}
                  {dashboardData.totalBilled > 0
                    ? `$${dashboardData.totalBilled.toLocaleString()} total invoiced`
                    : 'No invoices generated'}
                </Typography>
                <Typography variant='body1' sx={{ mb: 1 }}>
                  <strong>Payment Status:</strong>{' '}
                  {dashboardData.outstandingInvoices.count === 0
                    ? 'All invoices paid'
                    : `${dashboardData.outstandingInvoices.count} invoices pending payment`}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant='body1' sx={{ mb: 1 }}>
                  <strong>Collection Rate:</strong>{' '}
                  {dashboardData.totalBilled > 0
                    ? `${((dashboardData.totalPaid / dashboardData.totalBilled) * 100).toFixed(1)}% collected`
                    : 'No billing data'}
                </Typography>
                <Typography variant='body1' sx={{ mb: 1 }}>
                  <strong>Course Activity:</strong>{' '}
                  {dashboardData.completedCoursesThisMonth} courses completed this month
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
  } catch (error) {
    console.error('[AccountingDashboard] Error during render:', error);
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" color="error">Error Loading Dashboard</Typography>
        <Typography>An error occurred while loading the dashboard.</Typography>
        <Typography variant="body2" color="textSecondary">
          Error: {error instanceof Error ? error.message : 'Unknown error'}
        </Typography>
      </Box>
    );
  }
};

export default AccountingDashboard;
