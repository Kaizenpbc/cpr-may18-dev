import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Paper,
    Tabs,
    Tab,
    TextField,
    Button,
    Alert,
    CircularProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    Tooltip,
    Grid
} from '@mui/material';
import {
    Preview as PreviewIcon,
    Save as SaveIcon,
    Refresh as ResetIcon
} from '@mui/icons-material';
import { api } from '../../../services/api';
import { useSnackbar } from '../../../contexts/SnackbarContext';

interface EmailTemplate {
    id: string;
    name: string;
    subject: string;
    html: string;
    description: string;
    lastModified?: string;
}

const defaultTemplates = {
    COURSE_ASSIGNED_INSTRUCTOR: {
        id: 'COURSE_ASSIGNED_INSTRUCTOR',
        name: 'Instructor Course Assignment',
        subject: 'New Course Assignment',
        description: 'Sent to instructors when they are assigned to a course',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #007bff;">New Course Assignment</h2>
                <p>You have been assigned to teach a new course:</p>
                <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
                    <p><strong>Course Type:</strong> {{courseType}}</p>
                    <p><strong>Date:</strong> {{date}}</p>
                    <p><strong>Time:</strong> {{startTime}} - {{endTime}}</p>
                    <p><strong>Location:</strong> {{location}}</p>
                    <p><strong>Organization:</strong> {{organization}}</p>
                    <p><strong>Number of Students:</strong> {{students}}</p>
                </div>
                <div style="margin: 20px 0; padding: 15px; background-color: #fff3cd; border-radius: 5px;">
                    <p style="margin: 0;"><strong>Important:</strong> Please review these details in your instructor portal and arrive 15 minutes before the class start time.</p>
                </div>
                <p style="color: #6c757d; font-size: 0.9em;">This is an automated message, please do not reply.</p>
            </div>
        `
    },
    COURSE_SCHEDULED_ORGANIZATION: {
        id: 'COURSE_SCHEDULED_ORGANIZATION',
        name: 'Organization Course Confirmation',
        subject: 'Course Request Confirmed',
        description: 'Sent to organizations when an instructor is assigned to their course request',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #007bff;">Course Request Confirmed</h2>
                <p>Your course request has been confirmed and an instructor has been assigned:</p>
                <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
                    <p><strong>Course Type:</strong> {{courseType}}</p>
                    <p><strong>Date:</strong> {{date}}</p>
                    <p><strong>Time:</strong> {{startTime}} - {{endTime}}</p>
                    <p><strong>Location:</strong> {{location}}</p>
                    <p><strong>Instructor:</strong> {{instructorName}}</p>
                    <p><strong>Number of Students:</strong> {{students}}</p>
                </div>
                <p>You can view the full details and manage your courses through your organization portal.</p>
                <p style="color: #6c757d; font-size: 0.9em;">This is an automated message, please do not reply.</p>
            </div>
        `
    }
};

const EmailTemplateManager: React.FC = () => {
    const [selectedTemplate, setSelectedTemplate] = useState<string>('COURSE_ASSIGNED_INSTRUCTOR');
    const [templates, setTemplates] = useState<Record<string, EmailTemplate>>(defaultTemplates);
    const [editedTemplate, setEditedTemplate] = useState<EmailTemplate | null>(null);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { showSuccess, showError } = useSnackbar();

    useEffect(() => {
        setEditedTemplate(templates[selectedTemplate]);
    }, [selectedTemplate]);

    const handleTemplateChange = (event: React.SyntheticEvent, newValue: string) => {
        setSelectedTemplate(newValue);
    };

    const handleInputChange = (field: keyof EmailTemplate) => (
        event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        if (editedTemplate) {
            setEditedTemplate({
                ...editedTemplate,
                [field]: event.target.value
            });
        }
    };

    const handleSave = async () => {
        if (!editedTemplate) return;
        
        setLoading(true);
        setError(null);
        
        try {
            // In a real implementation, this would save to the backend
            setTemplates(prev => ({
                ...prev,
                [selectedTemplate]: {
                    ...editedTemplate,
                    lastModified: new Date().toISOString()
                }
            }));
            
            showSuccess('Template saved successfully');
        } catch (err) {
            setError('Failed to save template');
            showError('Failed to save template');
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setEditedTemplate(defaultTemplates[selectedTemplate]);
        showSuccess('Template reset to default');
    };

    const handlePreview = () => {
        setPreviewOpen(true);
    };

    const replaceVariables = (template: string) => {
        const sampleData = {
            courseType: 'Basic CPR Training',
            date: 'January 15th, 2024',
            startTime: '09:00',
            endTime: '12:00',
            location: 'Main Training Center',
            organization: 'Sample Organization',
            instructorName: 'John Smith',
            students: '10'
        };

        return template.replace(/{{(\w+)}}/g, (match, variable) => 
            sampleData[variable as keyof typeof sampleData] || match
        );
    };

    return (
        <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
            <Typography variant="h5" gutterBottom>
                Email Template Manager
            </Typography>
            
            <Typography variant="body2" color="text.secondary" paragraph>
                Manage email templates for course assignments. Use {{variableName}} syntax for dynamic content.
            </Typography>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            <Tabs
                value={selectedTemplate}
                onChange={handleTemplateChange}
                sx={{ mb: 3 }}
            >
                <Tab 
                    label="Instructor Assignment" 
                    value="COURSE_ASSIGNED_INSTRUCTOR"
                />
                <Tab 
                    label="Organization Confirmation" 
                    value="COURSE_SCHEDULED_ORGANIZATION"
                />
            </Tabs>

            {editedTemplate && (
                <Box sx={{ mt: 2 }}>
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <TextField
                                label="Template Name"
                                value={editedTemplate.name}
                                onChange={handleInputChange('name')}
                                fullWidth
                                margin="normal"
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                label="Subject Line"
                                value={editedTemplate.subject}
                                onChange={handleInputChange('subject')}
                                fullWidth
                                margin="normal"
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                label="HTML Content"
                                value={editedTemplate.html}
                                onChange={handleInputChange('html')}
                                fullWidth
                                multiline
                                rows={15}
                                margin="normal"
                            />
                        </Grid>
                    </Grid>

                    <Box sx={{ mt: 2, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                        <Button
                            startIcon={<ResetIcon />}
                            onClick={handleReset}
                            color="warning"
                        >
                            Reset to Default
                        </Button>
                        <Button
                            startIcon={<PreviewIcon />}
                            onClick={handlePreview}
                            color="info"
                        >
                            Preview
                        </Button>
                        <Button
                            startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
                            onClick={handleSave}
                            variant="contained"
                            disabled={loading}
                        >
                            Save Changes
                        </Button>
                    </Box>
                </Box>
            )}

            {/* Preview Dialog */}
            <Dialog
                open={previewOpen}
                onClose={() => setPreviewOpen(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    Template Preview
                    <Typography variant="caption" display="block" color="text.secondary">
                        Sample data is used for preview
                    </Typography>
                </DialogTitle>
                <DialogContent>
                    {editedTemplate && (
                        <>
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="subtitle2">Subject:</Typography>
                                <Typography>{editedTemplate.subject}</Typography>
                            </Box>
                            <Box>
                                <Typography variant="subtitle2">Body:</Typography>
                                <Box 
                                    sx={{ mt: 1 }} 
                                    dangerouslySetInnerHTML={{ 
                                        __html: replaceVariables(editedTemplate.html) 
                                    }} 
                                />
                            </Box>
                        </>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPreviewOpen(false)}>Close</Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
};

export default EmailTemplateManager; 