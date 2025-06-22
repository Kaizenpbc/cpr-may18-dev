import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import { CloudUpload as UploadIcon } from '@mui/icons-material';

interface CSVUploadDialogProps {
  open: boolean;
  onClose: () => void;
  onUploadSuccess?: (data: any) => void;
  title?: string;
  description?: string;
}

const CSVUploadDialog: React.FC<CSVUploadDialogProps> = ({
  open,
  onClose,
  onUploadSuccess,
  title = 'Upload CSV File',
  description = 'Select a CSV file to upload',
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('[TRACE] CSVUploadDialog - handleFileSelect called');
    const file = event.target.files?.[0];
    console.log('[TRACE] CSVUploadDialog - Selected file:', file);
    
    if (file) {
      console.log('[TRACE] CSVUploadDialog - File details:', {
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified
      });
      
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        console.log('[TRACE] CSVUploadDialog - File validation passed');
        setSelectedFile(file);
        setError(null);
      } else {
        console.log('[TRACE] CSVUploadDialog - File validation failed');
        setError('Please select a valid CSV file');
        setSelectedFile(null);
      }
    } else {
      console.log('[TRACE] CSVUploadDialog - No file selected');
    }
  };

  const handleUpload = async () => {
    console.log('[TRACE] CSVUploadDialog - handleUpload called');
    console.log('[TRACE] CSVUploadDialog - Selected file:', selectedFile);
    
    if (!selectedFile) {
      console.log('[TRACE] CSVUploadDialog - No file selected, showing error');
      setError('Please select a file first');
      return;
    }

    console.log('[TRACE] CSVUploadDialog - Starting upload process');
    setUploading(true);
    setError(null);

    try {
      console.log('[TRACE] CSVUploadDialog - Reading file content...');
      const text = await selectedFile.text();
      console.log('[TRACE] CSVUploadDialog - File content read successfully');
      console.log('[TRACE] CSVUploadDialog - Content length:', text.length);
      console.log('[TRACE] CSVUploadDialog - Content preview:', text.substring(0, 200));
      
      // TODO: Parse CSV and send to backend
      // This is step 1 - just reading the file
      
      console.log('[TRACE] CSVUploadDialog - Calling onUploadSuccess callback');
      const result = { fileName: selectedFile.name, content: text };
      console.log('[TRACE] CSVUploadDialog - Result data:', result);
      
      onUploadSuccess?.(result);
      console.log('[TRACE] CSVUploadDialog - Upload success callback completed');
      
      console.log('[TRACE] CSVUploadDialog - Closing dialog');
      onClose();
    } catch (err) {
      console.error('[TRACE] CSVUploadDialog - Upload error:', err);
      setError('Failed to read file');
    } finally {
      console.log('[TRACE] CSVUploadDialog - Setting uploading to false');
      setUploading(false);
    }
  };

  const handleClose = () => {
    console.log('[TRACE] CSVUploadDialog - handleClose called');
    setSelectedFile(null);
    setError(null);
    setUploading(false);
    onClose();
  };

  console.log('[TRACE] CSVUploadDialog - Rendering with props:', {
    open,
    hasSelectedFile: !!selectedFile,
    uploading,
    error
  });

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="textSecondary" gutterBottom>
          {description}
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ textAlign: 'center', py: 3 }}>
          <input
            accept=".csv"
            style={{ display: 'none' }}
            id="csv-file-input"
            type="file"
            onChange={handleFileSelect}
          />
          <label htmlFor="csv-file-input">
            <Button
              variant="outlined"
              component="span"
              startIcon={<UploadIcon />}
              disabled={uploading}
            >
              Choose CSV File
            </Button>
          </label>
          
          {selectedFile && (
            <Typography variant="body2" sx={{ mt: 2 }}>
              Selected: {selectedFile.name}
            </Typography>
          )}
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={handleClose} disabled={uploading}>
          Cancel
        </Button>
        <Button
          onClick={handleUpload}
          variant="contained"
          disabled={!selectedFile || uploading}
          startIcon={uploading ? <CircularProgress size={20} /> : null}
        >
          {uploading ? 'Uploading...' : 'Upload'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CSVUploadDialog; 