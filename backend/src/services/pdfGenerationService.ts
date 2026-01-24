import PDFDocument from 'pdfkit';

interface InvoiceData {
  id: number;
  invoice_number: string;
  item?: string;
  company?: string;
  billing_company?: string;
  quantity?: number | null;
  description: string;
  rate: number;
  amount: number;
  subtotal: number;
  hst: number;
  total: number;
  status: string;
  created_at: string;
  due_date?: string;
  payment_date?: string;
  pdf_filename?: string;
}

class PDFGenerationService {
  async generateInvoicePDF(invoiceData: InvoiceData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));

        // Simple invoice layout
        this.addHeader(doc, invoiceData);
        this.addCompanyInfo(doc, invoiceData);
        this.addInvoiceDetails(doc, invoiceData);
        this.addBillToSection(doc, invoiceData);
        this.addInvoiceTable(doc, invoiceData);
        this.addTotalsSection(doc, invoiceData);
        this.addFooter(doc, invoiceData);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  private addHeader(doc: PDFKit.PDFDocument, invoiceData: InvoiceData) {
    doc.fontSize(24)
       .font('Helvetica-Bold')
       .text('INVOICE', { align: 'center' })
       .moveDown(0.5);

    doc.fontSize(14)
       .font('Helvetica')
       .text(`Invoice #: ${invoiceData.invoice_number}`, { align: 'right' })
       .moveDown(0.5);

    const invoiceDate = new Date(invoiceData.created_at).toLocaleDateString('en-CA');
    doc.text(`Date: ${invoiceDate}`, { align: 'right' })
       .moveDown(2);
  }

  private addCompanyInfo(doc: PDFKit.PDFDocument, invoiceData: InvoiceData) {
    const companyName = invoiceData.billing_company || invoiceData.company || 'Company Name';
    
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .text(companyName)
       .moveDown(0.5);

    doc.fontSize(10)
       .font('Helvetica')
       .text('123 Business Street')
       .text('Toronto, ON M5V 3A8')
       .text('Phone: (416) 555-0123')
       .text('Email: info@company.com')
       .moveDown(2);
  }

  private addInvoiceDetails(doc: PDFKit.PDFDocument, invoiceData: InvoiceData) {
    if (invoiceData.due_date) {
      const dueDate = new Date(invoiceData.due_date).toLocaleDateString('en-CA');
      doc.fontSize(10)
         .font('Helvetica')
         .text(`Due Date: ${dueDate}`, { align: 'right' })
         .moveDown(1);
    }

    doc.fontSize(10)
       .font('Helvetica-Bold')
       .text(`Status: ${this.formatStatus(invoiceData.status)}`, { align: 'right' })
       .moveDown(2);
  }

  private addBillToSection(doc: PDFKit.PDFDocument, invoiceData: InvoiceData) {
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .text('Bill To:')
       .moveDown(0.5);

    doc.fontSize(10)
       .font('Helvetica')
       .text('GTACPR')
       .text('123 Main Street')
       .text('Toronto, ON M5V 3A8')
       .text('Canada')
       .moveDown(2);
  }

  private addInvoiceTable(doc: PDFKit.PDFDocument, invoiceData: InvoiceData) {
    const tableTop = doc.y;
    const itemX = 50;
    const quantityX = 300;
    const rateX = 350;
    const amountX = 450;

    // Table Headers
    doc.fontSize(10)
       .font('Helvetica-Bold')
       .text('Item', itemX, tableTop)
       .text('Qty', quantityX, tableTop)
       .text('Rate', rateX, tableTop)
       .text('Amount', amountX, tableTop)
       .moveDown(0.5);

    // Table Content
    const itemName = invoiceData.item || 'Service';
    const quantity = Number(invoiceData.quantity) || 1;
    const rate = Number(invoiceData.rate) || 0;
    const amount = Number(invoiceData.amount) || 0;

    doc.fontSize(10)
       .font('Helvetica')
       .text(itemName, itemX)
       .text(quantity.toString(), quantityX)
       .text(`$${rate.toFixed(2)}`, rateX)
       .text(`$${amount.toFixed(2)}`, amountX)
       .moveDown(1);

    // Description
    if (invoiceData.description) {
      doc.fontSize(9)
         .font('Helvetica')
         .text('Description:', itemX)
         .moveDown(0.3);
      
      const maxWidth = 400;
      doc.text(invoiceData.description, itemX, undefined, { width: maxWidth })
         .moveDown(1);
    }

    // Draw table lines
    doc.moveTo(50, tableTop - 10)
       .lineTo(550, tableTop - 10)
       .stroke()
       .moveTo(50, doc.y + 10)
       .lineTo(550, doc.y + 10)
       .stroke();
  }

  private addTotalsSection(doc: PDFKit.PDFDocument, invoiceData: InvoiceData) {
    const totalsX = 400;
    let currentY = doc.y + 20;

    // Subtotal
    const subtotal = Number(invoiceData.subtotal) || 0;
    if (subtotal > 0) {
      doc.fontSize(10)
         .font('Helvetica')
         .text('Subtotal:', totalsX, currentY)
         .text(`$${subtotal.toFixed(2)}`, totalsX + 100, currentY);
      currentY += 20;
    }

    // HST
    const hst = Number(invoiceData.hst) || 0;
    if (hst > 0) {
      doc.text('HST:', totalsX, currentY)
         .text(`$${hst.toFixed(2)}`, totalsX + 100, currentY);
      currentY += 20;
    }

    // Total
    const total = (Number(invoiceData.total) && Number(invoiceData.total) > 0)
      ? Number(invoiceData.total)
      : Number(invoiceData.amount) || 0;
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .text('Total:', totalsX, currentY)
       .text(`$${total.toFixed(2)}`, totalsX + 100, currentY);

    // Draw total line
    doc.moveTo(totalsX, currentY - 10)
       .lineTo(totalsX + 150, currentY - 10)
       .stroke();
  }

  private addFooter(doc: PDFKit.PDFDocument, invoiceData: InvoiceData) {
    const footerY = 750;

    doc.fontSize(8)
       .font('Helvetica')
       .text('Thank you for your business!', 50, footerY, { align: 'center', width: 500 })
       .moveDown(0.5)
       .text(`Generated on ${new Date().toLocaleDateString('en-CA')} at ${new Date().toLocaleTimeString('en-CA')}`, { align: 'center' })
       .moveDown(0.5)
       .text(`Invoice ID: ${invoiceData.id}`, { align: 'center' });
  }

  private formatStatus(status: string): string {
    return status.replace('_', ' ').toUpperCase();
  }
}

export default new PDFGenerationService(); 