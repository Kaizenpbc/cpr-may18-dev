import React, { useState } from 'react';
import {
    Box,
    Tab,
    Tabs,
    Typography,
    Paper,
    Container
} from '@mui/material';
import {
    Dashboard as DashboardIcon,
    People as PeopleIcon,
    Event as EventIcon,
    Email as EmailIcon,
    Settings as SettingsIcon
} from '@mui/icons-material';
import InstructorManagement from './InstructorManagement';
import CourseScheduling from './CourseScheduling';
import EmailTemplateManager from './EmailTemplateManager';
import DashboardView from './DashboardView';

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

const TabPanel = (props: TabPanelProps) => {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`course-admin-tabpanel-${index}`}
            aria-labelledby={`course-admin-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box sx={{ p: 3 }}>
                    {children}
                </Box>
            )}
        </div>
    );
};

const tabs = [
    {
        label: 'Dashboard',
        icon: <DashboardIcon />,
        component: <DashboardView />
    },
    {
        label: 'Instructor Management',
        icon: <PeopleIcon />,
        component: <InstructorManagement />
    },
    {
        label: 'Course Scheduling',
        icon: <EventIcon />,
        component: <CourseScheduling />
    },
    {
        label: 'Email Templates',
        icon: <EmailIcon />,
        component: <EmailTemplateManager />
    }
];

const CourseAdminPortal: React.FC = () => {
    const [selectedTab, setSelectedTab] = useState(0);

    const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
        setSelectedTab(newValue);
    };

    return (
        <Container maxWidth="xl">
            <Paper elevation={3} sx={{ mt: 3, mb: 3 }}>
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs
                        value={selectedTab}
                        onChange={handleTabChange}
                        variant="scrollable"
                        scrollButtons="auto"
                        aria-label="course admin tabs"
                    >
                        {tabs.map((tab, index) => (
                            <Tab
                                key={tab.label}
                                icon={tab.icon}
                                label={tab.label}
                                id={`course-admin-tab-${index}`}
                                aria-controls={`course-admin-tabpanel-${index}`}
                            />
                        ))}
                    </Tabs>
                </Box>

                {tabs.map((tab, index) => (
                    <TabPanel key={tab.label} value={selectedTab} index={index}>
                        {tab.component}
                    </TabPanel>
                ))}
            </Paper>
        </Container>
    );
};

export default CourseAdminPortal; 