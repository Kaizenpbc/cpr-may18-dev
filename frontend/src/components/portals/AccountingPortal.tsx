import React, { useState } from 'react';
import { Box, Tabs, Tab, Typography, Paper, Container } from '@mui/material';
import {
  Dashboard as DashboardIcon,
  AttachMoney as PricingIcon,
} from '@mui/icons-material';
import ErrorBoundary from '../common/ErrorBoundary';
import AccountingDashboard from './accounting/AccountingDashboard';
import CoursePricingManagement from './accounting/CoursePricingManagement';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role='tabpanel'
      hidden={value !== index}
      id={`accounting-tabpanel-${index}`}
      aria-labelledby={`accounting-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `accounting-tab-${index}`,
    'aria-controls': `accounting-tabpanel-${index}`,
  };
}

const AccountingPortal: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleError = (error: Error, errorInfo: any) => {
    console.error('[AccountingPortal] Error caught by boundary:', error, errorInfo);
  };

  return (
    <ErrorBoundary context="accounting_portal" onError={handleError}>
      <Container maxWidth='xl' sx={{ mt: 2, mb: 4 }}>
        <Paper elevation={1} sx={{ mb: 3, p: 2 }}>
          <Typography variant='h4' component='h1' gutterBottom>
            🏦 Accounting Portal
          </Typography>
          <Typography variant='subtitle1' color='textSecondary'>
            Financial management and course pricing administration
          </Typography>
        </Paper>

        <Paper elevation={1}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              aria-label='accounting portal tabs'
              variant='fullWidth'
            >
              <Tab
                icon={<DashboardIcon />}
                label='Financial Dashboard'
                {...a11yProps(0)}
                sx={{ minHeight: 72 }}
              />
              <Tab
                icon={<PricingIcon />}
                label='Course Pricing Setup'
                {...a11yProps(1)}
                sx={{ minHeight: 72 }}
              />
            </Tabs>
          </Box>

          <TabPanel value={tabValue} index={0}>
            <ErrorBoundary context="accounting_dashboard" onError={handleError}>
              <AccountingDashboard />
            </ErrorBoundary>
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <ErrorBoundary context="accounting_pricing" onError={handleError}>
              <CoursePricingManagement />
            </ErrorBoundary>
          </TabPanel>
        </Paper>
      </Container>
    </ErrorBoundary>
  );
};

export default AccountingPortal;
