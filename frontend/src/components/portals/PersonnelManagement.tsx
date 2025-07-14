import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Button,
  TextField,
  InputAdornment,
  Pagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  Tooltip,
  Avatar,
  Divider,
} from '@mui/material';
import {
  Search as SearchIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { hrDashboardService, InstructorProfile, OrganizationProfile } from '../../services/hrDashboardService';

interface PersonnelManagementProps {
  onViewChange?: (view: string) => void;
}

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
      id={`personnel-tabpanel-${index}`}
      aria-labelledby={`personnel-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const PersonnelManagement: React.FC<PersonnelManagementProps> = ({ onViewChange }) => {
  const [tabValue, setTabValue] = useState(0);
  const [instructors, setInstructors] = useState<InstructorProfile[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination states
  const [instructorPagination, setInstructorPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });
  const [organizationPagination, setOrganizationPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });
  
  // Search states
  const [instructorSearch, setInstructorSearch] = useState('');
  const [organizationSearch, setOrganizationSearch] = useState('');
  
  // Selected user for details
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userDetailsDialog, setUserDetailsDialog] = useState(false);

  useEffect(() => {
    loadInstructors();
    loadOrganizations();
  }, []);

  useEffect(() => {
    loadInstructors();
  }, [instructorPagination.page, instructorSearch]);

  useEffect(() => {
    loadOrganizations();
  }, [organizationPagination.page, organizationSearch]);

  const loadInstructors = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await hrDashboardService.getInstructors(
        instructorPagination.page,
        instructorPagination.limit,
        instructorSearch
      );
      setInstructors(data.instructors);
      setInstructorPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load instructors');
    } finally {
      setLoading(false);
    }
  };

  const loadOrganizations = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await hrDashboardService.getOrganizations(
        organizationPagination.page,
        organizationPagination.limit,
        organizationSearch
      );
      setOrganizations(data.organizations);
      setOrganizationPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load organizations');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleInstructorPageChange = (event: React.ChangeEvent<unknown>, page: number) => {
    setInstructorPagination(prev => ({ ...prev, page }));
  };

  const handleOrganizationPageChange = (event: React.ChangeEvent<unknown>, page: number) => {
    setOrganizationPagination(prev => ({ ...prev, page }));
  };

  const handleSearchInstructors = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInstructorSearch(event.target.value);
    setInstructorPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleSearchOrganizations = (event: React.ChangeEvent<HTMLInputElement>) => {
    setOrganizationSearch(event.target.value);
    setOrganizationPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleViewUserDetails = async (userId: number) => {
    try {
      const userData = await hrDashboardService.getUserProfile(userId);
      setSelectedUser(userData);
      setUserDetailsDialog(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load user details');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'error';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" gutterBottom>
          Personnel Management
        </Typography>
        <Button
          onClick={() => {
            loadInstructors();
            loadOrganizations();
          }}
          startIcon={<RefreshIcon />}
          variant="outlined"
        >
          Refresh
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ width: '100%' }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="personnel management tabs">
          <Tab 
            icon={<PersonIcon />} 
            label="Instructors" 
            iconPosition="start"
          />
          <Tab 
            icon={<BusinessIcon />} 
            label="Organizations" 
            iconPosition="start"
          />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          {/* Instructors Tab */}
          <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">
                Instructor Profiles ({instructorPagination.total})
              </Typography>
              <TextField
                size="small"
                placeholder="Search instructors..."
                value={instructorSearch}
                onChange={handleSearchInstructors}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
                sx={{ width: 300 }}
              />
            </Box>

            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Instructor</TableCell>
                    <TableCell>Contact</TableCell>
                    <TableCell>Courses</TableCell>
                    <TableCell>Last Course</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <CircularProgress />
                      </TableCell>
                    </TableRow>
                  ) : (
                    instructors.map((instructor) => (
                      <TableRow key={instructor.id}>
                        <TableCell>
                          <Box display="flex" alignItems="center">
                            <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                              {instructor.username.charAt(0).toUpperCase()}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" fontWeight="bold">
                                {instructor.username}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                ID: {instructor.id}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2">
                              {instructor.email}
                            </Typography>
                            {instructor.phone && (
                              <Typography variant="caption" color="text.secondary">
                                {instructor.phone}
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2">
                              Total: {instructor.total_courses}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Completed: {instructor.completed_courses}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          {instructor.last_course_date ? (
                            formatDate(instructor.last_course_date)
                          ) : (
                            <Typography variant="caption" color="text.secondary">
                              No courses
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={instructor.active_courses > 0 ? 'Active' : 'Inactive'}
                            size="small"
                            color={instructor.active_courses > 0 ? 'success' : 'default'}
                          />
                        </TableCell>
                        <TableCell>
                          <Box display="flex" gap={1}>
                            <Tooltip title="View Details">
                              <IconButton
                                size="small"
                                onClick={() => handleViewUserDetails(instructor.id)}
                              >
                                <ViewIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Edit Profile">
                              <IconButton size="small">
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {instructorPagination.pages > 1 && (
              <Box display="flex" justifyContent="center" mt={2}>
                <Pagination
                  count={instructorPagination.pages}
                  page={instructorPagination.page}
                  onChange={handleInstructorPageChange}
                  color="primary"
                />
              </Box>
            )}
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {/* Organizations Tab */}
          <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">
                Organization Profiles ({organizationPagination.total})
              </Typography>
              <TextField
                size="small"
                placeholder="Search organizations..."
                value={organizationSearch}
                onChange={handleSearchOrganizations}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
                sx={{ width: 300 }}
              />
            </Box>

            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Organization</TableCell>
                    <TableCell>Contact</TableCell>
                    <TableCell>Courses</TableCell>
                    <TableCell>Users</TableCell>
                    <TableCell>Last Activity</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <CircularProgress />
                      </TableCell>
                    </TableRow>
                  ) : (
                    organizations.map((organization) => (
                      <TableRow key={organization.id}>
                        <TableCell>
                          <Box display="flex" alignItems="center">
                            <Avatar sx={{ mr: 2, bgcolor: 'secondary.main' }}>
                              {organization.name.charAt(0).toUpperCase()}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" fontWeight="bold">
                                {organization.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                ID: {organization.id}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2">
                              {organization.contact_email}
                            </Typography>
                            {organization.contact_phone && (
                              <Typography variant="caption" color="text.secondary">
                                {organization.contact_phone}
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2">
                              Total: {organization.total_courses}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Completed: {organization.completed_courses}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {organization.total_users}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {organization.last_course_date ? (
                            formatDate(organization.last_course_date)
                          ) : (
                            <Typography variant="caption" color="text.secondary">
                              No activity
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Box display="flex" gap={1}>
                            <Tooltip title="View Details">
                              <IconButton
                                size="small"
                                onClick={() => handleViewUserDetails(organization.id)}
                              >
                                <ViewIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Edit Profile">
                              <IconButton size="small">
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {organizationPagination.pages > 1 && (
              <Box display="flex" justifyContent="center" mt={2}>
                <Pagination
                  count={organizationPagination.pages}
                  page={organizationPagination.page}
                  onChange={handleOrganizationPageChange}
                  color="primary"
                />
              </Box>
            )}
          </Box>
        </TabPanel>
      </Paper>

      {/* User Details Dialog */}
      <Dialog open={userDetailsDialog} onClose={() => setUserDetailsDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          User Profile Details
        </DialogTitle>
        <DialogContent>
          {selectedUser && (
            <Box>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    Basic Information
                  </Typography>
                  <Box>
                    <Typography variant="body2">
                      <strong>Username:</strong> {selectedUser.user.username}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Email:</strong> {selectedUser.user.email}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Role:</strong> {selectedUser.user.role}
                    </Typography>
                    {selectedUser.user.phone && (
                      <Typography variant="body2">
                        <strong>Phone:</strong> {selectedUser.user.phone}
                      </Typography>
                    )}
                    <Typography variant="body2">
                      <strong>Created:</strong> {formatDate(selectedUser.user.created_at)}
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    Profile Changes History
                  </Typography>
                  <Box maxHeight={200} overflow="auto">
                    {selectedUser.profileChanges.length > 0 ? (
                      selectedUser.profileChanges.map((change: any) => (
                        <Box key={change.id} sx={{ mb: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                          <Typography variant="body2">
                            <strong>{change.field_name}:</strong> {change.new_value}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Status: {change.status} - {formatDate(change.created_at)}
                          </Typography>
                        </Box>
                      ))
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No profile changes found
                      </Typography>
                    )}
                  </Box>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUserDetailsDialog(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PersonnelManagement; 