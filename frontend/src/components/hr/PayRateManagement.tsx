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
    baseHourlyRate: 0,
    courseBonus: 50
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
    hourlyRate: 0,
    courseBonus: 50,
    effectiveDate: new Date().toISOString().split('T')[0],
    notes: '',
    changeReason: ''
  });

  // Bulk update state
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [selectedInstructors, setSelectedInstructors] = useState<number[]>([]);
  const [bulkForm, setBulkForm] = useState<BulkPayRateUpdate>({
    instructorIds: [],
    hourlyRate: 0,
    courseBonus: 50,
    effectiveDate: new Date().toISOString().split('T')[0],
    notes: '',
    changeReason: ''
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
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      setError(errObj.message || 'Failed to load pay rate tiers');
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
        ...(hasRateFilter && { has_rate: hasRateFilter as 'true' | 'false' })
      });
      setInstructors(data.instructors);
      setPagination(data.pagination);
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      setError(errObj.message || 'Failed to load instructors');
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
      setTierForm({ name: '', description: '', baseHourlyRate: 0, courseBonus: 50 });
      loadTiers();
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      setError(errObj.message || 'Failed to save tier');
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
      setRateForm({ hourlyRate: 0, courseBonus: 50, effectiveDate: new Date().toISOString().split('T')[0], notes: '', changeReason: '' });
      loadInstructors();
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      setError(errObj.message || 'Failed to set instructor rate');
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
      setBulkForm({ instructorIds: [], hourlyRate: 0, courseBonus: 50, effectiveDate: new Date().toISOString().split('T')[0], notes: '', changeReason: '' });
      loadInstructors();
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      setError(errObj.message || 'Failed to update rates');
    } finally {
      setLoading(false);
    }
  };

  const openRateDialog = (instructor: InstructorPayRateList) => {
    setSelectedInstructor(instructor);
    setRateForm({
      hourlyRate: instructor.hourlyRate || 25,
      courseBonus: instructor.courseBonus || 50,
      effectiveDate: new Date().toISOString().split('T')[0],
      notes: '',
      changeReason: ''
    });
    setRateDialogOpen(true);
  };

  const openHistoryDialog = async (instructor: InstructorPayRateList) => {
    try {
      setLoading(true);
      const detail = await payRateService.getInstructorDetail(instructor.id);
      setInstructorDetail(detail);
      setHistoryDialogOpen(true);
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      setError(errObj.message || 'Failed to load instructor history');
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
        baseHourlyRate: tier.baseHourlyRate,
        courseBonus: tier.courseBonus
      });
    } else {
      setEditingTier(null);
      setTierForm({ name: '', description: '', baseHourlyRate: 0, courseBonus: 50 });
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
                      {instructor.hourlyRate ? (
                        <Box>
                          <Typography variant="body2">
                            ${instructor.hourlyRate}/hour
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            +${instructor.courseBonus} per course
                          </Typography>
                          {instructor.tierName && (
                            <Chip size="small" label={instructor.tierName} sx={{ ml: 1 }} />
                          )}
                        </Box>
                      ) : (
                        <Typography variant="body2" color="textSecondary">No rate set</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={instructor.rateStatus} 
                        color={getStatusColor(instructor.rateStatus) as any}
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
                      ${tier.baseHourlyRate}/hour
                    </Typography>
                    <Typography variant="body2">
                      +${tier.courseBonus} per course
                    </Typography>
                    <Chip 
                      label={tier.isActive ? 'Active' : 'Inactive'} 
                      color={tier.isActive ? 'success' : 'default'}
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
                value={tierForm.baseHourlyRate}
                onChange={(e) => setTierForm({ ...tierForm, baseHourlyRate: parseFloat(e.target.value) || 0 })}
                inputProps={{ min: 0, step: 0.01 }}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Course Bonus ($)"
                type="number"
                value={tierForm.courseBonus}
                onChange={(e) => setTierForm({ ...tierForm, courseBonus: parseFloat(e.target.value) || 0 })}
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
                value={rateForm.hourlyRate}
                onChange={(e) => setRateForm({ ...rateForm, hourlyRate: parseFloat(e.target.value) || 0 })}
                inputProps={{ min: 0, step: 0.01 }}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Course Bonus ($)"
                type="number"
                value={rateForm.courseBonus}
                onChange={(e) => setRateForm({ ...rateForm, courseBonus: parseFloat(e.target.value) || 0 })}
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Pay Rate Tier</InputLabel>
                <Select
                  value={rateForm.tierId || ''}
                  onChange={(e) => setRateForm({ ...rateForm, tierId: e.target.value ? Number(e.target.value) : undefined })}
                  label="Pay Rate Tier"
                >
                  <MenuItem value="">No Tier</MenuItem>
                  {tiers.map((tier) => (
                    <MenuItem key={tier.id} value={tier.id}>
                      {tier.name} (${tier.baseHourlyRate}/hour)
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
                value={rateForm.effectiveDate}
                onChange={(e) => setRateForm({ ...rateForm, effectiveDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Change Reason"
                value={rateForm.changeReason}
                onChange={(e) => setRateForm({ ...rateForm, changeReason: e.target.value })}
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
                value={bulkForm.hourlyRate}
                onChange={(e) => setBulkForm({ ...bulkForm, hourlyRate: parseFloat(e.target.value) || 0 })}
                inputProps={{ min: 0, step: 0.01 }}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Course Bonus ($)"
                type="number"
                value={bulkForm.courseBonus}
                onChange={(e) => setBulkForm({ ...bulkForm, courseBonus: parseFloat(e.target.value) || 0 })}
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Pay Rate Tier</InputLabel>
                <Select
                  value={bulkForm.tierId || ''}
                  onChange={(e) => setBulkForm({ ...bulkForm, tierId: e.target.value ? Number(e.target.value) : undefined })}
                  label="Pay Rate Tier"
                >
                  <MenuItem value="">No Tier</MenuItem>
                  {tiers.map((tier) => (
                    <MenuItem key={tier.id} value={tier.id}>
                      {tier.name} (${tier.baseHourlyRate}/hour)
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
                value={bulkForm.effectiveDate}
                onChange={(e) => setBulkForm({ ...bulkForm, effectiveDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Change Reason"
                value={bulkForm.changeReason}
                onChange={(e) => setBulkForm({ ...bulkForm, changeReason: e.target.value })}
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
                        ${instructorDetail.currentRate.hourlyRate}/hour
                      </Typography>
                      <Typography variant="body2">
                        +${instructorDetail.currentRate.courseBonus} per course
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        Effective: {new Date(instructorDetail.currentRate.effectiveDate).toLocaleDateString()}
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
                            ${change.oldHourlyRate || 0} → ${change.newHourlyRate}/hour
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            {new Date(change.effectiveDate).toLocaleDateString()}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="caption">
                            Course bonus: ${change.oldCourseBonus || 0} → ${change.newCourseBonus}
                          </Typography>
                          {change.changeReason && (
                            <Typography variant="caption" display="block">
                              Reason: {change.changeReason}
                            </Typography>
                          )}
                          {change.changedByName && (
                            <Typography variant="caption" display="block">
                              Changed by: {change.changedByName}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <MuiChip 
                        label={change.oldTierName || 'No Tier'} 
                        size="small" 
                        variant="outlined"
                        sx={{ mr: 1 }}
                      />
                      <MuiChip 
                        label={change.newTierName || 'No Tier'} 
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