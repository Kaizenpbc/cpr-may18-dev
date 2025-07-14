import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Chip,
  Box,
  CircularProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import { formatDisplayDate } from '../../utils/dateUtils';
import { PictureAsPdf as ReceiptIcon } from '@mui/icons-material';
import { api } from '../../services/api';

interface Payment {
  id: number;
  invoice_id: number;
  amount_paid: number;
  payment_date: string;
  payment_method: string;
  reference_number?: string;
  notes?: string;
  status: string;
  created_at: string;
  submitted_by_org_at?: string;
  verified_by_accounting_at?: string;
}

interface PaymentHistoryTableProps {
  payments: Payment[];
  isLoading?: boolean;
  showVerificationDetails?: boolean;
}

const PaymentHistoryTable: React.FC<PaymentHistoryTableProps> = ({
  payments = [],
  isLoading = false,
  showVerificationDetails = false,
}) => {
  // Get payment status color
  const getPaymentStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'verified':
        return 'success';
      case 'pending_verification':
        return 'warning';
      case 'rejected':
        return 'error';
      default:
        return 'default';
    }
  };

  // Format payment method for display
  const formatPaymentMethod = (method: string) => {
    if (!method) return '-';
    return method.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Format status for display
  const formatStatus = (status: string) => {
    if (!status) return '-';
    return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Handle download receipt
  const handleDownloadReceipt = async (paymentId: number) => {
    try {
      const response = await api.get(`/accounting/payments/${paymentId}/receipt`, {
        responseType: 'blob'
      });
      
      // Create blob and download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Payment-Receipt-${paymentId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading receipt:', error);
      // You could add a toast notification here
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" p={2}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (payments.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', p: 2 }}>
        No payments recorded for this invoice.
      </Typography>
    );
  }

  return (
    <TableContainer component={Paper} sx={{ mt: 1 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Payment Date</TableCell>
            <TableCell align="right">Amount</TableCell>
            <TableCell>Method</TableCell>
            <TableCell>Reference</TableCell>
            <TableCell>Status</TableCell>
            {showVerificationDetails && (
              <>
                <TableCell>Submitted</TableCell>
                <TableCell>Verified</TableCell>
              </>
            )}
            <TableCell>Notes</TableCell>
            <TableCell align="center">Receipt</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {payments.map((payment) => (
            <TableRow key={payment.id} hover>
              <TableCell>
                {formatDisplayDate(payment.payment_date)}
              </TableCell>
              <TableCell align="right">
                <Typography variant="body2" fontWeight="medium">
                  ${payment.amount_paid.toFixed(2)}
                </Typography>
              </TableCell>
              <TableCell>
                {formatPaymentMethod(payment.payment_method)}
              </TableCell>
              <TableCell>
                {payment.reference_number || '-'}
              </TableCell>
              <TableCell>
                <Chip
                  label={formatStatus(payment.status)}
                  color={getPaymentStatusColor(payment.status)}
                  size="small"
                />
              </TableCell>
              {showVerificationDetails && (
                <>
                  <TableCell>
                    {payment.submitted_by_org_at 
                      ? formatDisplayDate(payment.submitted_by_org_at)
                      : '-'
                    }
                  </TableCell>
                  <TableCell>
                    {payment.verified_by_accounting_at 
                      ? formatDisplayDate(payment.verified_by_accounting_at)
                      : '-'
                    }
                  </TableCell>
                </>
              )}
              <TableCell>
                <Typography variant="body2" sx={{ maxWidth: 200 }}>
                  {payment.notes || '-'}
                </Typography>
              </TableCell>
              <TableCell align="center">
                {payment.status === 'verified' && (
                  <Tooltip title="Download Receipt">
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => handleDownloadReceipt(payment.id)}
                    >
                      <ReceiptIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default PaymentHistoryTable; 