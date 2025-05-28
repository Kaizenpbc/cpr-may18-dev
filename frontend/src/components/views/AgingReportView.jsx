import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Grid,
    Card,
    CardContent,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    TextField,
    Chip,
    Alert,
    CircularProgress,
    Tabs,
    Tab,
    IconButton,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Divider
} from '@mui/material';
import {
    Assessment as ReportIcon,
    Download as DownloadIcon,
    Refresh as RefreshIcon,
    TrendingUp as TrendingUpIcon,
    Warning as WarningIcon,
    CheckCircle as CheckCircleIcon,
    Schedule as ScheduleIcon,
    Visibility as ViewIcon,
    FilterList as FilterIcon
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../../services/api';

const AgingReportView = () => {
    const [selectedTab, setSelectedTab] = useState(0);
    const [organizationFilter, setOrganizationFilter] = useState('');
    const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedBucket, setSelectedBucket] = useState(null);
    const [detailDialogOpen, setDetailDialogOpen] = useState(false);

    // Fetch aging report data
    const { data: reportData, isLoading, refetch, error } = useQuery({
        queryKey: ['aging-report', organizationFilter, asOfDate],
        queryFn: async () => {
            const params = {};
            if (organizationFilter) params.organization_id = organizationFilter;
            if (asOfDate) params.as_of_date = asOfDate;
            
            const response = await api.get('/api/v1/accounting/aging-report', { params });
            return response.data.data;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    // Fetch organizations for filter
    const { data: organizations } = useQuery({
        queryKey: ['organizations'],
        queryFn: async () => {
            const response = await api.get('/api/v1/accounting/organizations');
            return response.data.data;
        }
    });

    const handleTabChange = (event, newValue) => {
        setSelectedTab(newValue);
    };

    const handleBucketClick = (bucket) => {
        setSelectedBucket(bucket);
        setDetailDialogOpen(true);
    };

    const handleExportCSV = () => {
        if (!reportData) return;
        
        // Create CSV content
        const csvContent = [
            ['Aging Report - Generated ' + new Date(reportData.report_metadata.generated_at).toLocaleString()],
            ['As of Date:', new Date(reportData.report_metadata.as_of_date).toLocaleDateString()],
            [''],
            ['Executive Summary'],
            ['Total Outstanding:', `$${reportData.executive_summary.total_outstanding.toLocaleString()}`],
            ['Total Overdue:', `$${reportData.executive_summary.total_overdue.toLocaleString()}`],
            ['Collection Efficiency:', `${reportData.executive_summary.collection_efficiency}%`],
            [''],
            ['Aging Bucket', 'Invoice Count', 'Total Balance', 'Percentage', 'Avg Days Outstanding'],
            ...reportData.aging_summary.map(bucket => [
                bucket.aging_bucket,
                bucket.invoice_count,
                `$${bucket.total_balance.toLocaleString()}`,
                `${bucket.percentage_of_total}%`,
                bucket.avg_days_outstanding
            ])
        ].map(row => row.join(',')).join('\n');

        // Download CSV
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `aging-report-${asOfDate}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-CA', {
            style: 'currency',
            currency: 'CAD'
        }).format(amount || 0);
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString();
    };

    const getStatusColor = (bucket) => {
        switch (bucket) {
            case 'Current': return 'success';
            case '1-30 Days': return 'warning';
            case '31-60 Days': return 'error';
            case '61-90 Days': return 'error';
            case '90+ Days': return 'error';
            default: return 'default';
        }
    };

    const getRiskColor = (riskScore) => {
        switch (riskScore) {
            case 'Low': return 'success';
            case 'Medium': return 'warning';
            case 'High': return 'error';
            default: return 'default';
        }
    };

    // Prepare chart data
    const pieChartData = reportData?.aging_summary?.map(bucket => ({
        name: bucket.aging_bucket,
        value: bucket.total_balance,
        count: bucket.invoice_count
    })) || [];

    const barChartData = reportData?.aging_summary?.map(bucket => ({
        bucket: bucket.aging_bucket,
        amount: bucket.total_balance,
        count: bucket.invoice_count
    })) || [];

    const COLORS = ['#4caf50', '#ff9800', '#f44336', '#9c27b0', '#e91e63'];

    if (isLoading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
                <Typography variant="h6" sx={{ ml: 2 }}>
                    Generating Aging Report...
                </Typography>
            </Box>
        );
    }

    if (error) {
        return (
            <Alert severity="error" sx={{ m: 3 }}>
                Error loading aging report: {error.message}
            </Alert>
        );
    }

    return (
        <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: '100%', overflow: 'hidden' }}>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                <Box>
                    <Typography variant={{ xs: 'h5', sm: 'h4' }} gutterBottom sx={{ fontWeight: 'bold' }}>
                        <ReportIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                        Aging Report
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        As of {formatDate(reportData?.report_metadata?.as_of_date)} • 
                        Generated {new Date(reportData?.report_metadata?.generated_at).toLocaleString()}
                    </Typography>
                </Box>
                <Box display="flex" gap={1}>
                    <Tooltip title="Refresh Report">
                        <IconButton onClick={() => refetch()} color="primary">
                            <RefreshIcon />
                        </IconButton>
                    </Tooltip>
                    <Button
                        variant="outlined"
                        startIcon={<DownloadIcon />}
                        onClick={handleExportCSV}
                        size="small"
                    >
                        Export CSV
                    </Button>
                </Box>
            </Box>

            {/* Filters */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        <FilterIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                        Report Filters
                    </Typography>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={4}>
                            <TextField
                                fullWidth
                                label="As of Date"
                                type="date"
                                value={asOfDate}
                                onChange={(e) => setAsOfDate(e.target.value)}
                                InputLabelProps={{ shrink: true }}
                                size="small"
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Organization</InputLabel>
                                <Select
                                    value={organizationFilter}
                                    label="Organization"
                                    onChange={(e) => setOrganizationFilter(e.target.value)}
                                >
                                    <MenuItem value="">All Organizations</MenuItem>
                                    {organizations?.map((org) => (
                                        <MenuItem key={org.id} value={org.id}>
                                            {org.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <Button
                                variant="contained"
                                onClick={() => refetch()}
                                fullWidth
                                startIcon={<RefreshIcon />}
                            >
                                Update Report
                            </Button>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            {/* Executive Summary */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ bgcolor: 'primary.light', color: 'primary.contrastText' }}>
                        <CardContent>
                            <Box display="flex" alignItems="center" justifyContent="space-between">
                                <Box>
                                    <Typography variant="h6" component="div" fontWeight="bold">
                                        {formatCurrency(reportData?.executive_summary?.total_outstanding)}
                                    </Typography>
                                    <Typography variant="body2">
                                        Total Outstanding
                                    </Typography>
                                </Box>
                                <TrendingUpIcon sx={{ fontSize: 40, opacity: 0.8 }} />
                            </Box>
                            <Typography variant="caption" sx={{ mt: 1 }}>
                                {reportData?.executive_summary?.total_invoices} invoices
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ bgcolor: 'error.light', color: 'error.contrastText' }}>
                        <CardContent>
                            <Box display="flex" alignItems="center" justifyContent="space-between">
                                <Box>
                                    <Typography variant="h6" component="div" fontWeight="bold">
                                        {formatCurrency(reportData?.executive_summary?.total_overdue)}
                                    </Typography>
                                    <Typography variant="body2">
                                        Total Overdue
                                    </Typography>
                                </Box>
                                <WarningIcon sx={{ fontSize: 40, opacity: 0.8 }} />
                            </Box>
                            <Typography variant="caption" sx={{ mt: 1 }}>
                                {reportData?.executive_summary?.overdue_invoices} invoices
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ bgcolor: 'warning.light', color: 'warning.contrastText' }}>
                        <CardContent>
                            <Box display="flex" alignItems="center" justifyContent="space-between">
                                <Box>
                                    <Typography variant="h6" component="div" fontWeight="bold">
                                        {reportData?.executive_summary?.overdue_percentage}%
                                    </Typography>
                                    <Typography variant="body2">
                                        Overdue Rate
                                    </Typography>
                                </Box>
                                <ScheduleIcon sx={{ fontSize: 40, opacity: 0.8 }} />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ bgcolor: 'success.light', color: 'success.contrastText' }}>
                        <CardContent>
                            <Box display="flex" alignItems="center" justifyContent="space-between">
                                <Box>
                                    <Typography variant="h6" component="div" fontWeight="bold">
                                        {reportData?.executive_summary?.collection_efficiency}%
                                    </Typography>
                                    <Typography variant="body2">
                                        Collection Efficiency
                                    </Typography>
                                </Box>
                                <CheckCircleIcon sx={{ fontSize: 40, opacity: 0.8 }} />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Charts and Tables */}
            <Card>
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs value={selectedTab} onChange={handleTabChange}>
                        <Tab label="Aging Summary" />
                        <Tab label="Organization Breakdown" />
                        <Tab label="Visual Analysis" />
                    </Tabs>
                </Box>

                {/* Aging Summary Tab */}
                {selectedTab === 0 && (
                    <Box sx={{ p: 3 }}>
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 'bold' }}>Aging Bucket</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>Invoice Count</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>Total Balance</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>% of Total</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>Avg Days Outstanding</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {reportData?.aging_summary?.map((bucket) => (
                                        <TableRow key={bucket.aging_bucket} hover>
                                            <TableCell>
                                                <Chip
                                                    label={bucket.aging_bucket}
                                                    color={getStatusColor(bucket.aging_bucket)}
                                                    size="small"
                                                />
                                            </TableCell>
                                            <TableCell align="right">
                                                <Typography variant="body2" fontWeight="medium">
                                                    {bucket.invoice_count}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="right">
                                                <Typography variant="body2" fontWeight="medium">
                                                    {formatCurrency(bucket.total_balance)}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="right">
                                                <Typography variant="body2">
                                                    {bucket.percentage_of_total}%
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="right">
                                                <Typography variant="body2">
                                                    {bucket.avg_days_outstanding} days
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="center">
                                                <Tooltip title="View Details">
                                                    <IconButton 
                                                        size="small" 
                                                        onClick={() => handleBucketClick(bucket)}
                                                    >
                                                        <ViewIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                )}

                {/* Organization Breakdown Tab */}
                {selectedTab === 1 && (
                    <Box sx={{ p: 3 }}>
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 'bold' }}>Organization</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>Total Balance</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>Current</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>1-30 Days</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>31-60 Days</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>61-90 Days</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>90+ Days</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 'bold' }}>Risk Score</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {reportData?.organization_breakdown?.map((org) => (
                                        <TableRow key={org.organization_id} hover>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight="medium">
                                                    {org.organization_name}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="right">
                                                <Typography variant="body2" fontWeight="bold">
                                                    {formatCurrency(org.total_balance)}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="right">
                                                {formatCurrency(org.current_balance)}
                                            </TableCell>
                                            <TableCell align="right">
                                                {formatCurrency(org.days_1_30)}
                                            </TableCell>
                                            <TableCell align="right">
                                                {formatCurrency(org.days_31_60)}
                                            </TableCell>
                                            <TableCell align="right">
                                                {formatCurrency(org.days_61_90)}
                                            </TableCell>
                                            <TableCell align="right">
                                                {formatCurrency(org.days_90_plus)}
                                            </TableCell>
                                            <TableCell align="center">
                                                <Chip
                                                    label={org.risk_score}
                                                    color={getRiskColor(org.risk_score)}
                                                    size="small"
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                )}

                {/* Visual Analysis Tab */}
                {selectedTab === 2 && (
                    <Box sx={{ p: 3 }}>
                        <Grid container spacing={3}>
                            <Grid item xs={12} md={6}>
                                <Typography variant="h6" gutterBottom>
                                    Aging Distribution
                                </Typography>
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={pieChartData}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {pieChartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <ChartTooltip formatter={(value) => formatCurrency(value)} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <Typography variant="h6" gutterBottom>
                                    Aging Amounts by Bucket
                                </Typography>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={barChartData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="bucket" />
                                        <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`} />
                                        <ChartTooltip formatter={(value) => formatCurrency(value)} />
                                        <Legend />
                                        <Bar dataKey="amount" fill="#8884d8" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </Grid>
                        </Grid>
                    </Box>
                )}
            </Card>

            {/* Detail Dialog */}
            <Dialog 
                open={detailDialogOpen} 
                onClose={() => setDetailDialogOpen(false)}
                maxWidth="lg"
                fullWidth
            >
                <DialogTitle>
                    Invoice Details - {selectedBucket?.aging_bucket}
                </DialogTitle>
                <DialogContent>
                    {selectedBucket && (
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Invoice #</TableCell>
                                        <TableCell>Organization</TableCell>
                                        <TableCell align="right">Amount</TableCell>
                                        <TableCell align="right">Balance Due</TableCell>
                                        <TableCell>Due Date</TableCell>
                                        <TableCell align="right">Days Outstanding</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {reportData?.invoice_details
                                        ?.filter(invoice => invoice.aging_bucket === selectedBucket.aging_bucket)
                                        ?.map((invoice) => (
                                            <TableRow key={invoice.id}>
                                                <TableCell>{invoice.invoice_number}</TableCell>
                                                <TableCell>{invoice.organization_name}</TableCell>
                                                <TableCell align="right">{formatCurrency(invoice.amount)}</TableCell>
                                                <TableCell align="right">{formatCurrency(invoice.balance_due)}</TableCell>
                                                <TableCell>{formatDate(invoice.due_date)}</TableCell>
                                                <TableCell align="right">{invoice.days_outstanding} days</TableCell>
                                            </TableRow>
                                        ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDetailDialogOpen(false)}>
                        Close
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default AgingReportView; 