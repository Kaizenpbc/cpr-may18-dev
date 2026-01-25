import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  TextField,
  Button,
  Divider,
  CircularProgress,
  Alert,
  Paper,
} from '@mui/material';
import {
  TrendingUp as IncomeIcon,
  TrendingDown as ExpenseIcon,
  AccountBalance as BalanceIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import api from '../../services/api';

interface FinancialSummary {
  period: {
    start_date: string;
    end_date: string;
  };
  money_in: {
    organization_payments: { amount: number; count: number };
    total: number;
  };
  money_out: {
    vendor_payments: { amount: number; count: number };
    instructor_payments: { amount: number; count: number };
    total: number;
  };
  net_cash_flow: number;
  monthly_breakdown: Array<{
    month: string;
    month_label: string;
    money_in: number;
    money_out: number;
  }>;
}

const FinancialSummaryView: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const [startDate, setStartDate] = useState(`${currentYear}-01-01`);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const {
    data: summary,
    isLoading,
    error,
    refetch,
  } = useQuery<FinancialSummary>({
    queryKey: ['financial-summary', startDate, endDate],
    queryFn: async () => {
      const response = await api.get('/accounting/financial-summary', {
        params: { start_date: startDate, end_date: endDate },
      });
      return response.data.data;
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
    }).format(amount);
  };

  const handleExportCSV = () => {
    if (!summary) return;

    const csvContent = [
      ['Financial Summary Report'],
      [`Period: ${summary.period.start_date} to ${summary.period.end_date}`],
      [''],
      ['MONEY IN'],
      ['Organization Payments', formatCurrency(summary.money_in.organization_payments.amount), `${summary.money_in.organization_payments.count} transactions`],
      ['Total Income', formatCurrency(summary.money_in.total)],
      [''],
      ['MONEY OUT'],
      ['Vendor Payments', formatCurrency(summary.money_out.vendor_payments.amount), `${summary.money_out.vendor_payments.count} transactions`],
      ['Instructor Payments', formatCurrency(summary.money_out.instructor_payments.amount), `${summary.money_out.instructor_payments.count} transactions`],
      ['Total Expenses', formatCurrency(summary.money_out.total)],
      [''],
      ['NET CASH FLOW', formatCurrency(summary.net_cash_flow)],
      [''],
      ['Monthly Breakdown'],
      ['Month', 'Money In', 'Money Out', 'Net'],
      ...summary.monthly_breakdown.map(m => [
        m.month_label,
        formatCurrency(m.money_in),
        formatCurrency(m.money_out),
        formatCurrency(m.money_in - m.money_out),
      ]),
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `financial-summary-${startDate}-to-${endDate}.csv`;
    link.click();
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        Failed to load financial summary. Please try again.
      </Alert>
    );
  }

  const chartData = summary?.monthly_breakdown.map(m => ({
    ...m,
    net: m.money_in - m.money_out,
  })) || [];

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Financial Summary
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Money In / Money Out Overview
          </Typography>
        </Box>
        <Box display="flex" gap={2} alignItems="center">
          <TextField
            label="Start Date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            size="small"
          />
          <TextField
            label="End Date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            size="small"
          />
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => refetch()}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleExportCSV}
          >
            Export CSV
          </Button>
        </Box>
      </Box>

      {summary && (
        <>
          {/* Summary Cards */}
          <Grid container spacing={3} mb={4}>
            {/* Money In Card */}
            <Grid item xs={12} md={4}>
              <Card sx={{ height: '100%', borderLeft: '4px solid #4caf50' }}>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <IncomeIcon sx={{ color: '#4caf50', mr: 1 }} />
                    <Typography variant="h6" color="textSecondary">
                      Money In
                    </Typography>
                  </Box>
                  <Typography variant="h4" sx={{ color: '#4caf50', mb: 2 }}>
                    {formatCurrency(summary.money_in.total)}
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                  <Box>
                    <Box display="flex" justifyContent="space-between" mb={0.5}>
                      <Typography variant="body2" color="textSecondary">
                        Organization Payments
                      </Typography>
                      <Typography variant="body2">
                        {formatCurrency(summary.money_in.organization_payments.amount)}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="textSecondary">
                      {summary.money_in.organization_payments.count} transactions
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Money Out Card */}
            <Grid item xs={12} md={4}>
              <Card sx={{ height: '100%', borderLeft: '4px solid #f44336' }}>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <ExpenseIcon sx={{ color: '#f44336', mr: 1 }} />
                    <Typography variant="h6" color="textSecondary">
                      Money Out
                    </Typography>
                  </Box>
                  <Typography variant="h4" sx={{ color: '#f44336', mb: 2 }}>
                    {formatCurrency(summary.money_out.total)}
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                  <Box>
                    <Box display="flex" justifyContent="space-between" mb={0.5}>
                      <Typography variant="body2" color="textSecondary">
                        Vendor Payments
                      </Typography>
                      <Typography variant="body2">
                        {formatCurrency(summary.money_out.vendor_payments.amount)}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="textSecondary" display="block" mb={1}>
                      {summary.money_out.vendor_payments.count} transactions
                    </Typography>
                    <Box display="flex" justifyContent="space-between" mb={0.5}>
                      <Typography variant="body2" color="textSecondary">
                        Instructor Payments
                      </Typography>
                      <Typography variant="body2">
                        {formatCurrency(summary.money_out.instructor_payments.amount)}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="textSecondary">
                      {summary.money_out.instructor_payments.count} transactions
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Net Cash Flow Card */}
            <Grid item xs={12} md={4}>
              <Card
                sx={{
                  height: '100%',
                  borderLeft: `4px solid ${summary.net_cash_flow >= 0 ? '#2196f3' : '#ff9800'}`,
                }}
              >
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <BalanceIcon
                      sx={{ color: summary.net_cash_flow >= 0 ? '#2196f3' : '#ff9800', mr: 1 }}
                    />
                    <Typography variant="h6" color="textSecondary">
                      Net Cash Flow
                    </Typography>
                  </Box>
                  <Typography
                    variant="h4"
                    sx={{ color: summary.net_cash_flow >= 0 ? '#2196f3' : '#ff9800', mb: 2 }}
                  >
                    {formatCurrency(summary.net_cash_flow)}
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="body2" color="textSecondary">
                    {summary.net_cash_flow >= 0
                      ? 'Positive cash flow - more money coming in than going out'
                      : 'Negative cash flow - more money going out than coming in'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Monthly Chart */}
          <Paper sx={{ p: 3, mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              Monthly Cash Flow
            </Typography>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month_label" />
                <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  labelFormatter={(label) => `Month: ${label}`}
                />
                <Legend />
                <Bar dataKey="money_in" name="Money In" fill="#4caf50" />
                <Bar dataKey="money_out" name="Money Out" fill="#f44336" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>

          {/* Net Cash Flow Trend */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Net Cash Flow Trend
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month_label" />
                <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  labelFormatter={(label) => `Month: ${label}`}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="net"
                  name="Net Cash Flow"
                  stroke="#2196f3"
                  strokeWidth={2}
                  dot={{ fill: '#2196f3' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </>
      )}
    </Box>
  );
};

export default FinancialSummaryView;
