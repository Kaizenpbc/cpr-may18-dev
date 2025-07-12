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
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'; // Expand icon
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'; // Collapse icon
import * as api from '../../services/api'; // Import API service
import logger from '../../utils/logger';
// Add necessary icons
import VisibilityIcon from '@mui/icons-material/Visibility';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'; // Used for Billing Queue
import PaymentIcon from '@mui/icons-material/Payment'; // For Record Payment
import EmailIcon from '@mui/icons-material/Email'; // For Email Invoice
import PostAddIcon from '@mui/icons-material/PostAdd'; // For Post to Org
// Import shared formatters
import { formatDate, getStatusChipColor } from '../../utils/formatters'; // Correct path

// Component to display within the expanded row
const PaymentDetails = ({ invoiceId }) => {
  const [payments, setPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  React.useEffect(() => {
    const loadPayments = async () => {
      setIsLoading(true);
      setError('');
      try {
        const response = await api.getInvoicePayments(invoiceId);
        
        // Ensure we have an array of payments
        let paymentsData = [];
        if (response && response.data) {
          // If response has data property, use that
          paymentsData = Array.isArray(response.data) ? response.data : [];
        } else if (Array.isArray(response)) {
          // If response is directly an array
          paymentsData = response;
        } else {
          // If response is not an array, log and use empty array
          console.warn('Unexpected payments response format:', response);
          paymentsData = [];
        }
        
        setPayments(paymentsData);
      } catch (err) {
        console.error('Error loading payments:', err);
        setError(err.message || 'Could not load payment details.');
        setPayments([]);
      } finally {
        setIsLoading(false);
      }
    };
    loadPayments();
  }, [invoiceId]);

  if (isLoading) return <CircularProgress size={20} sx={{ m: 1 }} />;
  if (error)
    return (
      <Typography color='error' sx={{ m: 1 }}>
        {error}
      </Typography>
    );
  if (!payments || payments.length === 0)
    return (
      <Typography sx={{ m: 1, fontStyle: 'italic' }}>
        No payments recorded for this invoice.
      </Typography>
    );

  // Simple table to display payments
  return (
    <Box sx={{ margin: 1 }}>
      <Typography variant='subtitle2' gutterBottom component='div'>
        Payment History
      </Typography>
      <Table size='small' aria-label='payment history'>
        <TableHead>
          <TableRow>
            <TableCell>Payment Date</TableCell>
            <TableCell>Amount Paid</TableCell>
            <TableCell>Method</TableCell>
            <TableCell>Reference</TableCell>
            <TableCell>Notes</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {payments.map(payment => (
            <TableRow key={payment.paymentid}>
              <TableCell>{formatDate(payment.paymentdate)}</TableCell>
              <TableCell>{`$${parseFloat(payment.amountpaid || 0).toFixed(2)}`}</TableCell>
              <TableCell>{payment.paymentmethod || '-'}</TableCell>
              <TableCell>{payment.referencenumber || '-'}</TableCell>
              <TableCell>{payment.notes || '-'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
};

const AccountsReceivableTable = ({
  invoices,
  onRecordPaymentClick,
  onViewDetailsClick,
}) => {
  const [expandedRowId, setExpandedRowId] = useState(null); // State to track expanded row

  const handleExpandClick = invoiceId => {
    setExpandedRowId(expandedRowId === invoiceId ? null : invoiceId); // Toggle expansion
  };

  if (!invoices || invoices.length === 0) {
    return <Typography sx={{ mt: 2 }}>No invoices found.</Typography>;
  }

  return (
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
            <TableCell sx={{ fontWeight: 'bold' }}>Course #</TableCell>
            <TableCell align='right' sx={{ fontWeight: 'bold' }}>
              Amount
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
            <TableCell sx={{ fontWeight: 'bold' }}>Aging</TableCell>
            <TableCell align='center' sx={{ fontWeight: 'bold' }}>
              Actions
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {invoices.map((invoice, index) => (
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
                <TableCell>{invoice.coursenumber || '-'}</TableCell>
                <TableCell align='right'>{`$${parseFloat(invoice.amount || 0).toFixed(2)}`}</TableCell>
                <TableCell align='right'>{`$${parseFloat(invoice.paidtodate || 0).toFixed(2)}`}</TableCell>
                <TableCell align='right'>{`$${parseFloat(invoice.balancedue || 0).toFixed(2)}`}</TableCell>
                <TableCell align='center'>
                  <Chip
                    label={invoice.paymentstatus || 'Unknown'}
                    color={getStatusChipColor(invoice.paymentstatus)}
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
                  colSpan={11}
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
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default AccountsReceivableTable;
