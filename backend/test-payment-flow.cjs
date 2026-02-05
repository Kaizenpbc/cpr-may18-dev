const http = require('http');

const BASE_URL = 'localhost';
const PORT = 3000;

function makeRequest(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: BASE_URL,
      port: PORT,
      path: `/api/v1${path}`,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function runTests() {
  console.log('='.repeat(60));
  console.log('PAYMENT FLOW TEST');
  console.log('='.repeat(60));

  // 1. Login as organization user
  console.log('\n1. Logging in as organization user...');
  const loginRes = await makeRequest('POST', '/auth/login', {
    username: 'orguser',
    password: 'test123'
  });

  if (loginRes.status !== 200) {
    console.log('Login failed:', loginRes.data);
    return;
  }

  const token = loginRes.data.token;
  console.log('   Login successful');

  // 2. Get invoices
  console.log('\n2. Getting invoices...');
  const invoicesRes = await makeRequest('GET', '/organization/invoices', null, token);

  if (invoicesRes.status !== 200) {
    console.log('   Failed to get invoices:', invoicesRes.data);
    return;
  }

  const invoices = invoicesRes.data.data?.invoices || [];
  console.log(`   Found ${invoices.length} invoices`);

  // Find an invoice with balance due
  const unpaidInvoice = invoices.find(inv => parseFloat(inv.balance_due) > 0);

  if (!unpaidInvoice) {
    console.log('   No unpaid invoices found. Creating test scenario...');
    console.log('   Please ensure there is at least one invoice with balance_due > 0');
    return;
  }

  console.log(`   Using invoice: ${unpaidInvoice.invoice_number}`);
  console.log(`   Balance due: $${parseFloat(unpaidInvoice.balance_due).toFixed(2)}`);

  // 3. Test calculate-balance endpoint
  console.log('\n3. Testing /calculate-balance endpoint...');
  const testAmount = Math.min(100, parseFloat(unpaidInvoice.balance_due));
  const balanceRes = await makeRequest('GET', `/invoices/${unpaidInvoice.id}/calculate-balance?amount=${testAmount}`, null, token);

  if (balanceRes.status === 200) {
    console.log('   Calculate-balance endpoint works!');
    console.log('   Response:', JSON.stringify(balanceRes.data.data, null, 2));
  } else {
    console.log('   Calculate-balance failed:', balanceRes.status, balanceRes.data);
  }

  // 4. Test overpayment prevention
  console.log('\n4. Testing overpayment prevention...');
  const overpayAmount = parseFloat(unpaidInvoice.balance_due) + 100;
  const overpayRes = await makeRequest('POST', `/organization/invoices/${unpaidInvoice.id}/payment-submission`, {
    amount: overpayAmount,
    payment_method: 'check',
    payment_date: new Date().toISOString().split('T')[0],
    reference_number: 'TEST-OVERPAY',
    notes: 'Testing overpayment prevention'
  }, token);

  if (overpayRes.status === 400) {
    console.log('   Overpayment correctly rejected!');
    console.log('   Message:', overpayRes.data.message);
  } else {
    console.log('   WARNING: Overpayment was not rejected:', overpayRes.status);
  }

  // 5. Submit a valid payment
  console.log('\n5. Submitting valid payment...');
  const paymentAmount = Math.min(50, parseFloat(unpaidInvoice.balance_due));
  const paymentRes = await makeRequest('POST', `/organization/invoices/${unpaidInvoice.id}/payment-submission`, {
    amount: paymentAmount,
    payment_method: 'check',
    payment_date: new Date().toISOString().split('T')[0],
    reference_number: 'TEST-' + Date.now(),
    notes: 'Test payment'
  }, token);

  if (paymentRes.status === 200) {
    console.log('   Payment submitted successfully!');
    console.log('   Payment type:', paymentRes.data.data.payment_type);
    console.log('   Remaining balance:', paymentRes.data.data.remaining_balance);
  } else {
    console.log('   Payment failed:', paymentRes.status, paymentRes.data.message);
  }

  // 6. Test idempotency - try same payment again immediately
  console.log('\n6. Testing idempotency (duplicate submission)...');
  const duplicateRes = await makeRequest('POST', `/organization/invoices/${unpaidInvoice.id}/payment-submission`, {
    amount: paymentAmount,
    payment_method: 'check',
    payment_date: new Date().toISOString().split('T')[0],
    reference_number: 'TEST-DUPLICATE',
    notes: 'Duplicate payment test'
  }, token);

  if (duplicateRes.status === 409) {
    console.log('   Duplicate correctly rejected with 409!');
    console.log('   Message:', duplicateRes.data.message);
  } else if (duplicateRes.status === 400 && duplicateRes.data.message?.includes('exceeds')) {
    console.log('   Rejected due to balance (pending payment counted correctly)');
    console.log('   Message:', duplicateRes.data.message);
  } else {
    console.log('   Result:', duplicateRes.status, duplicateRes.data.message);
  }

  // 7. Verify invoice status updated
  console.log('\n7. Verifying invoice status...');
  const updatedInvoicesRes = await makeRequest('GET', '/organization/invoices', null, token);
  const updatedInvoice = updatedInvoicesRes.data.data?.invoices?.find(inv => inv.id === unpaidInvoice.id);

  if (updatedInvoice) {
    console.log('   Invoice status:', updatedInvoice.status || updatedInvoice.payment_status);
    console.log('   Updated balance_due:', updatedInvoice.balance_due);
  }

  console.log('\n' + '='.repeat(60));
  console.log('TEST COMPLETE');
  console.log('='.repeat(60));
}

runTests().catch(console.error);
