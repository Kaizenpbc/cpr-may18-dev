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
  Divider,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Collapse,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import LocationOnIcon from '@mui/icons-material/LocationOn';
// Phone Input Libraries
import PhoneInput, { formatPhoneNumber } from 'react-phone-number-input';
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

// Initial state for a new location
const initialLocationState = {
  locationName: '',
  address: '',
  city: '',
  province: '',
  postalCode: '',
  contactFirstName: '',
  contactLastName: '',
  contactEmail: '',
  contactPhone: '',
};

// Helper to format phone for display
const formatPhone = (phoneString: string) => {
  if (!phoneString) return '-';
  return formatPhoneNumber(phoneString) || phoneString;
};

function OrganizationDialog({ open, onClose, onSave, organization }) {
  const [orgData, setOrgData] = useState(initialOrgState);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | boolean>>({}); // State for field-specific errors
  const isEditMode = Boolean(organization?.id || organization?.organizationId);

  // Location state
  const [locations, setLocations] = useState<any[]>([]);
  const [locationsExpanded, setLocationsExpanded] = useState(true);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [editingLocation, setEditingLocation] = useState<any>(null);
  const [locationData, setLocationData] = useState(initialLocationState);
  const [locationFieldErrors, setLocationFieldErrors] = useState<Record<string, string>>({});
  const [locationSaving, setLocationSaving] = useState(false);

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
    // Reset location state
    setLocations([]);
    setEditingLocation(null);
    setLocationData(initialLocationState);
    setLocationError('');
  }, [organization, isEditMode, open]);

  // Fetch locations when editing an existing organization
  useEffect(() => {
    const fetchLocations = async () => {
      const orgId = organization?.id || organization?.organizationId;
      if (!isEditMode || !orgId || !open) return;

      setLocationsLoading(true);
      setLocationError('');
      try {
        const data = await api.getOrganizationLocations(orgId);
        setLocations(data || []);
      } catch (err: any) {
        setLocationError(err.message || 'Failed to load locations');
      } finally {
        setLocationsLoading(false);
      }
    };

    fetchLocations();
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
        await api.updateOrganization(organization.id || organization.organizationId, orgData);
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

  // Location handlers
  const handleAddLocation = () => {
    setEditingLocation({ isNew: true });
    setLocationData(initialLocationState);
    setLocationFieldErrors({});
  };

  const handleEditLocation = (location: any) => {
    setEditingLocation(location);
    setLocationData({
      locationName: location.locationName || '',
      address: location.address || '',
      city: location.city || '',
      province: location.province || '',
      postalCode: location.postalCode || '',
      contactFirstName: location.contactFirstName || '',
      contactLastName: location.contactLastName || '',
      contactEmail: location.contactEmail || '',
      contactPhone: location.contactPhone || '',
    });
    setLocationFieldErrors({});
  };

  const handleCancelLocationEdit = () => {
    setEditingLocation(null);
    setLocationData(initialLocationState);
    setLocationFieldErrors({});
  };

  const handleLocationChange = (name: string, value: string) => {
    setLocationData(prev => ({ ...prev, [name]: value }));
    if (locationFieldErrors[name]) {
      setLocationFieldErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSaveLocation = async () => {
    const orgId = organization?.id || organization?.organizationId;
    if (!orgId) return;

    // Validate
    const errors: Record<string, string> = {};
    if (!locationData.locationName.trim()) {
      errors.locationName = 'Location name is required';
    }
    if (Object.keys(errors).length > 0) {
      setLocationFieldErrors(errors);
      return;
    }

    setLocationSaving(true);
    setLocationError('');
    try {
      if (editingLocation.isNew) {
        await api.createOrganizationLocation(orgId, locationData);
      } else {
        await api.updateOrganizationLocation(orgId, editingLocation.id, locationData);
      }
      // Refresh locations
      const data = await api.getOrganizationLocations(orgId);
      setLocations(data || []);
      setEditingLocation(null);
      setLocationData(initialLocationState);
    } catch (err: any) {
      setLocationError(err.message || 'Failed to save location');
    } finally {
      setLocationSaving(false);
    }
  };

  const handleDeleteLocation = async (locationId: number) => {
    const orgId = organization?.id || organization?.organizationId;
    if (!orgId) return;

    if (!window.confirm('Are you sure you want to delete this location?')) return;

    setLocationError('');
    try {
      await api.deleteOrganizationLocation(orgId, locationId);
      // Refresh locations
      const data = await api.getOrganizationLocations(orgId);
      setLocations(data || []);
    } catch (err: any) {
      setLocationError(err.message || 'Failed to delete location');
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

        {/* Locations Section - only show when editing */}
        {isEditMode && (
          <Box sx={{ mt: 3 }}>
            <Divider sx={{ mb: 2 }} />
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 2,
                cursor: 'pointer',
              }}
              onClick={() => setLocationsExpanded(!locationsExpanded)}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LocationOnIcon color="primary" />
                <Typography variant="h6">
                  Locations ({locations.length})
                </Typography>
              </Box>
              <IconButton size="small">
                {locationsExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </Box>

            <Collapse in={locationsExpanded}>
              {locationError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {locationError}
                </Alert>
              )}

              {locationsLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : (
                <>
                  {/* Location editing form */}
                  {editingLocation && (
                    <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                      <Typography variant="subtitle2" sx={{ mb: 2 }}>
                        {editingLocation.isNew ? 'Add New Location' : 'Edit Location'}
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid xs={12}>
                          <TextField
                            label="Location Name *"
                            value={locationData.locationName}
                            onChange={e => handleLocationChange('locationName', e.target.value)}
                            fullWidth
                            size="small"
                            error={Boolean(locationFieldErrors.locationName)}
                            helperText={locationFieldErrors.locationName}
                          />
                        </Grid>
                        <Grid xs={12}>
                          <TextField
                            label="Street Address"
                            value={locationData.address}
                            onChange={e => handleLocationChange('address', e.target.value)}
                            fullWidth
                            size="small"
                          />
                        </Grid>
                        <Grid xs={12} sm={4}>
                          <TextField
                            label="City"
                            value={locationData.city}
                            onChange={e => handleLocationChange('city', e.target.value)}
                            fullWidth
                            size="small"
                          />
                        </Grid>
                        <Grid xs={12} sm={4}>
                          <TextField
                            label="Province"
                            value={locationData.province}
                            onChange={e => handleLocationChange('province', e.target.value)}
                            fullWidth
                            size="small"
                          />
                        </Grid>
                        <Grid xs={12} sm={4}>
                          <TextField
                            label="Postal Code"
                            value={locationData.postalCode}
                            onChange={e => handleLocationChange('postalCode', e.target.value)}
                            fullWidth
                            size="small"
                          />
                        </Grid>
                        <Grid xs={12} sm={6}>
                          <TextField
                            label="Contact First Name"
                            value={locationData.contactFirstName}
                            onChange={e => handleLocationChange('contactFirstName', e.target.value)}
                            fullWidth
                            size="small"
                          />
                        </Grid>
                        <Grid xs={12} sm={6}>
                          <TextField
                            label="Contact Last Name"
                            value={locationData.contactLastName}
                            onChange={e => handleLocationChange('contactLastName', e.target.value)}
                            fullWidth
                            size="small"
                          />
                        </Grid>
                        <Grid xs={12} sm={6}>
                          <TextField
                            label="Contact Email"
                            value={locationData.contactEmail}
                            onChange={e => handleLocationChange('contactEmail', e.target.value)}
                            fullWidth
                            size="small"
                            type="email"
                          />
                        </Grid>
                        <Grid xs={12} sm={6}>
                          <PhoneInput
                            placeholder="Contact Phone"
                            value={locationData.contactPhone}
                            onChange={value => handleLocationChange('contactPhone', value || '')}
                            defaultCountry="CA"
                            international
                            countryCallingCodeEditable={false}
                            limitMaxLength
                          />
                        </Grid>
                        <Grid xs={12}>
                          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                            <Button
                              size="small"
                              onClick={handleCancelLocationEdit}
                              disabled={locationSaving}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="small"
                              variant="contained"
                              onClick={handleSaveLocation}
                              disabled={locationSaving}
                            >
                              {locationSaving ? <CircularProgress size={16} /> : 'Save Location'}
                            </Button>
                          </Box>
                        </Grid>
                      </Grid>
                    </Box>
                  )}

                  {/* Locations table */}
                  {locations.length === 0 && !editingLocation ? (
                    <Typography color="text.secondary" sx={{ mb: 2 }}>
                      No locations defined for this organization.
                    </Typography>
                  ) : (
                    <TableContainer sx={{ mb: 2 }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Address</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Contact</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Phone</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }} align="right">Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {locations.map(loc => (
                            <TableRow key={loc.id} hover>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  {loc.locationName}
                                  {loc.isPrimary && (
                                    <Chip label="Primary" size="small" color="primary" variant="outlined" />
                                  )}
                                </Box>
                              </TableCell>
                              <TableCell>
                                {[loc.address, loc.city, loc.province].filter(Boolean).join(', ') || '-'}
                              </TableCell>
                              <TableCell>
                                {[loc.contactFirstName, loc.contactLastName].filter(Boolean).join(' ') || '-'}
                              </TableCell>
                              <TableCell>{formatPhone(loc.contactPhone)}</TableCell>
                              <TableCell align="right">
                                <IconButton
                                  size="small"
                                  onClick={() => handleEditLocation(loc)}
                                  disabled={Boolean(editingLocation)}
                                  title="Edit"
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  onClick={() => handleDeleteLocation(loc.id)}
                                  disabled={Boolean(editingLocation)}
                                  title="Delete"
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}

                  {/* Add location button */}
                  {!editingLocation && (
                    <Button
                      startIcon={<AddIcon />}
                      onClick={handleAddLocation}
                      size="small"
                    >
                      Add Location
                    </Button>
                  )}
                </>
              )}
            </Collapse>
          </Box>
        )}
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
