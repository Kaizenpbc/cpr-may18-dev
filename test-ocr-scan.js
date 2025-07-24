// Test OCR Scan Functionality
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: 'localhost',
  database: 'cpr_jun21',
  user: 'postgres',
  password: 'gtacpr'
});

async function testOCRScan() {
  try {
    console.log('🧪 [OCR TEST] Testing OCR scan functionality...\n');
    
    // Check if there are any PDF files in the uploads directory
    const uploadsDir = path.join(__dirname, 'backend', 'uploads', 'vendor-invoices');
    
    if (!fs.existsSync(uploadsDir)) {
      console.log('❌ Uploads directory not found:', uploadsDir);
      return;
    }
    
    const files = fs.readdirSync(uploadsDir);
    const pdfFiles = files.filter(file => file.endsWith('.pdf'));
    
    console.log(`📁 Found ${pdfFiles.length} PDF files in uploads directory`);
    
    if (pdfFiles.length === 0) {
      console.log('❌ No PDF files found for testing');
      return;
    }
    
    // Test with the most recent PDF file
    const testFile = pdfFiles[pdfFiles.length - 1];
    const testFilePath = path.join(uploadsDir, testFile);
    
    console.log(`📄 Testing with file: ${testFile}`);
    console.log(`📄 File path: ${testFilePath}`);
    
    // Check if file exists and get its size
    if (fs.existsSync(testFilePath)) {
      const stats = fs.statSync(testFilePath);
      console.log(`📄 File size: ${stats.size} bytes`);
      console.log(`📄 File modified: ${stats.mtime}`);
    } else {
      console.log('❌ Test file not found');
      return;
    }
    
    // Test the OCR service directly
    console.log('\n🔍 [OCR TEST] Testing OCR service...');
    
    try {
      // Check if the OCR service file exists
      const ocrServicePath = path.join(__dirname, 'backend', 'src', 'services', 'ocrService.ts');
      if (!fs.existsSync(ocrServicePath)) {
        console.log('❌ OCR service file not found:', ocrServicePath);
        return;
      }
      
      console.log('✅ OCR service file found');
      
      // Since we can't directly import TypeScript files in Node.js without compilation,
      // let's test the OCR functionality by making a direct API call to the backend
      console.log('\n🔍 [OCR TEST] Testing OCR via API endpoint...');
      
      // Test the API endpoint directly
      const FormData = require('form-data');
      const axios = require('axios');
      
      // Create form data with the PDF file
      const formData = new FormData();
      formData.append('invoice_pdf', fs.createReadStream(testFilePath));
      
      // Make API call to the OCR endpoint
      const response = await axios.post('http://localhost:3001/api/v1/vendor/invoices/scan', formData, {
        headers: {
          ...formData.getHeaders(),
          'Authorization': 'Bearer test-token' // We'll need a valid token for testing
        },
        timeout: 30000 // 30 second timeout
      });
      
      console.log('✅ API call successful');
      console.log('📋 Response data:', response.data);
      
    } catch (error) {
      console.error('❌ [OCR TEST] Error testing OCR service:', error);
      
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      } else if (error.request) {
        console.error('No response received:', error.request);
      } else {
        console.error('Error details:', error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ [OCR TEST] General error:', error);
  } finally {
    await pool.end();
  }
}

testOCRScan(); 