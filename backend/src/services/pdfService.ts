import puppeteer from 'puppeteer';

interface InvoiceData {
  invoice_id: number;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  amount: string;
  status: string;
  students_billed: number;
  organization_name: string;
  contact_email: string;
  location: string;
  course_type_name: string;
  date_completed: string;
  organization_id: number;
  attendance_list?: Array<{
    first_name: string;
    last_name: string;
    email?: string;
    attended?: boolean;
  }>;
  rate_per_student?: number; // Added for pricing
}

interface PaymentData {
  payment_id: number;
  payment_amount: number;
  payment_date: string;
  payment_method: string;
  reference_number?: string;
  payment_notes?: string;
  payment_status: string;
  payment_created_at: string;
  verified_by_accounting_at?: string;
  invoice_id: number;
  invoice_number: string;
  invoice_amount: number;
  invoice_date: string;
  due_date: string;
  organization_name: string;
  contact_email: string;
  address?: string;
  location?: string;
  course_type_name?: string;
  course_date?: string;
}

export class PDFService {
  private static getInvoiceHTML(invoice: InvoiceData): string {
    const invoiceDate = new Date(invoice.invoice_date).toLocaleDateString();
    const dueDate = new Date(invoice.due_date).toLocaleDateString();
    const courseDate = new Date(invoice.date_completed).toLocaleDateString();
    const studentsBilled = invoice.students_billed || 0;
    const ratePerStudent = Number(invoice.rate_per_student);
    
    if (!ratePerStudent) {
      throw new Error('Pricing not configured for this invoice. Please contact system administrator.');
    }
    
    const subtotal = studentsBilled * ratePerStudent;
    const hst = subtotal * 0.13;
    const total = subtotal + hst;
    const attendanceList = Array.isArray(invoice.attendance_list) ? invoice.attendance_list : [];
    const present = attendanceList.filter(s => s.attended).length;
    const absent = attendanceList.filter(s => s.attended === false).length;
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Invoice ${invoice.invoice_number}</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 20px;
                color: #333;
                line-height: 1.4;
            }
            .invoice-container {
                max-width: 800px;
                margin: 0 auto;
                background: white;
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
                border-bottom: 3px solid #2196F3;
                padding-bottom: 20px;
            }
            .company-name {
                font-size: 24px;
                font-weight: bold;
                color: #2196F3;
                margin-bottom: 5px;
            }
            .company-details {
                font-size: 12px;
                color: #666;
            }
            .invoice-title {
                font-size: 28px;
                font-weight: bold;
                text-align: center;
                margin: 30px 0;
                color: #2196F3;
            }
            .invoice-info {
                display: flex;
                justify-content: space-between;
                margin-bottom: 30px;
            }
            .invoice-details, .bill-to {
                width: 48%;
            }
            .invoice-details h3, .bill-to h3 {
                margin-top: 0;
                color: #2196F3;
                border-bottom: 1px solid #eee;
                padding-bottom: 5px;
            }
            .detail-row {
                margin-bottom: 5px;
            }
            .label {
                font-weight: bold;
                display: inline-block;
                width: 120px;
            }
            .services-table {
                width: 100%;
                border-collapse: collapse;
                margin: 30px 0;
            }
            .services-table th {
                background-color: #2196F3;
                color: white;
                padding: 12px;
                text-align: left;
                font-weight: bold;
            }
            .services-table td {
                padding: 12px;
                border-bottom: 1px solid #eee;
            }
            .services-table tr:nth-child(even) {
                background-color: #f9f9f9;
            }
            .amount-column {
                text-align: right;
            }
            .totals {
                margin-top: 20px;
                text-align: right;
            }
            .total-row {
                margin-bottom: 8px;
                font-size: 14px;
            }
            .total-final {
                font-size: 18px;
                font-weight: bold;
                color: #2196F3;
                border-top: 2px solid #2196F3;
                padding-top: 8px;
                margin-top: 10px;
            }
            .payment-info {
                margin-top: 40px;
                padding: 20px;
                background-color: #f5f5f5;
                border-left: 4px solid #2196F3;
            }
            .payment-info h3 {
                margin-top: 0;
                color: #2196F3;
            }
            .payment-methods {
                margin-top: 15px;
            }
            .payment-method {
                margin-bottom: 5px;
            }
            .footer {
                margin-top: 40px;
                text-align: center;
                font-size: 12px;
                color: #666;
                border-top: 1px solid #eee;
                padding-top: 20px;
            }
            .status-badge {
                display: inline-block;
                padding: 4px 12px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: bold;
                text-transform: uppercase;
            }
            .status-pending {
                background-color: #fff3cd;
                color: #856404;
                border: 1px solid #ffeaa7;
            }
            .status-paid {
                background-color: #d4edda;
                color: #155724;
                border: 1px solid #c3e6cb;
            }
            .status-overdue {
                background-color: #f8d7da;
                color: #721c24;
                border: 1px solid #f5c6cb;
            }
            .attendance-table {
                width: 100%;
                border-collapse: collapse;
                margin: 30px 0;
            }
            .attendance-table th {
                background-color: #2196F3;
                color: white;
                padding: 8px;
                text-align: left;
                font-weight: bold;
            }
            .attendance-table td {
                padding: 8px;
                border-bottom: 1px solid #eee;
            }
            .attendance-table tr:nth-child(even) {
                background-color: #f9f9f9;
            }
            .attendance-summary {
                margin-top: 10px;
                font-weight: bold;
            }
        </style>
    </head>
    <body>
        <div class="invoice-container">
            <div class="header">
                <div class="company-name">GTA CPR TRAINING SERVICES</div>
                <div class="company-details">
                    123 Training Way, Toronto, ON M5V 3A8<br>
                    Phone: (416) 555-0123 | Email: billing@gtacpr.com<br>
                    HST#: 123456789RT0001
                </div>
            </div>

