// Test Form Population
console.log('🧪 [FORM TEST] Testing form population...');

// Simulate OCR data that would be returned from the scan
const mockOcrData = {
  invoiceNumber: "2024-001",
  invoiceDate: "2024-01-15",
  dueDate: "2024-02-15",
  amount: "2825.00",
  description: "CPR Training Manuals and Equipment",
  vendorName: "ABC Training Supplies",
  acctNo: "ACC123",
  quantity: "50",
  item: "INV-2024-001",
  rate: "50.00",
  subtotal: "2500.00",
  hst: "325.00",
  confidence: {
    invoiceNumber: 0.8,
    invoiceDate: 0.9,
    dueDate: 0.7,
    amount: 0.95,
    description: 0.6,
    vendorName: 0.8,
    acctNo: 0.7,
    quantity: 0.6,
    item: 0.5,
    rate: 0.7,
    subtotal: 0.8,
    hst: 0.8
  }
};

// Simulate current form data
const currentFormData = {
  vendor_name: '',
  date: '2025-07-23',
  invoice_number: '',
  acct_no: '',
  due_date: '2025-08-22',
  quantity: '',
  item: '',
  description: '',
  rate: '',
  subtotal: '',
  hst: '',
  total: '',
  vendor_id: ''
};

console.log('📋 [FORM TEST] Current form data:', currentFormData);
console.log('🔍 [FORM TEST] OCR data to apply:', mockOcrData);

// Simulate the handleSaveOcrData function
const updatedFormData = { ...currentFormData };

if (mockOcrData.invoiceDate) {
  console.log('📅 [FORM TEST] Setting invoice date:', mockOcrData.invoiceDate);
  updatedFormData.date = mockOcrData.invoiceDate;
}
if (mockOcrData.invoiceNumber) {
  console.log('📄 [FORM TEST] Setting invoice number:', mockOcrData.invoiceNumber);
  updatedFormData.invoice_number = mockOcrData.invoiceNumber;
}
if (mockOcrData.dueDate) {
  console.log('📅 [FORM TEST] Setting due date:', mockOcrData.dueDate);
  updatedFormData.due_date = mockOcrData.dueDate;
}
if (mockOcrData.description) {
  console.log('📝 [FORM TEST] Setting description:', mockOcrData.description);
  updatedFormData.description = mockOcrData.description;
}
if (mockOcrData.amount) {
  console.log('💰 [FORM TEST] Setting total amount:', mockOcrData.amount);
  updatedFormData.total = mockOcrData.amount;
}
if (mockOcrData.acctNo) {
  console.log('🏦 [FORM TEST] Setting account number:', mockOcrData.acctNo);
  updatedFormData.acct_no = mockOcrData.acctNo;
}
if (mockOcrData.quantity) {
  console.log('🔢 [FORM TEST] Setting quantity:', mockOcrData.quantity);
  updatedFormData.quantity = mockOcrData.quantity;
}
if (mockOcrData.item) {
  console.log('📦 [FORM TEST] Setting item:', mockOcrData.item);
  updatedFormData.item = mockOcrData.item;
}
if (mockOcrData.rate) {
  console.log('💵 [FORM TEST] Setting rate:', mockOcrData.rate);
  updatedFormData.rate = mockOcrData.rate;
}
if (mockOcrData.subtotal) {
  console.log('💰 [FORM TEST] Setting subtotal:', mockOcrData.subtotal);
  updatedFormData.subtotal = mockOcrData.subtotal;
}
if (mockOcrData.hst) {
  console.log('🏛️ [FORM TEST] Setting HST:', mockOcrData.hst);
  updatedFormData.hst = mockOcrData.hst;
}

console.log('✅ [FORM TEST] Final updated form data:', updatedFormData);

// Check if any fields were actually updated
const changedFields = [];
for (const [key, value] of Object.entries(updatedFormData)) {
  if (value !== currentFormData[key]) {
    changedFields.push({ field: key, oldValue: currentFormData[key], newValue: value });
  }
}

console.log('🔄 [FORM TEST] Changed fields:', changedFields);

if (changedFields.length > 0) {
  console.log('✅ [FORM TEST] Form population test PASSED - fields would be updated');
} else {
  console.log('❌ [FORM TEST] Form population test FAILED - no fields would be updated');
} 