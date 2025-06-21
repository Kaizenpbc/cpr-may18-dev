import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
  Alert,
  CircularProgress,
  Paper,
} from '@mui/material';
import {
  Close as CloseIcon,
  CloudUpload as CloudUploadIcon,
  Description as FileIcon,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { api } from '../../services/api';

interface FileUploadDialogProps {
  open: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
  courseId: string | number | null;
  title: string;
  description: string;
  acceptedFileTypes: string;
  uploadEndpoint: string;
}

const FileUploadDialog: React.FC<FileUploadDialogProps> = ({
  open,
  onClose,
  onUploadSuccess,
  courseId,
  title,
  description,
  acceptedFileTypes,
  uploadEndpoint,
}) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0]);
      setError(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv'],
    },
    multiple: false,
  });

  const handleUpload = async () => {
    if (!selectedFile || !courseId) return;

    setUploading(true);
    setError(null);

    try {
      console.log('🔍 [UPLOAD] Starting upload process:', {
        courseId,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        uploadEndpoint,
        timestamp: new Date().toISOString()
      });

      // Check if we have auth headers
      const authHeader = api.defaults.headers.common['Authorization'];
      console.log('🔍 [UPLOAD] Auth header present:', !!authHeader);
      if (authHeader) {
        console.log('🔍 [UPLOAD] Auth header type:', typeof authHeader);
        console.log('🔍 [UPLOAD] Auth header starts with Bearer:', authHeader.toString().startsWith('Bearer '));
      }

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('courseId', courseId.toString());

      console.log('🔍 [UPLOAD] FormData created with:', {
        hasFile: formData.has('file'),
        hasCourseId: formData.has('courseId'),
        endpoint: uploadEndpoint
      });

      console.log('🔍 [UPLOAD] Making API request to:', uploadEndpoint);
      const response = await api.post(uploadEndpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('🔍 [UPLOAD] Response received:', {
        status: response.status,
        success: response.data?.success,
        message: response.data?.message,
        timestamp: new Date().toISOString()
      });

      if (response.data.success) {
        console.log('✅ [UPLOAD] Upload successful');
        onUploadSuccess();
      } else {
        console.log('❌ [UPLOAD] Upload failed:', response.data.message);
        setError(response.data.message || 'Upload failed');
      }
    } catch (err: any) {
      console.error('❌ [UPLOAD] Upload error:', {
        message: err.message,
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        headers: err.response?.headers,
        config: {
          url: err.config?.url,
          method: err.config?.method,
          headers: err.config?.headers
        },
        timestamp: new Date().toISOString()
      });
      setError(err.response?.data?.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setError(null);
    setUploading(false);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">{title}</Typography>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {description}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Paper
          {...getRootProps()}
          sx={{
            border: '2px dashed',
            borderColor: isDragActive ? 'primary.main' : 'grey.300',
            borderRadius: 2,
            p: 3,
            textAlign: 'center',
            cursor: 'pointer',
            backgroundColor: isDragActive ? 'primary.50' : 'grey.50',
            '&:hover': {
              borderColor: 'primary.main',
              backgroundColor: 'primary.50',
            },
          }}
        >
          <input {...getInputProps()} />
          
          {selectedFile ? (
            <Box>
              <FileIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
              <Typography variant="h6" gutterBottom>
                {selectedFile.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </Typography>
            </Box>
          ) : (
            <Box>
              <CloudUploadIcon sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
              <Typography variant="h6" gutterBottom>
                {isDragActive ? 'Drop the file here' : 'Drag & drop a file here'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                or click to select a file
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Accepted formats: {acceptedFileTypes}
              </Typography>
            </Box>
          )}
        </Paper>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={uploading}>
          Cancel
        </Button>
        <Button
          onClick={handleUpload}
          variant="contained"
          disabled={!selectedFile || uploading}
          startIcon={uploading ? <CircularProgress size={16} /> : null}
        >
          {uploading ? 'Uploading...' : 'Upload'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FileUploadDialog; 