import React, { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Box,
  Typography,
  Tooltip,
  Chip, // For status visualization
  IconButton, // Added IconButton
  Collapse, // Added Collapse for expansion
  CircularProgress,
  Link, // Add Link import from MUI (optional, for styling)
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Divider,
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'; // Expand icon
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'; // Collapse icon
import api from '../../services/api'; // Import API service
import logger from '../../utils/logger';
// Add necessary icons
import VisibilityIcon from '@mui/icons-material/Visibility';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'; // Used for Billing Queue
import PaymentIcon from '@mui/icons-material/Payment'; // For Record Payment
import EmailIcon from '@mui/icons-material/Email'; // For Email Invoice
import PostAddIcon from '@mui/icons-material/PostAdd'; // For Post to Org
import { CheckCircle as PresentIcon, Cancel as AbsentIcon, People as PeopleIcon } from '@mui/icons-material';
// Import shared formatters
import { formatDate, getStatusChipColor, formatCurrency } from '../../utils/formatters'; // Correct path
import PaymentHistoryTable from '../common/PaymentHistoryTable';

// Helper function for approval status colors
const getApprovalStatusChipColor = status => {
  switch (status?.toLowerCase()) {
    case 'approved':
      return 'success';
    case 'pending':
    case 'pending approval':
    case 'pending_approval':
      return 'warning';
    case 'rejected':
      return 'error';
    case 'draft':
    case 'new':
      return 'info';
    default:
      return 'default';
  }
};

// Student Attendance Dialog Component
const StudentAttendanceDialog = ({ open, onClose, courseId, students, loadingStudents }) => {
  const presentCount = students.filter(s => s.attended).length;
  const absentCount = students.filter(s => s.attended === false).length;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PeopleIcon color="primary" />
          Student Attendance List
        </Box>
      </DialogTitle>
      <DialogContent>
        {loadingStudents ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : students.length > 0 ? (
          <>
            <TableContainer component={Paper} sx={{ mb: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Student Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell align="center">Attendance Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {students.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {student.first_name} {student.last_name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="textSecondary">
                          {student.email || 'No email'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          icon={student.attended ? <PresentIcon /> : <AbsentIcon />}
                          label={student.attended ? 'Present' : 'Absent'}
                          color={student.attended ? 'success' : 'error'}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            
            {/* Attendance Summary */}
            <Box sx={{ 
              p: 2, 
              bgcolor: 'grey.50', 
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'grey.300'
            }}>
              <Typography variant="body2" fontWeight="medium">
                <Box component="span" sx={{ color: 'success.main' }}>
                  Present: {presentCount}
                </Box>
                {' | '}
                <Box component="span" sx={{ color: 'error.main' }}>
                  Absent: {absentCount}
                </Box>
                {' | '}
                <Box component="span">
                  Total: {students.length}
                </Box>
              </Typography>
            </Box>
          </>
        ) : (
          <Box sx={{ 
            p: 2, 
            bgcolor: 'grey.50', 
            borderRadius: 1,
            textAlign: 'center'
          }}>
            <Typography variant="body2" color="textSecondary">
              No student attendance data available
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

// Payment Details Component
const PaymentDetails = ({ invoiceId }) => {
  const [payments, setPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    const loadPayments = async () => {
      setIsLoading(true);
      setError('');
      try {
        const response = await api.get(`/accounting/invoices/${invoiceId}/payments`);
        setPayments(response.data.data || []);
      } catch (err) {
        logger.error('[PaymentDetails] Failed to load payments:', err);
        setError(err.response?.data?.error?.message || 'Failed to load payments');
        setPayments([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (invoiceId) {
      loadPayments();
    }
  }, [invoiceId]);

  if (error)
    return (
      <Typography sx={{ m: 1, color: 'error.main' }}>
        Error loading payments: {error}
      </Typography>
    );
  if (!payments || payments.length === 0)
    return (
      <Typography sx={{ m: 1, fontStyle: 'italic' }}>
        No payments recorded for this invoice.
      </Typography>
    );

  // Use the reusable PaymentHistoryTable component
  return (
    <Box sx={{ margin: 1 }}>
      <Typography variant='subtitle2' gutterBottom component='div'>
        Payment History
      </Typography>
      <PaymentHistoryTable 
        payments={payments}
        isLoading={isLoading}
        showVerificationDetails={false}
      />
    </Box>
  );
};

const AccountsReceivableTable = ({
  invoices,
  onRecordPaymentClick,
  onViewDetailsClick,
}) => {
  const [expandedRowId, setExpandedRowId] = useState(null); // State to track expanded row
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentDialogOpen, setStudentDialogOpen] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState(null);

  const handleExpandClick = invoiceId => {
    setExpandedRowId(expandedRowId === invoiceId ? null : invoiceId); // Toggle expansion
  };

  const fetchStudents = async (courseId) => {
    setLoadingStudents(true);
    try {
      const response = await api.get(`/accounting/courses/${courseId}/students`);
      setStudents(response.data.data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
      setStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleViewStudents = (courseId) => {
    setSelectedCourseId(courseId);
    setStudentDialogOpen(true);
    fetchStudents(courseId);
  };

  const handleCloseStudentDialog = () => {
    setStudentDialogOpen(false);
    setSelectedCourseId(null);
    setStudents([]);
  };

  // Calculate invoice amounts
  const calculateInvoiceAmounts = (invoice) => {
    const studentsBilled = invoice.students_billed || 0;
    const ratePerStudent = invoice.rate_per_student;
    
    if (!ratePerStudent) {
      return {
        baseCost: 'N/A',
        taxAmount: 'N/A',
        totalAmount: 'N/A',
        balanceDue: 'N/A',
        error: 'Pricing not configured'
      };
    }
    
    const baseCost = studentsBilled * ratePerStudent;
    const taxAmount = baseCost * 0.13; // 13% HST
    const totalAmount = baseCost + taxAmount;
    
    return {
      baseCost: baseCost.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
      totalAmount: totalAmount.toFixed(2),
      balanceDue: (totalAmount - parseFloat(invoice.paidtodate || 0)).toFixed(2)
    };
  };

  if (!invoices || invoices.length === 0) {
    return <Typography sx={{ mt: 2 }}>No invoices found.</Typography>;
  }

  return (
    <>
      <TableContainer component={Paper} sx={{ mt: 2 }}>
        <Table stickyHeader aria-label='accounts receivable table'>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: '10px', fontWeight: 'bold' }} />
              {/* Empty cell for expand button */}
              <TableCell sx={{ fontWeight: 'bold' }}>Invoice #</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Invoice Date</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Due Date</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Organization</TableCell>
              <TableCell align='right' sx={{ fontWeight: 'bold' }}>
                Base Cost
              </TableCell>
              <TableCell align='right' sx={{ fontWeight: 'bold' }}>
                Tax (HST)
              </TableCell>
              <TableCell align='right' sx={{ fontWeight: 'bold' }}>
                Total
              </TableCell>
              <TableCell align='right' sx={{ fontWeight: 'bold' }}>
                Paid To Date
              </TableCell>
              <TableCell align='right' sx={{ fontWeight: 'bold' }}>
                Balance Due
              </TableCell>
              <TableCell align='center' sx={{ fontWeight: 'bold' }}>
                Payment Status
              </TableCell>
              <TableCell align='center' sx={{ fontWeight: 'bold' }}>
                Approval Status
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Aging</TableCell>
              <TableCell align='center' sx={{ fontWeight: 'bold' }}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {invoices.map((invoice, index) => {
              const amounts = calculateInvoiceAmounts(invoice);
              
              return (
                <React.Fragment key={invoice.invoiceid}>
                  <TableRow
                    hover
                    sx={{
                      '& > *': { borderBottom: 'unset' },
                      backgroundColor: index % 2 !== 0 ? '#f9f9f9' : 'inherit',
                    }}
                  >
                    <TableCell>
                      {/* Expand/Collapse Button */}
                      <IconButton
                        aria-label='expand row'
                        size='small'
                        onClick={() => handleExpandClick(invoice.invoiceid)}
                      >
                        {expandedRowId === invoice.invoiceid ? (
                          <KeyboardArrowUpIcon />
                        ) : (
                          <KeyboardArrowDownIcon />
                        )}
                      </IconButton>
                    </TableCell>
                    <TableCell>{invoice.invoicenumber}</TableCell>
                    <TableCell>{formatDate(invoice.invoicedate)}</TableCell>
                    <TableCell>{formatDate(invoice.duedate)}</TableCell>
                    <TableCell>
                      <Link
                        component={RouterLink}
                        to={`/accounting/organizations/${invoice.organizationid}`}
                        underline='hover'
                      >
                        {invoice.organizationname || '-'}
                      </Link>
                    </TableCell>
                    <TableCell align='right'>
                      {amounts.error ? (
                        <Typography variant="body2" color="error.main" fontSize="small">
                          {amounts.error}
                        </Typography>
                      ) : (
                        `$${amounts.baseCost}`
                      )}
                    </TableCell>
                    <TableCell align='right'>
                      {amounts.error ? (
                        <Typography variant="body2" color="error.main" fontSize="small">
                          {amounts.error}
                        </Typography>
                      ) : (
                        `$${amounts.taxAmount}`
                      )}
                    </TableCell>
                    <TableCell align='right'>
                      {amounts.error ? (
                        <Typography variant="body2" color="error.main" fontSize="small">
                          {amounts.error}
                        </Typography>
                      ) : (
                        `$${amounts.totalAmount}`
                      )}
                    </TableCell>
                    <TableCell align='right'>{`$${parseFloat(invoice.paidtodate || 0).toFixed(2)}`}</TableCell>
                    <TableCell align='right'>
                      {amounts.error ? (
                        <Typography variant="body2" color="error.main" fontSize="small">
                          {amounts.error}
                        </Typography>
                      ) : (
                        `$${amounts.balanceDue}`
                      )}
                    </TableCell>
                    <TableCell align='center'>
                      <Chip
                        label={invoice.paymentstatus || 'Unknown'}
                        color={getStatusChipColor(invoice.paymentstatus)}
                        size='small'
                      />
                    </TableCell>
                    <TableCell align='center'>
                      <Chip
                        label={invoice.approval_status || 'Unknown'}
                        color={getApprovalStatusChipColor(invoice.approval_status)}
                        size='small'
                      />
                    </TableCell>
                    <TableCell>{invoice.agingbucket || '-'}</TableCell>
                    <TableCell align='center'>
                      <Box
                        sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}
                      >
                        {/* Reduced gap */}
                        {/* Record Payment Button */}
                        <Tooltip title='Record Payment Received'>
                          {/* Wrap IconButton in span for tooltip on disabled */}
                          <span>
                            <IconButton
                              color='success'
                              size='small'
                              onClick={() => onRecordPaymentClick(invoice)}
                              disabled={
                                invoice.paymentstatus?.toLowerCase() === 'paid'
                              }
                            >
                              <PaymentIcon fontSize='small' />
                            </IconButton>
                          </span>
                        </Tooltip>
                        {/* View Students Button */}
                        <Tooltip title='View Student Attendance'>
                          <IconButton
                            color='info'
                            size='small'
                            onClick={() => handleViewStudents(invoice.coursenumber)}
                          >
                            <PeopleIcon fontSize='small' />
                          </IconButton>
                        </Tooltip>
                        {/* Details Button */}
                        <Tooltip title='View Course/Invoice Details'>
                          <IconButton
                            color='info'
                            size='small'
                            onClick={() => onViewDetailsClick(invoice.invoiceid)}
                          >
                            <VisibilityIcon fontSize='small' />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                  {/* Expanded Row for Payment Details */}
                  <TableRow>
                    <TableCell
                      style={{ paddingBottom: 0, paddingTop: 0 }}
                      colSpan={16}
                    >
                      {/* Adjust colSpan based on total columns */}
                      <Collapse
                        in={expandedRowId === invoice.invoiceid}
                        timeout='auto'
                        unmountOnExit
                      >
                        {/* Render PaymentDetails component only when expanded */}
                        {expandedRowId === invoice.invoiceid && (
                          <PaymentDetails invoiceId={invoice.invoiceid} />
                        )}
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Student Attendance Dialog */}
      <StudentAttendanceDialog
        open={studentDialogOpen}
        onClose={handleCloseStudentDialog}
        courseId={selectedCourseId}
        students={students}
        loadingStudents={loadingStudents}
      />
    </>
  );
};

export default AccountsReceivableTable;