            <div class="invoice-title">INVOICE</div>

            <div class="invoice-info">
                <div class="invoice-details">
                    <h3>Invoice Details</h3>
                    <div class="detail-row">
                        <span class="label">Invoice #:</span>
                        <strong>${invoice.invoice_number}</strong>
                    </div>
                    <div class="detail-row">
                        <span class="label">Invoice Date:</span>
                        ${invoiceDate}
                    </div>
                    <div class="detail-row">
                        <span class="label">Due Date:</span>
                        ${dueDate}
                    </div>
                    <div class="detail-row">
                        <span class="label">Payment Terms:</span>
                        Net 30 Days
                    </div>
                    <div class="detail-row">
                        <span class="label">Status:</span>
                        <span class="status-badge status-${invoice.status.toLowerCase()}">${invoice.status}</span>
                    </div>
                </div>

                <div class="bill-to">
                    <h3>Bill To</h3>
                    <div class="detail-row">
                        <strong>${invoice.organization_name}</strong>
                    </div>
                    <div class="detail-row">
                        ${invoice.contact_email}
                    </div>
                </div>
            </div>

            <div style="margin: 30px 0; padding: 20px; background-color: #f8f9fa; border-radius: 8px; border-left: 4px solid #2196F3;">
                <h3 style="margin: 0 0 20px 0; color: #2196F3; font-size: 18px;">Course Information</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                    <div>
                        <div style="margin-bottom: 15px;">
                            <div style="font-size: 14px; color: #666; margin-bottom: 5px;">Course Type</div>
                            <div style="font-size: 16px; font-weight: 600; color: #333;">${invoice.course_type_name}</div>
                        </div>
                        <div style="margin-bottom: 15px;">
                            <div style="font-size: 14px; color: #666; margin-bottom: 5px;">Location</div>
                            <div style="font-size: 16px; font-weight: 600; color: #333;">${invoice.location}</div>
                        </div>
                        <div style="margin-bottom: 15px;">
                            <div style="font-size: 14px; color: #666; margin-bottom: 5px;">Course Date</div>
                            <div style="font-size: 16px; font-weight: 600; color: #333;">${courseDate}</div>
                        </div>
                    </div>
                    <div>
                        <div style="margin-bottom: 15px;">
                            <div style="font-size: 14px; color: #666; margin-bottom: 5px;">Students Billed</div>
                            <div style="font-size: 16px; font-weight: 600; color: #333;">${invoice.students_billed}</div>
                        </div>
                        <div style="margin-bottom: 15px;">
                            <div style="font-size: 14px; color: #666; margin-bottom: 5px;">Rate per Student</div>
                            <div style="font-size: 16px; font-weight: 600; color: #333;">$${ratePerStudent.toFixed(2)}</div>
                        </div>
                        <div style="margin-bottom: 15px;">
                            <div style="font-size: 14px; color: #666; margin-bottom: 5px;">Base Cost</div>
                            <div style="font-size: 16px; font-weight: 600; color: #333;">$${subtotal.toFixed(2)}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div style="margin: 30px 0; padding: 20px; background-color: #f8f9fa; border-radius: 8px; border-left: 4px solid #28a745;">
                <h3 style="margin: 0 0 20px 0; color: #28a745; font-size: 18px;">Cost Breakdown</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px;">
                    <div style="text-align: center;">
                        <div style="font-size: 14px; color: #666; margin-bottom: 5px;">Base Cost</div>
                        <div style="font-size: 20px; font-weight: 700; color: #333;">$${subtotal.toFixed(2)}</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 14px; color: #666; margin-bottom: 5px;">Tax (HST 13%)</div>
                        <div style="font-size: 20px; font-weight: 700; color: #333;">$${hst.toFixed(2)}</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 14px; color: #666; margin-bottom: 5px;">Total Amount</div>
                        <div style="font-size: 20px; font-weight: 700; color: #2196F3;">$${total.toFixed(2)}</div>
                    </div>
                </div>
            </div>

