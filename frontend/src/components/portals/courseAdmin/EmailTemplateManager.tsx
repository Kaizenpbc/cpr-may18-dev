import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TableSortLabel,
    IconButton,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Chip,
    Grid,
    Alert,
    CircularProgress,
    ToggleButton,
    ToggleButtonGroup,
    Tabs,
    Tab,
    Card,
    CardContent,
    CardActions,
    FormControlLabel,
    Switch,
    Autocomplete
} from '@mui/material';
import {
    Edit as EditIcon,
    Delete as DeleteIcon,
    Add as AddIcon,
    Preview as PreviewIcon,
    Send as SendIcon,
    FileCopy as CloneIcon,
    Code as CodeIcon,
    TextFields as TextFieldsIcon,
    Create as CreateIcon,
    Save as SaveIcon
} from '@mui/icons-material';
import Editor from "@monaco-editor/react";
import { emailTemplateApi } from '../../../services/api';
import { useSnackbar } from '../../../contexts/SnackbarContext';

interface EmailTemplate {
    _id?: string;
    id?: number | string; // Backend uses id
    name: string;
    key: string;
    subject: string;
    htmlContent: string;
    body?: string; // Backend uses body
    textContent?: string;
    description?: string;
    category: 'Instructor' | 'Organization' | 'Course Admin' | 'Accountant' | 'Sys Admin' | 'Other';
    subCategory?: string;
    eventTriggers: string[];
    availableVariables: Array<{
        name: string;
        description: string;
        sampleValue: string;
    }>;
    isActive: boolean;
    isSystem: boolean;
    createdBy?: {
        firstName: string;
        lastName: string;
    };
    lastModifiedBy?: {
        firstName: string;
        lastName: string;
    };
    usageCount?: number;
    createdAt?: string;
    updatedAt?: string;
}

interface EventTrigger {
    value: string;
    label: string;
    category: string;
}

interface TemplateVariable {
    name: string;
    description: string;
    sampleValue: string;
}

type EditorMode = 'rich' | 'html' | 'simple';
type ViewMode = 'grid' | 'table';

const categoryOptions: Record<string, string[]> = {
    'Instructor': ['On-boarding', 'Course Confirmed'],
    'Organization': ['Course Confirmed', 'Invoice sent'],
    'Course Admin': [],
    'Accountant': [],
    'Sys Admin': [],
    'Other': []
};

