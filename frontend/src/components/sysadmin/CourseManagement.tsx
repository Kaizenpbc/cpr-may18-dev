import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  TextField,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Chip,
  IconButton,
  Tooltip,
  FormControlLabel,
  Switch,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  School as SchoolIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Restore as RestoreIcon,
} from '@mui/icons-material';
import { sysAdminApi } from '../../services/api';
import logger from '../../utils/logger';

const CourseManagement = ({ onShowSnackbar }) => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Dialog state
  const [showDialog, setShowDialog] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    durationHours: '',
    durationMinutes: '',
    prerequisites: [],
    certificationType: '',
    validityPeriodMonths: '',
    courseCategory: '',
    regulatoryCompliance: [],
    isActive: true,
  });

  const courseCategories = [
    'First Aid',
    'CPR',
    'BLS',
    'Advanced Life Support',
    'Emergency Response',
    'Safety Training',
    'Other',
  ];

  const certificationTypes = [
    'Initial Certification',
    'Renewal',
    'Advanced Training',
    'Refresher Course',
    'Specialty Course',
  ];

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    setLoading(true);
    try {
      const response = await sysAdminApi.getCourses();
      setCourses(response.data || []);
      setError('');
    } catch (err) {
      logger.error('Error loading courses:', err);
      setError('Failed to load courses');
      onShowSnackbar?.('Failed to load courses', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    setEditingCourse(null);
    setFormData({
      name: '',
      description: '',
      durationHours: '',
      durationMinutes: '',
      prerequisites: [],
      certificationType: '',
      validityPeriodMonths: '',
      courseCategory: '',
      regulatoryCompliance: [],
      isActive: true,
    });
    setShowDialog(true);
  };

  const handleEdit = course => {
    setEditingCourse(course);
    setFormData({
      name: course.name || '',
      description: course.description || '',
      durationHours: course.durationHours || '',
      durationMinutes: course.durationMinutes || '',
      prerequisites: course.prerequisites || [],
      certificationType: course.certificationType || '',
      validityPeriodMonths: course.validityPeriodMonths || '',
      courseCategory: course.courseCategory || '',
      regulatoryCompliance: course.regulatoryCompliance || [],
      isActive: course.isActive !== false,
    });
    setShowDialog(true);
  };

  const handleDelete = async course => {
    if (
      window.confirm(
        `Are you sure you want to deactivate the course "${course.name}"?`
      )
    ) {
      try {
        await sysAdminApi.deleteCourse(course.id);
        onShowSnackbar?.('Course deactivated successfully', 'success');
        loadCourses();
      } catch (err) {
        logger.error('Error deactivating course:', err);
        onShowSnackbar?.('Failed to deactivate course', 'error');
      }
    }
  };

  const handleToggleActive = async course => {
    const action = course.isActive ? 'deactivate' : 'reactivate';
    if (
      window.confirm(
        `Are you sure you want to ${action} the course "${course.name}"?`
      )
    ) {
      try {
        await sysAdminApi.toggleCourseActive(course.id);
        onShowSnackbar?.(`Course ${action}d successfully`, 'success');
        loadCourses();
      } catch (err) {
        logger.error(`Error toggling course status:`, err);
        onShowSnackbar?.(`Failed to ${action} course`, 'error');
      }
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();

    if (!formData.name.trim()) {
      onShowSnackbar?.('Course name is required', 'error');
      return;
    }

    try {
      const submitData = {
        ...formData,
        durationHours: formData.durationHours
          ? parseInt(formData.durationHours)
          : null,
        durationMinutes: formData.durationMinutes
          ? parseInt(formData.durationMinutes)
          : null,
        validityPeriodMonths: formData.validityPeriodMonths
          ? parseInt(formData.validityPeriodMonths)
          : null,
      };

      if (editingCourse) {
        await sysAdminApi.updateCourse(editingCourse.id, submitData);
        onShowSnackbar?.('Course updated successfully', 'success');
      } else {
        await sysAdminApi.createCourse(submitData);
        onShowSnackbar?.('Course created successfully', 'success');
      }

      setShowDialog(false);
      loadCourses();
    } catch (err) {
      logger.error('Error saving course:', err);
      onShowSnackbar?.('Failed to save course', 'error');
    }
  };

  const handleChange = e => {
    const { name, value, checked, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const formatDate = dateString => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDuration = (hours, minutes) => {
    if (!hours && !minutes) return 'Not specified';
    const parts = [];
    if (hours) parts.push(`${hours}h`);
    if (minutes) parts.push(`${minutes}m`);
    return parts.join(' ');
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 400,
        }}
      >
        <CircularProgress size={60} />
        <Typography variant='body1' sx={{ ml: 2 }}>
          Loading courses...
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
        }}
      >
        <Box>
          <Typography
            variant='h5'
            gutterBottom
            sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <SchoolIcon color='primary' />
            Course Management
          </Typography>
          <Typography variant='body1' color='text.secondary'>
            Define and manage course types, codes, and specifications
          </Typography>
        </Box>
        <Button
          variant='contained'
          startIcon={<AddIcon />}
          onClick={handleAddNew}
          sx={{ minWidth: 200 }}
        >
          Add New Course
        </Button>
      </Box>

      {error && (
        <Alert severity='error' sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Courses Table */}
      <TableContainer component={Paper} elevation={2}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Course Name</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Code</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Category</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Duration</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>
                Certification Type
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Validity Period</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Created</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {courses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align='center'>
                  <Typography
                    variant='body1'
                    color='text.secondary'
                    sx={{ py: 4 }}
                  >
                    No courses found. Click "Add New Course" to get started.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              courses.map((course, index) => (
                <TableRow
                  key={course.id}
                  hover
                  sx={{
                    backgroundColor: index % 2 !== 0 ? '#f9f9f9' : 'inherit',
                  }}
                >
                  <TableCell>
                    <Typography variant='body2' fontWeight='medium'>
                      {course.name}
                    </Typography>
                    {course.description && (
                      <Typography
                        variant='caption'
                        color='text.secondary'
                        display='block'
                      >
                        {course.description}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={course.courseCode || 'N/A'}
                      size='small'
                      color='primary'
                      variant='outlined'
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant='body2'>
                      {course.courseCategory || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant='body2'>
                      {formatDuration(
                        course.durationHours,
                        course.durationMinutes
                      )}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant='body2'>
                      {course.certificationType || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant='body2'>
                      {course.validityPeriodMonths
                        ? `${course.validityPeriodMonths} months`
                        : '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={course.isActive ? 'Active' : 'Inactive'}
                      color={course.isActive ? 'success' : 'default'}
                      size='small'
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant='body2'>
                      {formatDate(course.createdAt)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Tooltip title='Edit Course'>
                        <IconButton
                          onClick={() => handleEdit(course)}
                          color='primary'
                          size='small'
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      {course.isActive ? (
                        <Tooltip title='Deactivate Course'>
                          <IconButton
                            onClick={() => handleToggleActive(course)}
                            color='error'
                            size='small'
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      ) : (
                        <Tooltip title='Reactivate Course'>
                          <IconButton
                            onClick={() => handleToggleActive(course)}
                            color='success'
                            size='small'
                          >
                            <RestoreIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit Course Dialog */}
      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>
          {editingCourse ? 'Edit Course' : 'Add New Course'}
        </DialogTitle>
        <DialogContent>
          <Box component='form' onSubmit={handleSubmit} sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  label='Course Name'
                  name='name'
                  value={formData.name}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Course Category</InputLabel>
                  <Select
                    name='courseCategory'
                    value={formData.courseCategory}
                    label='Course Category'
                    onChange={handleChange}
                  >
                    {courseCategories.map(category => (
                      <MenuItem key={category} value={category}>
                        {category}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label='Description'
                  name='description'
                  value={formData.description}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField
                  fullWidth
                  type='number'
                  label='Duration (Hours)'
                  name='durationHours'
                  value={formData.durationHours}
                  onChange={handleChange}
                  inputProps={{ min: 0 }}
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField
                  fullWidth
                  type='number'
                  label='Duration (Minutes)'
                  name='durationMinutes'
                  value={formData.durationMinutes}
                  onChange={handleChange}
                  inputProps={{ min: 0, max: 59 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Certification Type</InputLabel>
                  <Select
                    name='certificationType'
                    value={formData.certificationType}
                    label='Certification Type'
                    onChange={handleChange}
                  >
                    {certificationTypes.map(type => (
                      <MenuItem key={type} value={type}>
                        {type}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type='number'
                  label='Validity Period (Months)'
                  name='validityPeriodMonths'
                  value={formData.validityPeriodMonths}
                  onChange={handleChange}
                  inputProps={{ min: 1 }}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.isActive}
                      onChange={handleChange}
                      name='isActive'
                      color='primary'
                    />
                  }
                  label='Active Course'
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setShowDialog(false)}
            startIcon={<CancelIcon />}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant='contained'
            startIcon={<SaveIcon />}
          >
            {editingCourse ? 'Update Course' : 'Create Course'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CourseManagement;
