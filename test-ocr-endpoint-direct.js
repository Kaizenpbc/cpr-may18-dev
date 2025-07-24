// Test OCR Endpoint Directly
// This script tests the OCR endpoint directly to see what response we get

const fs = require('fs');
const path = require('path');

// Create a simple test file
const testContent = `
F.A.S.T. Rescue Incorporated

750 Oakdale Rd., Suite 56
Toronto ON M3N 2Z4
Canada
Phone: (905) 760-2045
www.fast-rescue.com
GST/HST #: 852997477RT0001

Bill To
Coujoe Annamunthodo
46 Sunnyside Hill Rd
Markham ON L6B 0X5
Canada	  	Ship To
Coujoe Annamunthodo
46 Sunnyside Hill Rd
Markham ON L6B 0X5
Canada
Invoice
Date	 	06/02/2025
Invoice #	 	67691
Acct. No.	 	519293
Terms	 	Net 30
Due Date	 	07/02/2025
PO #	 	 
Currency	 	CAD
Memo	 	 

Project	Item	Quantity	Units	Inventory Detail	Description	Rate	Options	Amount
 	ITFR-B-SFA-O	685	 	 	FAST Standard First Aid Theory Completed Part 1 Online Training

Students that completed Part 1 Standard Training in the month of May	15.00	 	10,275.00
Subtotal	10,275.00
Shipping Cost (No Charge)	0.00
Tax	1,335.75
Total	11,610.75
Amount Due	$11,610.75
`;

console.log('🧪 [DIRECT OCR TEST] Testing OCR endpoint directly...\n');

// Simulate the OCR service response
function simulateOcrResponse() {
  return {
    success: true,
    data: {
      invoiceNumber: '67691',
      invoiceDate: '2025-06-02',
      dueDate: '2025-07-02',
      amount: '11,610.75',
      description: 'FAST Standard First Aid Theory Completed Part 1 Online Training',
      vendorName: 'F.A.S.T. Rescue Incorporated',
      confidence: {
        invoiceNumber: 0.95,
        invoiceDate: 0.98,
        dueDate: 0.92,
        amount: 0.99,
        description: 0.85,
        vendorName: 0.97
      },
      rawText: testContent,
      templateUsed: 'FAST Rescue Template'
    },
    message: 'Invoice scanned successfully'
  };
}

// Test the response
const response = simulateOcrResponse();

console.log('✅ [DIRECT OCR TEST] Simulated OCR Response:');
console.log(JSON.stringify(response, null, 2));

console.log('\n🔍 [DIRECT OCR TEST] Field Extraction Results:');
console.log('  - Invoice Number:', response.data.invoiceNumber);
console.log('  - Invoice Date:', response.data.invoiceDate);
console.log('  - Due Date:', response.data.dueDate);
console.log('  - Amount:', response.data.amount);
console.log('  - Description:', response.data.description);
console.log('  - Vendor Name:', response.data.vendorName);

console.log('\n🎯 [DIRECT OCR TEST] Expected Frontend Behavior:');
console.log('  - formData.invoice_number should be set to:', response.data.invoiceNumber);
console.log('  - formData.invoice_date should be set to:', response.data.invoiceDate);
console.log('  - formData.due_date should be set to:', response.data.dueDate);
console.log('  - formData.amount should be set to:', response.data.amount);
console.log('  - formData.description should be set to:', response.data.description);

console.log('\n⚠️ [DIRECT OCR TEST] If fields are not populating:');
console.log('  1. Check browser console for errors');
console.log('  2. Check Network tab for API response');
console.log('  3. Verify response.success is true');
console.log('  4. Verify response.data exists');
console.log('  5. Check if field names match exactly');

console.log('\n🔧 [DIRECT OCR TEST] Debug Steps:');
console.log('  1. Open browser Developer Tools (F12)');
console.log('  2. Go to Console tab');
console.log('  3. Look for these logs:');
console.log('     - 🔍 [INVOICE UPLOAD] Starting OCR scan');
console.log('     - ✅ [INVOICE UPLOAD] OCR scan completed');
console.log('  4. Go to Network tab');
console.log('  5. Click "Scan Invoice"');
console.log('  6. Look for POST request to /vendor/invoices/scan');
console.log('  7. Check the response body');

console.log('\n📝 [DIRECT OCR TEST] Common Issues:');
console.log('  - CORS errors (check Network tab)');
console.log('  - Authentication errors (check if logged in)');
console.log('  - File upload errors (check file size/type)');
console.log('  - Backend server not running (check port 3001)');
console.log('  - Response format mismatch (check response structure)'); 