const EmailTemplateManager: React.FC = () => {
    console.log('[EmailTemplateManager] Component initializing');
    console.log('[EmailTemplateManager] emailTemplateApi available:', !!emailTemplateApi);
    console.log('[EmailTemplateManager] emailTemplateApi methods:', emailTemplateApi ? Object.keys(emailTemplateApi) : 'undefined');
    
    const [templates, setTemplates] = useState<EmailTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
    const [testDialogOpen, setTestDialogOpen] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
    const [editorMode, setEditorMode] = useState<EditorMode>('rich');
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState<string>('name');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [eventTriggers, setEventTriggers] = useState<EventTrigger[]>([]);
    const [commonVariables, setCommonVariables] = useState<TemplateVariable[]>([]);
    const [testEmail, setTestEmail] = useState('');
    const [previewVariables, setPreviewVariables] = useState<Record<string, string>>({});
    const { showSuccess, showError } = useSnackbar();

    // Form state for editing
    const [formData, setFormData] = useState<EmailTemplate>({
        name: '',
        key: '',
        subject: '',
        htmlContent: '',
        textContent: '',
        description: '',
        category: 'Other',
        subCategory: '',
        eventTriggers: [],
        availableVariables: [],
        isActive: true,
        isSystem: false
    });

    useEffect(() => {
        console.log('[EmailTemplateManager] Component mounted - useEffect triggered');
        console.log('[EmailTemplateManager] About to call fetchTemplates');
        fetchTemplates('all', '').catch(error => {
            console.error('[EmailTemplateManager] Error calling fetchTemplates from useEffect:', error);
        });
        console.log('[EmailTemplateManager] About to call fetchMetadata');
        fetchMetadata().catch(error => {
            console.error('[EmailTemplateManager] Error calling fetchMetadata from useEffect:', error);
        });
    }, []);

    // Add useEffect to refetch templates when filters change
    useEffect(() => {
        console.log('[EmailTemplateManager] Filters changed, refetching templates');
        console.log('[EmailTemplateManager] Current categoryFilter:', categoryFilter);
        console.log('[EmailTemplateManager] Current searchTerm:', searchTerm);
        fetchTemplates(categoryFilter, searchTerm).catch(error => {
            console.error('[EmailTemplateManager] Error refetching templates on filter change:', error);
        });
    }, [categoryFilter, searchTerm]);

    // Monitor sorting changes
    useEffect(() => {
        console.log('[EmailTemplateManager] Sort changed:', { sortBy, sortOrder });
    }, [sortBy, sortOrder]);

    // Monitor templates state changes
    useEffect(() => {
        console.log('[EmailTemplateManager] Templates state updated:', templates);
        console.log('[EmailTemplateManager] Templates count in state:', templates.length);
    }, [templates]);

    const fetchTemplates = async (currentCategoryFilter?: string, currentSearchTerm?: string) => {
        try {
            const effectiveCategoryFilter = currentCategoryFilter !== undefined ? currentCategoryFilter : categoryFilter;
            const effectiveSearchTerm = currentSearchTerm !== undefined ? currentSearchTerm : searchTerm;
            
            console.log('[EmailTemplateManager] fetchTemplates called');
            console.log('[EmailTemplateManager] Effective filters:', { 
                effectiveCategoryFilter, 
                effectiveSearchTerm,
                originalCategoryFilter: categoryFilter,
                originalSearchTerm: searchTerm
            });
            
            try {
                const params: any = {
                    active: 'true' // Explicitly request active templates
                };
                if (effectiveCategoryFilter !== 'all') {
                    params.category = effectiveCategoryFilter;
                    console.log('[EmailTemplateManager] Adding category filter:', effectiveCategoryFilter);
                }
                if (effectiveSearchTerm) {
                    params.search = effectiveSearchTerm;
                    console.log('[EmailTemplateManager] Adding search filter:', effectiveSearchTerm);
                }
                
                console.log('[EmailTemplateManager] Final API params:', params);
                
                const response = await emailTemplateApi.getAll(params);
                console.log('[EmailTemplateManager] API response:', response);
                console.log('[EmailTemplateManager] API response.data:', response.data);
                console.log('[EmailTemplateManager] API response.data type:', typeof response.data);
                console.log('[EmailTemplateManager] API response.data keys:', response.data ? Object.keys(response.data) : 'null');
                
                const templatesData = response.data.data || response.data;
                console.log('[EmailTemplateManager] Templates data:', templatesData);
                console.log('[EmailTemplateManager] Templates count:', templatesData?.length || 0);
                
                // Map backend format to frontend format
                const mappedTemplates = templatesData.map((template: any) => ({
                    ...template,
                    htmlContent: template.body, // Backend uses 'body', frontend uses 'htmlContent'
                    _id: template.id?.toString(), // Ensure _id is a string
                    subCategory: template.subCategory || '', // Map subCategory
                    eventTriggers: template.eventTriggers || [], // Provide default empty array
                    availableVariables: template.availableVariables || [], // Provide default empty array
                    description: template.description || '' // Provide default empty string
                }));
                
                console.log('[EmailTemplateManager] Mapped templates:', mappedTemplates);
                console.log('[EmailTemplateManager] First mapped template:', mappedTemplates[0]);
                
                setTemplates(mappedTemplates);
            } catch (error) {
                console.error('[EmailTemplateManager] Error fetching templates:', error);
                showError('Failed to fetch email templates');
            } finally {
                setLoading(false);
            }
        } catch (outerError) {
            console.error('[EmailTemplateManager] Unexpected error in fetchTemplates:', outerError);
            console.error('[EmailTemplateManager] Error type:', typeof outerError);
            console.error('[EmailTemplateManager] Error details:', {
                message: (outerError as any)?.message,
                stack: (outerError as any)?.stack,
                name: (outerError as any)?.name
            });
            setLoading(false);
        }
    };

    const fetchMetadata = async () => {
        try {
            const [triggersResponse, variablesResponse] = await Promise.all([
                emailTemplateApi.getEventTriggers(),
                emailTemplateApi.getTemplateVariables()
            ]);
            setEventTriggers(triggersResponse.data.data || triggersResponse.data);
            setCommonVariables(variablesResponse.data.data || variablesResponse.data);
        } catch (error) {
            console.error('Failed to fetch metadata:', error);
        }
    };

    const handleCreateTemplate = () => {
        setSelectedTemplate(null);
        setFormData({
            name: '',
            key: '',
            subject: '',
            htmlContent: '',
            textContent: '',
            description: '',
            category: 'Other',
            subCategory: '',
            eventTriggers: [],
            availableVariables: [],
            isActive: true,
            isSystem: false
        });
        setEditDialogOpen(true);
    };

    const handleEditTemplate = (template: EmailTemplate) => {
        setSelectedTemplate(template);
        // Map the template data, ensuring htmlContent is properly set
        setFormData({
            ...template,
            htmlContent: template.htmlContent || template.body || '', // Handle both formats
            eventTriggers: template.eventTriggers || [],
            availableVariables: template.availableVariables || []
        });
        setEditDialogOpen(true);
    };

    const handleSaveTemplate = async () => {
        try {
            // Generate a key from the name if not provided
            const templateKey = formData.key || formData.name.toUpperCase().replace(/\s+/g, '_');
            
            // Map frontend data to backend format - ensure all required fields are included
            const requestData = {
                name: formData.name,
                key: templateKey,
                category: formData.category, // Send as string, not array
                subCategory: formData.subCategory || '',
                subject: formData.subject,
                body: formData.htmlContent, // Backend expects 'body' not 'htmlContent'
                isActive: formData.isActive !== undefined ? formData.isActive : true
            };

            console.log('[EmailTemplateManager] Saving template with data:', requestData);

            if (selectedTemplate?._id) {
                await emailTemplateApi.update(parseInt(selectedTemplate._id), requestData);
                showSuccess('Template updated successfully');
            } else {
                await emailTemplateApi.create(requestData);
                showSuccess('Template created successfully');
            }
            setEditDialogOpen(false);
            fetchTemplates(categoryFilter, searchTerm);
        } catch (error: any) {
            console.error('[EmailTemplateManager] Error saving template:', error);
            const errorMessage = error.response?.data?.error?.message || 
                               error.response?.data?.message || 
                               error.response?.data?.error || 
                               error.message ||
                               'Failed to save template';
            showError(errorMessage);
        }
    };

    const handleDeleteTemplate = async (templateId: string) => {
        if (window.confirm('Are you sure you want to delete this template?')) {
            try {
                await emailTemplateApi.delete(parseInt(templateId));
                showSuccess('Template deleted successfully');
                fetchTemplates(categoryFilter, searchTerm);
            } catch (error: any) {
                const errorMessage = error.response?.data?.error?.message || 
                                   error.response?.data?.message || 
                                   error.response?.data?.error || 
                                   'Failed to delete template';
                showError(errorMessage);
            }
        }
    };

    const handleCloneTemplate = async (templateId: string, newName: string) => {
        try {
            await emailTemplateApi.clone(parseInt(templateId), newName);
            showSuccess('Template cloned successfully');
            fetchTemplates(categoryFilter, searchTerm);
        } catch (error: any) {
            const errorMessage = error.response?.data?.error?.message || 
                               error.response?.data?.message || 
                               error.response?.data?.error || 
                               'Failed to clone template';
            showError(errorMessage);
        }
    };

    const handlePreviewTemplate = async (template: EmailTemplate) => {
        setSelectedTemplate(template);
        const variables: Record<string, string> = {};
        template.availableVariables.forEach(v => {
            variables[v.name] = v.sampleValue;
        });
        setPreviewVariables(variables);
        setPreviewDialogOpen(true);
    };

    const handleTestEmail = async () => {
        if (!selectedTemplate || !testEmail) return;
        
        try {
            await emailTemplateApi.sendTest(parseInt(selectedTemplate._id!), testEmail, previewVariables);
            showSuccess('Test email sent successfully');
            setTestDialogOpen(false);
            setTestEmail('');
        } catch (error: any) {
            const errorMessage = error.response?.data?.error?.message || 
                               error.response?.data?.message || 
                               error.response?.data?.error || 
                               'Failed to send test email';
            showError(errorMessage);
        }
    };

    const handleColumnSort = (column: string) => {
        if (sortBy === column) {
            // If clicking the same column, toggle sort order
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            // If clicking a different column, set new sort column and default to asc
            setSortBy(column);
            setSortOrder('asc');
        }
    };

    const getSortIcon = (column: string) => {
        if (sortBy !== column) return '↕️'; // No sort indicator
        return sortOrder === 'asc' ? '↑' : '↓';
    };

    const convertToHtml = (text: string): string => {
        return text
            .split('\n\n')
            .map(paragraph => {
                if (paragraph.trim().startsWith('- ')) {
                    const items = paragraph.split('\n').map(item => 
                        `<li>${item.replace('- ', '')}</li>`
                    ).join('');
                    return `<ul>${items}</ul>`;
                }
                return `<p>${paragraph}</p>`;
            })
            .join('\n')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>');
    };

    const renderTemplateCard = (template: EmailTemplate) => (
        <Card key={template._id} sx={{ height: '100%' }}>
            <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box>
                        <Typography variant="h6" gutterBottom>
                            {template.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                            {template.description}
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Chip 
                            label={template.category} 
                            size="small" 
                            color="primary" 
                            variant="outlined"
                        />
                        {template.subCategory && (
                            <Chip 
                                label={template.subCategory} 
                                size="small" 
                                color="secondary" 
                                variant="outlined"
                            />
                        )}
                        {template.isSystem && (
                            <Chip label="System" size="small" color="warning" />
                        )}
                        <Chip 
                            label={template.isActive ? 'Active' : 'Inactive'} 
                            size="small" 
                            color={template.isActive ? 'success' : 'default'}
                        />
                    </Box>
                </Box>

                {template.eventTriggers.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                        <Typography variant="caption" color="text.secondary">
                            Event Triggers:
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                            {template.eventTriggers.map(trigger => (
                                <Chip
                                    key={trigger}
                                    label={eventTriggers.find(et => et.value === trigger)?.label || trigger}
                                    size="small"
                                    variant="outlined"
                                />
                            ))}
                        </Box>
                    </Box>
                )}

                <Typography variant="body2" color="text.secondary">
                    Subject: {template.subject}
                </Typography>
                {template.updatedAt && (
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                        Updated: {new Date(template.updatedAt).toLocaleDateString()}
                    </Typography>
                )}
            </CardContent>
            <CardActions>
                <IconButton 
                    size="small" 
                    onClick={() => handleEditTemplate(template)}
                    title={template.isSystem ? "Edit System Template" : "Edit Template"}
                >
                    <EditIcon />
                </IconButton>
                <IconButton 
                    size="small" 
                    onClick={() => handleDeleteTemplate(template._id!)}
                    title={template.isSystem ? "Cannot Delete System Template" : "Delete Template"}
                    disabled={template.isSystem}
                >
                    <DeleteIcon />
                </IconButton>
            </CardActions>
        </Card>
    );

    const filteredTemplates = templates.filter(template => {
        console.log(`[EmailTemplateManager] Filtering template "${template.name}": category="${template.category}", categoryFilter="${categoryFilter}"`);
        
        if (categoryFilter !== 'all' && template.category !== categoryFilter) {
            console.log(`[EmailTemplateManager] Template "${template.name}" filtered out by category: ${template.category} !== ${categoryFilter}`);
            return false;
        }
        
        if (searchTerm && !template.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
            !template.description?.toLowerCase().includes(searchTerm.toLowerCase())) {
            console.log(`[EmailTemplateManager] Template "${template.name}" filtered out by search term: "${searchTerm}"`);
            return false;
        }
        
        console.log(`[EmailTemplateManager] Template "${template.name}" passed all filters`);
        return true;
    });

    // Sort the filtered templates
    const sortedTemplates = [...filteredTemplates].sort((a, b) => {
        let comparison = 0;
        
        switch (sortBy) {
            case 'name':
                comparison = a.name.localeCompare(b.name);
                break;
            case 'category':
                comparison = a.category.localeCompare(b.category);
                break;
            case 'subCategory':
                const subCatA = a.subCategory || '';
                const subCatB = b.subCategory || '';
                comparison = subCatA.localeCompare(subCatB);
                break;
            case 'subject':
                comparison = a.subject.localeCompare(b.subject);
                break;
            case 'updated':
                const dateA = new Date(a.updatedAt || a.createdAt || 0);
                const dateB = new Date(b.updatedAt || b.createdAt || 0);
                comparison = dateA.getTime() - dateB.getTime();
                break;
            case 'status':
                comparison = (a.isActive === b.isActive) ? 0 : a.isActive ? -1 : 1;
                break;
            case 'system':
                comparison = (a.isSystem === b.isSystem) ? 0 : a.isSystem ? -1 : 1;
                break;
            default:
                comparison = a.name.localeCompare(b.name);
        }
        
        return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    console.log('[EmailTemplateManager] Total templates:', templates.length);
    console.log('[EmailTemplateManager] Filtered templates:', filteredTemplates.length);
    console.log('[EmailTemplateManager] Sorted templates:', sortedTemplates.length);
    console.log('[EmailTemplateManager] Current categoryFilter:', categoryFilter);
    console.log('[EmailTemplateManager] Current searchTerm:', searchTerm);
    console.log('[EmailTemplateManager] Current sortBy:', sortBy, 'order:', sortOrder);
    if (sortedTemplates.length > 0) {
        console.log('[EmailTemplateManager] First sorted template:', sortedTemplates[0]);
    }

    return (
        <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h5">
                    Email Template Manager
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleCreateTemplate}
                >
                    Create Template
                </Button>
            </Box>

            <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
                <TextField
                    placeholder="Search templates..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    size="small"
                    sx={{ flexGrow: 1 }}
                />
                <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>Category</InputLabel>
                    <Select
                        value={categoryFilter}
                        onChange={(e) => {
                            const newCategory = e.target.value;
                            console.log('[EmailTemplateManager] Category dropdown changed from:', categoryFilter, 'to:', newCategory);
                            setCategoryFilter(newCategory);
                        }}
                        label="Category"
                    >
                        <MenuItem value="all">All Categories</MenuItem>
                        <MenuItem value="Instructor">Instructor</MenuItem>
                        <MenuItem value="Organization">Organization</MenuItem>
                        <MenuItem value="Course Admin">Course Admin</MenuItem>
                        <MenuItem value="Accountant">Accountant</MenuItem>
                        <MenuItem value="Sys Admin">Sys Admin</MenuItem>
                        <MenuItem value="Other">Other</MenuItem>
                    </Select>
                </FormControl>
                <ToggleButtonGroup
                    value={viewMode}
                    exclusive
                    onChange={(_, newMode) => newMode && setViewMode(newMode)}
                    size="small"
                >
                    <ToggleButton value="grid">Grid</ToggleButton>
                    <ToggleButton value="table">Table</ToggleButton>
                </ToggleButtonGroup>
            </Box>

            {/* Filter Status and Results */}
            <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary">
                    Showing {sortedTemplates.length} of {templates.length} templates
                    {categoryFilter !== 'all' && (
                        <Chip 
                            label={`Category: ${categoryFilter}`} 
                            size="small" 
                            sx={{ ml: 1 }}
                            onDelete={() => setCategoryFilter('all')}
                        />
                    )}
                    {searchTerm && (
                        <Chip 
                            label={`Search: "${searchTerm}"`} 
                            size="small" 
                            sx={{ ml: 1 }}
                            onDelete={() => setSearchTerm('')}
                        />
                    )}
                </Typography>
            </Box>

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                </Box>
            ) : viewMode === 'grid' ? (
                <Grid container spacing={3}>
                    {sortedTemplates.map(template => (
                        <Grid item xs={12} md={6} lg={4} key={template._id}>
                            {renderTemplateCard(template)}
                        </Grid>
                    ))}
                </Grid>
            ) : (
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>
                                    <TableSortLabel
                                        active={sortBy === 'name'}
                                        direction={sortBy === 'name' ? sortOrder : 'asc'}
                                        onClick={() => handleColumnSort('name')}
                                    >
                                        Name
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell>
                                    <TableSortLabel
                                        active={sortBy === 'category'}
                                        direction={sortBy === 'category' ? sortOrder : 'asc'}
                                        onClick={() => handleColumnSort('category')}
                                    >
                                        Category
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell>
                                    <TableSortLabel
                                        active={sortBy === 'subCategory'}
                                        direction={sortBy === 'subCategory' ? sortOrder : 'asc'}
                                        onClick={() => handleColumnSort('subCategory')}
                                    >
                                        Sub-Category
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell>
                                    <TableSortLabel
                                        active={sortBy === 'subject'}
                                        direction={sortBy === 'subject' ? sortOrder : 'asc'}
                                        onClick={() => handleColumnSort('subject')}
                                    >
                                        Subject
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell>
                                    <TableSortLabel
                                        active={sortBy === 'status'}
                                        direction={sortBy === 'status' ? sortOrder : 'asc'}
                                        onClick={() => handleColumnSort('status')}
                                    >
                                        Status
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell>
                                    <TableSortLabel
                                        active={sortBy === 'updated'}
                                        direction={sortBy === 'updated' ? sortOrder : 'asc'}
                                        onClick={() => handleColumnSort('updated')}
                                    >
                                        Last Updated
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {sortedTemplates.map(template => (
                                <TableRow key={template._id}>
                                    <TableCell>
                                        {template.name}
                                        {template.isSystem && (
                                            <Chip label="System" size="small" sx={{ ml: 1 }} />
                                        )}
                                    </TableCell>
                                    <TableCell>{template.category}</TableCell>
                                    <TableCell>{template.subCategory}</TableCell>
                                    <TableCell>{template.subject}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={template.isActive ? 'Active' : 'Inactive'}
                                            size="small"
                                            color={template.isActive ? 'success' : 'default'}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        {template.updatedAt ? (
                                            <Typography variant="caption" color="text.secondary">
                                                {new Date(template.updatedAt).toLocaleDateString()}
                                            </Typography>
                                        ) : (
                                            <Typography variant="caption" color="text.secondary">
                                                -
                                            </Typography>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', gap: 1 }}>
                                            <IconButton
                                                size="small"
                                                onClick={() => handleEditTemplate(template)}
                                                title={template.isSystem ? "Edit System Template" : "Edit Template"}
                                            >
                                                <EditIcon />
                                            </IconButton>
                                            <IconButton
                                                size="small"
                                                onClick={() => handleDeleteTemplate(template._id!)}
                                                title={template.isSystem ? "Cannot Delete System Template" : "Delete Template"}
                                                disabled={template.isSystem}
                                            >
                                                <DeleteIcon />
                                            </IconButton>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Edit/Create Dialog */}
            <Dialog
                open={editDialogOpen}
                onClose={() => setEditDialogOpen(false)}
                maxWidth="lg"
                fullWidth
            >
                <DialogTitle>
                    {selectedTemplate ? 'Edit Email Template' : 'Create Email Template'}
                </DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12} md={6}>
                            <TextField
                                label="Template Name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                fullWidth
                                required
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth>
                                <InputLabel>Category</InputLabel>
                                <Select
                                    value={formData.category}
                                    onChange={(e) => setFormData({ 
                                        ...formData, 
                                        category: e.target.value as any,
                                        subCategory: '' // Reset subcategory when category changes
                                    })}
                                    label="Category"
                                >
                                    <MenuItem value="Instructor">Instructor</MenuItem>
                                    <MenuItem value="Organization">Organization</MenuItem>
                                    <MenuItem value="Course Admin">Course Admin</MenuItem>
                                    <MenuItem value="Accountant">Accountant</MenuItem>
                                    <MenuItem value="Sys Admin">Sys Admin</MenuItem>
                                    <MenuItem value="Other">Other</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth>
                                <InputLabel>Sub-Category</InputLabel>
                                <Select
                                    value={formData.subCategory}
                                    onChange={(e) => setFormData({ ...formData, subCategory: e.target.value })}
                                    label="Sub-Category"
                                    disabled={!categoryOptions[formData.category] || categoryOptions[formData.category].length === 0}
                                >
                                    {categoryOptions[formData.category]?.map(subCat => (
                                        <MenuItem key={subCat} value={subCat}>{subCat}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                label="Description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                fullWidth
                                multiline
                                rows={2}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                label="Subject Line"
                                value={formData.subject}
                                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                fullWidth
                                required
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <Autocomplete
                                multiple
                                options={eventTriggers}
                                getOptionLabel={(option) => option.label}
                                value={eventTriggers.filter(et => formData.eventTriggers.includes(et.value))}
                                onChange={(_, newValue) => {
                                    setFormData({
                                        ...formData,
                                        eventTriggers: newValue.map(v => v.value)
                                    });
                                }}
                                renderInput={(params) => (
                                    <TextField {...params} label="Event Triggers" />
                                )}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <Autocomplete
                                multiple
                                options={commonVariables}
                                getOptionLabel={(option) => `${option.name} - ${option.description}`}
                                value={formData.availableVariables}
                                onChange={(_, newValue) => {
                                    setFormData({
                                        ...formData,
                                        availableVariables: newValue
                                    });
                                }}
                                renderInput={(params) => (
                                    <TextField {...params} label="Available Variables" />
                                )}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="subtitle2">Email Content</Typography>
                                <ToggleButtonGroup
                                    value={editorMode}
                                    exclusive
                                    onChange={(_, newMode) => newMode && setEditorMode(newMode)}
                                    size="small"
                                >
                                    <ToggleButton value="rich">Rich Text</ToggleButton>
                                    <ToggleButton value="html">HTML</ToggleButton>
                                    <ToggleButton value="simple">Simple</ToggleButton>
                                </ToggleButtonGroup>
                            </Box>
                            {editorMode === 'html' ? (
                                <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, height: 400 }}>
                                    <Editor
                                        height="400px"
                                        defaultLanguage="html"
                                        value={formData.htmlContent}
                                        onChange={(value) => setFormData({ ...formData, htmlContent: value || '' })}
                                        options={{
                                            minimap: { enabled: false },
                                            fontSize: 14,
                                            wordWrap: 'on'
                                        }}
                                    />
                                </Box>
                            ) : editorMode === 'simple' ? (
                                <TextField
                                    value={formData.textContent || ''}
                                    onChange={(e) => {
                                        const text = e.target.value;
                                        setFormData({
                                            ...formData,
                                            textContent: text,
                                            htmlContent: convertToHtml(text)
                                        });
                                    }}
                                    fullWidth
                                    multiline
                                    rows={15}
                                    placeholder="Write your email in simple text format..."
                                />
                            ) : (
                                <TextField
                                    value={formData.htmlContent}
                                    onChange={(e) => setFormData({ ...formData, htmlContent: e.target.value })}
                                    fullWidth
                                    multiline
                                    rows={15}
                                    placeholder="Enter HTML content..."
                                />
                            )}
                        </Grid>
                        <Grid item xs={12}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={formData.isActive}
                                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                    />
                                }
                                label="Active"
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
                    <Button
                        onClick={handleSaveTemplate}
                        variant="contained"
                        startIcon={<SaveIcon />}
                    >
                        Save
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Preview Dialog */}
            <Dialog
                open={previewDialogOpen}
                onClose={() => setPreviewDialogOpen(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    Template Preview
                    <Typography variant="caption" display="block" color="text.secondary">
                        Using sample data for preview
                    </Typography>
                </DialogTitle>
                <DialogContent>
                    {selectedTemplate && (
                        <>
                            <Box sx={{ mb: 3 }}>
                                <Typography variant="subtitle2" gutterBottom>
                                    Variables:
                                </Typography>
                                <Grid container spacing={1}>
                                    {selectedTemplate.availableVariables.map(variable => (
                                        <Grid item xs={12} sm={6} key={variable.name}>
                                            <TextField
                                                size="small"
                                                label={variable.name}
                                                value={previewVariables[variable.name] || ''}
                                                onChange={(e) => setPreviewVariables({
                                                    ...previewVariables,
                                                    [variable.name]: e.target.value
                                                })}
                                                fullWidth
                                                helperText={variable.description}
                                            />
                                        </Grid>
                                    ))}
                                </Grid>
                            </Box>
                            <Box sx={{ border: 1, borderColor: 'divider', p: 2, borderRadius: 1 }}>
                                <Typography variant="subtitle2">Subject:</Typography>
                                <Typography sx={{ mb: 2 }}>
                                    {selectedTemplate.subject.replace(/\{\{(\w+)\}\}/g, (_, key) => 
                                        previewVariables[key] || `{{${key}}}`
                                    )}
                                </Typography>
                                <Typography variant="subtitle2">Body:</Typography>
                                <Box 
                                    dangerouslySetInnerHTML={{ 
                                        __html: (selectedTemplate.htmlContent || selectedTemplate.body || '').replace(/\{\{(\w+)\}\}/g, (_, key) => 
                                            previewVariables[key] || `{{${key}}}`
                                        )
                                    }} 
                                />
                            </Box>
                        </>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPreviewDialogOpen(false)}>Close</Button>
                    <Button
                        onClick={() => {
                            setTestDialogOpen(true);
                            setPreviewDialogOpen(false);
                        }}
                        variant="contained"
                        startIcon={<SendIcon />}
                    >
                        Send Test
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Test Email Dialog */}
            <Dialog
                open={testDialogOpen}
                onClose={() => setTestDialogOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Send Test Email</DialogTitle>
                <DialogContent>
                    <TextField
                        label="Recipient Email"
                        type="email"
                        value={testEmail}
                        onChange={(e) => setTestEmail(e.target.value)}
                        fullWidth
                        sx={{ mt: 2 }}
                        helperText="Enter the email address to send the test to"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setTestDialogOpen(false)}>Cancel</Button>
                    <Button
                        onClick={handleTestEmail}
                        variant="contained"
                        startIcon={<SendIcon />}
                        disabled={!testEmail}
                    >
                        Send Test
                    </Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
};

export default EmailTemplateManager; 