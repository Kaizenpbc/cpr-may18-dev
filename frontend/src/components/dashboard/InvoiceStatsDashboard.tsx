import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  Chip,
  Tooltip,
} from '@mui/material';
import {
  PendingActions as PendingIcon,
  CheckCircle as ApprovedIcon,
  PostAdd as PostedIcon,
  AttachMoney as OutstandingIcon,
} from '@mui/icons-material';
import { formatCurrency } from '../../utils/formatters';

interface InvoiceStats {
  pendingApprovals: number;
  approvedToday: number;
  postedToday: number;
  totalOutstanding: number;
  lastUpdated: string;
}

interface Invoice {
  id: number;
  status: string;
  amount: number;
  createdAt?: string;
  approvalStatus?: string;
  approvedAt?: string;
  postedToOrgAt?: string;
  paymentStatus?: string;
  paidToDate?: number;
}

interface InvoiceStatsDashboardProps {
  invoices?: Invoice[];
  loading?: boolean;
}

const InvoiceStatsDashboard: React.FC<InvoiceStatsDashboardProps> = ({
  invoices = [],
  loading = false,
}) => {
  const [stats, setStats] = useState<InvoiceStats>({
    pendingApprovals: 0,
    approvedToday: 0,
    postedToday: 0,
    totalOutstanding: 0,
    lastUpdated: new Date().toLocaleTimeString(),
  });

  useEffect(() => {
    if (!invoices || invoices.length === 0) return;

    const today = new Date().toDateString();
    
    const pendingApprovals = invoices.filter(invoice =>
      ['pending approval', 'pending_approval', 'pending', 'draft', 'new'].includes(
        (invoice.approvalStatus || '').toLowerCase()
      )
    ).length;

    const approvedToday = invoices.filter(invoice => {
      if (!invoice.approvedAt) return false;
      const approvedDate = new Date(invoice.approvedAt).toDateString();
      return approvedDate === today;
    }).length;

    const postedToday = invoices.filter(invoice => {
      if (!invoice.postedToOrgAt) return false;
      const postedDate = new Date(invoice.postedToOrgAt).toDateString();
      return postedDate === today;
    }).length;

    const totalOutstanding = invoices
      .filter(invoice => {
        const status = (invoice.paymentStatus || '').toLowerCase();
        return status !== 'paid' && status !== 'cancelled';
      })
      .reduce((sum, invoice) => {
        const amount = typeof invoice.amount === 'number' ? invoice.amount : parseFloat(String(invoice.amount)) || 0;
        const paid = typeof invoice.paidToDate === 'number' ? invoice.paidToDate : parseFloat(String(invoice.paidToDate)) || 0;
        return sum + (amount - paid);
      }, 0);

    setStats({
      pendingApprovals,
      approvedToday,
      postedToday,
      totalOutstanding,
      lastUpdated: new Date().toLocaleTimeString(),
    });
  }, [invoices]);

  const statCards = [
    {
      title: 'Pending Approvals',
      value: stats.pendingApprovals,
      icon: <PendingIcon sx={{ fontSize: 40, color: 'warning.main' }} />,
      color: 'warning',
      tooltip: 'Invoices waiting for approval',
    },
    {
      title: 'Approved Today',
      value: stats.approvedToday,
      icon: <ApprovedIcon sx={{ fontSize: 40, color: 'success.main' }} />,
      color: 'success',
      tooltip: 'Invoices approved today',
    },
    {
      title: 'Posted Today',
      value: stats.postedToday,
      icon: <PostedIcon sx={{ fontSize: 40, color: 'info.main' }} />,
      color: 'info',
      tooltip: 'Invoices posted to organizations today',
    },
    {
      title: 'Total Outstanding',
      value: formatCurrency(stats.totalOutstanding),
      icon: <OutstandingIcon sx={{ fontSize: 40, color: 'error.main' }} />,
      color: 'error',
      tooltip: 'Total outstanding invoice amounts',
    },
  ];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" component="h2">
          Invoice Statistics
        </Typography>
        <Chip 
          label={`Last updated: ${stats.lastUpdated}`}
          size="small"
          variant="outlined"
        />
      </Box>
      
      <Grid container spacing={2}>
        {statCards.map((card, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Tooltip title={card.tooltip}>
              <Card 
                sx={{ 
                  height: '100%',
                  transition: 'transform 0.2s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 3,
                  }
                }}
              >
                <CardContent sx={{ textAlign: 'center', p: 2 }}>
                  <Box sx={{ mb: 1 }}>
                    {card.icon}
                  </Box>
                  <Typography variant="h4" component="div" sx={{ mb: 1, fontWeight: 'bold' }}>
                    {card.value}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {card.title}
                  </Typography>
                </CardContent>
              </Card>
            </Tooltip>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default InvoiceStatsDashboard; 