            <div style="margin: 30px 0; padding: 20px; background-color: #f8f9fa; border-radius: 8px; border-left: 4px solid #ff9800;">
                <h3 style="margin: 0 0 20px 0; color: #ff9800; font-size: 18px;">Student Attendance List</h3>
                ${attendanceList.length > 0 ? `
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
                        <thead>
                            <tr style="background-color: #ff9800; color: white;">
                                <th style="padding: 12px; text-align: left; font-weight: 600;">Student Name</th>
                                <th style="padding: 12px; text-align: left; font-weight: 600;">Email</th>
                                <th style="padding: 12px; text-align: center; font-weight: 600;">Attendance Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${attendanceList.map((s, index) => `
                                <tr style="${index % 2 === 0 ? 'background-color: #ffffff;' : 'background-color: #f9f9f9;'}">
                                    <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: 500;">
                                        ${s.first_name} ${s.last_name}
                                    </td>
                                    <td style="padding: 12px; border-bottom: 1px solid #eee; color: #666;">
                                        ${s.email || 'No email provided'}
                                    </td>
                                    <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">
                                        <span style="
                                            display: inline-block;
                                            padding: 4px 12px;
                                            border-radius: 4px;
                                            font-size: 12px;
                                            font-weight: 600;
                                            text-transform: uppercase;
                                            ${s.attended ? 
                                                'background-color: #d4edda; color: #155724; border: 1px solid #c3e6cb;' : 
                                                'background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb;'
                                            }
                                        ">
                                            ${s.attended ? 'Present' : 'Absent'}
                                        </span>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <div style="
                        display: flex;
                        justify-content: space-around;
                        padding: 15px;
                        background-color: #ffffff;
                        border-radius: 6px;
                        border: 1px solid #e0e0e0;
                        font-weight: 600;
                    ">
                        <div style="text-align: center;">
                            <div style="font-size: 14px; color: #666;">Present</div>
                            <div style="font-size: 18px; color: #28a745;">${present}</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 14px; color: #666;">Absent</div>
                            <div style="font-size: 18px; color: #dc3545;">${absent}</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 14px; color: #666;">Total Students</div>
                            <div style="font-size: 18px; color: #2196F3;">${attendanceList.length}</div>
                        </div>
                    </div>
                ` : `
                    <div style="text-align: center; padding: 40px; color: #666;">
                        <div style="font-size: 16px; margin-bottom: 10px;">No attendance data available</div>
                        <div style="font-size: 14px;">Student attendance has not been recorded for this course.</div>
                    </div>
                `}
            </div>

            <div class="payment-info">
                <h3>Payment Instructions</h3>
                <p>Please remit payment within 30 days of invoice date.</p>
                
                <div class="payment-methods">
                    <div class="payment-method">• <strong>E-Transfer:</strong> payments@gtacpr.com</div>
                    <div class="payment-method">• <strong>Cheque:</strong> Payable to GTA CPR Training Services</div>
                    <div class="payment-method">• <strong>Credit Card:</strong> Call (416) 555-0123</div>
                    <div class="payment-method">• <strong>Online Portal:</strong> www.gtacpr.com/payments</div>
                </div>
                
                <p style="margin-top: 15px;">
                    <strong>Reference:</strong> ${invoice.invoice_number}
                </p>
            </div>

            <div class="footer">
                <p><strong>Thank you for choosing GTA CPR Training Services!</strong></p>
                <p>
                    This invoice is due within 30 days. A 1.5% monthly service charge may be applied to overdue accounts.<br>
                    Questions? Contact us at (416) 555-0123 or support@gtacpr.com
                </p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  private static getPaymentReceiptHTML(payment: PaymentData): string {
    const paymentDate = new Date(payment.payment_date).toLocaleDateString();
    const receiptDate = new Date(payment.payment_created_at).toLocaleDateString();
    const courseDate = payment.course_date ? new Date(payment.course_date).toLocaleDateString() : 'N/A';

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Payment Receipt ${payment.payment_id}</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 20px;
                color: #333;
                line-height: 1.4;
            }
            .receipt-container {
                max-width: 800px;
                margin: 0 auto;
                background: white;
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
                border-bottom: 3px solid #4CAF50;
                padding-bottom: 20px;
            }
            .company-name {
                font-size: 24px;
                font-weight: bold;
                color: #4CAF50;
                margin-bottom: 5px;
            }
            .company-details {
                font-size: 12px;
                color: #666;
            }
            .receipt-title {
                font-size: 28px;
                font-weight: bold;
                text-align: center;
                margin: 30px 0;
                color: #4CAF50;
            }
            .receipt-info {
                display: flex;
                justify-content: space-between;
                margin-bottom: 30px;
            }
            .receipt-details, .payment-to {
                width: 48%;
            }
            .receipt-details h3, .payment-to h3 {
                margin-top: 0;
                color: #4CAF50;
                border-bottom: 1px solid #eee;
                padding-bottom: 5px;
            }
            .detail-row {
                margin-bottom: 5px;
            }
            .label {
                font-weight: bold;
                display: inline-block;
                width: 120px;
            }
            .payment-details {
                width: 100%;
                border-collapse: collapse;
                margin: 30px 0;
            }
            .payment-details th {
                background-color: #4CAF50;
                color: white;
                padding: 12px;
                text-align: left;
                font-weight: bold;
            }
            .payment-details td {
                padding: 12px;
                border-bottom: 1px solid #eee;
            }
            .payment-details tr:nth-child(even) {
                background-color: #f9f9f9;
            }
            .amount-column {
                text-align: right;
            }
            .status-badge {
                display: inline-block;
                padding: 4px 12px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: bold;
                text-transform: uppercase;
            }
            .status-verified {
                background-color: #d4edda;
                color: #155724;
                border: 1px solid #c3e6cb;
            }
            .status-pending {
                background-color: #fff3cd;
                color: #856404;
                border: 1px solid #ffeaa7;
            }
            .status-rejected {
                background-color: #f8d7da;
                color: #721c24;
                border: 1px solid #f5c6cb;
            }
            .footer {
                margin-top: 40px;
                text-align: center;
                font-size: 12px;
                color: #666;
                border-top: 1px solid #eee;
                padding-top: 20px;
            }
            .thank-you {
                text-align: center;
                margin: 30px 0;
                font-size: 18px;
                color: #4CAF50;
                font-weight: bold;
            }
        </style>
    </head>
    <body>
        <div class="receipt-container">
            <div class="header">
                <div class="company-name">GTA CPR TRAINING SERVICES</div>
                <div class="company-details">
                    123 Training Way, Toronto, ON M5V 3A8<br>
                    Phone: (416) 555-0123 | Email: billing@gtacpr.com<br>
                    HST#: 123456789RT0001
                </div>
            </div>

            <div class="receipt-title">PAYMENT RECEIPT</div>

            <div class="receipt-info">
                <div class="receipt-details">
                    <h3>Receipt Details</h3>
                    <div class="detail-row">
                        <span class="label">Receipt #:</span>
                        <strong>${payment.payment_id}</strong>
                    </div>
                    <div class="detail-row">
                        <span class="label">Receipt Date:</span>
                        ${receiptDate}
                    </div>
                    <div class="detail-row">
                        <span class="label">Payment Date:</span>
                        ${paymentDate}
                    </div>
                    <div class="detail-row">
                        <span class="label">Payment Method:</span>
                        ${payment.payment_method.replace('_', ' ').toUpperCase()}
                    </div>
                    <div class="detail-row">
                        <span class="label">Reference #:</span>
                        ${payment.reference_number || 'N/A'}
                    </div>
                    <div class="detail-row">
                        <span class="label">Status:</span>
                        <span class="status-badge status-${payment.payment_status}">
                            ${payment.payment_status.replace('_', ' ').toUpperCase()}
                        </span>
                    </div>
                </div>
                <div class="payment-to">
                    <h3>Payment From</h3>
                    <div class="detail-row">
                        <span class="label">Organization:</span>
                        <strong>${payment.organization_name}</strong>
                    </div>
                    <div class="detail-row">
                        <span class="label">Contact Email:</span>
                        ${payment.contact_email}
                    </div>
                    ${payment.address ? `
                    <div class="detail-row">
                        <span class="label">Address:</span>
                        ${payment.address}
                    </div>
                    ` : ''}
                </div>
            </div>

            <table class="payment-details">
                <thead>
                    <tr>
                        <th>Description</th>
                        <th>Invoice #</th>
                        <th>Course</th>
                        <th>Date</th>
                        <th class="amount-column">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>CPR Training Services</td>
                        <td>${payment.invoice_number}</td>
                        <td>${payment.course_type_name || 'N/A'}</td>
                        <td>${courseDate}</td>
                        <td class="amount-column">$${payment.payment_amount.toFixed(2)}</td>
                    </tr>
                </tbody>
            </table>

            <div style="text-align: right; margin-top: 20px;">
                <div style="font-size: 18px; font-weight: bold; color: #4CAF50;">
                    Total Payment: $${payment.payment_amount.toFixed(2)}
                </div>
            </div>

            ${payment.payment_notes ? `
            <div style="margin-top: 20px; padding: 15px; background-color: #f5f5f5; border-left: 4px solid #4CAF50;">
                <strong>Payment Notes:</strong><br>
                ${payment.payment_notes}
            </div>
            ` : ''}

            <div class="thank-you">
                Thank you for your payment!
            </div>

            <div class="footer">
                <p>This receipt serves as proof of payment for the above services.</p>
                <p>For questions regarding this payment, please contact billing@gtacpr.com</p>
                <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  static async generateInvoicePDF(invoice: InvoiceData): Promise<Buffer> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      const html = this.getInvoiceHTML(invoice);

      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px',
        },
      });

      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }

  static getInvoicePreviewHTML(invoice: InvoiceData): string {
    return this.getInvoiceHTML(invoice);
  }

  static async generatePaymentReceipt(payment: PaymentData): Promise<Buffer> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();
      const html = this.getPaymentReceiptHTML(payment);

      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '0.5in',
          right: '0.5in',
          bottom: '0.5in',
          left: '0.5in'
        }
      });

      return Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }
  }
}
