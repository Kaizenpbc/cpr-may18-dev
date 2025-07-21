import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Avatar,
  LinearProgress,
  Tooltip,
  IconButton,
  Divider,
} from '@mui/material';
import {
  School as SchoolIcon,
  People as PeopleIcon,
  Receipt as ReceiptIcon,
  TrendingUp as TrendingUpIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Visibility as VisibilityIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  Remove as RemoveIcon,
} from '@mui/icons-material';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { formatDisplayDate } from '../../../../utils/dateUtils';
import { useNavigate } from 'react-router-dom';

// TypeScript interfaces
interface OrganizationData {
  id: number;
  name: string;
  contact_email: string;
  contact_phone: string;
  address: string;
  total_courses: number;
  total_students: number;
  active_instructors: number;
}

interface Course {
  id: string | number;
  request_submitted_date: string;
  scheduled_date: string;
  course_type_name: string;
  location: string;
  registered_students: number;
  status: string;
  instructor: string;
  notes?: string;
}

interface BillingSummary {
  total_invoices: number;
  pending_invoices: number;
  overdue_invoices: number;
  paid_invoices: number;
  payment_submitted: number;
  total_amount: number;
  pending_amount: number;
  overdue_amount: number;
  paid_amount: number;
  recent_invoices: any[];
}

interface OrganizationDashboardProps {
  organizationData: OrganizationData | undefined;
  courses: Course[];
  archivedCourses?: Course[];
  billingSummary: BillingSummary | undefined;
}

