// Test Google Cloud Vision OCR Integration
const fs = require('fs');
const path = require('path');

async function testGoogleCloudOCR() {
  console.log('🧪 [GOOGLE CLOUD TEST] Testing Google Cloud Vision integration...\n');
  
  try {
    // Check if environment variables are set
    console.log('🔍 [CONFIG] Checking environment variables...');
    console.log(`GOOGLE_CLOUD_KEY_FILE: ${process.env.GOOGLE_CLOUD_KEY_FILE || 'NOT SET'}`);
    console.log(`GOOGLE_CLOUD_PROJECT_ID: ${process.env.GOOGLE_CLOUD_PROJECT_ID || 'NOT SET'}`);
    console.log(`GOOGLE_APPLICATION_CREDENTIALS: ${process.env.GOOGLE_APPLICATION_CREDENTIALS || 'NOT SET'}`);
    
    // Check if key file exists
    const keyFilePath = './gtacpr-ocr-266c4803c5bc.json';
    console.log(`\n🔍 [FILE CHECK] Looking for key file: ${keyFilePath}`);
    
    if (fs.existsSync(keyFilePath)) {
      console.log('✅ [FILE CHECK] Google Cloud key file found!');
      
      // Read key file to verify it's valid JSON
      try {
        const keyContent = JSON.parse(fs.readFileSync(keyFilePath, 'utf8'));
        console.log(`✅ [KEY VALIDATION] Key file is valid JSON`);
        console.log(`📋 [KEY INFO] Project ID: ${keyContent.project_id}`);
        console.log(`📋 [KEY INFO] Client Email: ${keyContent.client_email}`);
      } catch (parseError) {
        console.error('❌ [KEY VALIDATION] Key file is not valid JSON:', parseError.message);
        return;
      }
    } else {
      console.log('❌ [FILE CHECK] Google Cloud key file NOT found!');
      console.log('📋 [INSTRUCTIONS] Please copy gtacpr-ocr-266c4803c5bc.json to the project root directory');
      return;
    }
    
    // Test OCR service with actual PDF
    console.log('\n🔍 [OCR TEST] Testing OCR service with Google Cloud...');
    
    // Check for uploaded PDF files
    const uploadsDir = path.join(__dirname, 'backend', 'uploads', 'vendor-invoices');
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      const pdfFiles = files.filter(file => file.endsWith('.pdf'));
      
      if (pdfFiles.length > 0) {
        const testFile = pdfFiles[pdfFiles.length - 1];
        const testFilePath = path.join(uploadsDir, testFile);
        
        console.log(`📄 [OCR TEST] Testing with file: ${testFile}`);
        
        // Use tsx to run the OCR service
        const { execSync } = require('child_process');
        
        const testScript = `
import { ocrService } from './backend/src/services/ocrService.js';

async function testOCR() {
  try {
    console.log('🔍 [GOOGLE CLOUD OCR] Starting real OCR test...');
    
    const extractedText = await ocrService.extractTextFromPDF('${testFilePath.replace(/\\/g, '\\\\')}');
    console.log('✅ [GOOGLE CLOUD OCR] Text extraction completed');
    console.log('📄 [EXTRACTED TEXT] First 300 characters:');
    console.log(extractedText.substring(0, 300) + '...');
    
    const extractedData = await ocrService.extractInvoiceData(extractedText);
    console.log('✅ [GOOGLE CLOUD OCR] Data extraction completed');
    console.log('📋 [EXTRACTED DATA]:');
    console.log('  - Invoice Number:', extractedData.invoiceNumber);
    console.log('  - Invoice Date:', extractedData.invoiceDate);
    console.log('  - Due Date:', extractedData.dueDate);
    console.log('  - Amount:', extractedData.amount);
    console.log('  - Description:', extractedData.description);
    console.log('  - Vendor Name:', extractedData.vendorName);
    console.log('  - Template Used:', extractedData.templateUsed);
    
  } catch (error) {
    console.error('❌ [GOOGLE CLOUD OCR] Error:', error.message);
  }
}

testOCR();
        `;
        
        const tempScriptPath = path.join(__dirname, 'temp-google-cloud-test.js');
        fs.writeFileSync(tempScriptPath, testScript);
        
        console.log('🚀 [OCR TEST] Running Google Cloud OCR test...');
        const result = execSync('npx tsx temp-google-cloud-test.js', { 
          encoding: 'utf8',
          cwd: __dirname,
          timeout: 30000
        });
        
        console.log(result);
        
        // Clean up
        fs.unlinkSync(tempScriptPath);
        
      } else {
        console.log('❌ [OCR TEST] No PDF files found for testing');
      }
    } else {
      console.log('❌ [OCR TEST] Uploads directory not found');
    }
    
  } catch (error) {
    console.error('❌ [GOOGLE CLOUD TEST] Error:', error.message);
  }
}

// Run the test
testGoogleCloudOCR();