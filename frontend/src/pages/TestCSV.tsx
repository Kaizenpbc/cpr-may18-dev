import React, { useState } from 'react';
import { Button, Container, Typography, Box, Paper } from '@mui/material';
import CSVUploadDialog from '../components/dialogs/CSVUploadDialog';

const TestCSV: React.FC = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);

  const handleUploadSuccess = (data: any) => {
    console.log('Upload successful:', data);
    setUploadResult(data);
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          CSV Upload Test
        </Typography>
        
        <Typography variant="body1" sx={{ mb: 3 }}>
          This is a test page for the CSV upload functionality.
        </Typography>

        <Button
          variant="contained"
          onClick={() => setDialogOpen(true)}
          sx={{ mb: 3 }}
        >
          Test CSV Upload
        </Button>

        {uploadResult && (
          <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
            <Typography variant="h6" gutterBottom>
              Upload Result:
            </Typography>
            <Typography variant="body2">
              File: {uploadResult.fileName}
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Content preview: {uploadResult.content.substring(0, 100)}...
            </Typography>
          </Box>
        )}
      </Paper>

      <CSVUploadDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onUploadSuccess={handleUploadSuccess}
        title="Test CSV Upload"
        description="Select a CSV file to test the upload functionality"
      />
    </Container>
  );
};

export default TestCSV; 