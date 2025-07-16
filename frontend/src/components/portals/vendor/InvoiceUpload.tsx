console.log('📦 [INVOICE UPLOAD] Module loaded');

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  SelectChangeEvent,
  Snackbar
} from '@mui/material';
import { Upload as UploadIcon, AttachFile as AttachFileIcon } from '@mui/icons-material';
import { vendorApi } from '../../../services/api';
import { useNavigate } from 'react-router-dom';

const InvoiceUpload: React.FC = () => {
  try {
    console.log('🔄 [INVOICE UPLOAD] Component rendered');
    console.log('🔄 [INVOICE UPLOAD] Component function called successfully');
    
    // Set default dates
    const today = new Date().toISOString().split('T')[0];
    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 30 days from now

    const [formData, setFormData] = useState({
      invoice_number: '',
      amount: '',
      description: '',
      invoice_date: today,
      due_date: dueDate,
      manual_type: '',
      quantity: ''
    });
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const navigate = useNavigate();

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    };

    const handleSelectChange = (e: SelectChangeEvent<string>) => {
      const { name, value } = e.target;
      setFormData(prev => ({
        ...prev,
        [name as string]: value
      }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        const selectedFile = e.target.files[0];
        
        // Validate file type
        if (selectedFile.type !== 'application/pdf') {
          setError('Please select a valid PDF file.');
          return;
        }
        
        // Validate file size (5MB limit)
        if (selectedFile.size > 5 * 1024 * 1024) {
          setError('File size must be less than 5MB.');
          return;
        }
        
        setFile(selectedFile);
        setError(null); // Clear any previous errors
      }
    };

    const formatFileSize = (bytes: number): string => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      console.log('🚀 [INVOICE UPLOAD] Form submission started');
      console.log('📋 [INVOICE UPLOAD] Form data:', formData);
      console.log('📁 [INVOICE UPLOAD] File:', file);
      
      setLoading(true);
      setError(null);
      setSuccess(null);

      try {
        // Validate required fields
        if (!formData.invoice_number || !formData.amount || !formData.description || !formData.invoice_date) {
          console.log('❌ [INVOICE UPLOAD] Validation failed - missing required fields');
          setError('Please fill in all required fields.');
          setLoading(false);
          return;
        }

        if (!file) {
          console.log('❌ [INVOICE UPLOAD] Validation failed - no file selected');
          setError('Please select an invoice PDF file.');
          setLoading(false);
          return;
        }

        // Validate file type
        if (file.type !== 'application/pdf') {
          console.log('❌ [INVOICE UPLOAD] Validation failed - invalid file type:', file.type);
          setError('Please select a valid PDF file.');
          setLoading(false);
          return;
        }

        // Validate file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
          console.log('❌ [INVOICE UPLOAD] Validation failed - file too large:', file.size);
          setError('File size must be less than 5MB.');
          setLoading(false);
          return;
        }

        console.log('✅ [INVOICE UPLOAD] Validation passed, preparing FormData');

        const formDataToSend = new FormData();
        Object.entries(formData).forEach(([key, value]) => {
          if (value) {
            formDataToSend.append(key, value);
            console.log(`📝 [INVOICE UPLOAD] Added to FormData: ${key} = ${value}`);
          }
        });
        if (file) {
          formDataToSend.append('invoice_pdf', file);
          console.log(`📁 [INVOICE UPLOAD] Added file to FormData: ${file.name}`);
        }

        console.log('🚀 [INVOICE UPLOAD] Making API call to upload invoice');
        
        // Make API call to upload invoice
        const response = await vendorApi.uploadInvoice(formDataToSend);

        console.log('✅ [INVOICE UPLOAD] API response received:', response);

        if (response) {
          setSuccess('Invoice uploaded successfully!');
          setSnackbarOpen(true);
          setFormData({
            invoice_number: '',
            amount: '',
            description: '',
            invoice_date: today,
            due_date: dueDate,
            manual_type: '',
            quantity: ''
          });
          setFile(null);
          // After a short delay, navigate to history and trigger refresh
          setTimeout(() => {
            navigate('/vendor/history', { state: { refresh: true } });
          }, 1200);
          console.log('✅ [INVOICE UPLOAD] Form reset and success message set');
        }
      } catch (err: any) {
        console.error('❌ [INVOICE UPLOAD] Upload error:', err);
        if (err.response?.data?.error) {
          setError(err.response.data.error);
        } else if (err.message) {
          setError(err.message);
        } else {
          setError('Failed to upload invoice. Please try again.');
        }
      } finally {
        setLoading(false);
        console.log('🏁 [INVOICE UPLOAD] Form submission completed');
      }
    };

    const handleButtonClick = () => {
      console.log('🖱️ [INVOICE UPLOAD] Submit button clicked');
    };

    console.log('🔄 [INVOICE UPLOAD] About to render full JSX');

    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Upload Invoice
        </Typography>

        <Paper sx={{ p: 3, maxWidth: 800 }}>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Please fill in the invoice details below and select your PDF file, then click "Upload Invoice" to submit.
          </Typography>
          
          <form onSubmit={(e) => {
            console.log('📝 [INVOICE UPLOAD] Form onSubmit triggered');
            handleSubmit(e);
          }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Invoice Number *"
                  name="invoice_number"
                  value={formData.invoice_number}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., INV-2024-001"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Amount *"
                  name="amount"
                  type="number"
                  value={formData.amount}
                  onChange={handleInputChange}
                  required
                  placeholder="0.00"
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description *"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  multiline
                  rows={3}
                  required
                  placeholder="Describe the goods or services..."
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Invoice Date *"
                  name="invoice_date"
                  type="date"
                  value={formData.invoice_date}
                  onChange={handleInputChange}
                  required
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Due Date"
                  name="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={handleInputChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Manual Type</InputLabel>
                  <Select
                    name="manual_type"
                    value={formData.manual_type}
                    onChange={handleSelectChange}
                    label="Manual Type"
                  >
                    <MenuItem value="training">Training Manual</MenuItem>
                    <MenuItem value="safety">Safety Manual</MenuItem>
                    <MenuItem value="procedural">Procedural Manual</MenuItem>
                    <MenuItem value="other">Other</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Quantity"
                  name="quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={handleInputChange}
                  placeholder="1"
                />
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Invoice PDF File *
                </Typography>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<AttachFileIcon />}
                  fullWidth
                  sx={{ py: 2, mb: 1 }}
                  color={file ? "success" : "primary"}
                >
                  {file ? `${file.name} (${formatFileSize(file.size)})` : 'Choose PDF File'}
                  <input
                    type="file"
                    hidden
                    accept=".pdf"
                    onChange={handleFileChange}
                  />
                </Button>
                {file && (
                  <Typography variant="caption" color="success.main" sx={{ display: 'block' }}>
                    ✓ File selected: {file.name} - {formatFileSize(file.size)}
                  </Typography>
                )}
                {!file && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Please select a PDF file (max 5MB)
                  </Typography>
                )}
              </Grid>

              {error && (
                <Grid item xs={12}>
                  <Alert severity="error">{error}</Alert>
                </Grid>
              )}

              <Grid item xs={12}>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={loading ? <CircularProgress size={20} /> : <UploadIcon />}
                  disabled={loading || !file}
                  fullWidth
                  size="large"
                  sx={{ 
                    py: 2, 
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                    backgroundColor: file ? '#1976d2' : '#ccc'
                  }}
                >
                  {loading ? 'Uploading...' : 'Upload Invoice'}
                </Button>
                {!file && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>
                    Please select a PDF file to enable upload
                  </Typography>
                )}
              </Grid>
            </Grid>
          </form>
        </Paper>
        <Snackbar
          open={snackbarOpen}
          autoHideDuration={2000}
          onClose={() => setSnackbarOpen(false)}
          message={success}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        />
      </Box>
    );
  } catch (error) {
    console.error('❌ [INVOICE UPLOAD] Component error:', error);
    return (
      <div>
        <h2>Error loading upload component</h2>
        <p>Error: {error instanceof Error ? error.message : 'Unknown error'}</p>
      </div>
    );
  }
};

export default InvoiceUpload; 