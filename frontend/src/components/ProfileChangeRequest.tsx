import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Chip,
  Grid,
  Divider,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { profileChangesService, type ProfileChangeRequest as ProfileChangeRequestType } from '../services/profileChangesService';

interface ProfileChangeRequestProps {
  onSuccess?: () => void;
}

const ProfileChangeRequest: React.FC<ProfileChangeRequestProps> = ({ onSuccess }) => {
  const { user } = useAuth();
  const { success, error } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<ProfileChangeRequestType>({
    field_name: '',
    new_value: '',
    change_type: 'instructor',
  });

  const availableFields = {
    instructor: [
      { value: 'name', label: 'Full Name' },
      { value: 'phone', label: 'Phone Number' },
      { value: 'address', label: 'Address' },
      { value: 'city', label: 'City' },
      { value: 'province', label: 'Province' },
      { value: 'postal_code', label: 'Postal Code' },
    ],
    organization: [
      { value: 'name', label: 'Organization Name' },
      { value: 'contact_email', label: 'Contact Email' },
      { value: 'contact_phone', label: 'Contact Phone' },
      { value: 'address', label: 'Address' },
      { value: 'city', label: 'City' },
      { value: 'province', label: 'Province' },
      { value: 'postal_code', label: 'Postal Code' },
    ],
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await profileChangesService.submitChangeRequest(formData);
      success('Profile change request submitted successfully! It will be reviewed by HR.', {
        title: 'Request Submitted',
        context: 'profile_change',
      });
      
      // Reset form
      setFormData({
        field_name: '',
        new_value: '',
        change_type: formData.change_type,
      });
      
      onSuccess?.();
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { message?: string } } };
      error(errObj.response?.data?.message || 'Failed to submit profile change request', {
        title: 'Submission Failed',
        context: 'profile_change',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof ProfileChangeRequestType, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const getChangeType = () => {
    if (user?.role === 'instructor') return 'instructor';
    if (user?.role === 'organization') return 'organization';
    return 'instructor'; // default
  };

  const changeType = getChangeType();
  const fields = availableFields[changeType as keyof typeof availableFields];

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Request Profile Change
        </Typography>
        
        <Alert severity="info" sx={{ mb: 2 }}>
          Profile changes require HR approval. Your request will be reviewed and you'll be notified of the decision.
        </Alert>

        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Field to Change</InputLabel>
                <Select
                  value={formData.field_name}
                  label="Field to Change"
                  onChange={(e) => handleChange('field_name', e.target.value)}
                  required
                >
                  {fields.map((field) => (
                    <MenuItem key={field.value} value={field.value}>
                      {field.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="New Value"
                value={formData.new_value}
                onChange={(e) => handleChange('new_value', e.target.value)}
                required
                placeholder="Enter the new value"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                type="hidden"
                value={changeType}
                onChange={(e) => handleChange('change_type', e.target.value)}
                sx={{ display: 'none' }}
              />
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading || !formData.field_name || !formData.new_value}
                >
                  {loading ? 'Submitting...' : 'Submit Request'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Box>

        <Divider sx={{ my: 2 }} />
        
        <Typography variant="body2" color="text.secondary">
          <strong>Current Role:</strong> {user?.role}
          <br />
          <strong>Change Type:</strong> {changeType}
        </Typography>
      </CardContent>
    </Card>
  );
};

export default ProfileChangeRequest; 