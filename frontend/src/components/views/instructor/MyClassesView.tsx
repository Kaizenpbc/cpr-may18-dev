import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Typography,
  Tooltip,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  useTheme,
} from '@mui/material';
import {
  EventAvailable as AvailableIcon,
  Delete as DeleteIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
  UnfoldMore as UnfoldMoreIcon,
} from '@mui/icons-material';
import { CombinedScheduleItem } from '../../../types/instructor';
import { formatDisplayDate } from '../../../utils/dateUtils';
import { handleError } from '../../../services/errorHandler';

interface MyClassesViewProps {
  combinedSchedule?: CombinedScheduleItem[];
  onCompleteClass: (item: CombinedScheduleItem) => void;
  onRemoveAvailability?: (date: string) => Promise<{ success: boolean; error?: string }>;
}

type SortField = 'date' | 'status' | null;
type SortDirection = 'asc' | 'desc';

const MyClassesView: React.FC<MyClassesViewProps> = ({
  combinedSchedule = [],
  onCompleteClass,
  onRemoveAvailability,
}) => {
  console.log('🔍 [TRACE] MyClassesView rendered with combinedSchedule:', JSON.stringify(combinedSchedule, null, 2));
  
  // Log each class item's studentsregistered value
  combinedSchedule.forEach((item, index) => {
    if (item.type === 'class') {
      console.log(`🔍 [TRACE] Class ${index}:`, {
        course_id: item.courseId,
        studentsregistered: item.studentsregistered,
        displayDate: item.displayDate,
        organizationname: item.organizationname
      });
    }
  });

  // Sorting state
  const [sortField, setSortField] = React.useState<SortField>(null);
  const [sortDirection, setSortDirection] = React.useState<SortDirection>('asc');

  const [deleteDialog, setDeleteDialog] = React.useState<{
    open: boolean;
    date: string;
  }>({
    open: false,
    date: '',
  });

  // Handle sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field with ascending direction
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Get sort icon for a column
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <UnfoldMoreIcon fontSize="small" />;
    }
    return sortDirection === 'asc' ? <ArrowUpIcon fontSize="small" /> : <ArrowDownIcon fontSize="small" />;
  };

  // Sort the data
  const sortedSchedule = React.useMemo(() => {
    if (!sortField) return combinedSchedule;

    return [...combinedSchedule].sort((a, b) => {
      let aValue: Date | string;
      let bValue: Date | string;

      if (sortField === 'date') {
        aValue = new Date(a.displayDate);
        bValue = new Date(b.displayDate);
      } else if (sortField === 'status') {
        aValue = a.status?.toLowerCase() || '';
        bValue = b.status?.toLowerCase() || '';
      } else {
        return 0;
      }

      if (aValue < bValue) {
        return sortDirection === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [combinedSchedule, sortField, sortDirection]);

  const handleDeleteClick = (date: string) => {
    setDeleteDialog({
      open: true,
      date,
    });
  };

  const handleDeleteConfirm = async () => {
    if (onRemoveAvailability) {
      try {
        await onRemoveAvailability(deleteDialog.date);
      } catch (error) {
        handleError(error, { component: 'MyClassesView', action: 'remove availability' });
      }
    }
    setDeleteDialog({ open: false, date: '' });
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({ open: false, date: '' });
  };

  return (
    <>
      <TableContainer 
        component={Paper}
        sx={{
          borderRadius: 2,
          boxShadow: (theme) => theme.shadows[2],
          overflow: 'hidden',
        }}
      >
        <Typography 
          variant='h6' 
          sx={{ 
            p: 2,
            backgroundColor: 'background.paper',
            borderBottom: 1,
            borderColor: 'divider',
            fontWeight: 600,
          }}
        >
          My Schedule
        </Typography>
        <Table stickyHeader size='small'>
          <TableHead>
            <TableRow>
              <TableCell 
                sx={{ 
                  fontWeight: 'bold', 
                  backgroundColor: 'background.paper',
                  borderBottom: 2,
                  borderColor: 'divider',
                  color: 'text.primary',
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  },
                }}
                onClick={() => handleSort('date')}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  Date
                  {getSortIcon('date')}
                </Box>
              </TableCell>
              <TableCell 
                sx={{ 
                  fontWeight: 'bold', 
                  backgroundColor: 'background.paper',
                  borderBottom: 2,
                  borderColor: 'divider',
                  color: 'text.primary',
                }}
              >
                Organization
              </TableCell>
              <TableCell 
                sx={{ 
                  fontWeight: 'bold', 
                  backgroundColor: 'background.paper',
                  borderBottom: 2,
                  borderColor: 'divider',
                  color: 'text.primary',
                }}
              >
                Location
              </TableCell>
              <TableCell 
                sx={{ 
                  fontWeight: 'bold', 
                  backgroundColor: 'background.paper',
                  borderBottom: 2,
                  borderColor: 'divider',
                  color: 'text.primary',
                }}
              >
                Course No
              </TableCell>
              <TableCell 
                sx={{ 
                  fontWeight: 'bold', 
                  backgroundColor: 'background.paper',
                  borderBottom: 2,
                  borderColor: 'divider',
                  color: 'text.primary',
                }}
              >
                Course Name
              </TableCell>
              <TableCell
                sx={{ 
                  fontWeight: 'bold', 
                  backgroundColor: 'background.paper',
                  borderBottom: 2,
                  borderColor: 'divider',
                  color: 'text.primary',
                }}
                align='center'
              >
                Students R
              </TableCell>
              <TableCell
                sx={{ 
                  fontWeight: 'bold', 
                  backgroundColor: 'background.paper',
                  borderBottom: 2,
                  borderColor: 'divider',
                  color: 'text.primary',
                }}
                align='center'
              >
                Students A
              </TableCell>
              <TableCell 
                sx={{ 
                  fontWeight: 'bold', 
                  backgroundColor: 'background.paper',
                  borderBottom: 2,
                  borderColor: 'divider',
                  color: 'text.primary',
                }}
              >
                Notes
              </TableCell>
              <TableCell 
                sx={{ 
                  fontWeight: 'bold', 
                  backgroundColor: 'background.paper',
                  borderBottom: 2,
                  borderColor: 'divider',
                  color: 'text.primary',
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  },
                }}
                onClick={() => handleSort('status')}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  Status
                  {getSortIcon('status')}
                </Box>
              </TableCell>
              <TableCell
                sx={{ 
                  fontWeight: 'bold', 
                  backgroundColor: 'background.paper',
                  borderBottom: 2,
                  borderColor: 'divider',
                  color: 'text.primary',
                }}
                align='center'
              >
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedSchedule.length === 0 ? (
              <TableRow>
                <TableCell 
                  colSpan={10} 
                  align='center'
                  sx={{ 
                    py: 4,
                    color: 'text.secondary',
                    fontStyle: 'italic',
                  }}
                >
                  No schedule items found.
                </TableCell>
              </TableRow>
            ) : (
              sortedSchedule.map((item, index) => {
                console.log(`🔍 [TRACE] Rendering item ${index}:`, {
                  type: item.type,
                  course_id: item.courseId,
                  studentsregistered: item.studentsregistered,
                  displayDate: item.displayDate
                });
                
                return (
                  <TableRow key={`${item.type}-${item.courseId || item.originalData?.id || index}`} hover>
                    <TableCell>{item.displayDate}</TableCell>
                    <TableCell>{item.type === 'class' ? item.organizationname : ''}</TableCell>
                    <TableCell>{item.type === 'class' ? item.location : ''}</TableCell>
                    <TableCell>{item.type === 'class' ? item.coursenumber : ''}</TableCell>
                    <TableCell>{item.type === 'class' ? item.coursetypename : ''}</TableCell>
                    <TableCell align='center'>
                      {item.type === 'class' ? (
                        (() => {
                          console.log(`🔍 [TRACE] Displaying studentsregistered for course ${item.courseId}:`, item.studentsregistered);
                          return item.studentsregistered;
                        })()
                      ) : ''}
                    </TableCell>
                    <TableCell align='center'>{item.type === 'class' ? item.studentsattendance : ''}</TableCell>
                    <TableCell>{item.type === 'class' ? item.notes : ''}</TableCell>
                    <TableCell>
                      {item.type === 'class' ? (
                        <Chip 
                          label={item.status} 
                          color={item.status === 'completed' ? 'success' : 'primary'}
                          size="small"
                        />
                      ) : (
                        <Chip 
                          label="Available" 
                          color="success"
                          icon={<AvailableIcon />}
                          size="small"
                        />
                      )}
                    </TableCell>
                    <TableCell align='center'>
                      {item.type === 'availability' && onRemoveAvailability && (
                        <Tooltip title='Remove Availability'>
                          <IconButton 
                            onClick={() => handleDeleteClick(item.displayDate)}
                            color='error'
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={deleteDialog.open}
        onClose={handleDeleteCancel}
      >
        <DialogTitle>Remove Availability</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to remove your availability for {formatDisplayDate(deleteDialog.date)}?
            {(() => {
              const today = new Date();
              const targetDate = new Date(deleteDialog.date);
              const diffTime = targetDate.getTime() - today.getTime();
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              
              if (diffDays < 11) {
                return ' This date is less than 11 days away and cannot be modified.';
              }
              return '';
            })()}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>Cancel</Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error"
            disabled={(() => {
              const today = new Date();
              const targetDate = new Date(deleteDialog.date);
              const diffTime = targetDate.getTime() - today.getTime();
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              return diffDays < 11;
            })()}
          >
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default MyClassesView;
