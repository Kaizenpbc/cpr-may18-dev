import PDFDocument from 'pdfkit';

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
  rate_per_student?: number;
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

// Colors
const BLUE = '#2196F3';
const GREEN = '#4CAF50';
const ORANGE = '#ff9800';
const GRAY = '#666666';
const LIGHT_GRAY = '#f5f5f5';
const RED = '#dc3545';

export class PDFService {
  private static formatDate(dateStr: string): string {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateStr || 'N/A';
    }
  }

  private static formatCurrency(amount: number): string {
    return `$${amount.toFixed(2)}`;
  }

  static async generateInvoicePDF(invoice: InvoiceData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50,
          bufferPages: true
        });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const invoiceDate = this.formatDate(invoice.invoice_date);
        const dueDate = this.formatDate(invoice.due_date);
        const courseDate = this.formatDate(invoice.date_completed);
        const studentsBilled = invoice.students_billed || 0;
        const ratePerStudent = Number(invoice.rate_per_student) || 0;

        if (!ratePerStudent) {
          throw new Error('Pricing not configured for this invoice.');
        }

        const subtotal = studentsBilled * ratePerStudent;
        const hst = subtotal * 0.13;
        const total = subtotal + hst;
        const attendanceList = Array.isArray(invoice.attendance_list) ? invoice.attendance_list : [];
        const present = attendanceList.filter(s => s.attended).length;
        const absent = attendanceList.filter(s => s.attended === false).length;

        // Header
        doc.fontSize(20).fillColor(BLUE).text('GTA CPR TRAINING SERVICES', { align: 'center' });
        doc.fontSize(10).fillColor(GRAY)
          .text('123 Training Way, Toronto, ON M5V 3A8', { align: 'center' })
          .text('Phone: (416) 555-0123 | Email: billing@gtacpr.com', { align: 'center' })
          .text('HST#: 123456789RT0001', { align: 'center' });

        doc.moveTo(50, doc.y + 10).lineTo(545, doc.y + 10).strokeColor(BLUE).lineWidth(2).stroke();
        doc.moveDown(1.5);

        // Invoice Title
        doc.fontSize(24).fillColor(BLUE).text('INVOICE', { align: 'center' });
        doc.moveDown(1);

        // Invoice Details and Bill To - Two columns
        const leftCol = 50;
        const rightCol = 300;
        let currentY = doc.y;

        // Left column - Invoice Details
        doc.fontSize(12).fillColor(BLUE).text('Invoice Details', leftCol, currentY);
        doc.moveTo(leftCol, doc.y + 2).lineTo(200, doc.y + 2).strokeColor('#eeeeee').lineWidth(1).stroke();
        doc.moveDown(0.5);

        doc.fontSize(10).fillColor('#000000');
        doc.text(`Invoice #: `, leftCol, doc.y, { continued: true }).font('Helvetica-Bold').text(invoice.invoice_number);
        doc.font('Helvetica').text(`Invoice Date: ${invoiceDate}`, leftCol);
        doc.text(`Due Date: ${dueDate}`, leftCol);
        doc.text(`Payment Terms: Net 30 Days`, leftCol);
        doc.text(`Status: ${invoice.status.toUpperCase()}`, leftCol);

        // Right column - Bill To
        doc.fontSize(12).fillColor(BLUE).text('Bill To', rightCol, currentY);
        doc.moveTo(rightCol, currentY + 14).lineTo(450, currentY + 14).strokeColor('#eeeeee').lineWidth(1).stroke();

        doc.fontSize(10).fillColor('#000000');
        doc.font('Helvetica-Bold').text(invoice.organization_name, rightCol, currentY + 20);
        doc.font('Helvetica').text(invoice.contact_email, rightCol);

        doc.moveDown(2);

        // Course Information Box
        const boxY = doc.y;
        doc.rect(50, boxY, 495, 100).fillColor(LIGHT_GRAY).fill();
        doc.moveTo(50, boxY).lineTo(50, boxY + 100).strokeColor(BLUE).lineWidth(4).stroke();

        doc.fontSize(12).fillColor(BLUE).text('Course Information', 60, boxY + 10);

        doc.fontSize(9).fillColor(GRAY);
        doc.text('Course Type', 60, boxY + 30);
        doc.text('Location', 60, boxY + 55);
        doc.text('Course Date', 60, boxY + 80);

        doc.text('Students Billed', 280, boxY + 30);
        doc.text('Rate per Student', 280, boxY + 55);
        doc.text('Base Cost', 280, boxY + 80);

        doc.fontSize(11).fillColor('#000000');
        doc.text(invoice.course_type_name || 'N/A', 60, boxY + 40);
        doc.text(invoice.location || 'N/A', 60, boxY + 65);
        doc.text(courseDate, 60, boxY + 90);

        doc.text(String(studentsBilled), 280, boxY + 40);
        doc.text(this.formatCurrency(ratePerStudent), 280, boxY + 65);
        doc.text(this.formatCurrency(subtotal), 280, boxY + 90);

        doc.y = boxY + 115;

        // Cost Breakdown Box
        const costBoxY = doc.y;
        doc.rect(50, costBoxY, 495, 60).fillColor(LIGHT_GRAY).fill();
        doc.moveTo(50, costBoxY).lineTo(50, costBoxY + 60).strokeColor(GREEN).lineWidth(4).stroke();

        doc.fontSize(12).fillColor(GREEN).text('Cost Breakdown', 60, costBoxY + 10);

        // Three columns for cost
        doc.fontSize(9).fillColor(GRAY);
        doc.text('Base Cost', 80, costBoxY + 30, { align: 'left' });
        doc.text('Tax (HST 13%)', 230, costBoxY + 30, { align: 'left' });
        doc.text('Total Amount', 380, costBoxY + 30, { align: 'left' });

        doc.fontSize(14).fillColor('#000000');
        doc.text(this.formatCurrency(subtotal), 80, costBoxY + 42);
        doc.text(this.formatCurrency(hst), 230, costBoxY + 42);
        doc.fillColor(BLUE).text(this.formatCurrency(total), 380, costBoxY + 42);

        doc.y = costBoxY + 75;

        // Attendance List
        const attendanceBoxY = doc.y;
        doc.rect(50, attendanceBoxY, 495, 25).fillColor(LIGHT_GRAY).fill();
        doc.moveTo(50, attendanceBoxY).lineTo(50, attendanceBoxY + 25).strokeColor(ORANGE).lineWidth(4).stroke();
        doc.fontSize(12).fillColor(ORANGE).text('Student Attendance List', 60, attendanceBoxY + 7);

        doc.y = attendanceBoxY + 30;

        if (attendanceList.length > 0) {
          // Table header
          const tableTop = doc.y;
          doc.rect(50, tableTop, 495, 20).fillColor(ORANGE).fill();
          doc.fontSize(10).fillColor('white');
          doc.text('Student Name', 60, tableTop + 5);
          doc.text('Email', 220, tableTop + 5);
          doc.text('Status', 450, tableTop + 5);

          doc.y = tableTop + 20;

          // Table rows
          attendanceList.forEach((student, index) => {
            const rowY = doc.y;
            if (index % 2 === 0) {
              doc.rect(50, rowY, 495, 18).fillColor('#f9f9f9').fill();
            }
            doc.fontSize(9).fillColor('#000000');
            doc.text(`${student.first_name} ${student.last_name}`, 60, rowY + 4);
            doc.fillColor(GRAY).text(student.email || 'No email', 220, rowY + 4);

            const statusColor = student.attended ? GREEN : RED;
            const statusText = student.attended ? 'Present' : 'Absent';
            doc.fillColor(statusColor).text(statusText, 450, rowY + 4);

            doc.y = rowY + 18;
          });

          // Attendance summary
          doc.moveDown(0.5);
          doc.fontSize(10).fillColor('#000000');
          doc.text(`Present: ${present}  |  Absent: ${absent}  |  Total: ${attendanceList.length}`, { align: 'center' });
        } else {
          doc.fontSize(10).fillColor(GRAY).text('No attendance data available', { align: 'center' });
        }

        doc.moveDown(1.5);

        // Payment Instructions
        const paymentY = doc.y;
        doc.rect(50, paymentY, 495, 90).fillColor(LIGHT_GRAY).fill();
        doc.moveTo(50, paymentY).lineTo(50, paymentY + 90).strokeColor(BLUE).lineWidth(4).stroke();

        doc.fontSize(12).fillColor(BLUE).text('Payment Instructions', 60, paymentY + 10);
        doc.fontSize(9).fillColor('#000000');
        doc.text('Please remit payment within 30 days of invoice date.', 60, paymentY + 28);
        doc.text('E-Transfer: payments@gtacpr.com', 60, paymentY + 42);
        doc.text('Cheque: Payable to GTA CPR Training Services', 60, paymentY + 54);
        doc.text('Credit Card: Call (416) 555-0123', 60, paymentY + 66);
        doc.text(`Reference: ${invoice.invoice_number}`, 60, paymentY + 78);

        doc.y = paymentY + 100;

        // Footer
        doc.moveDown(1);
        doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#eeeeee').lineWidth(1).stroke();
        doc.moveDown(0.5);
        doc.fontSize(10).fillColor('#000000').text('Thank you for choosing GTA CPR Training Services!', { align: 'center' });
        doc.fontSize(8).fillColor(GRAY)
          .text('This invoice is due within 30 days. A 1.5% monthly service charge may be applied to overdue accounts.', { align: 'center' })
          .text('Questions? Contact us at (416) 555-0123 or support@gtacpr.com', { align: 'center' });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  static getInvoicePreviewHTML(invoice: InvoiceData): string {
    // Keep HTML preview for web display
    const invoiceDate = this.formatDate(invoice.invoice_date);
    const dueDate = this.formatDate(invoice.due_date);
    const courseDate = this.formatDate(invoice.date_completed);
    const studentsBilled = invoice.students_billed || 0;
    const ratePerStudent = Number(invoice.rate_per_student) || 0;
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
            body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 3px solid #2196F3; padding-bottom: 15px; }
            .company-name { font-size: 24px; font-weight: bold; color: #2196F3; }
            .invoice-title { font-size: 28px; font-weight: bold; text-align: center; margin: 20px 0; color: #2196F3; }
            .section { margin: 20px 0; padding: 15px; background: #f5f5f5; border-left: 4px solid #2196F3; }
            .section h3 { margin: 0 0 10px 0; color: #2196F3; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            th { background: #2196F3; color: white; padding: 10px; text-align: left; }
            td { padding: 10px; border-bottom: 1px solid #eee; }
            .total { font-size: 18px; font-weight: bold; color: #2196F3; text-align: right; }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="company-name">GTA CPR TRAINING SERVICES</div>
            <div>123 Training Way, Toronto, ON M5V 3A8 | (416) 555-0123</div>
        </div>
        <div class="invoice-title">INVOICE</div>
        <div class="section">
            <h3>Invoice Details</h3>
            <p><strong>Invoice #:</strong> ${invoice.invoice_number}</p>
            <p><strong>Date:</strong> ${invoiceDate} | <strong>Due:</strong> ${dueDate}</p>
            <p><strong>Status:</strong> ${invoice.status}</p>
        </div>
        <div class="section">
            <h3>Bill To</h3>
            <p><strong>${invoice.organization_name}</strong></p>
            <p>${invoice.contact_email}</p>
        </div>
        <div class="section">
            <h3>Course Information</h3>
            <p><strong>Course:</strong> ${invoice.course_type_name} | <strong>Location:</strong> ${invoice.location}</p>
            <p><strong>Date:</strong> ${courseDate} | <strong>Students:</strong> ${studentsBilled}</p>
        </div>
        <div class="section">
            <h3>Cost Breakdown</h3>
            <p>Base Cost (${studentsBilled} x ${this.formatCurrency(ratePerStudent)}): ${this.formatCurrency(subtotal)}</p>
            <p>HST (13%): ${this.formatCurrency(hst)}</p>
            <p class="total">Total: ${this.formatCurrency(total)}</p>
        </div>
        ${attendanceList.length > 0 ? `
        <div class="section" style="border-left-color: #ff9800;">
            <h3 style="color: #ff9800;">Attendance (${present} Present, ${absent} Absent)</h3>
            <table>
                <tr><th>Name</th><th>Email</th><th>Status</th></tr>
                ${attendanceList.map(s => `
                    <tr>
                        <td>${s.first_name} ${s.last_name}</td>
                        <td>${s.email || 'N/A'}</td>
                        <td style="color: ${s.attended ? 'green' : 'red'}">${s.attended ? 'Present' : 'Absent'}</td>
                    </tr>
                `).join('')}
            </table>
        </div>
        ` : ''}
    </body>
    </html>
    `;
  }

  static async generatePaymentReceipt(payment: PaymentData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50,
          bufferPages: true
        });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const paymentDate = this.formatDate(payment.payment_date);
        const receiptDate = this.formatDate(payment.payment_created_at);
        const courseDate = payment.course_date ? this.formatDate(payment.course_date) : 'N/A';

        // Header
        doc.fontSize(20).fillColor(GREEN).text('GTA CPR TRAINING SERVICES', { align: 'center' });
        doc.fontSize(10).fillColor(GRAY)
          .text('123 Training Way, Toronto, ON M5V 3A8', { align: 'center' })
          .text('Phone: (416) 555-0123 | Email: billing@gtacpr.com', { align: 'center' })
          .text('HST#: 123456789RT0001', { align: 'center' });

        doc.moveTo(50, doc.y + 10).lineTo(545, doc.y + 10).strokeColor(GREEN).lineWidth(2).stroke();
        doc.moveDown(1.5);

        // Receipt Title
        doc.fontSize(24).fillColor(GREEN).text('PAYMENT RECEIPT', { align: 'center' });
        doc.moveDown(1);

        // Receipt Details
        const leftCol = 50;
        const rightCol = 300;
        let currentY = doc.y;

        doc.fontSize(12).fillColor(GREEN).text('Receipt Details', leftCol, currentY);
        doc.moveTo(leftCol, doc.y + 2).lineTo(200, doc.y + 2).strokeColor('#eeeeee').lineWidth(1).stroke();
        doc.moveDown(0.5);

        doc.fontSize(10).fillColor('#000000');
        doc.text(`Receipt #: `, leftCol, doc.y, { continued: true }).font('Helvetica-Bold').text(String(payment.payment_id));
        doc.font('Helvetica').text(`Receipt Date: ${receiptDate}`, leftCol);
        doc.text(`Payment Date: ${paymentDate}`, leftCol);
        doc.text(`Method: ${payment.payment_method.replace('_', ' ').toUpperCase()}`, leftCol);
        doc.text(`Reference: ${payment.reference_number || 'N/A'}`, leftCol);
        doc.text(`Status: ${payment.payment_status.toUpperCase()}`, leftCol);

        // Payment From
        doc.fontSize(12).fillColor(GREEN).text('Payment From', rightCol, currentY);
        doc.moveTo(rightCol, currentY + 14).lineTo(450, currentY + 14).strokeColor('#eeeeee').lineWidth(1).stroke();

        doc.fontSize(10).fillColor('#000000');
        doc.font('Helvetica-Bold').text(payment.organization_name, rightCol, currentY + 20);
        doc.font('Helvetica').text(payment.contact_email, rightCol);
        if (payment.address) {
          doc.text(payment.address, rightCol);
        }

        doc.moveDown(3);

        // Payment Details Table
        const tableTop = doc.y;
        doc.rect(50, tableTop, 495, 25).fillColor(GREEN).fill();
        doc.fontSize(10).fillColor('white');
        doc.text('Description', 60, tableTop + 7);
        doc.text('Invoice #', 200, tableTop + 7);
        doc.text('Course', 300, tableTop + 7);
        doc.text('Amount', 470, tableTop + 7);

        const rowY = tableTop + 25;
        doc.rect(50, rowY, 495, 25).fillColor('#f9f9f9').fill();
        doc.fontSize(10).fillColor('#000000');
        doc.text('CPR Training Services', 60, rowY + 7);
        doc.text(payment.invoice_number, 200, rowY + 7);
        doc.text(payment.course_type_name || 'N/A', 300, rowY + 7);
        doc.text(this.formatCurrency(payment.payment_amount), 470, rowY + 7);

        doc.y = rowY + 40;

        // Total
        doc.fontSize(16).fillColor(GREEN).text(`Total Payment: ${this.formatCurrency(payment.payment_amount)}`, { align: 'right' });

        // Notes
        if (payment.payment_notes) {
          doc.moveDown(1);
          const notesY = doc.y;
          doc.rect(50, notesY, 495, 50).fillColor(LIGHT_GRAY).fill();
          doc.moveTo(50, notesY).lineTo(50, notesY + 50).strokeColor(GREEN).lineWidth(4).stroke();
          doc.fontSize(10).fillColor('#000000');
          doc.font('Helvetica-Bold').text('Payment Notes:', 60, notesY + 10);
          doc.font('Helvetica').text(payment.payment_notes, 60, notesY + 25, { width: 475 });
          doc.y = notesY + 60;
        }

        // Thank you
        doc.moveDown(2);
        doc.fontSize(16).fillColor(GREEN).text('Thank you for your payment!', { align: 'center' });

        // Footer
        doc.moveDown(2);
        doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#eeeeee').lineWidth(1).stroke();
        doc.moveDown(0.5);
        doc.fontSize(9).fillColor(GRAY)
          .text('This receipt serves as proof of payment for the above services.', { align: 'center' })
          .text('For questions regarding this payment, please contact billing@gtacpr.com', { align: 'center' })
          .text(`Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, { align: 'center' });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}
