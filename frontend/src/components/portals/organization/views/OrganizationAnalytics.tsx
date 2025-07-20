import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  School as SchoolIcon,
  People as PeopleIcon,
  Receipt as ReceiptIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { formatDisplayDate } from '../../../../utils/dateUtils';

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

interface Invoice {
  id: number;
  invoice_number: string;
  created_at: string;
  due_date: string;
  amount: number;
  status: string;
  students_billed: number;
  paid_date?: string;
  location: string;
  course_type_name: string;
  course_date: string;
  course_request_id: number;
  amount_paid: number;
  balance_due: number;
}

interface OrganizationAnalyticsProps {
  courses: Course[];
  invoices: Invoice[];
  organizationData: OrganizationData | undefined;
}

const OrganizationAnalytics: React.FC<OrganizationAnalyticsProps> = ({
  courses = [],
  invoices = [],
  organizationData,
}) => {
  // Calculate analytics with safety checks
  const totalBilled = (invoices || []).reduce((sum, invoice) => sum + Number(invoice?.amount || 0), 0);
  const totalPaid = (invoices || []).reduce((sum, invoice) => sum + Number(invoice?.amount_paid || 0), 0);
  const totalOutstanding = totalBilled - totalPaid;
  
  // Course type distribution
  const courseTypeStats = (courses || []).reduce((acc, course) => {
    if (course?.course_type_name) {
      acc[course.course_type_name] = (acc[course.course_type_name] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  // Status distribution
  const statusStats = (courses || []).reduce((acc, course) => {
    if (course?.status) {
      acc[course.status] = (acc[course.status] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  // Recent activity (last 10 courses)
  const recentCourses = (courses || []).slice(0, 10);

  // Show loading state if data is not ready
  if (!courses || !invoices) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
        <Typography variant="h6" color="text.secondary">
          Loading analytics...
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Analytics & Reports
      </Typography>

      {/* Key Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card 
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
              },
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <SchoolIcon sx={{ mr: 2, fontSize: 40, color: 'white' }} />
                <Box>
                  <Typography variant="h4" component="div" sx={{ color: 'white', fontWeight: 'bold' }}>
                    {organizationData?.total_courses || 0}
                  </Typography>
                  <Typography sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    Total Courses
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card 
            sx={{
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              color: 'white',
              transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
              },
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <PeopleIcon sx={{ mr: 2, fontSize: 40, color: 'white' }} />
                <Box>
                  <Typography variant="h4" component="div" sx={{ color: 'white', fontWeight: 'bold' }}>
                    {organizationData?.total_students || 0}
                  </Typography>
                  <Typography sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    Total Students
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card 
            sx={{
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              color: 'white',
              transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
              },
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <ReceiptIcon sx={{ mr: 2, fontSize: 40, color: 'white' }} />
                <Box>
                  <Typography variant="h4" component="div" sx={{ color: 'white', fontWeight: 'bold' }}>
                    ${totalBilled.toFixed(2)}
                  </Typography>
                  <Typography sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    Total Billed
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card 
            sx={{
              background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
              color: 'white',
              transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
              },
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CheckCircleIcon sx={{ mr: 2, fontSize: 40, color: 'white' }} />
                <Box>
                  <Typography variant="h4" component="div" sx={{ color: 'white', fontWeight: 'bold' }}>
                    ${totalPaid.toFixed(2)}
                  </Typography>
                  <Typography sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    Total Paid
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Summary Section */}
      <Box sx={{ mb: 4, p: 3, bgcolor: 'background.paper', borderRadius: 2, boxShadow: 1 }}>
        <Typography variant="h6" gutterBottom>
          Financial Summary
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
              <Typography variant="h5" color="warning.dark" fontWeight="bold">
                ${totalOutstanding.toFixed(2)}
              </Typography>
              <Typography variant="body2" color="warning.dark">
                Outstanding Amount
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
              <Typography variant="h5" color="info.dark" fontWeight="bold">
                {totalBilled > 0 ? ((totalPaid / totalBilled) * 100).toFixed(1) : '0'}%
              </Typography>
              <Typography variant="body2" color="info.dark">
                Collection Rate
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
              <Typography variant="h5" color="success.dark" fontWeight="bold">
                {invoices.length}
              </Typography>
              <Typography variant="body2" color="success.dark">
                Total Invoices
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* Analytics Content */}
      <Grid container spacing={3}>
        {/* Course Type Distribution */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Course Type Distribution
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Course Name</TableCell>
                    <TableCell>Count</TableCell>
                    <TableCell>Percentage</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(courseTypeStats).map(([type, count]) => (
                    <TableRow key={type}>
                      <TableCell>{type}</TableCell>
                      <TableCell>{count}</TableCell>
                      <TableCell>
                        {((count / courses.length) * 100).toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  ))}
                  {Object.keys(courseTypeStats).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} align="center">
                        No course data available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Status Distribution */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Course Status Distribution
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Status</TableCell>
                    <TableCell>Count</TableCell>
                    <TableCell>Percentage</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(statusStats).map(([status, count]) => (
                    <TableRow key={status}>
                      <TableCell>{status}</TableCell>
                      <TableCell>{count}</TableCell>
                      <TableCell>
                        {((count / courses.length) * 100).toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  ))}
                  {Object.keys(statusStats).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} align="center">
                        No status data available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Recent Activity
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Course Name</TableCell>
                    <TableCell>Date Submitted</TableCell>
                    <TableCell>Location</TableCell>
                    <TableCell>Students</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Instructor</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentCourses.map((course) => (
                    <TableRow key={course.id}>
                      <TableCell>{course.course_type_name}</TableCell>
                      <TableCell>
                        {formatDisplayDate(course.request_submitted_date)}
                      </TableCell>
                      <TableCell>{course.location}</TableCell>
                      <TableCell>{course.registered_students}</TableCell>
                      <TableCell>{course.status}</TableCell>
                      <TableCell>{course.instructor || 'TBD'}</TableCell>
                    </TableRow>
                  ))}
                  {recentCourses.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        No recent activity
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default OrganizationAnalytics; 