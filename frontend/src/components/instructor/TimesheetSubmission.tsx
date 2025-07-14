import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Chip,
  Divider,
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  Add as AddIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { timesheetService, TimesheetSubmission as TimesheetSubmissionData } from '../../services/timesheetService';
import { useAuth } from '../../contexts/AuthContext';

interface TimesheetSubmissionProps {
  onTimesheetSubmitted?: () => void;
}

const TimesheetSubmission: React.FC<TimesheetSubmissionProps> = ({ onTimesheetSubmitted }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState<TimesheetSubmissionData>({
    week_start_date: '',
    total_hours: 0,
    courses_taught: 0,
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleChange = (field: keyof TimesheetSubmissionData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = field === 'total_hours' || field === 'courses_taught' 
      ? parseFloat(event.target.value) || 0 
      : event.target.value;
    
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    
    // Clear messages on change
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!formData.week_start_date || formData.total_hours <= 0) {
      setError('Please fill in all required fields (Week Start Date and Total Hours)');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await timesheetService.submitTimesheet(formData);
      
      setSuccess('Timesheet submitted successfully! HR will review and approve it.');
      
      // Reset form
      setFormData({
        week_start_date: '',
        total_hours: 0,
        courses_taught: 0,
        notes: '',
      });
      
      // Notify parent component
      if (onTimesheetSubmitted) {
        onTimesheetSubmitted();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to submit timesheet');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentWeekStart = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday = 1, Sunday = 0
    const monday = new Date(today);
    monday.setDate(today.getDate() - daysToSubtract);
    return monday.toISOString().split('T')[0];
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <AssignmentIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6" component="h2">
            Submit Timesheet
          </Typography>
        </Box>

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

        <Paper sx={{ p: 3 }}>
          <Box component="form" onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Week Start Date"
                  type="date"
                  value={formData.week_start_date}
                  onChange={handleChange('week_start_date')}
                  InputLabelProps={{ shrink: true }}
                  required
                  disabled={loading}
                  helperText="Select the Monday of the week you're reporting"
                  inputProps={{
                    min: getCurrentWeekStart(),
                  }}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Total Hours"
                  type="number"
                  value={formData.total_hours}
                  onChange={handleChange('total_hours')}
                  required
                  disabled={loading}
                  inputProps={{ min: 0, step: 0.5 }}
                  helperText="Total hours worked this week"
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Courses Taught"
                  type="number"
                  value={formData.courses_taught}
                  onChange={handleChange('courses_taught')}
                  disabled={loading}
                  inputProps={{ min: 0 }}
                  helperText="Number of courses taught this week (optional)"
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Notes"
                  multiline
                  rows={3}
                  value={formData.notes}
                  onChange={handleChange('notes')}
                  disabled={loading}
                  helperText="Additional notes about your work this week (optional)"
                  placeholder="Describe any special circumstances, extra work, or important details..."
                />
              </Grid>
              
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      Submitted by: {user?.username || 'Instructor'}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Status: <Chip label="PENDING" color="warning" size="small" />
                    </Typography>
                  </Box>
                  
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={loading ? <CircularProgress size={20} /> : <AddIcon />}
                    disabled={loading || !formData.week_start_date || formData.total_hours <= 0}
                    size="large"
                  >
                    {loading ? 'Submitting...' : 'Submit Timesheet'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </Paper>

        <Divider sx={{ my: 2 }} />
        
        <Box>
          <Typography variant="subtitle2" color="textSecondary" gutterBottom>
            Timesheet Guidelines:
          </Typography>
          <Typography variant="body2" color="textSecondary" paragraph>
            • Submit one timesheet per week (Monday to Sunday)
          </Typography>
          <Typography variant="body2" color="textSecondary" paragraph>
            • Include all hours worked, including preparation and travel time
          </Typography>
          <Typography variant="body2" color="textSecondary" paragraph>
            • HR will review and approve your timesheet within 2-3 business days
          </Typography>
          <Typography variant="body2" color="textSecondary">
            • You'll be notified when your timesheet is approved or if changes are needed
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default TimesheetSubmission; 