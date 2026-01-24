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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Badge,
  Tooltip,
} from '@mui/material';
import {
  People as PeopleIcon,
  Business as BusinessIcon,
  Assignment as AssignmentIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Visibility as ViewIcon,
  Refresh as RefreshIcon,
  AttachMoney as MoneyIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';
import { hrDashboardService, HRDashboardStats, ProfileChange, RecentChange as ServiceRecentChange } from '../../services/hrDashboardService';

interface HRDashboardProps {
  onViewChange?: (view: string) => void;
}

// Extended RecentChange for dashboard display (API returns additional fields)
interface RecentChange extends ServiceRecentChange {
  username?: string;
  fieldName?: string;
  status?: string;
}

type ChipColor = 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';

const HRDashboard: React.FC<HRDashboardProps> = ({ onViewChange }) => {
  const [stats, setStats] = useState<HRDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedChange, setSelectedChange] = useState<ProfileChange | null>(null);
  const [approvalDialog, setApprovalDialog] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [approvalComment, setApprovalComment] = useState('');
  const [processingApproval, setProcessingApproval] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const dashboardStats = await hrDashboardService.getDashboardStats();
      setStats(dashboardStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveChange = async () => {
    if (!selectedChange) return;

    try {
      setProcessingApproval(true);
      await hrDashboardService.approveChange(
        selectedChange.id,
        approvalAction,
        approvalComment
      );
      
      // Refresh data
      await loadDashboardData();
      
      // Close dialog
      setApprovalDialog(false);
      setSelectedChange(null);
      setApprovalComment('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process approval');
    } finally {
      setProcessingApproval(false);
    }
  };

  const openApprovalDialog = (change: ProfileChange, action: 'approve' | 'reject') => {
    setSelectedChange(change);
    setApprovalAction(action);
    setApprovalDialog(true);
  };

  const getStatusColor = (status: string): ChipColor => {
    switch (status) {
      case 'approved':
        return 'success';
      case 'rejected':
        return 'error';
      case 'pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getFieldDisplayName = (fieldName: string) => {
    const fieldMap: Record<string, string> = {
      email: 'Email Address',
      phone: 'Phone Number',
      username: 'Username',
      organization_id: 'Organization',
      role: 'Role',
    };
    return fieldMap[fieldName] || fieldName;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button onClick={loadDashboardData} startIcon={<RefreshIcon />}>
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" gutterBottom>
          HR Dashboard
        </Typography>
        <Button
          onClick={loadDashboardData}
          startIcon={<RefreshIcon />}
          variant="outlined"
        >
          Refresh
        </Button>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <AssignmentIcon color="warning" sx={{ mr: 2, fontSize: 40 }} />
                <Box>
                  <Typography variant="h4" component="div">
                    {stats?.pendingApprovals || 0}
                  </Typography>
                  <Typography color="text.secondary">
                    Pending Approvals
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <PeopleIcon color="primary" sx={{ mr: 2, fontSize: 40 }} />
                <Box>
                  <Typography variant="h4" component="div">
                    {stats?.activeInstructors || 0}
                  </Typography>
                  <Typography color="text.secondary">
                    Active Instructors
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <BusinessIcon color="primary" sx={{ mr: 2, fontSize: 40 }} />
                <Box>
                  <Typography variant="h4" component="div">
                    {stats?.organizations || 0}
                  </Typography>
                  <Typography color="text.secondary">
                    Organizations
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <WarningIcon color="error" sx={{ mr: 2, fontSize: 40 }} />
                <Box>
                  <Typography variant="h4" component="div">
                    {stats?.expiringCertifications || 0}
                  </Typography>
                  <Typography color="text.secondary">
                    Expiring Certifications
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Quick Actions
            </Typography>
            <Box display="flex" gap={2} flexWrap="wrap">
              <Button
                variant="contained"
                onClick={() => onViewChange?.('personnel')}
                startIcon={<PeopleIcon />}
              >
                Manage Personnel
              </Button>
              <Button
                variant="outlined"
                onClick={() => onViewChange?.('payrates')}
                startIcon={<MoneyIcon />}
              >
                Pay Rate Management
              </Button>
              <Button
                variant="outlined"
                onClick={() => onViewChange?.('timesheet')}
                startIcon={<AssignmentIcon />}
              >
                Timesheet Management
              </Button>
              <Button
                variant="outlined"
                onClick={() => onViewChange?.('reports')}
                startIcon={<AssessmentIcon />}
              >
                HR Reports
              </Button>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Recent Activity
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {stats?.recentChanges?.length || 0} recent profile changes
            </Typography>
            {stats?.recentChanges?.slice(0, 3).map((change) => {
              const extChange = change as RecentChange;
              return (
                <Box key={change.id} sx={{ mt: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="body2">
                    <strong>{extChange.username || `User ${change.userId}`}</strong> - {getFieldDisplayName(extChange.fieldName || change.changeType)} change
                  </Typography>
                  <Chip
                    label={extChange.status || 'pending'}
                    size="small"
                    color={getStatusColor(extChange.status || 'pending')}
                    sx={{ mt: 0.5 }}
                  />
                </Box>
              );
            })}
          </Paper>
        </Grid>
      </Grid>

      {/* Pending Approvals Table */}
      <Paper sx={{ mb: 3 }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6">
            Pending Approvals
            <Badge badgeContent={stats?.pendingApprovalsList?.length || 0} color="warning" sx={{ ml: 1 }}>
              <AssignmentIcon />
            </Badge>
          </Typography>
        </Box>
        
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>User</TableCell>
                <TableCell>Change Type</TableCell>
                <TableCell>Field</TableCell>
                <TableCell>New Value</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {stats?.pendingApprovalsList?.map((approval) => {
                const change = approval as unknown as ProfileChange;
                return (
                <TableRow key={change.id}>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        {change.username}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {change.email}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={change.changeType}
                      size="small"
                      color="primary"
                    />
                  </TableCell>
                  <TableCell>
                    {getFieldDisplayName(change.fieldName)}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                      {change.newValue}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={change.status}
                      size="small"
                      color={getStatusColor(change.status)}
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(change.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Box display="flex" gap={1}>
                      <Tooltip title="View Details">
                        <IconButton
                          size="small"
                          onClick={() => setSelectedChange(change)}
                        >
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Approve">
                        <IconButton
                          size="small"
                          color="success"
                          onClick={() => openApprovalDialog(change, 'approve')}
                        >
                          <CheckCircleIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Reject">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => openApprovalDialog(change, 'reject')}
                        >
                          <CancelIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Approval Dialog */}
      <Dialog open={approvalDialog} onClose={() => setApprovalDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {approvalAction === 'approve' ? 'Approve' : 'Reject'} Profile Change
        </DialogTitle>
        <DialogContent>
          {selectedChange && (
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                User: {selectedChange.username} ({selectedChange.email})
              </Typography>
              <Typography variant="body2" gutterBottom>
                Change: {getFieldDisplayName(selectedChange.fieldName)} → {selectedChange.newValue}
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Comment (optional)"
                value={approvalComment}
                onChange={(e) => setApprovalComment(e.target.value)}
                sx={{ mt: 2 }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApprovalDialog(false)} disabled={processingApproval}>
            Cancel
          </Button>
          <Button
            onClick={handleApproveChange}
            variant="contained"
            color={approvalAction === 'approve' ? 'success' : 'error'}
            disabled={processingApproval}
          >
            {processingApproval ? (
              <CircularProgress size={20} />
            ) : (
              approvalAction === 'approve' ? 'Approve' : 'Reject'
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default HRDashboard; 