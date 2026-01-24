import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { sysadminApi } from '../../services/api';
import logger from '../../utils/logger';

interface SystemConfig {
  id: number;
  configKey: string;
  configValue: string;
  description: string;
  category: string;
  updatedBy?: number;
  updatedAt: string;
  createdAt: string;
}

interface ConfigurationsByCategory {
  [category: string]: SystemConfig[];
}

const SystemConfiguration: React.FC = () => {
  const [configurations, setConfigurations] = useState<ConfigurationsByCategory>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});

  useEffect(() => {
    loadConfigurations();
  }, []);

  const loadConfigurations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await sysadminApi.getConfigurations();
      
      if (response.data.success) {
        setConfigurations(response.data.data);
        // Initialize edited values with current values
        const initialValues: Record<string, string> = {};
        Object.values(response.data.data).flat().forEach((config: SystemConfig) => {
          initialValues[config.configKey] = config.configValue;
        });
        setEditedValues(initialValues);
      } else {
        setError('Failed to load configurations');
      }
    } catch (err) {
      logger.error('Error loading configurations:', err);
      setError('Failed to load system configurations');
    } finally {
      setLoading(false);
    }
  };

  const handleValueChange = (key: string, value: string) => {
    setEditedValues(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = async (key: string) => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const response = await sysadminApi.updateConfiguration(key, editedValues[key]);

      if (response.data.success) {
        setSuccess(`Configuration '${key}' updated successfully`);
        // Reload configurations to get updated data
        await loadConfigurations();
      } else {
        setError(`Failed to update ${key}`);
      }
    } catch (err) {
      logger.error(`Error updating configuration ${key}:`, err);
      setError(`Failed to update ${key}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAll = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const updatePromises = Object.keys(editedValues).map(key => 
        sysadminApi.updateConfiguration(key, editedValues[key])
      );

      await Promise.all(updatePromises);
      setSuccess('All configurations updated successfully');
      await loadConfigurations();
    } catch (err) {
      logger.error('Error updating configurations:', err);
      setError('Failed to update some configurations');
    } finally {
      setSaving(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'invoice':
        return '💰';
      case 'email':
        return '📧';
      case 'course':
        return '📚';
      case 'system':
        return '⚙️';
      default:
        return '🔧';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'invoice':
        return 'primary';
      case 'email':
        return 'info';
      case 'course':
        return 'success';
      case 'system':
        return 'warning';
      default:
        return 'default';
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
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        System Configuration
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Manage system-wide settings and defaults. Changes take effect immediately.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
        <Button
          variant="contained"
          onClick={handleSaveAll}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
        >
          {saving ? 'Saving...' : 'Save All Changes'}
        </Button>
        
        <Button
          variant="outlined"
          onClick={loadConfigurations}
          disabled={loading}
          startIcon={<RefreshIcon />}
        >
          Refresh
        </Button>
      </Box>

      {Object.entries(configurations).map(([category, configs]) => (
        <Accordion key={category} defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="h6">
                {getCategoryIcon(category)} {category.charAt(0).toUpperCase() + category.slice(1)} Settings
              </Typography>
              <Chip 
                label={configs.length} 
                size="small" 
                color={getCategoryColor(category) as any}
              />
            </Box>
          </AccordionSummary>
          
          <AccordionDetails>
            <Grid container spacing={2}>
              {configs.map((config) => (
                <Grid item xs={12} md={6} key={config.configKey}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                        <Typography variant="subtitle2" fontWeight="bold">
                          {config.configKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </Typography>

                        <Box display="flex" gap={1}>
                          <Tooltip title="Save this setting">
                            <IconButton
                              size="small"
                              onClick={() => handleSave(config.configKey)}
                              disabled={saving}
                              color="primary"
                            >
                              {saving ? <CircularProgress size={16} /> : <SaveIcon />}
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>

                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {config.description}
                      </Typography>

                      <TextField
                        fullWidth
                        size="small"
                        value={editedValues[config.configKey] || config.configValue}
                        onChange={(e) => handleValueChange(config.configKey, e.target.value)}
                        variant="outlined"
                        label="Value"
                      />

                      {config.updatedAt && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                          Last updated: {new Date(config.updatedAt).toLocaleString()}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
};

export default SystemConfiguration; 