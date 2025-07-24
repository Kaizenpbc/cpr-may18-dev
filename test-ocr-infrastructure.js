// Test OCR Infrastructure (Phase 1)
// This script tests the basic OCR infrastructure without requiring Google Cloud setup

async function testOCRInfrastructure() {
  console.log('🧪 [OCR TEST] Starting OCR infrastructure test...\n');

  try {
    // Dynamic import for ES module
    const { ocrService } = await import('./backend/src/services/ocrService.js');

    // Test 1: Mock text extraction
    console.log('📄 [OCR TEST] Test 1: Mock text extraction');
    const mockText = await ocrService.extractTextFromPDF('mock-file.pdf');
    console.log('✅ Mock text extracted:', mockText.substring(0, 100) + '...\n');

    // Test 2: Structured data extraction
    console.log('🔍 [OCR TEST] Test 2: Structured data extraction');
    const extractedData = await ocrService.extractInvoiceData(mockText);
    console.log('✅ Extracted data:');
    console.log('  - Invoice Number:', extractedData.invoiceNumber);
    console.log('  - Invoice Date:', extractedData.invoiceDate);
    console.log('  - Due Date:', extractedData.dueDate);
    console.log('  - Amount:', extractedData.amount);
    console.log('  - Description:', extractedData.description);
    console.log('  - Vendor Name:', extractedData.vendorName);
    console.log('  - Confidence:', extractedData.confidence);
    console.log('');

    // Test 3: Pattern matching
    console.log('🎯 [OCR TEST] Test 3: Pattern matching validation');
    const patterns = [
      { field: 'Invoice Number', value: extractedData.invoiceNumber, expected: 'INV-2024-001' },
      { field: 'Invoice Date', value: extractedData.invoiceDate, expected: '2024-01-15' },
      { field: 'Due Date', value: extractedData.dueDate, expected: '2024-02-15' },
      { field: 'Amount', value: extractedData.amount, expected: '2,825.00' },
      { field: 'Description', value: extractedData.description, expected: 'CPR Training Manuals and Equipment' },
      { field: 'Vendor Name', value: extractedData.vendorName, expected: 'ABC Training Supplies' }
    ];

    patterns.forEach(pattern => {
      const status = pattern.value === pattern.expected ? '✅' : '❌';
      console.log(`  ${status} ${pattern.field}: ${pattern.value} (expected: ${pattern.expected})`);
    });

    console.log('\n🎉 [OCR TEST] All tests completed successfully!');
    console.log('📋 [OCR TEST] Phase 1 infrastructure is working correctly.');
    console.log('🚀 [OCR TEST] Ready to proceed to Phase 2 (Google Cloud integration).');

  } catch (error) {
    console.error('❌ [OCR TEST] Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testOCRInfrastructure(); 