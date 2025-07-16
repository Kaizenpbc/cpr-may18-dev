import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';

interface VendorProfileData {
  name: string;
  contact_email: string;
  contact_phone: string;
  address: string;
  vendor_type: string;
}

const VendorProfile: React.FC = () => {
  const [profile, setProfile] = useState<VendorProfileData>({
    name: '',
    contact_email: '',
    contact_phone: '',
    address: '',
    vendor_type: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call
      // const response = await apiService.get('/vendor/profile');
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data
      setProfile({
        name: 'Test Vendor Company',
        contact_email: 'vendor@example.com',
        contact_phone: '555-1234',
        address: '123 Vendor St, Vendor City, ON, A1B 2C3',
        vendor_type: 'supplier'
      });
    } catch (err) {
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectChange = (e: any) => {
    const { name, value } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // TODO: Replace with actual API call
      // await apiService.put('/vendor/profile', profile);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSuccess('Profile updated successfully!');
    } catch (err) {
      setError('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Vendor Profile
      </Typography>

      <Paper sx={{ p: 3, maxWidth: 800 }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Company Information
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Company Name"
                name="name"
                value={profile.name}
                onChange={handleInputChange}
                required
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Vendor Type</InputLabel>
                <Select
                  name="vendor_type"
                  value={profile.vendor_type}
                  onChange={handleSelectChange}
                  label="Vendor Type"
                >
                  <MenuItem value="supplier">Supplier</MenuItem>
                  <MenuItem value="service_provider">Service Provider</MenuItem>
                  <MenuItem value="consultant">Consultant</MenuItem>
                  <MenuItem value="contractor">Contractor</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Contact Information
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Contact Email"
                name="contact_email"
                type="email"
                value={profile.contact_email}
                onChange={handleInputChange}
                required
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Contact Phone"
                name="contact_phone"
                value={profile.contact_phone}
                onChange={handleInputChange}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Address"
                name="address"
                value={profile.address}
                onChange={handleInputChange}
                multiline
                rows={3}
              />
            </Grid>

            {error && (
              <Grid item xs={12}>
                <Alert severity="error">{error}</Alert>
              </Grid>
            )}

            {success && (
              <Grid item xs={12}>
                <Alert severity="success">{success}</Alert>
              </Grid>
            )}

            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
                disabled={saving}
                size="large"
              >
                {saving ? 'Saving...' : 'Save Profile'}
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Box>
  );
};

export default VendorProfile; 