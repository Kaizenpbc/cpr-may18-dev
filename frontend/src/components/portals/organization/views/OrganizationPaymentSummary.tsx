import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Payment as PaymentIcon,
  TrendingUp as TrendingUpIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
} from '@mui/icons-material';
import { formatDisplayDate } from '../../../../utils/dateUtils';
import { api } from '../../../../services/api';

interface PaymentSummary {
  total_payments: number;
  total_amount_paid: number;
  verified_payments: number;
  pending_payments: number;
  recent_payments: Payment[];
}

interface Payment {
  id: number;
  invoice_id: number;
  amount_paid: number;
  payment_date: string;
  payment_method: string;
  reference_number?: string;
  status: string;
  invoice_number: string;
  course_type_name?: string;
}

interface OrganizationPaymentSummaryProps {
  organizationId: number;
}

const OrganizationPaymentSummary: React.FC<OrganizationPaymentSummaryProps> = ({
  organizationId,
}) => {
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPaymentSummary = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get(`/organization/payment-summary`);
        setSummary(response.data);
      } catch (err) {
        console.error('Error loading payment summary:', err);
        setError('Failed to load payment summary');
      } finally {
        setLoading(false);
      }
    };

    loadPaymentSummary();
  }, [organizationId]);

  const getStatusColor = (status: string) => {
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

  const formatPaymentMethod = (method: string) => {
    if (!method) return '-';
    return method.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!summary) {
    return (
      <Alert severity="info" sx={{ mb: 2 }}>
        No payment data available
      </Alert>
    );
  }

  return (
    <Box>
      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <PaymentIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6" color="primary">
                  Total Payments
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight="bold">
                {summary.total_payments}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                All time payments
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <TrendingUpIcon color="success" sx={{ mr: 1 }} />
                <Typography variant="h6" color="success.main">
                  Total Amount
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight="bold" color="success.main">
                ${summary.total_amount_paid.toFixed(2)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total amount paid
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                <Typography variant="h6" color="success.main">
                  Verified
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight="bold" color="success.main">
                {summary.verified_payments}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Payments verified
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <PendingIcon color="warning" sx={{ mr: 1 }} />
                <Typography variant="h6" color="warning.main">
                  Pending
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight="bold" color="warning.main">
                {summary.pending_payments}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Awaiting verification
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Payments */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Recent Payments
        </Typography>
        {summary.recent_payments.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
            No recent payments found
          </Typography>
        ) : (
          <List>
            {summary.recent_payments.map((payment, index) => (
              <React.Fragment key={payment.id}>
                <ListItem>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="body1" fontWeight="medium">
                          ${payment.amount_paid.toFixed(2)}
                        </Typography>
                        <Chip
                          label={payment.status.replace('_', ' ')}
                          color={getStatusColor(payment.status)}
                          size="small"
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Invoice: {payment.invoice_number}
                          {payment.course_type_name && ` • ${payment.course_type_name}`}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {formatPaymentMethod(payment.payment_method)} • {formatDisplayDate(payment.payment_date)}
                          {payment.reference_number && ` • Ref: ${payment.reference_number}`}
                        </Typography>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Typography variant="body2" color="text.secondary">
                      {formatDisplayDate(payment.payment_date)}
                    </Typography>
                  </ListItemSecondaryAction>
                </ListItem>
                {index < summary.recent_payments.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}
      </Paper>
    </Box>
  );
};

export default OrganizationPaymentSummary; 