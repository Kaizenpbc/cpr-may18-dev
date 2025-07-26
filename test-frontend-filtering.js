// Test the frontend filtering logic with actual data
const testInvoice = {
  id: 29,
  invoice_number: "001",
  status: "pending_submission",
  vendor_id: 1,
  created_at: "2025-07-26T11:52:07.848Z"
};

console.log('🔍 Testing frontend filtering logic...');
console.log('📊 Test invoice:', testInvoice);

// Simulate the frontend filtering logic
const search = '';
const statusFilter = '';
const tabValue = 0; // Pending Submission tab

const searchLower = search.toLowerCase();
const baseFiltered = [testInvoice].filter(invoice => {
  const matchesSearch = 
    invoice.invoice_number.toLowerCase().includes(searchLower) ||
    (invoice.item && invoice.item.toLowerCase().includes(searchLower)) ||
    (invoice.company && invoice.company.toLowerCase().includes(searchLower)) ||
    (invoice.description && invoice.description.toLowerCase().includes(searchLower));
  const matchesStatus = !statusFilter || invoice.status === statusFilter;
  return matchesSearch && matchesStatus;
});

console.log('✅ Base filtered:', baseFiltered);

// Apply tab filtering
let filteredInvoices;
switch (tabValue) {
  case 0: // Pending Submission - all invoices not submitted or paid
    filteredInvoices = baseFiltered.filter(invoice => 
      invoice.status !== 'submitted' && invoice.status !== 'paid'
    );
    console.log('📋 Tab 0 (Pending Submission) filter result:', filteredInvoices);
    console.log(`Status check: ${testInvoice.status} !== 'submitted' && ${testInvoice.status} !== 'paid'`);
    console.log(`Result: ${testInvoice.status !== 'submitted' && testInvoice.status !== 'paid'}`);
    break;
  case 1: // Submitted - invoices that are submitted but not paid
    filteredInvoices = baseFiltered.filter(invoice => 
      invoice.status === 'submitted'
    );
    break;
  case 2: // Paid Invoices
    filteredInvoices = baseFiltered.filter(invoice => 
      invoice.status === 'paid'
    );
    break;
  case 3: // All Invoices
    filteredInvoices = baseFiltered;
    break;
  default:
    filteredInvoices = baseFiltered;
}

console.log('🎯 Final filtered invoices:', filteredInvoices);
console.log('✅ Invoice should appear in Pending Submission tab:', filteredInvoices.length > 0); 