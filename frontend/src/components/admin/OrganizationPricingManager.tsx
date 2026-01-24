import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Snackbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TableSortLabel,
  Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import OrganizationPricingDialog from './OrganizationPricingDialog';
import * as api from '../../services/api';
import logger from '../../utils/logger';

interface OrganizationPricing {
  id: number;
  organizationId: number;
  classTypeId: number;
  pricePerStudent: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: number;
  lastModifiedBy?: number;
  deletedAt?: string;
  organizationName?: string;
  classTypeName?: string;
}

interface Organization {
  id: number;
  name: string;
}

interface ClassType {
  id: number;
  name: string;
}

function OrganizationPricingManager() {
  const [pricingData, setPricingData] = useState<OrganizationPricing[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [classTypes, setClassTypes] = useState<ClassType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'warning' | 'info',
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPricing, setEditingPricing] = useState<OrganizationPricing | null>(null);

  // Filter states
  const [filterOrg, setFilterOrg] = useState('');
  const [filterClassType, setFilterClassType] = useState('');

  // Sort states
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [orderBy, setOrderBy] = useState('organizationName');

  // Fetch all data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [pricingResponse, orgsResponse, typesResponse] = await Promise.all([
        api.getCoursePricing(),
        api.getOrganizations(),
        api.getClassTypes(),
      ]);

      console.log('API Responses:', {
        pricing: pricingResponse,
        organizations: orgsResponse,
        classTypes: typesResponse
      });

      console.log('Setting state with:', {
        pricingData: Array.isArray(pricingResponse) ? pricingResponse : [],
        organizations: Array.isArray(orgsResponse) ? orgsResponse : [],
        classTypes: Array.isArray(typesResponse) ? typesResponse : []
      });

      setPricingData(Array.isArray(pricingResponse) ? pricingResponse : []);
      setOrganizations(Array.isArray(orgsResponse) ? orgsResponse : []);
      setClassTypes(Array.isArray(typesResponse) ? typesResponse : []);
    } catch (err: unknown) {
      logger.error('Error fetching organization pricing data:', err);
      const errObj = err as { message?: string };
      setError(errObj.message || 'Failed to load data.');
      setPricingData([]);
      setOrganizations([]);
      setClassTypes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddOpen = () => {
    setEditingPricing(null);
    setDialogOpen(true);
  };

  const handleEditOpen = (pricing: OrganizationPricing) => {
    setEditingPricing(pricing);
    setDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this pricing record?')) {
      try {
        setError('');
        await api.deleteCoursePricing(id);
        setPricingData(pricingData.filter(p => p.id !== id));
        logger.info(`Organization pricing ${id} deleted successfully`);
        showSnackbar('Pricing record deleted successfully.', 'success');
      } catch (err: unknown) {
        logger.error(`Error deleting organization pricing ${id}:`, err);
        const errObj = err as { message?: string };
        setError(errObj.message || 'Failed to delete pricing record.');
        showSnackbar(errObj.message || 'Failed to delete pricing record.', 'error');
      }
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingPricing(null);
  };

  const handleDialogSave = () => {
    fetchData(); // Refresh data after save
  };

  // Sorting handler
  const handleSortRequest = (property: string) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  // Filtering and sorting logic
  const getProcessedData = () => {
    // Ensure pricingData is an array
    if (!Array.isArray(pricingData)) {
      console.warn('pricingData is not an array:', pricingData);
      return [];
    }
    
    let filtered = [...pricingData];

    // Apply filters
    if (filterOrg) {
      filtered = filtered.filter(
        p => p.organizationId === parseInt(filterOrg, 10)
      );
    }
    if (filterClassType) {
      filtered = filtered.filter(
        p => p.classTypeId === parseInt(filterClassType, 10)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let compareA: string | number, compareB: string | number;
      switch (orderBy) {
        case 'organizationName':
          compareA = a.organizationName || '';
          compareB = b.organizationName || '';
          break;
        case 'classTypeName':
          compareA = a.classTypeName || '';
          compareB = b.classTypeName || '';
          break;
        case 'pricePerStudent':
          compareA = Number(a.pricePerStudent) || 0;
          compareB = Number(b.pricePerStudent) || 0;
          break;
        case 'isActive':
          compareA = a.isActive ? 1 : 0;
          compareB = b.isActive ? 1 : 0;
          break;
        default:
          compareA = a.id;
          compareB = b.id;
      }

      if (compareB < compareA) {
        return order === 'asc' ? 1 : -1;
      }
      if (compareB > compareA) {
        return order === 'asc' ? -1 : 1;
      }
      return 0;
    });

    return filtered;
  };

  const processedData = getProcessedData();

  console.log('Render state:', {
    organizations: organizations,
    classTypes: classTypes,
    pricingData: pricingData,
    processedData: processedData
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
        }}
      >
        <Typography variant="h5" component="h2">
          Course Pricing Management
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchData}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddOpen}
          >
            Add Pricing
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Filter Controls */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Filter by Organization</InputLabel>
          <Select
            value={filterOrg}
            label="Filter by Organization"
            onChange={(e) => setFilterOrg(e.target.value)}
          >
            <MenuItem value="">All Organizations</MenuItem>
            {Array.isArray(organizations) && organizations.map((org) => (
              <MenuItem key={org?.id || 'unknown'} value={(org?.id || '').toString()}>
                {org?.name || 'Unknown Organization'}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Filter by Class Type</InputLabel>
          <Select
            value={filterClassType}
            label="Filter by Class Type"
            onChange={(e) => setFilterClassType(e.target.value)}
          >
            <MenuItem value="">All Class Types</MenuItem>
            {Array.isArray(classTypes) && classTypes.map((type) => (
              <MenuItem key={type?.id || 'unknown'} value={(type?.id || '').toString()}>
                {type?.name || 'Unknown Class Type'}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Data Table */}
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'organizationName'}
                  direction={orderBy === 'organizationName' ? order : 'asc'}
                  onClick={() => handleSortRequest('organizationName')}
                >
                  Organization
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'classTypeName'}
                  direction={orderBy === 'classTypeName' ? order : 'asc'}
                  onClick={() => handleSortRequest('classTypeName')}
                >
                  Class Type
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'pricePerStudent'}
                  direction={orderBy === 'pricePerStudent' ? order : 'asc'}
                  onClick={() => handleSortRequest('pricePerStudent')}
                >
                  Price per Student
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'isActive'}
                  direction={orderBy === 'isActive' ? order : 'asc'}
                  onClick={() => handleSortRequest('isActive')}
                >
                  Status
                </TableSortLabel>
              </TableCell>
              <TableCell>Last Updated</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {processedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography variant="body2" color="textSecondary">
                    No pricing records found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              processedData.map((pricing) => (
                <TableRow key={pricing.id}>
                  <TableCell>{pricing.organizationName || 'Unknown'}</TableCell>
                  <TableCell>{pricing.classTypeName || 'Unknown'}</TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {formatCurrency(pricing.pricePerStudent)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={pricing.isActive ? 'Active' : 'Inactive'}
                      color={pricing.isActive ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{formatDate(pricing.updatedAt)}</TableCell>
                  <TableCell align="center">
                    <Tooltip title="Edit">
                      <IconButton
                        size="small"
                        onClick={() => handleEditOpen(pricing)}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(pricing.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog */}
      <OrganizationPricingDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        onSave={handleDialogSave}
        pricing={editingPricing}
        organizations={organizations}
        classTypes={classTypes}
      />

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Paper>
  );
}

export default OrganizationPricingManager; 