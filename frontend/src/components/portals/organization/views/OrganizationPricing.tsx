import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Chip,
  Card,
  CardContent,
  Grid,
  Divider,
} from '@mui/material';
import {
  AttachMoney as PricingIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { getOrganizationPricingForOrg } from '../../../../services/api';
import { parseISO, format } from 'date-fns';

interface OrganizationPricingData {
  id: number;
  organization_id: number;
  organization_name: string;
  course_type_id: number;
  course_type_name: string;
  base_price: number;
  student_price: number;
  created_at: string;
  updated_at: string;
}

interface OrganizationPricingProps {
  organizationId: number;
}

const OrganizationPricing: React.FC<OrganizationPricingProps> = ({ organizationId }) => {
  const [pricingData, setPricingData] = useState<OrganizationPricingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPricingData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await getOrganizationPricingForOrg(organizationId);
        const data = response.data || [];
        
        setPricingData(data);
      } catch (err) {
        console.error('Error fetching organization pricing:', err);
        setError('Failed to load pricing information. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    if (organizationId) {
      fetchPricingData();
    }
  }, [organizationId]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    try {
      return format(parseISO(dateString), 'MMM d, yyyy');
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <PricingIcon color="primary" />
          Course Pricing
        </Typography>
        <Typography variant="body1" color="text.secondary">
          View your organization's current pricing for different course types.
        </Typography>
      </Box>

      {/* Info Card */}
      <Card sx={{ mb: 4, bgcolor: 'info.light' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <InfoIcon color="info" />
            <Typography variant="h6" color="info.dark">
              Pricing Information
            </Typography>
          </Box>
          <Typography variant="body2" color="info.dark">
            These are your current pricing rates for each course type. Base price is the minimum charge per course, 
            and student price is the cost per individual student. Contact your system administrator if you need 
            to update any pricing information.
          </Typography>
        </CardContent>
      </Card>

      {/* Pricing Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Total Course Types
              </Typography>
              <Typography variant="h4" color="primary">
                {pricingData.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Average Base Price
              </Typography>
              <Typography variant="h4" color="primary">
                {pricingData.length > 0 
                  ? formatCurrency(
                      pricingData.reduce((sum, item) => sum + item.base_price, 0) / pricingData.length
                    )
                  : formatCurrency(0)
                }
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Average Student Price
              </Typography>
              <Typography variant="h4" color="primary">
                {pricingData.length > 0 
                  ? formatCurrency(
                      pricingData.reduce((sum, item) => sum + item.student_price, 0) / pricingData.length
                    )
                  : formatCurrency(0)
                }
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Pricing Table */}
      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Course Type</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }} align="right">Base Price</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }} align="right">Student Price</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }} align="center">Status</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }} align="center">Last Updated</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pricingData.length > 0 ? (
                pricingData.map((pricing) => (
                  <TableRow key={pricing.id} hover>
                    <TableCell>
                      <Box>
                        <Typography variant="body1" fontWeight="medium">
                          {pricing.course_type_name}
                        </Typography>
                        <Chip 
                          label={`ID: ${pricing.course_type_id}`} 
                          size="small" 
                          variant="outlined" 
                          sx={{ mt: 0.5 }}
                        />
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body1" fontWeight="medium" color="primary">
                        {formatCurrency(pricing.base_price)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body1" fontWeight="medium" color="secondary">
                        {formatCurrency(pricing.student_price)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip 
                        label="Active" 
                        color="success" 
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(pricing.updated_at)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                // Show available course types with placeholder pricing
                [
                  { id: 1, name: 'CPR Basic', base_price: 0, student_price: 0 },
                  { id: 2, name: 'CPR Advanced', base_price: 0, student_price: 0 },
                  { id: 3, name: 'First Aid', base_price: 0, student_price: 0 }
                ].map((courseType) => (
                  <TableRow key={courseType.id} hover>
                    <TableCell>
                      <Box>
                        <Typography variant="body1" fontWeight="medium">
                          {courseType.name}
                        </Typography>
                        <Chip 
                          label={`ID: ${courseType.id}`} 
                          size="small" 
                          variant="outlined" 
                          sx={{ mt: 0.5 }}
                        />
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color="text.secondary" fontStyle="italic">
                        Not configured
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color="text.secondary" fontStyle="italic">
                        Not configured
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip 
                        label="Pending" 
                        color="warning" 
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" color="text.secondary">
                        -
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Information Card */}
      {pricingData.length === 0 && (
        <Card sx={{ mt: 3, bgcolor: 'info.light' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <InfoIcon color="info" />
              <Typography variant="h6" color="info.dark">
                Pricing Setup Required
              </Typography>
            </Box>
            <Typography variant="body2" color="info.dark">
              Your organization's pricing has not been configured yet. The table above shows available course types. 
              Please contact your system administrator to set up custom pricing for your organization.
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Footer Information */}
      {pricingData.length > 0 && (
        <Box sx={{ mt: 4, p: 3, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary">
            <strong>Note:</strong> Pricing information is managed by your system administrator. 
            For questions about pricing or to request changes, please contact your administrator.
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default OrganizationPricing; 