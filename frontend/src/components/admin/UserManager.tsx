import React, { useState, useEffect, useCallback } from 'react';
import * as api from '../../services/api';
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
  Snackbar,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
// Import Add/Edit Dialog component
import UserDialog from './UserDialog';
// Phone formatting
import { formatPhoneNumber } from 'react-phone-number-input';
import logger from '../../utils/logger';

// Helper to safely format phone numbers (copied from OrganizationManager)
const formatPhone = phoneString => {
  if (!phoneString) return '-';
  return formatPhoneNumber(phoneString) || phoneString;
};

function UserManager() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // State for Add/Edit Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null); // null for Add, user object for Edit
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'success',
  }); // Add Snackbar state

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getUsers();
      setUsers(data || []);
    } catch (err) {
      logger.error('Error fetching users:', err);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleAddOpen = () => {
    setEditingUser(null); // Set to null for Add mode
    setDialogOpen(true);
  };

  const handleEditOpen = user => {
    setEditingUser(user); // Set the user data for Edit mode
    setDialogOpen(true);
  };

  const handleDelete = async userId => {
    const userToDelete = users.find(u => u.userId === userId);
    const confirmMessage = userToDelete
      ? `Are you sure you want to delete user: ${userToDelete.username} (ID: ${userId})?`
      : `Are you sure you want to delete user ID ${userId}?`;

    if (window.confirm(confirmMessage)) {
      try {
        await api.deleteUser(userId);
        setUsers(users.filter(user => user.userId !== userId));
        logger.info(`User ${userId} deleted successfully`);
        showSnackbar(`User ${userId} deleted successfully.`, 'success');
        fetchUsers(); // Refresh the list
      } catch (err) {
        logger.error(`Error deleting user ${userId}:`, err);
        setError('Failed to delete user');
        showSnackbar(`Failed to delete user: ${err.message}`, 'error');
      }
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingUser(null);
  };

  const handleDialogSave = () => {
    fetchUsers(); // Refresh list after save
    // Dialog will close itself via its own logic
  };

  // --- Define showSnackbar helper ---
  const showSnackbar = (message: string, severity: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  return (
    <Paper sx={{ p: 2, mt: 2 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
        }}
      >
        <Typography variant='h6'>Manage Users</Typography>
        <Button
          variant='contained'
          startIcon={<AddIcon />}
          onClick={handleAddOpen}
        >
          Add User
        </Button>
      </Box>

      {error && (
        <Alert severity='error' sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer>
          <Table stickyHeader size='small'>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>ID</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Username</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Role</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>First Name</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Last Name</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Phone</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Organization</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Location</TableCell>
                <TableCell align='center' sx={{ fontWeight: 'bold' }}>
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align='center'>
                    No users found.
                  </TableCell>
                </TableRow>
              ) : (
                users.map(user => (
                  <TableRow key={user.userId}>
                    <TableCell>{user.userId}</TableCell>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>{user.role}</TableCell>
                    <TableCell>{user.firstName}</TableCell>
                    <TableCell>{user.lastName}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.phone}</TableCell>
                    <TableCell>{user.organizationName || '-'}</TableCell>
                    <TableCell>{user.locationName || '-'}</TableCell>
                    <TableCell>
                      <IconButton
                        size='small'
                        onClick={() => handleEditOpen(user)}
                        title='Edit'
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size='small'
                        onClick={() => handleDelete(user.userId)}
                        title='Delete'
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Snackbar for feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant='filled'
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Add/Edit Dialog */}
      <UserDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        onSave={handleDialogSave}
        user={editingUser}
        existingUsers={users}
      />
    </Paper>
  );
}

export default UserManager;
