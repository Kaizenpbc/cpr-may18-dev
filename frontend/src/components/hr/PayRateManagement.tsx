import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Card,
  CardContent,
  CardActions,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip as MuiChip,
  TablePagination
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  History as HistoryIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Group as GroupIcon
} from '@mui/icons-material';
import { payRateService, 
  PayRateTier, 
  InstructorPayRateList, 
  InstructorPayRateDetail,
  PayRateTierForm,
  InstructorPayRateForm,
  BulkPayRateUpdate 
} from '../../services/payRateService';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`pay-rate-tabpanel-${index}`}
      aria-labelledby={`pay-rate-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const PayRateManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tiers state
  const [tiers, setTiers] = useState<PayRateTier[]>([]);
  const [tierDialogOpen, setTierDialogOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<PayRateTier | null>(null);
  const [tierForm, setTierForm] = useState<PayRateTierForm>({
    name: '',
    description: '',
    base_hourly_rate: 0,
    course_bonus: 50
  });

  // Instructors state
  const [instructors, setInstructors] = useState<InstructorPayRateList[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [hasRateFilter, setHasRateFilter] = useState<'true' | 'false' | ''>('');

  // Rate dialog state
  const [rateDialogOpen, setRateDialogOpen] = useState(false);
  const [selectedInstructor, setSelectedInstructor] = useState<InstructorPayRateList | null>(null);
  const [rateForm, setRateForm] = useState<InstructorPayRateForm>({
    hourly_rate: 0,
    course_bonus: 50,
    effective_date: new Date().toISOString().split('T')[0],
    notes: '',
    change_reason: ''
  });

  // Bulk update state
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [selectedInstructors, setSelectedInstructors] = useState<number[]>([]);
  const [bulkForm, setBulkForm] = useState<BulkPayRateUpdate>({
    instructor_ids: [],
    hourly_rate: 0,
    course_bonus: 50,
    effective_date: new Date().toISOString().split('T')[0],
    notes: '',
    change_reason: ''
  });

  // History dialog state
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [instructorDetail, setInstructorDetail] = useState<InstructorPayRateDetail | null>(null);

  useEffect(() => {
    loadTiers();
    loadInstructors();
  }, []);

  useEffect(() => {
    loadInstructors();
  }, [pagination.page, searchTerm, hasRateFilter]);

  const loadTiers = async () => {
    try {
      setLoading(true);
      const data = await payRateService.getTiers();
      setTiers(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load pay rate tiers');
    } finally {
      setLoading(false);
    }
  };

  const loadInstructors = async () => {
    try {
      setLoading(true);
      const data = await payRateService.getInstructors({
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm,
        has_rate: hasRateFilter
      });
      setInstructors(data.instructors);
      setPagination(data.pagination);
    } catch (err: any) {
      setError(err.message || 'Failed to load instructors');
    } finally {
      setLoading(false);
    }
  };

  const handleTierSubmit = async () => {
    try {
      setLoading(true);
      if (editingTier) {
        await payRateService.updateTier(editingTier.id, tierForm);
      } else {
        await payRateService.createTier(tierForm);
      }
      setTierDialogOpen(false);
      setEditingTier(null);
      setTierForm({ name: '', description: '', base_hourly_rate: 0, course_bonus: 50 });
      loadTiers();
    } catch (err: any) {
      setError(err.message || 'Failed to save tier');
    } finally {
      setLoading(false);
    }
  };

  const handleRateSubmit = async () => {
    if (!selectedInstructor) return;
    
    try {
      setLoading(true);
      await payRateService.setInstructorRate(selectedInstructor.id, rateForm);
      setRateDialogOpen(false);
      setSelectedInstructor(null);
      setRateForm({ hourly_rate: 0, course_bonus: 50, effective_date: new Date().toISOString().split('T')[0], notes: '', change_reason: '' });
      loadInstructors();
    } catch (err: any) {
      setError(err.message || 'Failed to set instructor rate');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkSubmit = async () => {
    try {
      setLoading(true);
      await payRateService.bulkUpdateRates(bulkForm);
      setBulkDialogOpen(false);
      setSelectedInstructors([]);
      setBulkForm({ instructor_ids: [], hourly_rate: 0, course_bonus: 50, effective_date: new Date().toISOString().split('T')[0], notes: '', change_reason: '' });
      loadInstructors();
    } catch (err: any) {
      setError(err.message || 'Failed to update rates');
    } finally {
      setLoading(false);
    }
  };

  const openRateDialog = (instructor: InstructorPayRateList) => {
    setSelectedInstructor(instructor);
    setRateForm({
      hourly_rate: instructor.hourly_rate || 25,
      course_bonus: instructor.course_bonus || 50,
      effective_date: new Date().toISOString().split('T')[0],
      notes: '',
      change_reason: ''
    });
    setRateDialogOpen(true);
  };

  const openHistoryDialog = async (instructor: InstructorPayRateList) => {
    try {
      setLoading(true);
      const detail = await payRateService.getInstructorDetail(instructor.id);
      setInstructorDetail(detail);
      setHistoryDialogOpen(true);
    } catch (err: any) {
      setError(err.message || 'Failed to load instructor history');
    } finally {
      setLoading(false);
    }
  };

  const openTierDialog = (tier?: PayRateTier) => {
    if (tier) {
      setEditingTier(tier);
      setTierForm({
        name: tier.name,
        description: tier.description || '',
        base_hourly_rate: tier.base_hourly_rate,
        course_bonus: tier.course_bonus
      });
    } else {
      setEditingTier(null);
      setTierForm({ name: '', description: '', base_hourly_rate: 0, course_bonus: 50 });
    }
    setTierDialogOpen(true);
  };

  const handleInstructorSelection = (instructorId: number, checked: boolean) => {
    if (checked) {
      setSelectedInstructors([...selectedInstructors, instructorId]);
    } else {
      setSelectedInstructors(selectedInstructors.filter(id => id !== instructorId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedInstructors(instructors.map(i => i.id));
    } else {
      setSelectedInstructors([]);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Set': return 'success';
      case 'Not Set': return 'warning';
      default: return 'default';
    }
  };

  if (loading && instructors.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Instructor Pay Rate Management
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper sx={{ width: '100%' }}>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          <Tab label="Instructors" />
          <Tab label="Pay Rate Tiers" />
          <Tab label="Bulk Operations" />
        </Tabs>

        <TabPanel value={activeTab} index={0}>
          <Box sx={{ mb: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Search Instructors"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name or email..."
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Rate Status</InputLabel>
                  <Select
                    value={hasRateFilter}
                    onChange={(e) => setHasRateFilter(e.target.value as 'true' | 'false' | '')}
                    label="Rate Status"
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="true">Has Rate</MenuItem>
                    <MenuItem value="false">No Rate</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2}>
                <Button
                  variant="contained"
                  startIcon={<GroupIcon />}
                  onClick={() => setBulkDialogOpen(true)}
                  disabled={selectedInstructors.length === 0}
                >
                  Bulk Update ({selectedInstructors.length})
                </Button>
              </Grid>
            </Grid>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedInstructors.length === instructors.length && instructors.length > 0}
                      indeterminate={selectedInstructors.length > 0 && selectedInstructors.length < instructors.length}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                  </TableCell>
                  <TableCell>Instructor</TableCell>
                  <TableCell>Contact</TableCell>
                  <TableCell>Current Rate</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {instructors.map((instructor) => (
                  <TableRow key={instructor.id}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedInstructors.includes(instructor.id)}
                        onChange={(e) => handleInstructorSelection(instructor.id, e.target.checked)}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="subtitle2">{instructor.username}</Typography>
                      <Typography variant="body2" color="textSecondary">{instructor.email}</Typography>
                    </TableCell>
                    <TableCell>{instructor.phone || 'N/A'}</TableCell>
                    <TableCell>
                      {instructor.hourly_rate ? (
                        <Box>
                          <Typography variant="body2">
                            ${instructor.hourly_rate}/hour
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            +${instructor.course_bonus} per course
                          </Typography>
                          {instructor.tier_name && (
                            <Chip size="small" label={instructor.tier_name} sx={{ ml: 1 }} />
                          )}
                        </Box>
                      ) : (
                        <Typography variant="body2" color="textSecondary">No rate set</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={instructor.rate_status} 
                        color={getStatusColor(instructor.rate_status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Set/Edit Rate">
                        <IconButton onClick={() => openRateDialog(instructor)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="View History">
                        <IconButton onClick={() => openHistoryDialog(instructor)}>
                          <HistoryIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={pagination.total}
            page={pagination.page - 1}
            onPageChange={(_, newPage) => setPagination({ ...pagination, page: newPage + 1 })}
            rowsPerPage={pagination.limit}
            onRowsPerPageChange={(e) => setPagination({ ...pagination, limit: parseInt(e.target.value), page: 1 })}
          />
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <Box sx={{ mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => openTierDialog()}
            >
              Add New Tier
            </Button>
          </Box>

          <Grid container spacing={2}>
            {tiers.map((tier) => (
              <Grid item xs={12} md={6} lg={4} key={tier.id}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {tier.name}
                    </Typography>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      {tier.description}
                    </Typography>
                    <Typography variant="h5" color="primary">
                      ${tier.base_hourly_rate}/hour
                    </Typography>
                    <Typography variant="body2">
                      +${tier.course_bonus} per course
                    </Typography>
                    <Chip 
                      label={tier.is_active ? 'Active' : 'Inactive'} 
                      color={tier.is_active ? 'success' : 'default'}
                      size="small"
                      sx={{ mt: 1 }}
                    />
                  </CardContent>
                  <CardActions>
                    <Button size="small" onClick={() => openTierDialog(tier)}>
                      Edit
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          <Typography variant="h6" gutterBottom>
            Bulk Pay Rate Operations
          </Typography>
          <Typography variant="body2" color="textSecondary" paragraph>
            Select multiple instructors and update their pay rates simultaneously.
          </Typography>
          
          <Button
            variant="contained"
            startIcon={<GroupIcon />}
            onClick={() => setBulkDialogOpen(true)}
            disabled={selectedInstructors.length === 0}
          >
            Update {selectedInstructors.length} Selected Instructors
          </Button>
        </TabPanel>
      </Paper>

      {/* Tier Dialog */}
      <Dialog open={tierDialogOpen} onClose={() => setTierDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingTier ? 'Edit Pay Rate Tier' : 'Create New Pay Rate Tier'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Tier Name"
                value={tierForm.name}
                onChange={(e) => setTierForm({ ...tierForm, name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                value={tierForm.description}
                onChange={(e) => setTierForm({ ...tierForm, description: e.target.value })}
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Base Hourly Rate ($)"
                type="number"
                value={tierForm.base_hourly_rate}
                onChange={(e) => setTierForm({ ...tierForm, base_hourly_rate: parseFloat(e.target.value) || 0 })}
                inputProps={{ min: 0, step: 0.01 }}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Course Bonus ($)"
                type="number"
                value={tierForm.course_bonus}
                onChange={(e) => setTierForm({ ...tierForm, course_bonus: parseFloat(e.target.value) || 0 })}
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTierDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleTierSubmit} variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={20} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rate Dialog */}
      <Dialog open={rateDialogOpen} onClose={() => setRateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Set Pay Rate for {selectedInstructor?.username}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Hourly Rate ($)"
                type="number"
                value={rateForm.hourly_rate}
                onChange={(e) => setRateForm({ ...rateForm, hourly_rate: parseFloat(e.target.value) || 0 })}
                inputProps={{ min: 0, step: 0.01 }}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Course Bonus ($)"
                type="number"
                value={rateForm.course_bonus}
                onChange={(e) => setRateForm({ ...rateForm, course_bonus: parseFloat(e.target.value) || 0 })}
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Pay Rate Tier</InputLabel>
                <Select
                  value={rateForm.tier_id || ''}
                  onChange={(e) => setRateForm({ ...rateForm, tier_id: e.target.value ? Number(e.target.value) : undefined })}
                  label="Pay Rate Tier"
                >
                  <MenuItem value="">No Tier</MenuItem>
                  {tiers.map((tier) => (
                    <MenuItem key={tier.id} value={tier.id}>
                      {tier.name} (${tier.base_hourly_rate}/hour)
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Effective Date"
                type="date"
                value={rateForm.effective_date}
                onChange={(e) => setRateForm({ ...rateForm, effective_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Change Reason"
                value={rateForm.change_reason}
                onChange={(e) => setRateForm({ ...rateForm, change_reason: e.target.value })}
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                value={rateForm.notes}
                onChange={(e) => setRateForm({ ...rateForm, notes: e.target.value })}
                multiline
                rows={2}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleRateSubmit} variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={20} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Update Dialog */}
      <Dialog open={bulkDialogOpen} onClose={() => setBulkDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Bulk Update Pay Rates ({selectedInstructors.length} instructors)
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Hourly Rate ($)"
                type="number"
                value={bulkForm.hourly_rate}
                onChange={(e) => setBulkForm({ ...bulkForm, hourly_rate: parseFloat(e.target.value) || 0 })}
                inputProps={{ min: 0, step: 0.01 }}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Course Bonus ($)"
                type="number"
                value={bulkForm.course_bonus}
                onChange={(e) => setBulkForm({ ...bulkForm, course_bonus: parseFloat(e.target.value) || 0 })}
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Pay Rate Tier</InputLabel>
                <Select
                  value={bulkForm.tier_id || ''}
                  onChange={(e) => setBulkForm({ ...bulkForm, tier_id: e.target.value ? Number(e.target.value) : undefined })}
                  label="Pay Rate Tier"
                >
                  <MenuItem value="">No Tier</MenuItem>
                  {tiers.map((tier) => (
                    <MenuItem key={tier.id} value={tier.id}>
                      {tier.name} (${tier.base_hourly_rate}/hour)
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Effective Date"
                type="date"
                value={bulkForm.effective_date}
                onChange={(e) => setBulkForm({ ...bulkForm, effective_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Change Reason"
                value={bulkForm.change_reason}
                onChange={(e) => setBulkForm({ ...bulkForm, change_reason: e.target.value })}
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                value={bulkForm.notes}
                onChange={(e) => setBulkForm({ ...bulkForm, notes: e.target.value })}
                multiline
                rows={2}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleBulkSubmit} 
            variant="contained" 
            disabled={loading || selectedInstructors.length === 0}
          >
            {loading ? <CircularProgress size={20} /> : `Update ${selectedInstructors.length} Instructors`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyDialogOpen} onClose={() => setHistoryDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Pay Rate History - {instructorDetail?.instructor.username}
        </DialogTitle>
        <DialogContent>
          {instructorDetail && (
            <Box>
              <Card sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Current Rate</Typography>
                  {instructorDetail.currentRate ? (
                    <Box>
                      <Typography variant="h5" color="primary">
                        ${instructorDetail.currentRate.hourly_rate}/hour
                      </Typography>
                      <Typography variant="body2">
                        +${instructorDetail.currentRate.course_bonus} per course
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        Effective: {new Date(instructorDetail.currentRate.effective_date).toLocaleDateString()}
                      </Typography>
                    </Box>
                  ) : (
                    <Typography variant="body2" color="textSecondary">No current rate set</Typography>
                  )}
                </CardContent>
              </Card>

              <Typography variant="h6" gutterBottom>Rate History</Typography>
              <List>
                {instructorDetail.history.map((change) => (
                  <ListItem key={change.id} divider>
                    <ListItemText
                      primary={
                        <Box>
                          <Typography variant="subtitle2">
                            ${change.old_hourly_rate || 0} → ${change.new_hourly_rate}/hour
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            {new Date(change.effective_date).toLocaleDateString()}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="caption">
                            Course bonus: ${change.old_course_bonus || 0} → ${change.new_course_bonus}
                          </Typography>
                          {change.change_reason && (
                            <Typography variant="caption" display="block">
                              Reason: {change.change_reason}
                            </Typography>
                          )}
                          {change.changed_by_name && (
                            <Typography variant="caption" display="block">
                              Changed by: {change.changed_by_name}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <MuiChip 
                        label={change.old_tier_name || 'No Tier'} 
                        size="small" 
                        variant="outlined"
                        sx={{ mr: 1 }}
                      />
                      <MuiChip 
                        label={change.new_tier_name || 'No Tier'} 
                        size="small"
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PayRateManagement; 