const OrganizationDashboard: React.FC<OrganizationDashboardProps> = ({
  organizationData,
  courses,
  archivedCourses = [],
  billingSummary,
}) => {
  console.log('🔍 [DEBUG] Dashboard Billing Summary:', billingSummary);
  console.log('🔍 [DEBUG] Dashboard Courses:', JSON.stringify(courses, null, 2));
  console.log('🔍 [DEBUG] Dashboard Archived Courses:', JSON.stringify(archivedCourses, null, 2));
  console.log('🔍 [DEBUG] Courses length:', courses?.length);
  console.log('🔍 [DEBUG] Archived Courses length:', archivedCourses?.length);
  const navigate = useNavigate();

  // Get status color for courses
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
      case 'completed':
        return 'success';
      case 'cancelled':
      case 'past_due':
        return 'error';
      default:
        return 'warning';
    }
  };

  // Get recent courses (last 5)
  const recentCourses = courses.slice(0, 5);

  // Prepare data for charts
  const invoiceStatusData = [
    { name: 'Paid', value: billingSummary?.paid_invoices || 0, color: '#4caf50' },
    { name: 'Pending', value: billingSummary?.pending_invoices || 0, color: '#ff9800' },
    { name: 'Overdue', value: billingSummary?.overdue_invoices || 0, color: '#f44336' },
    { name: 'Payment Submitted', value: billingSummary?.payment_submitted || 0, color: '#2196f3' },
  ].filter(item => item.value > 0); // Only show categories with data

  // Add fallback data if no invoices exist
  const hasInvoiceData = invoiceStatusData.some(item => item.value > 0);
  const displayInvoiceData = hasInvoiceData ? invoiceStatusData : [
    { name: 'No Invoices', value: 1, color: '#9e9e9e' }
  ];

  const courseStatusData = courses.reduce((acc, course) => {
    const status = course.status?.toLowerCase() || 'pending';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const courseStatusChartData = Object.entries(courseStatusData).map(([status, count]) => ({
    name: status.charAt(0).toUpperCase() + status.slice(1),
    value: count,
  }));

  // Calculate completion percentage
  const completionPercentage = courses.length > 0 
    ? (courses.filter(c => c.status?.toLowerCase() === 'completed').length / courses.length) * 100 
    : 0;

  // Calculate trend (mock data - in real app, compare with previous period)
  const getTrendData = () => {
    const currentAmount = billingSummary?.total_amount || 0;
    const previousAmount = currentAmount * 0.8; // Mock previous period
    const trend = ((currentAmount - previousAmount) / previousAmount) * 100;
    return {
      value: Math.abs(trend),
      direction: trend > 0 ? 'up' : trend < 0 ? 'down' : 'stable',
      color: trend > 0 ? '#4caf50' : trend < 0 ? '#f44336' : '#9e9e9e',
    };
  };

  const trendData = getTrendData();

  return (
    <Box sx={{ p: 3, backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, color: '#1a237e', mb: 4 }}>
        Organization Dashboard
      </Typography>

      {/* Modern Stats Cards with Charts */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Total Courses Card */}
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)',
            transition: 'transform 0.2s ease-in-out',
            height: '140px',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 12px 40px rgba(102, 126, 234, 0.4)',
            }
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                <SchoolIcon sx={{ mr: 1, color: 'white', fontSize: 28 }} />
                <Box>
                  <Typography color="rgba(255,255,255,0.8)" gutterBottom sx={{ fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                    Total Courses
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600, color: 'white' }}>
                    {(courses?.length || 0) + (archivedCourses?.length || 0)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Total Students Card */}
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            color: 'white',
            boxShadow: '0 8px 32px rgba(240, 147, 251, 0.3)',
            transition: 'transform 0.2s ease-in-out',
            height: '140px',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 12px 40px rgba(240, 147, 251, 0.4)',
            }
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                <PeopleIcon sx={{ mr: 1, color: 'white', fontSize: 28 }} />
                <Box>
                  <Typography color="rgba(255,255,255,0.8)" gutterBottom sx={{ fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                    Total Students
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600, color: 'white' }}>
                    {[...(courses || []), ...(archivedCourses || [])].reduce((sum, course) => sum + Number(course?.registered_students || 0), 0)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Pending Invoices Card */}
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            color: 'white',
            boxShadow: '0 8px 32px rgba(79, 172, 254, 0.3)',
            transition: 'transform 0.2s ease-in-out',
            height: '140px',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 12px 40px rgba(79, 172, 254, 0.4)',
            }
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                <ReceiptIcon sx={{ mr: 1, color: 'white', fontSize: 28 }} />
                <Box>
                  <Typography color="rgba(255,255,255,0.8)" gutterBottom sx={{ fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                    Pending Invoices
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600, color: 'white' }}>
                    {Number(billingSummary?.pending_invoices || 0)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Total Billed Card */}
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)',
            color: 'white',
            boxShadow: '0 8px 32px rgba(76, 175, 80, 0.3)',
            transition: 'transform 0.2s ease-in-out',
            height: '140px',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 12px 40px rgba(76, 175, 80, 0.4)',
            }
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                <TrendingUpIcon sx={{ mr: 1, color: 'white', fontSize: 28 }} />
                <Box>
                  <Typography color="rgba(255,255,255,0.8)" gutterBottom sx={{ fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                    Total Billed
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600, color: 'white' }}>
                    ${Number(billingSummary?.total_amount || 0).toFixed(2)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Total Paid Card */}
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #2196f3 0%, #42a5f5 100%)',
            color: 'white',
            boxShadow: '0 8px 32px rgba(33, 150, 243, 0.3)',
            transition: 'transform 0.2s ease-in-out',
            height: '140px',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 12px 40px rgba(33, 150, 243, 0.4)',
            }
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                <CheckCircleIcon sx={{ mr: 1, color: 'white', fontSize: 28 }} />
                <Box>
                  <Typography color="rgba(255,255,255,0.8)" gutterBottom sx={{ fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                    Total Paid
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600, color: 'white' }}>
                    ${Number(billingSummary?.paid_amount || 0).toFixed(2)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Outstanding Amount Card */}
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #f44336 0%, #ef5350 100%)',
            color: 'white',
            boxShadow: '0 8px 32px rgba(244, 67, 54, 0.3)',
            transition: 'transform 0.2s ease-in-out',
            height: '140px',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 12px 40px rgba(244, 67, 54, 0.4)',
            }
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                <WarningIcon sx={{ mr: 1, color: 'white', fontSize: 28 }} />
                <Box>
                  <Typography color="rgba(255,255,255,0.8)" gutterBottom sx={{ fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                    Outstanding Amount
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600, color: 'white' }}>
                    ${Number(billingSummary?.pending_amount || 0).toFixed(2)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts and Tables Section */}
      <Grid container spacing={3}>
        {/* Invoice Status Chart */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: 400, p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#1a237e' }}>
              Invoice Status Distribution
            </Typography>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={displayInvoiceData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent, value }) => 
                    hasInvoiceData 
                      ? `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
                      : name
                  }
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {displayInvoiceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  formatter={(value, name) => [value, name]}
                  labelFormatter={(label) => `${label}`}
                />
              </PieChart>
            </ResponsiveContainer>
            {hasInvoiceData && (
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 1 }}>
                {displayInvoiceData.map((entry) => (
                  <Chip
                    key={entry.name}
                    label={`${entry.name}: ${entry.value}`}
                    size="small"
                    sx={{
                      backgroundColor: entry.color,
                      color: 'white',
                      fontWeight: 500,
                      fontSize: '0.75rem'
                    }}
                  />
                ))}
              </Box>
            )}
          </Card>
        </Grid>

        {/* Course Activity Chart */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: 400, p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#1a237e' }}>
              Course Activity Overview
            </Typography>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={courseStatusChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <RechartsTooltip />
                <Bar dataKey="value" fill="#667eea" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Grid>

        {/* Recent Courses Table */}
        <Grid item xs={12} md={8}>
          <Card sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#1a237e' }}>
                Recent Courses
              </Typography>
              <Tooltip title="View all courses">
                <IconButton size="small" sx={{ color: '#667eea' }}>
                  <VisibilityIcon />
                </IconButton>
              </Tooltip>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f8f9fa' }}>
                    <TableCell sx={{ fontWeight: 600 }}>Course Name</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Date Submitted</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Location</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Students</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentCourses.map((course) => (
                    <TableRow key={course.id} sx={{ '&:hover': { backgroundColor: '#f8f9fa' } }}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {course.course_type_name}
                        </Typography>
                      </TableCell>
                      <TableCell>{formatDisplayDate(course.request_submitted_date)}</TableCell>
                      <TableCell>{course.location}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <PeopleIcon sx={{ fontSize: 16, mr: 0.5, color: '#666' }} />
                          {course.registered_students}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={course.status}
                          color={getStatusColor(course.status)}
                          size="small"
                          sx={{ fontWeight: 500 }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  {recentCourses.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                          No courses found
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Grid>

        {/* Enhanced Billing Summary */}
        <Grid item xs={12} md={4}>
          <Card sx={{ p: 3, height: 'fit-content' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#1a237e' }}>
              Billing Summary
            </Typography>
            
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Total Invoices
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {billingSummary?.total_invoices || 0}
                </Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={100} 
                sx={{ height: 6, borderRadius: 3, backgroundColor: '#e0e0e0' }}
              />
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Pending Amount
                </Typography>
                <Typography variant="h6" color="warning.main" sx={{ fontWeight: 600 }}>
                  ${Number(billingSummary?.pending_amount || 0).toFixed(2)}
                </Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={billingSummary?.total_amount ? (billingSummary.pending_amount / billingSummary.total_amount) * 100 : 0} 
                sx={{ height: 6, borderRadius: 3, backgroundColor: '#fff3e0' }}
                color="warning"
              />
            </Box>

            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Overdue Amount
                </Typography>
                <Typography variant="h6" color="error.main" sx={{ fontWeight: 600 }}>
                  ${Number(billingSummary?.overdue_amount || 0).toFixed(2)}
                </Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={billingSummary?.total_amount ? (billingSummary.overdue_amount / billingSummary.total_amount) * 100 : 0} 
                sx={{ height: 6, borderRadius: 3, backgroundColor: '#ffebee' }}
                color="error"
              />
            </Box>

            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Paid Amount
                </Typography>
                <Typography variant="h6" color="success.main" sx={{ fontWeight: 600 }}>
                  ${Number(billingSummary?.paid_amount || 0).toFixed(2)}
                </Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={billingSummary?.total_amount ? (billingSummary.paid_amount / billingSummary.total_amount) * 100 : 0} 
                sx={{ height: 6, borderRadius: 3, backgroundColor: '#e8f5e8' }}
                color="success"
              />
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Quick Actions */}
            <Box sx={{ mt: 3 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Quick Actions
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip 
                  label="View All Invoices" 
                  size="small" 
                  onClick={() => navigate('/organization/billing')}
                  sx={{ cursor: 'pointer', '&:hover': { backgroundColor: '#667eea', color: 'white' } }}
                />
                <Chip 
                  label="Submit Payment" 
                  size="small" 
                  onClick={() => navigate('/organization/billing')}
                  sx={{ cursor: 'pointer', '&:hover': { backgroundColor: '#667eea', color: 'white' } }}
                />
              </Box>
            </Box>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default OrganizationDashboard; 