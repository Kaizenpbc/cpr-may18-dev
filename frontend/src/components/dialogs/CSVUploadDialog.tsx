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
import { parseCSV, ParsedCSVResult } from '../../utils/csvParser';
import { organizationApi } from '../../services/api';

interface CSVUploadDialogProps {
  open: boolean;
  onClose: () => void;
  onUploadSuccess?: (data: any) => void;
  title?: string;
  description?: string;
  courseRequestId?: number;
  organizationId?: number;
}

const CSVUploadDialog: React.FC<CSVUploadDialogProps> = ({
  open,
  onClose,
  onUploadSuccess,
  title = 'Upload CSV File',
  description = 'Select a CSV file to upload',
  courseRequestId,
  organizationId,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parseResult, setParseResult] = useState<ParsedCSVResult | null>(null);

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
        setParseResult(null);
      } else {
        console.log('[TRACE] CSVUploadDialog - File validation failed');
        setError('Please select a valid CSV file');
        setSelectedFile(null);
        setParseResult(null);
      }
    } else {
      console.log('[TRACE] CSVUploadDialog - No file selected');
    }
  };

  const handleUpload = async () => {
    console.log('[TRACE] CSVUploadDialog - handleUpload called');
    console.log('[TRACE] CSVUploadDialog - Selected file:', selectedFile);
    console.log('[TRACE] CSVUploadDialog - Course request ID:', courseRequestId);
    console.log('[TRACE] CSVUploadDialog - Organization ID:', organizationId);
    
    if (!selectedFile) {
      console.log('[TRACE] CSVUploadDialog - No file selected, showing error');
      setError('Please select a file first');
      return;
    }

    if (!courseRequestId) {
      console.log('[TRACE] CSVUploadDialog - No course request ID, showing error');
      setError('Course information is missing');
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
      
      // Parse CSV
      console.log('[TRACE] CSVUploadDialog - Parsing CSV...');
      const parsed = parseCSV(text, courseRequestId, organizationId);
      setParseResult(parsed);
      console.log('[TRACE] CSVUploadDialog - Parse result:', parsed);
      
      if (!parsed.success) {
        console.log('[TRACE] CSVUploadDialog - CSV parsing failed');
        setError(`CSV parsing failed: ${parsed.errors.join(', ')}`);
        return;
      }

      if (parsed.students.length === 0) {
        console.log('[TRACE] CSVUploadDialog - No valid students found');
        setError('No valid student data found in CSV');
        return;
      }

      // Send to backend
      console.log('[TRACE] CSVUploadDialog - Sending to backend API...');
      const response = await organizationApi.uploadStudents(courseRequestId, parsed.students);
      console.log('[TRACE] CSVUploadDialog - Backend response:', response);
      
      console.log('[TRACE] CSVUploadDialog - Calling onUploadSuccess callback');
      const result = { 
        fileName: selectedFile.name, 
        content: text,
        parsed: parsed,
        response: response
      };
      console.log('[TRACE] CSVUploadDialog - Result data:', result);
      
      onUploadSuccess?.(result);
      console.log('[TRACE] CSVUploadDialog - Upload success callback completed');
      
      console.log('[TRACE] CSVUploadDialog - Closing dialog');
      onClose();
    } catch (err) {
      console.error('[TRACE] CSVUploadDialog - Upload error:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload file');
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
    setParseResult(null);
    onClose();
  };

  console.log('[TRACE] CSVUploadDialog - Rendering with props:', {
    open,
    hasSelectedFile: !!selectedFile,
    uploading,
    error,
    courseRequestId,
    organizationId
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

        {parseResult && parseResult.errors.length > 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2" gutterBottom>
              CSV parsed with {parseResult.errors.length} errors:
            </Typography>
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              {parseResult.errors.slice(0, 3).map((error, index) => (
                <li key={index}>
                  <Typography variant="body2">{error}</Typography>
                </li>
              ))}
            </ul>
            {parseResult.errors.length > 3 && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                ... and {parseResult.errors.length - 3} more errors
              </Typography>
            )}
          </Alert>
        )}

        {parseResult && parseResult.success && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              Found {parseResult.validRows} valid students out of {parseResult.totalRows} total rows
            </Typography>
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