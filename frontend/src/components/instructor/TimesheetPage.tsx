import React, { useState } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  History as HistoryIcon,
  Payment as PaymentIcon,
} from '@mui/icons-material';
import TimesheetSubmission from './TimesheetSubmission';
import TimesheetHistory from './TimesheetHistory';
import PaymentHistory from './PaymentHistory';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`timesheet-tabpanel-${index}`}
      aria-labelledby={`timesheet-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

const TimesheetPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleTimesheetSubmitted = () => {
    // Switch to history tab when timesheet is submitted
    setTabValue(1);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <AssignmentIcon sx={{ mr: 1, color: 'primary.main', fontSize: 28 }} />
        <Typography variant="h4" component="h1">
          Timesheet Management
        </Typography>
      </Box>

      <Paper sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange} 
            aria-label="timesheet tabs"
            sx={{ px: 2 }}
          >
            <Tab 
              icon={<AssignmentIcon />} 
              label="Submit Timesheet" 
              id="timesheet-tab-0"
              aria-controls="timesheet-tabpanel-0"
            />
            <Tab
              icon={<HistoryIcon />}
              label="Timesheet History"
              id="timesheet-tab-1"
              aria-controls="timesheet-tabpanel-1"
            />
            <Tab
              icon={<PaymentIcon />}
              label="Payment History"
              id="timesheet-tab-2"
              aria-controls="timesheet-tabpanel-2"
            />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <Box sx={{ p: 2 }}>
            <TimesheetSubmission onTimesheetSubmitted={handleTimesheetSubmitted} />
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box sx={{ p: 2 }}>
            <TimesheetHistory />
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Box sx={{ p: 2 }}>
            <PaymentHistory />
          </Box>
        </TabPanel>
      </Paper>
    </Box>
  );
};

export default TimesheetPage; 