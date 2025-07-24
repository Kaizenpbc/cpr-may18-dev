// Direct OCR Service Test (without authentication)
const fs = require('fs');
const path = require('path');

async function testOCRDirect() {
  try {
    console.log('🧪 [OCR DIRECT TEST] Testing OCR service directly...\n');
    
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
    
    // Test the OCR service directly using tsx to run TypeScript
    console.log('\n🔍 [OCR DIRECT TEST] Testing OCR service with tsx...');
    
    try {
      // Use tsx to run the OCR service directly
      const { execSync } = require('child_process');
      
      // Create a simple test script
      const testScript = `
import { ocrService } from './backend/src/services/ocrService.js';

async function testOCR() {
  try {
    console.log('🔍 [OCR TEST] Starting OCR test...');
    
    // Test text extraction
    const extractedText = await ocrService.extractTextFromPDF('${testFilePath.replace(/\\/g, '\\\\')}');
    console.log('✅ Text extraction completed');
    console.log('📄 Extracted text (first 200 chars):', extractedText.substring(0, 200) + '...');
    
    // Test structured data extraction
    const extractedData = await ocrService.extractInvoiceData(extractedText);
    console.log('✅ Structured data extraction completed');
    console.log('📋 Extracted data:');
    console.log('  - Invoice Number:', extractedData.invoiceNumber);
    console.log('  - Invoice Date:', extractedData.invoiceDate);
    console.log('  - Due Date:', extractedData.dueDate);
    console.log('  - Amount:', extractedData.amount);
    console.log('  - Description:', extractedData.description);
    console.log('  - Vendor Name:', extractedData.vendorName);
    console.log('  - Template Used:', extractedData.templateUsed);
    
  } catch (error) {
    console.error('❌ [OCR TEST] Error:', error);
  }
}

testOCR();
      `;
      
      // Write test script to temp file
      const tempScriptPath = path.join(__dirname, 'temp-ocr-test.js');
      fs.writeFileSync(tempScriptPath, testScript);
      
      // Run the test script with tsx
      console.log('🚀 Running OCR test with tsx...');
      const result = execSync('npx tsx temp-ocr-test.js', { 
        encoding: 'utf8',
        cwd: __dirname,
        timeout: 30000
      });
      
      console.log('✅ OCR test completed successfully');
      console.log('📋 Test output:');
      console.log(result);
      
      // Clean up temp file
      fs.unlinkSync(tempScriptPath);
      
    } catch (error) {
      console.error('❌ [OCR DIRECT TEST] Error running OCR test:', error);
      console.error('Error details:', error.message);
      if (error.stdout) {
        console.error('stdout:', error.stdout);
      }
      if (error.stderr) {
        console.error('stderr:', error.stderr);
      }
    }
    
  } catch (error) {
    console.error('❌ [OCR DIRECT TEST] General error:', error);
  }
}

testOCRDirect(); 