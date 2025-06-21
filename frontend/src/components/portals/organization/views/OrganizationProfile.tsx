import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  Divider,
  Card,
  CardContent,
} from '@mui/material';
import {
  Business as BusinessIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
} from '@mui/icons-material';

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

interface OrganizationProfileProps {
  organizationData: OrganizationData | undefined;
}

const OrganizationProfile: React.FC<OrganizationProfileProps> = ({
  organizationData,
}) => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Organization Profile
      </Typography>

      <Grid container spacing={3}>
        {/* Organization Information */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Organization Information
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Organization Name"
                  value={organizationData?.name || ''}
                  variant="outlined"
                  InputProps={{
                    readOnly: true,
                  }}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Contact Email"
                  value={organizationData?.contact_email || ''}
                  variant="outlined"
                  InputProps={{
                    readOnly: true,
                  }}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Contact Phone"
                  value={organizationData?.contact_phone || ''}
                  variant="outlined"
                  InputProps={{
                    readOnly: true,
                  }}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Address"
                  value={organizationData?.address || ''}
                  variant="outlined"
                  multiline
                  rows={3}
                  InputProps={{
                    readOnly: true,
                  }}
                />
              </Grid>
            </Grid>
            
            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
              <Button variant="contained" color="primary">
                Edit Profile
              </Button>
              <Button variant="outlined">
                Request Changes
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Organization Stats */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Organization Statistics
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <BusinessIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    Total Courses
                  </Typography>
                </Box>
                <Typography variant="h5">
                  {organizationData?.total_courses || 0}
                </Typography>
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <EmailIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    Total Students
                  </Typography>
                </Box>
                <Typography variant="h5">
                  {organizationData?.total_students || 0}
                </Typography>
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <PhoneIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    Active Instructors
                  </Typography>
                </Box>
                <Typography variant="h5">
                  {organizationData?.active_instructors || 0}
                </Typography>
              </Box>
            </CardContent>
          </Card>

          {/* Contact Information Card */}
          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Contact Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <EmailIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    Email
                  </Typography>
                </Box>
                <Typography variant="body1">
                  {organizationData?.contact_email || 'N/A'}
                </Typography>
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <PhoneIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    Phone
                  </Typography>
                </Box>
                <Typography variant="body1">
                  {organizationData?.contact_phone || 'N/A'}
                </Typography>
              </Box>
              
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <LocationIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    Address
                  </Typography>
                </Box>
                <Typography variant="body1">
                  {organizationData?.address || 'N/A'}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default OrganizationProfile; 