import React, { useState, useEffect } from 'react';
import * as api from '../../services/api';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Alert,
  CircularProgress,
  Typography,
} from '@mui/material';
// Phone Input Libraries
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input';
import 'react-phone-number-input/style.css'; // Import default styles

// Initial empty state for a new organization
const initialOrgState = {
  organizationName: '',
  contactName: '',
  contactEmail: '',
  contactPhone: '', // Store as E.164
  addressStreet: '',
  addressCity: '',
  addressProvince: '',
  addressPostalCode: '',
  ceoName: '',
  ceoPhone: '', // Store as E.164
  ceoEmail: '',
};

function OrganizationDialog({ open, onClose, onSave, organization }) {
  const [orgData, setOrgData] = useState(initialOrgState);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | boolean>>({}); // State for field-specific errors
  const isEditMode = Boolean(organization?.organizationId);

  useEffect(() => {
    // Populate form if editing, otherwise reset
    if (isEditMode && organization) {
      // Map incoming data to state (backend returns camelCase via keysToCamel)
      setOrgData({
        organizationName: organization.organizationName || '',
        contactName: organization.contactName || '',
        contactEmail: organization.contactEmail || '',
        contactPhone: organization.contactPhone || '', // Already E.164 from DB
        addressStreet: organization.addressStreet || '',
        addressCity: organization.addressCity || '',
        addressProvince: organization.addressProvince || '',
        addressPostalCode: organization.addressPostalCode || '',
        ceoName: organization.ceoName || '',
        ceoPhone: organization.ceoPhone || '', // Already E.164 from DB
        ceoEmail: organization.ceoEmail || '',
      });
    } else {
      setOrgData(initialOrgState);
    }
    setError(''); // Clear general error
    setFieldErrors({}); // Clear field errors when dialog opens/org changes
  }, [organization, isEditMode, open]);

  // Handles both TextField changes and PhoneInput changes
  const handleChange = (name, value) => {
    setOrgData(prevData => ({
      ...prevData,
      [name]: value,
    }));
    // Clear specific field error on change
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: false }));
    }
    // Clear general error message when user starts typing
    if (error) {
      setError('');
    }
  };

  const handleSave = async () => {
    setError('');
    setFieldErrors({});
    const newFieldErrors: Record<string, string> = {};

    // Client-side validation
    if (!orgData.organizationName)
      newFieldErrors.organizationName = 'Organization Name required';
    if (!orgData.contactName)
      newFieldErrors.contactName = 'Contact Name required';
    if (!orgData.contactEmail)
      newFieldErrors.contactEmail = 'Contact Email required';
    if (!orgData.contactPhone)
      newFieldErrors.contactPhone = 'Contact Phone required';

    if (Object.keys(newFieldErrors).length > 0) {
      setError('Please fix highlighted field(s).');
      setFieldErrors(newFieldErrors);
      return;
    }

    setLoading(true);
    try {
      if (isEditMode) {
        await api.updateOrganization(organization.organizationId, orgData);
      } else {
        await api.addOrganization(orgData);
      }
      onSave();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save organization');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth='md' fullWidth>
      <DialogTitle>
        {isEditMode ? 'Edit Organization' : 'Add New Organization'}
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity='error' sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Grid container spacing={2} sx={{ mt: 1 }}>
          {/* Organization Details */}
          <Grid xs={12} sm={12}>
            <TextField
              name='organizationName'
              label='Organization Name *'
              value={orgData.organizationName}
              onChange={e => handleChange('organizationName', e.target.value)}
              fullWidth
              required
              error={Boolean(fieldErrors.organizationName)}
              helperText={fieldErrors.organizationName || ''}
            />
          </Grid>
          {/* Address */}
          <Grid xs={12}>
            <TextField
              name='addressStreet'
              label='Street Address'
              value={orgData.addressStreet}
              onChange={e => handleChange('addressStreet', e.target.value)}
              fullWidth
            />
          </Grid>
          <Grid xs={12} sm={4}>
            <TextField
              name='addressCity'
              label='City'
              value={orgData.addressCity}
              onChange={e => handleChange('addressCity', e.target.value)}
              fullWidth
            />
          </Grid>
          <Grid xs={12} sm={4}>
            <TextField
              name='addressProvince'
              label='Province'
              value={orgData.addressProvince}
              onChange={e => handleChange('addressProvince', e.target.value)}
              fullWidth
            />
          </Grid>
          <Grid xs={12} sm={4}>
            <TextField
              name='addressPostalCode'
              label='Postal Code'
              value={orgData.addressPostalCode}
              onChange={e =>
                handleChange('addressPostalCode', e.target.value)
              }
              fullWidth
            />
          </Grid>
          {/* Contact Person */}
          <Grid xs={12} sm={6}>
            <TextField
              name='contactName'
              label='Contact Name'
              value={orgData.contactName}
              onChange={e => handleChange('contactName', e.target.value)}
              fullWidth
            />
          </Grid>
          <Grid xs={12} sm={6}>
            <PhoneInput
              placeholder='Enter contact phone'
              value={orgData.contactPhone}
              onChange={value => handleChange('contactPhone', value || '')}
              defaultCountry='CA'
              international
              countryCallingCodeEditable={false}
              limitMaxLength
              style={{ marginBottom: '0px' }}
              className={fieldErrors.contactPhone ? 'phone-input-error' : ''}
            />
            {fieldErrors.contactPhone && (
              <Typography color='error' variant='caption'>
                {fieldErrors.contactPhone}
              </Typography>
            )}
          </Grid>
          <Grid xs={12} sm={12}>
            <TextField
              name='contactEmail'
              label='Contact Email'
              value={orgData.contactEmail}
              type='email'
              onChange={e => handleChange('contactEmail', e.target.value)}
              fullWidth
            />
          </Grid>
          {/* CEO Details */}
          <Grid xs={12} sm={6}>
            <TextField
              name='ceoName'
              label='CEO Name'
              value={orgData.ceoName}
              onChange={e => handleChange('ceoName', e.target.value)}
              fullWidth
            />
          </Grid>
          <Grid xs={12} sm={6}>
            <PhoneInput
              placeholder='Enter CEO phone'
              value={orgData.ceoPhone}
              onChange={value => handleChange('ceoPhone', value || '')}
              defaultCountry='CA'
              international
              countryCallingCodeEditable={false}
              limitMaxLength
              style={{ marginBottom: '0px' }}
              className={fieldErrors.ceoPhone ? 'phone-input-error' : ''}
            />
            {fieldErrors.ceoPhone && (
              <Typography color='error' variant='caption'>
                {fieldErrors.ceoPhone}
              </Typography>
            )}
          </Grid>
          <Grid xs={12} sm={12}>
            <TextField
              name='ceoEmail'
              label='CEO Email'
              value={orgData.ceoEmail}
              type='email'
              onChange={e => handleChange('ceoEmail', e.target.value)}
              fullWidth
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: '16px 24px' }}>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={handleSave} variant='contained' disabled={loading}>
          {loading ? (
            <CircularProgress size={24} />
          ) : isEditMode ? (
            'Save Changes'
          ) : (
            'Add Organization'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default OrganizationDialog;
