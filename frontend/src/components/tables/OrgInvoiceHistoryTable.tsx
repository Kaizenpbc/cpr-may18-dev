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
  Chip,
  IconButton,
  Link as MuiLink, // Use alias to avoid conflict
  Button,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom'; // For linking later if needed
// Import necessary icons
import VisibilityIcon from '@mui/icons-material/Visibility';
import EmailIcon from '@mui/icons-material/Email';
import PaymentIcon from '@mui/icons-material/Payment';
// Import shared formatters
import {
  formatDate,
  formatCurrency,
  getStatusChipColor,
} from '../../utils/formatters'; // Correct path

const OrgInvoiceHistoryTable = ({
  invoices = [], // Default to empty array
  // Pass handlers for actions if needed from parent page
  onViewDetailsClick,
  onEmailInvoiceClick,
  onPayInvoiceClick,
}) => {
  if (!invoices || invoices.length === 0) {
    return (
      <Typography sx={{ mt: 2, fontStyle: 'italic' }}>
        No invoices found for this organization.
      </Typography>
    );
  }

  // TODO: Add state and handlers for sorting if required

  return (
    <TableContainer component={Paper} sx={{ mt: 1 }}>
      {' '}
      {/* Use Paper for consistency */}
      <Table
        stickyHeader
        size='small'
        aria-label='organization invoice history table'
      >
        <TableHead>
          <TableRow>
            {/* Consider which columns are most relevant here */}
            <TableCell sx={{ fontWeight: 'bold' }}>Invoice #</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Invoice Date</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Due Date</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Course #</TableCell>
            <TableCell align='right' sx={{ fontWeight: 'bold' }}>
              Amount
            </TableCell>
            <TableCell align='center' sx={{ fontWeight: 'bold' }}>
              Status
            </TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Aging</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Email Sent</TableCell>
            <TableCell align='center' sx={{ fontWeight: 'bold' }}>
              Actions
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {invoices.map((invoice, index) => (
            // Using Fragment as expanding isn't directly implemented here yet
            <React.Fragment key={invoice.invoiceid}>
              <TableRow
                hover
                sx={{
                  backgroundColor: index % 2 !== 0 ? '#f9f9f9' : 'inherit',
                }}
              >
                <TableCell>
                  <MuiLink
                    component="button"
                    variant="body2"
                    onClick={() => onViewDetailsClick && onViewDetailsClick(invoice.invoiceid)}
                    sx={{
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      color: 'primary.main',
                      '&:hover': {
                        color: 'primary.dark',
                      },
                    }}
                  >
                    {invoice.invoicenumber}
                  </MuiLink>
                </TableCell>
                <TableCell>{formatDate(invoice.invoicedate)}</TableCell>
                <TableCell>{formatDate(invoice.duedate)}</TableCell>
                <TableCell>{invoice.coursenumber || '-'}</TableCell>
                <TableCell align='right'>
                  {formatCurrency(invoice.amount)}
                </TableCell>
                <TableCell align='center'>
                  <Chip
                    label={invoice.paymentstatus || 'Unknown'}
                    color={getStatusChipColor(invoice.paymentstatus)}
                    size='small'
                  />
                </TableCell>
                <TableCell>{invoice.agingBucket || '-'}</TableCell>
                <TableCell>
                  {invoice.emailsentat ? formatDate(invoice.emailsentat) : '-'}
                </TableCell>
                <TableCell align='center'>
                  <Box
                    sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}
                  >
                    {/* View Details Button */}
                    <Tooltip title='View Details'>
                      <IconButton
                        color='info'
                        size='small'
                        onClick={() => onViewDetailsClick && onViewDetailsClick(invoice.invoiceid)}
                      >
                        <VisibilityIcon fontSize='small' />
                      </IconButton>
                    </Tooltip>
                    
                    {/* Pay Invoice Button */}
                    <Tooltip title='Pay Invoice'>
                      <Button
                        variant="contained"
                        color="success"
                        size="small"
                        startIcon={<PaymentIcon />}
                        onClick={() => onPayInvoiceClick && onPayInvoiceClick(invoice.invoiceid)}
                        sx={{ 
                          minWidth: 'auto',
                          px: 1,
                          py: 0.5,
                          fontSize: '0.75rem'
                        }}
                      >
                        PAY
                      </Button>
                    </Tooltip>
                    
                    {/* Email Invoice Button */}
                    <Tooltip title='Email Invoice'>
                      <span>
                        {' '}
                        {/* Wrapper for disabled state */}
                        <IconButton
                          color='primary'
                          size='small'
                          disabled={!invoice.contactemail} // Use contactemail from fetched data if available
                          onClick={() => onEmailInvoiceClick && onEmailInvoiceClick(invoice.invoiceid)}
                        >
                          <EmailIcon fontSize='small' />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default OrgInvoiceHistoryTable;
