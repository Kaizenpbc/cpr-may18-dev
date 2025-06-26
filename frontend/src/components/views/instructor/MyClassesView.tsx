import React from 'react';
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
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  CheckCircle as CompleteIcon,
  EventAvailable as AvailableIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { CombinedScheduleItem } from '../../../types/instructor';
import { formatDisplayDate } from '../../../utils/dateUtils';

interface MyClassesViewProps {
  combinedSchedule?: CombinedScheduleItem[];
  onCompleteClass: (item: CombinedScheduleItem) => void;
  onRemoveAvailability?: (date: string) => Promise<{ success: boolean; error?: string }>;
}

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
        course_id: item.course_id,
        studentsregistered: item.studentsregistered,
        displayDate: item.displayDate,
        organizationname: item.organizationname
      });
    }
  });

  const [deleteDialog, setDeleteDialog] = React.useState<{
    open: boolean;
    date: string;
  }>({
    open: false,
    date: '',
  });

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
        console.error('Error removing availability:', error);
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
                }}
              >
                Date
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
                }}
              >
                Status
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
            {combinedSchedule.length === 0 ? (
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
              combinedSchedule.map((item, index) => {
                console.log(`🔍 [TRACE] Rendering item ${index}:`, {
                  type: item.type,
                  course_id: item.course_id,
                  studentsregistered: item.studentsregistered,
                  displayDate: item.displayDate
                });
                
                return (
                  <TableRow key={`${item.type}-${item.course_id || item.originalData?.id || index}`} hover>
                    <TableCell>{formatDisplayDate(item.displayDate)}</TableCell>
                    <TableCell>{item.type === 'class' ? item.organizationname : ''}</TableCell>
                    <TableCell>{item.type === 'class' ? item.location : ''}</TableCell>
                    <TableCell>{item.type === 'class' ? item.coursenumber : ''}</TableCell>
                    <TableCell>{item.type === 'class' ? item.coursetypename : ''}</TableCell>
                    <TableCell align='center'>
                      {item.type === 'class' ? (
                        (() => {
                          console.log(`🔍 [TRACE] Displaying studentsregistered for course ${item.course_id}:`, item.studentsregistered);
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
                          color={item.status === 'Completed' ? 'success' : 'primary'}
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
                      {item.type === 'class' && item.status !== 'Completed' && (
                        <Tooltip title='Mark as Complete'>
                          <IconButton onClick={() => onCompleteClass(item)}>
                            <CompleteIcon color='success' />
                          </IconButton>
                        </Tooltip>
                      )}
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
