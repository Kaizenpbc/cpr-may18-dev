console.log('📦 [INVOICE UPLOAD] Module loaded');

import React, { useState, useEffect } from 'react';
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
  Snackbar,
  Chip,
  Stack
} from '@mui/material';
import { Upload as UploadIcon, AttachFile as AttachFileIcon, DocumentScanner as ScanIcon } from '@mui/icons-material';
import { vendorApi } from '../../../services/api';
import { useNavigate } from 'react-router-dom';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import CheckIcon from '@mui/icons-material/Check';

const InvoiceUpload: React.FC = () => {
  try {
    console.log('🔄 [INVOICE UPLOAD] Component rendered');
    console.log('🔄 [INVOICE UPLOAD] Component function called successfully');
    
    // Set default dates
    const today = new Date().toISOString().split('T')[0];
    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 30 days from now

    const [formData, setFormData] = useState({
      vendorName: '',
      date: today,
      invoiceNumber: '',
      acctNo: '',
      dueDate: dueDate,
      quantity: '',
      item: '',
      description: '',
      rate: '',
      subtotal: '',
      hst: '',
      total: '',
      vendorId: '', // Keep vendorId for database relationship
      detectedVendorId: '' // Store detected vendor ID for backend processing
    });
    const [vendors, setVendors] = useState<Array<{id: number, vendorName: string, vendorType: string}>>([]);
    const [vendorsLoading, setVendorsLoading] = useState(true);
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [scanning, setScanning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [ocrResults, setOcrResults] = useState<Record<string, unknown> | null>(null);
    const [ocrConfidence, setOcrConfidence] = useState<number | null>(null);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [pendingOcrData, setPendingOcrData] = useState<Record<string, unknown> | null>(null);
    const navigate = useNavigate();

    // Load vendors on component mount
    useEffect(() => {
      const loadVendors = async () => {
        try {
          setVendorsLoading(true);
          const response = await vendorApi.getVendors();
          console.log('📋 [INVOICE UPLOAD] Vendors loaded:', response);
          setVendors(response || []);
        } catch (error) {
          console.error('❌ [INVOICE UPLOAD] Error loading vendors:', error);
          setError('Failed to load vendors. Please try again.');
        } finally {
          setVendorsLoading(false);
        }
      };
      
      loadVendors();
    }, []);

    // Monitor success state changes
    useEffect(() => {
      if (success) {
        console.log('🎉 [INVOICE UPLOAD] Success state changed:', success);
      }
    }, [success]);

    // Monitor snackbar state changes
    useEffect(() => {
      if (snackbarOpen) {
        console.log('🔔 [INVOICE UPLOAD] Snackbar opened with message:', success || error);
      }
    }, [snackbarOpen, success, error]);

    // Monitor form data changes
    useEffect(() => {
      console.log('📝 [INVOICE UPLOAD] Form data updated:', formData);
    }, [formData]);

    // Monitor confirmation dialog state
    useEffect(() => {
      console.log('🔍 [INVOICE UPLOAD] Confirmation dialog state changed - showConfirmation:', showConfirmation, 'pendingOcrData:', pendingOcrData);
    }, [showConfirmation, pendingOcrData]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      
      // Handle comma formatting for financial fields
      let cleanValue = value;
      if (['subtotal', 'hst', 'total', 'rate'].includes(name)) {
        // Remove commas and convert to clean number string
        cleanValue = value.replace(/,/g, '');
        // Ensure it's a valid number or empty string
        if (cleanValue && !isNaN(parseFloat(cleanValue))) {
          cleanValue = parseFloat(cleanValue).toString();
        } else if (cleanValue === '') {
          cleanValue = '';
        } else {
          // Invalid input, don't update
          return;
        }
      }
      
      setFormData(prev => ({
        ...prev,
        [name]: cleanValue
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
        if (selectedFile.type !== 'application/pdf' && selectedFile.type !== 'text/html') {
          setError('Please select a valid PDF or HTML file.');
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
        if (!formData.invoiceNumber || !formData.total || !formData.description || !formData.date || !formData.vendorId) {
          console.log('❌ [INVOICE UPLOAD] Validation failed - missing required fields');
          setError('Please fill in all required fields including vendor selection.');
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
        if (file.type !== 'application/pdf' && file.type !== 'text/html') {
          console.log('❌ [INVOICE UPLOAD] Validation failed - invalid file type:', file.type);
          setError('Please select a valid PDF or HTML file.');
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

        if (response && response.success) {
          const successMessage = response.message || 'Invoice uploaded successfully!';
          console.log('✅ [INVOICE UPLOAD] Setting success message:', successMessage);
          setSuccess(successMessage);
          setSnackbarOpen(true);
          setFormData({
            vendorName: '',
            date: today,
            invoiceNumber: '',
            acctNo: '',
            dueDate: dueDate,
            quantity: '',
            item: '',
            description: '',
            rate: '',
            subtotal: '',
            hst: '',
            total: '',
            vendorId: '', // Reset vendorId
            detectedVendorId: '' // Reset detected vendor ID
          });
          setFile(null);
          // After a short delay, navigate to history and trigger refresh
          setTimeout(() => {
            navigate('/vendor/history', { state: { refresh: true } });
          }, 1200);
          console.log('✅ [INVOICE UPLOAD] Form reset and success message set');
        }
      } catch (err: unknown) {
        console.error('❌ [INVOICE UPLOAD] Upload error:', err);
        const errObj = err as { response?: { data?: { error?: string } }; message?: string };
        if (errObj.response?.data?.error) {
          setError(errObj.response.data.error);
        } else if (errObj.message) {
          setError(errObj.message);
        } else {
          setError('Failed to upload invoice. Please try again.');
        }
      } finally {
        setLoading(false);
        console.log('🏁 [INVOICE UPLOAD] Form submission completed');
      }
    };

    const handleScanInvoice = async () => {
              if (!file) {
          setError('Please select a PDF or HTML file first');
          return;
        }

      try {
        setScanning(true);
        setError(null);
        console.log('🔍 [INVOICE UPLOAD] Starting OCR scan for file:', file.name);

        const response = await vendorApi.scanInvoice(file);
        console.log('✅ [INVOICE UPLOAD] OCR scan completed:', response);
        console.log('🔍 [INVOICE UPLOAD] Response data structure:', JSON.stringify(response.data, null, 2));

        if (response.success && response.data) {
          const extractedData = response.data;
          console.log('🔍 [INVOICE UPLOAD] Extracted data fields:', {
            invoiceNumber: extractedData.invoiceNumber,
            invoiceDate: extractedData.invoiceDate,
            dueDate: extractedData.dueDate,
            amount: extractedData.amount,
            description: extractedData.description,
            acctNo: extractedData.acctNo,
            rate: extractedData.rate,
            subtotal: extractedData.subtotal,
            hst: extractedData.hst,
            item: extractedData.item,
            quantity: extractedData.quantity
          });
          
          console.log('🔍 [INVOICE UPLOAD] Checking specific financial fields:');
          console.log('  - extractedData.subtotal:', extractedData.subtotal, 'type:', typeof extractedData.subtotal);
          console.log('  - extractedData.hst:', extractedData.hst, 'type:', typeof extractedData.hst);
          console.log('  - extractedData.amount:', extractedData.amount, 'type:', typeof extractedData.amount);
          
          console.log('🔍 [INVOICE UPLOAD] Automatically populating form with extracted data');
          
          // Automatically populate the form with extracted data
          const updatedFormData = { ...formData };
          
          if (extractedData.invoiceDate) {
            console.log('📅 [INVOICE UPLOAD] Setting invoice date:', extractedData.invoiceDate);
            updatedFormData.date = extractedData.invoiceDate;
          }
          if (extractedData.invoiceNumber) {
            console.log('📄 [INVOICE UPLOAD] Setting invoice number:', extractedData.invoiceNumber);
            updatedFormData.invoiceNumber = extractedData.invoiceNumber;
          }
          if (extractedData.dueDate) {
            console.log('📅 [INVOICE UPLOAD] Setting due date:', extractedData.dueDate);
            updatedFormData.dueDate = extractedData.dueDate;
          }
          if (extractedData.description) {
            console.log('📝 [INVOICE UPLOAD] Setting description:', extractedData.description);
            updatedFormData.description = extractedData.description;
          }
          if (extractedData.amount) {
            console.log('💰 [INVOICE UPLOAD] Setting total amount:', extractedData.amount);
            // Remove commas for number input compatibility
            const cleanAmount = extractedData.amount.replace(/,/g, '');
            updatedFormData.total = cleanAmount;
            console.log('💰 [INVOICE UPLOAD] Cleaned total amount:', cleanAmount);
          }
          if (extractedData.acctNo) {
            console.log('🏦 [INVOICE UPLOAD] Setting account number:', extractedData.acctNo);
            updatedFormData.acctNo = extractedData.acctNo;
          }
          if (extractedData.quantity) {
            console.log('🔢 [INVOICE UPLOAD] Setting quantity:', extractedData.quantity);
            updatedFormData.quantity = extractedData.quantity;
          }
          if (extractedData.item) {
            console.log('📦 [INVOICE UPLOAD] Setting item:', extractedData.item);
            updatedFormData.item = extractedData.item;
          }
          if (extractedData.rate) {
            console.log('💵 [INVOICE UPLOAD] Setting rate:', extractedData.rate);
            // Remove commas for number input compatibility
            const cleanRate = extractedData.rate.replace(/,/g, '');
            updatedFormData.rate = cleanRate;
            console.log('💵 [INVOICE UPLOAD] Cleaned rate:', cleanRate);
          }
          if (extractedData.subtotal) {
            console.log('💰 [INVOICE UPLOAD] Setting subtotal:', extractedData.subtotal);
            // Remove commas for number input compatibility
            const cleanSubtotal = extractedData.subtotal.replace(/,/g, '');
            updatedFormData.subtotal = cleanSubtotal;
            console.log('💰 [INVOICE UPLOAD] Cleaned subtotal:', cleanSubtotal);
          }
          if (extractedData.hst) {
            console.log('🏛️ [INVOICE UPLOAD] Setting HST:', extractedData.hst);
            // Remove commas for number input compatibility
            const cleanHst = extractedData.hst.replace(/,/g, '');
            updatedFormData.hst = cleanHst;
            console.log('🏛️ [INVOICE UPLOAD] Cleaned HST:', cleanHst);
          }
          
          // 🔍 PHASE 2: Enhanced Vendor Detection Integration
          if (extractedData.vendorDetection && extractedData.vendorDetection.detectedVendorId) {
            console.log('🔍 [INVOICE UPLOAD] Using backend vendor detection results:', extractedData.vendorDetection);
            
            const detectedVendorId = extractedData.vendorDetection.detectedVendorId;
            const detectedVendorName = extractedData.vendorDetection.detectedVendorName;
            const confidence = extractedData.vendorDetection.confidence;
            
            console.log(`🔍 [INVOICE UPLOAD] Detected vendor: ${detectedVendorName} (ID: ${detectedVendorId}) - Confidence: ${(confidence * 100).toFixed(1)}%`);
            
            if (confidence > 0.7) { // High confidence threshold
              console.log('✅ [INVOICE UPLOAD] High confidence vendor detection, auto-selecting vendor');
              updatedFormData.vendorId = detectedVendorId.toString();
              updatedFormData.vendorName = detectedVendorName;

              // Store detected vendor ID for submission
              updatedFormData.detectedVendorId = detectedVendorId.toString();
            } else {
              console.log('⚠️ [INVOICE UPLOAD] Low confidence vendor detection, requiring manual selection');
              // Still store the detected vendor ID but don't auto-select
              updatedFormData.detectedVendorId = detectedVendorId.toString();
            }
          } else {
            // Fallback to simple string matching if no vendor detection data
            console.log('🔍 [INVOICE UPLOAD] No vendor detection data, using fallback string matching');
            if (extractedData.vendorName && vendors.length > 0) {
              console.log('🏢 [INVOICE UPLOAD] Attempting to auto-match vendor:', extractedData.vendorName);
              const matchedVendor = vendors.find(vendor =>
                vendor.vendorName.toLowerCase().includes(extractedData.vendorName.toLowerCase()) ||
                extractedData.vendorName.toLowerCase().includes(vendor.vendorName.toLowerCase())
              );

              if (matchedVendor) {
                console.log('✅ [INVOICE UPLOAD] Vendor auto-matched (fallback):', matchedVendor.vendorName, 'ID:', matchedVendor.id);
                updatedFormData.vendorId = matchedVendor.id.toString();
                updatedFormData.vendorName = matchedVendor.vendorName;
                updatedFormData.detectedVendorId = matchedVendor.id.toString();
              } else {
                console.log('⚠️ [INVOICE UPLOAD] No vendor match found for:', extractedData.vendorName);
                console.log('🔍 [INVOICE UPLOAD] Available vendors:', vendors.map(v => v.vendorName));
              }
            }
          }
          
          console.log('🔍 [INVOICE UPLOAD] Final updated form data:', updatedFormData);
          console.log('🔍 [INVOICE UPLOAD] Financial fields in updatedFormData:');
          console.log('  - updatedFormData.subtotal:', updatedFormData.subtotal);
          console.log('  - updatedFormData.hst:', updatedFormData.hst);
          console.log('  - updatedFormData.total:', updatedFormData.total);
          setFormData(updatedFormData);
          
          // Also set OCR results for display and show confirmation dialog
          setOcrResults(extractedData);
          setOcrConfidence(extractedData.confidence);
          setPendingOcrData(extractedData);
          setShowConfirmation(true);
          
          const vendorMessage = updatedFormData.vendorId
            ? 'Vendor has been auto-matched and form is ready to submit!'
            : 'Form has been populated. Please select the vendor from the dropdown.';
          
          setSuccess(`Invoice scanned successfully! ${vendorMessage}`);
          setSnackbarOpen(true);
          console.log('🔍 [INVOICE UPLOAD] Form has been automatically populated');
        } else {
          setError('Failed to scan invoice. Please try again or enter data manually.');
        }
      } catch (err: unknown) {
        console.error('❌ [INVOICE UPLOAD] OCR scan error:', err);
        const errObj = err as { response?: { data?: { error?: string } } };
        setError(errObj.response?.data?.error || 'Failed to scan invoice. Please try again.');
      } finally {
        setScanning(false);
      }
    };

    const handleSaveOcrData = () => {
      if (pendingOcrData) {
        console.log('🔍 [INVOICE UPLOAD] Starting to apply OCR data:', pendingOcrData);
        console.log('🔍 [INVOICE UPLOAD] Current form data before update:', formData);
        
        const updatedFormData = { ...formData };
        
        // Note: vendor_id cannot be auto-populated from OCR since we need the ID, not the name
        // User will need to manually select the vendor from the dropdown
        
        if (pendingOcrData.invoiceDate) {
          console.log('📅 [INVOICE UPLOAD] Setting invoice date:', pendingOcrData.invoiceDate);
          updatedFormData.date = String(pendingOcrData.invoiceDate);
        }
        if (pendingOcrData.invoiceNumber) {
          console.log('📄 [INVOICE UPLOAD] Setting invoice number:', pendingOcrData.invoiceNumber);
          updatedFormData.invoiceNumber = String(pendingOcrData.invoiceNumber);
        }
        if (pendingOcrData.dueDate) {
          console.log('📅 [INVOICE UPLOAD] Setting due date:', pendingOcrData.dueDate);
          updatedFormData.dueDate = String(pendingOcrData.dueDate);
        }
        if (pendingOcrData.description) {
          console.log('📝 [INVOICE UPLOAD] Setting description:', pendingOcrData.description);
          updatedFormData.description = String(pendingOcrData.description);
        }
        if (pendingOcrData.amount) {
          console.log('💰 [INVOICE UPLOAD] Setting total amount:', pendingOcrData.amount);
          updatedFormData.total = String(pendingOcrData.amount);
        }
        if (pendingOcrData.acctNo) {
          console.log('🏦 [INVOICE UPLOAD] Setting account number:', pendingOcrData.acctNo);
          updatedFormData.acctNo = String(pendingOcrData.acctNo);
        }
        if (pendingOcrData.quantity) {
          console.log('🔢 [INVOICE UPLOAD] Setting quantity:', pendingOcrData.quantity);
          updatedFormData.quantity = String(pendingOcrData.quantity);
        }
        if (pendingOcrData.item) {
          console.log('📦 [INVOICE UPLOAD] Setting item:', pendingOcrData.item);
          updatedFormData.item = String(pendingOcrData.item);
        }
        if (pendingOcrData.rate) {
          console.log('💵 [INVOICE UPLOAD] Setting rate:', pendingOcrData.rate);
          updatedFormData.rate = String(pendingOcrData.rate);
        }
        if (pendingOcrData.subtotal) {
          console.log('💰 [INVOICE UPLOAD] Setting subtotal:', pendingOcrData.subtotal);
          updatedFormData.subtotal = String(pendingOcrData.subtotal);
        }
        if (pendingOcrData.hst) {
          console.log('🏛️ [INVOICE UPLOAD] Setting HST:', pendingOcrData.hst);
          updatedFormData.hst = String(pendingOcrData.hst);
        }

        console.log('🔍 [INVOICE UPLOAD] Final updated form data:', updatedFormData);
        setFormData(updatedFormData);
        setShowConfirmation(false);
        setPendingOcrData(null);
        setSuccess('OCR data applied to form successfully! Please select the vendor from the dropdown.');
        setSnackbarOpen(true);
      } else {
        console.log('❌ [INVOICE UPLOAD] No pending OCR data to apply');
      }
    };

    const handleCancelOcrData = () => {
      console.log('🖱️ [INVOICE UPLOAD] Clear form button clicked');
      setShowConfirmation(false);
      setPendingOcrData(null);
      
      // Clear the form data
      const today = new Date().toISOString().split('T')[0];
      const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      setFormData({
        vendorName: '',
        date: today,
        invoiceNumber: '',
        acctNo: '',
        dueDate: dueDate,
        quantity: '',
        item: '',
        description: '',
        rate: '',
        subtotal: '',
        hst: '',
        total: '',
        vendorId: '',
        detectedVendorId: ''
      });
      
      setSuccess('Form cleared. You can now enter data manually or scan another invoice.');
      setSnackbarOpen(true);
      setOcrResults(null);
      setOcrConfidence(null);
      setSuccess('OCR data cancelled. You can enter data manually.');
      setSnackbarOpen(true);
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
              {/* Row 1: Vendor Name and Date */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Vendor Name *</InputLabel>
                  <Select
                    name="vendorId"
                    value={formData.vendorId}
                    onChange={handleSelectChange}
                    required
                    disabled={vendorsLoading}
                  >
                    {vendors.map((vendor) => (
                      <MenuItem key={vendor.id} value={vendor.id}>
                        {vendor.vendorName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Date *"
                  name="date"
                  type="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  required
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              {/* Row 2: Invoice # and Acct. No. */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Invoice # *"
                  name="invoiceNumber"
                  value={formData.invoiceNumber}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., INV-2024-001"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Acct. No."
                  name="acctNo"
                  value={formData.acctNo}
                  onChange={handleInputChange}
                  placeholder="Account number"
                />
              </Grid>

              {/* Row 3: Due Date and Quantity */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Due Date"
                  name="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={handleInputChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Quantity"
                  name="quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={handleInputChange}
                  placeholder="0"
                />
              </Grid>

              {/* Row 4: Item and Rate */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Item"
                  name="item"
                  value={formData.item}
                  onChange={handleInputChange}
                  placeholder="Item code or name"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Rate"
                  name="rate"
                  type="text"
                  value={formData.rate ? parseFloat(formData.rate).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                />
              </Grid>

              {/* Row 5: Description */}
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

              {/* Row 6: Subtotal, HST, and Total */}
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Subtotal"
                  name="subtotal"
                  type="text"
                  value={formData.subtotal ? parseFloat(formData.subtotal).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="HST"
                  name="hst"
                  type="text"
                  value={formData.hst ? parseFloat(formData.hst).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Total *"
                  name="total"
                  type="text"
                  value={formData.total ? parseFloat(formData.total).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
                  onChange={handleInputChange}
                  required
                  placeholder="0.00"
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
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
                  {file ? `${file.name} (${formatFileSize(file.size)})` : 'Choose PDF or HTML File'}
                  <input
                    type="file"
                    hidden
                    accept=".pdf,.html,.htm"
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
                    Please select a PDF or HTML file (max 5MB)
                  </Typography>
                )}
              </Grid>

              <Grid item xs={12}>
                <Button
                  variant="outlined"
                  startIcon={scanning ? <CircularProgress size={20} /> : <ScanIcon />}
                  fullWidth
                  sx={{ py: 2, mb: 1 }}
                  onClick={handleScanInvoice}
                  disabled={loading || !file || scanning}
                >
                  {scanning ? 'Scanning...' : 'Scan Invoice'}
                </Button>
                {ocrResults && (
                  <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
                    <Chip label={`Confidence: ${ocrConfidence}%`} color="success" />
                                    <Chip label={`Vendor: ${ocrResults.vendorName || 'N/A'}`} />
                <Chip label={`Invoice #: ${ocrResults.invoiceNumber || 'N/A'}`} />
                <Chip label={`Date: ${ocrResults.invoiceDate || 'N/A'}`} />
                <Chip label={`Due Date: ${ocrResults.dueDate || 'N/A'}`} />
                <Chip label={`Total: ${ocrResults.amount || 'N/A'}`} />
                <Chip label={`Description: ${ocrResults.description || 'N/A'}`} />
                <Chip label={`Account #: ${ocrResults.acctNo || 'N/A'}`} />
                <Chip label={`Rate: ${ocrResults.rate || 'N/A'}`} />
                <Chip label={`Subtotal: ${ocrResults.subtotal || 'N/A'}`} />
                <Chip label={`Tax/HST: ${ocrResults.hst || 'N/A'}`} />
                <Chip label={`Item: ${ocrResults.item || 'N/A'}`} />
                <Chip label={`Quantity: ${ocrResults.quantity || 'N/A'}`} />
                  </Stack>
                )}

                {showConfirmation && pendingOcrData && (
                  <Paper sx={{ p: 2, mt: 2, bgcolor: 'grey.50' }}>
                    <Typography variant="h6" gutterBottom color="primary">
                      📋 Extracted Data Review
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                      The form has been automatically populated with the extracted data below. Please review and select the vendor from the dropdown above.
                    </Typography>
                    
                    <Grid container spacing={2} sx={{ mb: 2 }}>
                      <Grid item xs={6} md={3}>
                        <Typography variant="caption" color="text.secondary">Vendor</Typography>
                        <Typography variant="body2">{String(pendingOcrData.vendorName || 'N/A')}</Typography>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Typography variant="caption" color="text.secondary">Invoice #</Typography>
                        <Typography variant="body2">{String(pendingOcrData.invoiceNumber || 'N/A')}</Typography>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Typography variant="caption" color="text.secondary">Date</Typography>
                        <Typography variant="body2">{String(pendingOcrData.invoiceDate || 'N/A')}</Typography>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Typography variant="caption" color="text.secondary">Due Date</Typography>
                        <Typography variant="body2">{String(pendingOcrData.dueDate || 'N/A')}</Typography>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Typography variant="caption" color="text.secondary">Account #</Typography>
                        <Typography variant="body2">{String(pendingOcrData.acctNo || 'N/A')}</Typography>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Typography variant="caption" color="text.secondary">Item</Typography>
                        <Typography variant="body2">{String(pendingOcrData.item || 'N/A')}</Typography>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Typography variant="caption" color="text.secondary">Quantity</Typography>
                        <Typography variant="body2">{String(pendingOcrData.quantity || 'N/A')}</Typography>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Typography variant="caption" color="text.secondary">Rate</Typography>
                        <Typography variant="body2">{String(pendingOcrData.rate || 'N/A')}</Typography>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Typography variant="caption" color="text.secondary">Subtotal</Typography>
                        <Typography variant="body2">{String(pendingOcrData.subtotal || 'N/A')}</Typography>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Typography variant="caption" color="text.secondary">Tax/HST</Typography>
                        <Typography variant="body2">{String(pendingOcrData.hst || 'N/A')}</Typography>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Typography variant="caption" color="text.secondary">Total</Typography>
                        <Typography variant="body2" fontWeight="bold">{String(pendingOcrData.amount || 'N/A')}</Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="caption" color="text.secondary">Description</Typography>
                        <Typography variant="body2">{String(pendingOcrData.description || 'N/A')}</Typography>
                      </Grid>
                    </Grid>

                    <Stack direction="row" spacing={2}>
                      <Button
                        variant="outlined"
                        color="primary"
                        startIcon={<CheckIcon />}
                        onClick={() => {
                          console.log('🖱️ [INVOICE UPLOAD] OK button clicked');
                          setShowConfirmation(false);
                          setPendingOcrData(null);
                        }}
                        sx={{ flex: 1 }}
                      >
                        OK
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        startIcon={<CancelIcon />}
                        onClick={handleCancelOcrData}
                        sx={{ flex: 1 }}
                      >
                        CLEAR FORM
                      </Button>
                    </Stack>
                  </Paper>
                )}
              </Grid>

              <Grid item xs={12}>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <UploadIcon />}
                  fullWidth
                  sx={{ py: 2 }}
                  disabled={loading || !file || !formData.vendorId || !formData.invoiceNumber || !formData.total || !formData.description || !formData.date || showConfirmation}
                >
                  {loading ? 'Uploading...' : 'Upload Invoice'}
                </Button>
              </Grid>
            </Grid>
          </form>
        </Paper>

        <Snackbar
          open={snackbarOpen}
          autoHideDuration={6000}
          onClose={() => setSnackbarOpen(false)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        >
          <Alert onClose={() => setSnackbarOpen(false)} severity={error ? 'error' : success ? 'success' : 'info'} sx={{ width: '100%' }}>
            {error || success || 'Invoice uploaded successfully!'}
          </Alert>
        </Snackbar>
      </Box>
    );
  } catch (error) {
    console.error('❌ [INVOICE UPLOAD] Error in InvoiceUpload component:', error);
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Upload Invoice
        </Typography>
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load invoice upload component. Please try again later.
        </Alert>
      </Box>
    );
  }
};

export default InvoiceUpload;