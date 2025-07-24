const fs = require('fs');
const path = require('path');

function testPDFContent() {
  try {
    const pdfPath = './backend/uploads/vendor-invoices/invoice-1753314333732-643616151.pdf';
    
    if (!fs.existsSync(pdfPath)) {
      console.log('❌ PDF file not found:', pdfPath);
      return;
    }

    console.log('📄 Testing PDF content:', pdfPath);
    
    // Get file stats
    const stats = fs.statSync(pdfPath);
    console.log('📊 File size:', stats.size, 'bytes');
    console.log('📅 Last modified:', stats.mtime);
    
    // Read first 1000 bytes to see if it's a valid PDF
    const buffer = fs.readFileSync(pdfPath);
    const header = buffer.slice(0, 1000).toString('utf8');
    
    console.log('🔍 PDF header (first 1000 bytes):');
    console.log('='.repeat(50));
    console.log(header);
    console.log('='.repeat(50));
    
    // Check if it's a valid PDF
    if (header.includes('%PDF')) {
      console.log('✅ Valid PDF header detected');
    } else {
      console.log('❌ Invalid PDF header');
    }
    
    // Check for common PDF content patterns
    const content = buffer.toString('utf8');
    console.log('🔍 Content analysis:');
    console.log('- Contains "Invoice":', content.includes('Invoice'));
    console.log('- Contains "Date":', content.includes('Date'));
    console.log('- Contains "Amount":', content.includes('Amount'));
    console.log('- Contains "Total":', content.includes('Total'));
    console.log('- Contains "$":', content.includes('$'));
    console.log('- Contains numbers:', /\d/.test(content));
    
    // Look for actual data patterns
    const dollarMatches = content.match(/\$\d+\.\d{2}/g);
    if (dollarMatches) {
      console.log('💰 Dollar amounts found:', dollarMatches);
    } else {
      console.log('💰 No dollar amounts found');
    }
    
    const dateMatches = content.match(/\d{1,2}\/\d{1,2}\/\d{2,4}/g);
    if (dateMatches) {
      console.log('📅 Dates found:', dateMatches);
    } else {
      console.log('📅 No dates found');
    }
    
  } catch (error) {
    console.error('❌ Error testing PDF content:', error);
  }
}

testPDFContent(); 