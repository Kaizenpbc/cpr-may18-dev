import { Storage } from '@google-cloud/storage';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import fs from 'fs';
import path from 'path';

// OCR Service for invoice text extraction
export class OCRService {
  private visionClient: ImageAnnotatorClient;
  private storage: Storage;
  private bucketName: string;

  constructor() {
    // Initialize Google Cloud Vision client
    this.visionClient = new ImageAnnotatorClient({
      keyFilename: process.env.GOOGLE_CLOUD_KEY_FILE || 'google-cloud-key.json'
    });

    // Initialize Google Cloud Storage
    this.storage = new Storage({
      keyFilename: process.env.GOOGLE_CLOUD_KEY_FILE || 'google-cloud-key.json'
    });

    this.bucketName = process.env.GOOGLE_CLOUD_BUCKET || 'cpr-invoice-ocr';
  }

  /**
   * Extract text from PDF or HTML invoice using Google Cloud Vision or direct text extraction
   */
  async extractTextFromFile(filePath: string): Promise<string> {
    try {
      console.log('🔍 [OCR] Starting text extraction from file:', filePath);
      
      const fileExtension = path.extname(filePath).toLowerCase();
      
      if (fileExtension === '.html' || fileExtension === '.htm') {
        return await this.extractTextFromHTML(filePath);
      } else if (fileExtension === '.pdf') {
        return await this.extractTextFromPDF(filePath);
      } else {
        throw new Error(`Unsupported file type: ${fileExtension}`);
      }
    } catch (error) {
      console.error('❌ [OCR] Error extracting text from file:', error);
      throw error;
    }
  }

  /**
   * Extract text from HTML invoice directly
   */
  async extractTextFromHTML(filePath: string): Promise<string> {
    try {
      console.log('🔍 [OCR] Starting text extraction from HTML:', filePath);

      // Read the HTML file
      const htmlContent = fs.readFileSync(filePath, 'utf8');
      
      // Check if this is an MHTML file (multipart HTML)
      if (htmlContent.includes('Content-Type: multipart/related') || htmlContent.includes('MultipartBoundary')) {
        console.log('🔍 [OCR] Detected MHTML file, extracting main HTML content...');
        
        // Extract the main HTML content from MHTML
        const htmlMatch = htmlContent.match(/Content-Type: text\/html[\s\S]*?(?=------MultipartBoundary|$)/i);
        if (htmlMatch) {
          const mainHtml = htmlMatch[0];
          
          // Remove the Content-Type header and get just the HTML content
          const htmlContentOnly = mainHtml.replace(/Content-Type: text\/html[\s\S]*?Content-Location:.*?\n/i, '');
          
          // Clean up the HTML content
          const textContent = htmlContentOnly
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove script tags
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove style tags
            .replace(/<[^>]+>/g, ' ') // Remove all HTML tags
            .replace(/\s+/g, ' ') // Replace multiple spaces with single space
            .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
            .replace(/&amp;/g, '&') // Replace &amp; with &
            .replace(/&lt;/g, '<') // Replace &lt; with <
            .replace(/&gt;/g, '>') // Replace &gt; with >
            .replace(/&quot;/g, '"') // Replace &quot; with "
            .replace(/= /g, '') // Remove MHTML line continuations
            .trim();
          
          console.log('✅ [OCR] MHTML text extraction completed');
          console.log('📄 [OCR] Extracted text length:', textContent.length);
          
          return textContent;
        }
      }
      
      // Regular HTML processing
      const textContent = htmlContent
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove script tags
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove style tags
        .replace(/<[^>]+>/g, ' ') // Remove all HTML tags
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
        .replace(/&amp;/g, '&') // Replace &amp; with &
        .replace(/&lt;/g, '<') // Replace &lt; with <
        .replace(/&gt;/g, '>') // Replace &gt; with >
        .replace(/&quot;/g, '"') // Replace &quot; with "
        .trim();
      
      console.log('✅ [OCR] Text extraction completed from HTML');
      console.log('📄 [OCR] Extracted text length:', textContent.length);
      
      return textContent;
    } catch (error) {
      console.error('❌ [OCR] Error extracting text from HTML:', error);
      throw error;
    }
  }

  /**
   * Extract text from PDF invoice using Google Cloud Vision
   */
  async extractTextFromPDF(filePath: string): Promise<string> {
    try {
      console.log('🔍 [OCR] Starting text extraction from PDF:', filePath);

      // Check if Google Cloud credentials are available
      if (!process.env.GOOGLE_CLOUD_KEY_FILE && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        throw new Error('Google Cloud credentials not found');
      }

      // Read the PDF file
      const pdfBuffer = fs.readFileSync(filePath);
      
      // Convert PDF to images for OCR
      const imageBuffer = await this.convertPDFToImage(pdfBuffer);
      
      // Use Google Cloud Vision to extract text
      const [result] = await this.visionClient.textDetection(imageBuffer);
      const detections = result.textAnnotations;
      
      if (!detections || detections.length === 0) {
        throw new Error('No text detected in PDF');
      }

      // Extract the full text (first element contains all text)
      const extractedText = detections[0].description || '';
      
      console.log('✅ [OCR] Text extraction completed with Google Cloud Vision');
      return extractedText;
    } catch (error) {
      console.error('❌ [OCR] Error extracting text with Google Cloud Vision:', error);
      throw error;
    }
  }

  /**
   * Extract structured data from invoice text using generic patterns
   */
  async extractInvoiceData(text: string, vendorId?: number): Promise<InvoiceExtractionResult> {
    try {
      console.log('🔍 [OCR] Extracting structured data from text');
      console.log('📋 [OCR] Using generic extraction patterns');
      console.log('📄 [OCR] Raw text for extraction:', text);
      
      // Use generic patterns for all extractions
      const result: InvoiceExtractionResult = {
        invoiceNumber: this.extractInvoiceNumber(text),
        invoiceDate: this.extractInvoiceDate(text),
        dueDate: this.extractDueDate(text),
        amount: this.extractAmount(text),
        description: this.extractDescription(text),
        vendorName: this.extractVendorName(text),
        acctNo: this.extractAcctNo(text),
        quantity: this.extractQuantity(text),
        item: this.extractItem(text),
        rate: this.extractRate(text),
        subtotal: this.extractSubtotal(text),
        hst: this.extractHST(text),
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
        },
        rawText: text,
        templateUsed: 'Generic'
      };

      console.log('✅ [OCR] Structured data extraction completed with generic patterns');
      console.log('📊 [OCR] Extraction results:', {
        invoiceNumber: result.invoiceNumber,
        description: result.description,
        vendorName: result.vendorName,
        amount: result.amount
      });
      return result;
    } catch (error) {
      console.error('❌ [OCR] Error extracting structured data:', error);
      throw new Error('Failed to extract structured data from invoice');
    }
  }

  /**
   * Extract invoice number using pattern matching
   */
  private extractInvoiceNumber(text: string): string | null {
    const patterns = [
      /(INV-\d{4}-\d+)/i,  // Specific pattern for INV-YYYY-NNN format (highest priority)
      /Invoice #\s*([A-Za-z0-9\-]+)/i,
      /Invoice Number[:\s]*([A-Za-z0-9\-]+)/i,
      /INV[:\s-]*([A-Za-z0-9\-]+)/i,
      /Bill[:\s#]*([A-Za-z0-9\-]+)/i,
      /Invoice[:\s#]*([A-Za-z0-9\-]+)/i
    ];

    // List of words to exclude (table headers, common words)
    const excludeWords = [
      'from', 'abc', 'oice', 'entory', 'quantity', 'units', 'detail', 
      'description', 'rate', 'options', 'amount', 'project', 'item', 'invoice'
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        // For the first pattern (INV-YYYY-NNN), use match[1] directly
        // For other patterns, use match[1] as the captured group
        const extracted = pattern.source.includes('(INV-\\d{4}-\\d+)') ? match[1] : match[1];
        const trimmed = extracted.trim();
        
        // Skip if it's in the exclude list
        if (excludeWords.includes(trimmed.toLowerCase())) {
          continue;
        }
        // Skip if it's too short (likely not a real invoice number)
        if (trimmed.length < 3) {
          continue;
        }
        console.log('🔍 [OCR] Invoice number extracted:', trimmed);
        return trimmed;
      }
    }

    return null;
  }

  /**
   * Extract invoice date using pattern matching
   */
  private extractInvoiceDate(text: string): string | null {
    const patterns = [
      /Date\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
      /Invoice Date[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
      /Date[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
      /(\d{4}-\d{2}-\d{2})/,
      /(\d{1,2}\/\d{1,2}\/\d{2,4})/
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const date = match[1].trim();
        // Convert to YYYY-MM-DD format
        if (date.includes('/')) {
          const parts = date.split('/');
          if (parts.length === 3) {
            const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
            return `${year}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
          }
        }
        return date;
      }
    }

    return null;
  }

  /**
   * Extract due date using pattern matching
   */
  private extractDueDate(text: string): string | null {
    const patterns = [
      /Due Date\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
      /Due Date[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
      /Payment Due[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
      /Due[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const date = match[1].trim();
        // Convert to YYYY-MM-DD format
        if (date.includes('/')) {
          const parts = date.split('/');
          if (parts.length === 3) {
            const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
            return `${year}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
          }
        }
        return date;
      }
    }

    return null;
  }

  /**
   * Extract amount using pattern matching
   */
  private extractAmount(text: string): string | null {
    const patterns = [
      /Total\s*Amount\s*Due\s*[:\s]*\$?([\d,]+\.\d{2})/i,
      /Amount\s*Due\s*[:\s]*\$?([\d,]+\.\d{2})/i,
      /Total\s*[:\s]*\$?([\d,]+\.\d{2})/i,
      /Grand\s*Total\s*[:\s]*\$?([\d,]+\.\d{2})/i,
      /Balance[:\s]*\$?([\d,]+\.\d{2})/i
    ];

    // First try to find the main total amount (prioritize "Amount Due" and "Total Amount Due")
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const amount = match[1].trim();
        console.log('🔍 [OCR] Amount extracted (pattern):', amount);
        return amount;
      }
    }

    // If no main total found, look for the largest dollar amount that's not subtotal
    const dollarMatches = text.match(/\$([\d,]+\.\d{2})/g);
    if (dollarMatches && dollarMatches.length > 0) {
      // Convert to numbers and find the largest, but exclude subtotal
      const amounts = dollarMatches.map(match => {
        const amount = match.replace('$', '').replace(',', '');
        return parseFloat(amount);
      }).filter(amount => !isNaN(amount));
      
      if (amounts.length > 0) {
        // Sort amounts in descending order and take the first one that's not clearly a subtotal
        const sortedAmounts = amounts.sort((a, b) => b - a);
        for (const amount of sortedAmounts) {
          // Skip if this looks like a subtotal (usually smaller than the final total)
          if (amount > 0) {
            console.log('🔍 [OCR] Amount extracted (largest):', amount.toFixed(2));
            return amount.toFixed(2);
          }
        }
      }
    }

    return null;
  }

  /**
   * Extract description using pattern matching
   */
  private extractDescription(text: string): string | null {
    // List of words to exclude (table headers, common words)
    const excludeWords = [
      'rate', 'options', 'quantity', 'units', 'inventory', 'detail', 
      'project', 'item', 'amount', 'east', 'subtotal', 'tax', 'total', 'shipping'
    ];

    // Look for specific training description patterns first
    const trainingPatterns = [
      /FAST Standard First Aid Theory Completed Part \d+ Online Training/i,
      /Standard First Aid Theory.*Training/i,
      /First Aid Training Course/i,
      /Training.*Theory.*Completed/i
    ];

    for (const pattern of trainingPatterns) {
      const match = text.match(pattern);
      if (match) {
        const extracted = match[0].trim();
        console.log('🔍 [OCR] Description extracted (training pattern):', extracted);
        return extracted;
      }
    }

    // Look for individual table rows with training descriptions
    const lines = text.split('\n');
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      if (lowerLine.includes('training') || lowerLine.includes('first aid') || lowerLine.includes('theory')) {
        // Clean up the line and extract only the description part
        const cleanedLine = line.replace(/\s+/g, ' ').trim();
        
        // Split by common delimiters and take the first meaningful part
        const parts = cleanedLine.split(/[|$]\d+\.\d{2}|\d+\.\d{2}|\$\d+|\d+$/);
        if (parts.length > 0) {
          const descriptionPart = parts[0].trim();
          // Remove item codes like ITFR-B-SFA-O 685 or ITFR-001
          const cleanDescription = descriptionPart.replace(/[A-Z]{2,}-\w+(-\w+)?\s+\d+/, '').trim();
          
          // Only return if it's a reasonable length and doesn't contain multiple items
          if (cleanDescription && 
              cleanDescription.length > 10 && 
              cleanDescription.length < 100 &&
              !cleanDescription.includes('ITFR-002') &&
              !cleanDescription.includes('ITFR-003')) {
            console.log('🔍 [OCR] Description extracted (line pattern):', cleanDescription);
            return cleanDescription;
          }
        }
      }
    }

    // Look for "Description:" pattern
    const descriptionMatch = text.match(/Description[:\s]*(.+?)(?:\n|$)/i);
    if (descriptionMatch && descriptionMatch[1]) {
      const extracted = descriptionMatch[1].trim();
      if (!excludeWords.includes(extracted.toLowerCase())) {
        console.log('🔍 [OCR] Description extracted (description pattern):', extracted);
        return extracted;
      }
    }

    // Look for lines with "FAST" and "Training" together
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      if (lowerLine.includes('fast') && lowerLine.includes('training')) {
        // Clean up the line and remove pricing/quantity info
        const cleanedLine = line.replace(/\s+/g, ' ').trim();
        const parts = cleanedLine.split(/[|$]\d+\.\d{2}|\d+\.\d{2}|\$\d+|\d+$/);
        if (parts.length > 0) {
          const descriptionPart = parts[0].trim();
          const cleanDescription = descriptionPart.replace(/[A-Z]{2,}-\w+-\w+-\w+\s+\d+/, '').trim();
          
          if (cleanDescription && cleanDescription.length > 10) {
            console.log('🔍 [OCR] Description extracted (FAST training):', cleanDescription);
            return cleanDescription;
          }
        }
      }
    }

    // If no specific pattern found, return null instead of grabbing everything
    return null;
  }

  /**
   * Extract vendor name using pattern matching
   */
  private extractVendorName(text: string): string | null {
    const patterns = [
      /From[:\s]*(.+?)(?:\n|$)/i,
      /Vendor[:\s]*(.+?)(?:\n|$)/i,
      /Company[:\s]*(.+?)(?:\n|$)/i,
      /(EAST\s+Training\s+Services)/i,  // Specific pattern for EAST Training Services
      /(F\.A\.S\.T\.\s+Rescue\s+Incorporated)/i  // Specific pattern for F.A.S.T. Rescue
    ];

    // List of words to exclude (table headers, common words, MHTML headers)
    const excludeWords = [
      'project', 'item', 'quantity', 'units', 'inventory', 'detail', 
      'description', 'rate', 'options', 'amount', 'invoice', 'bill', 'total',
      'snapshot', 'content', 'location', 'subject', 'mime', 'version', 'multipart',
      'boundary', 'encoding', 'transfer'
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const extracted = match[1].trim();
        // Skip if it's in the exclude list
        if (excludeWords.includes(extracted.toLowerCase())) {
          continue;
        }
        // Skip if it's too short
        if (extracted.length < 3) {
          continue;
        }
        // Skip if it contains MHTML headers
        if (extracted.toLowerCase().includes('content-type') || 
            extracted.toLowerCase().includes('multipart') ||
            extracted.toLowerCase().includes('boundary')) {
          continue;
        }
        console.log('🔍 [OCR] Vendor name extracted (pattern):', extracted);
        return extracted;
      }
    }

    // Look for company name in the text (since HTML text is all on one line)
    const words = text.split(' ');
    for (let i = 0; i < words.length - 2; i++) {
      const potentialName = words.slice(i, i + 3).join(' ').trim();
      if (potentialName && 
          potentialName.length > 5 &&
          (potentialName.includes('Training') || potentialName.includes('Rescue') || potentialName.includes('Incorporated')) &&
          !excludeWords.includes(potentialName.toLowerCase()) &&
          !potentialName.toLowerCase().includes('project') &&
          !potentialName.toLowerCase().includes('item') &&
          !potentialName.toLowerCase().includes('quantity') &&
          !potentialName.toLowerCase().includes('units') &&
          !potentialName.toLowerCase().includes('inventory') &&
          !potentialName.toLowerCase().includes('detail') &&
          !potentialName.toLowerCase().includes('description') &&
          !potentialName.toLowerCase().includes('rate') &&
          !potentialName.toLowerCase().includes('options') &&
          !potentialName.toLowerCase().includes('amount') &&
          !potentialName.toLowerCase().includes('invoice') &&
          !potentialName.toLowerCase().includes('fast') &&
          !potentialName.toLowerCase().includes('standard') &&
          !potentialName.toLowerCase().includes('first') &&
          !potentialName.toLowerCase().includes('aid') &&
          !potentialName.toLowerCase().includes('theory') &&
          !potentialName.toLowerCase().includes('completed') &&
          !potentialName.toLowerCase().includes('part') &&
          !potentialName.toLowerCase().includes('online') &&
          !potentialName.toLowerCase().includes('students') &&
          !potentialName.toLowerCase().includes('completed') &&
          !potentialName.toLowerCase().includes('content') &&
          !potentialName.toLowerCase().includes('multipart') &&
          !potentialName.toLowerCase().includes('boundary')) {
        console.log('🔍 [OCR] Vendor name extracted (word search):', potentialName);
        return potentialName;
      }
    }

    // Look for company name at the top (first non-empty line that looks like a company name)
    const lines = text.split('\n');
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      const line = lines[i].trim();
      if (line && 
          !line.includes('@') && 
          !line.includes('Phone:') && 
          !line.includes('www.') && 
          !line.includes('GST/HST') &&
          !line.includes('Bill To') &&
          !line.includes('Ship To') &&
          !line.includes('Invoice') &&
          !line.toLowerCase().includes('content-type') &&
          !line.toLowerCase().includes('multipart') &&
          !line.toLowerCase().includes('boundary') &&
          !excludeWords.includes(line.toLowerCase()) &&
          line.length > 3 &&
          // Additional checks to avoid table headers
          !line.toLowerCase().includes('project') &&
          !line.toLowerCase().includes('item') &&
          !line.toLowerCase().includes('quantity') &&
          !line.toLowerCase().includes('units') &&
          !line.toLowerCase().includes('inventory') &&
          !line.toLowerCase().includes('detail') &&
          !line.toLowerCase().includes('description') &&
          !line.toLowerCase().includes('rate') &&
          !line.toLowerCase().includes('options') &&
          !line.toLowerCase().includes('amount')) {
        console.log('🔍 [OCR] Vendor name extracted (line search):', line);
        return line;
      }
    }

    return null;
  }

  /**
   * Extract account number using pattern matching
   */
  private extractAcctNo(text: string): string | null {
    const patterns = [
      /Account\s*#?\s*[:\s]*([A-Za-z0-9\-]+)/i,
      /Acct\.?\s*No\.?\s*#?\s*[:\s]*([A-Za-z0-9\-]+)/i,
      /Acct\s*#?\s*[:\s]*([A-Za-z0-9\-]+)/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const extracted = match[1].trim();
        console.log('🔍 [OCR] Account number extracted:', extracted);
        return extracted;
      }
    }

    return null;
  }

  /**
   * Extract quantity using pattern matching
   */
  private extractQuantity(text: string): string | null {
    const patterns = [
      /Quantity\s*[:\s]*(\d+)/i,
      /Qty\s*[:\s]*(\d+)/i,
      /(\d+)\s*(?:manuals?|units?|items?)/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return null;
  }

  /**
   * Extract item using pattern matching
   */
  private extractItem(text: string): string | null {
    const patterns = [
      /ITFR-[A-Za-z0-9\-]+/i,  // Specific pattern for ITFR codes (highest priority)
      /Item\s*[:\s]*([A-Za-z0-9\-]+)/i,
      /([A-Z]{2,}-[A-Za-z0-9\-]+)/i
    ];

    // List of words to exclude (table headers, common words, MHTML headers)
    const excludeWords = [
      'quantity', 'units', 'inventory', 'detail', 'description', 
      'rate', 'options', 'amount', 'project', 'item', 'east',
      'snapshot', 'content', 'location', 'subject', 'mime', 'version', 'multipart',
      'boundary', 'encoding', 'transfer'
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        // For ITFR pattern, use the full match
        const extracted = pattern.source.includes('ITFR-') ? match[0] : match[1];
        const trimmed = extracted.trim();
        
        // Skip if it's in the exclude list
        if (excludeWords.includes(trimmed.toLowerCase())) {
          continue;
        }
        // Skip if it's too short
        if (trimmed.length < 2) {
          continue;
        }
        // Skip if it contains MHTML headers
        if (trimmed.toLowerCase().includes('content-type') || 
            trimmed.toLowerCase().includes('multipart') ||
            trimmed.toLowerCase().includes('boundary')) {
          continue;
        }
        console.log('🔍 [OCR] Item extracted:', trimmed);
        return trimmed;
      }
    }

    return null;
  }

  /**
   * Extract rate using pattern matching
   */
  private extractRate(text: string): string | null {
    const patterns = [
      /Rate\s*Options\s*[:\s]*\$?([\d,]+\.\d{2})/i,  // Specific pattern for Rate Options column
      /Rate\s*[:\s]*\$?([\d,]+\.\d{2})/i,
      /Price\s*[:\s]*\$?([\d,]+\.\d{2})/i,
      /Unit\s*Price\s*[:\s]*\$?([\d,]+\.\d{2})/i
    ];

    // First try to find rate in table rows with training content
    const lines = text.split('\n');
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      if (lowerLine.includes('training') || lowerLine.includes('first aid') || lowerLine.includes('course')) {
        // Look for all numbers in this line (both with and without $)
        const allNumbers = line.match(/(\d+(?:,\d{3})*\.\d{2})/g);
        if (allNumbers && allNumbers.length > 0) {
          // Convert to numbers
          const amounts = allNumbers.map(match => {
            const amount = match.replace(',', '');
            return parseFloat(amount);
          }).filter(amount => !isNaN(amount));
          
          if (amounts.length > 0) {
            // Sort amounts in ascending order
            const sortedAmounts = amounts.sort((a, b) => a - b);
            
            // Look for amounts between 10-200 (typical rate range)
            const reasonableRates = amounts.filter(amount => amount >= 10 && amount <= 200);
            if (reasonableRates.length > 0) {
              const actualRate = Math.min(...reasonableRates);
              console.log('🔍 [OCR] Rate extracted (line pattern, filtered):', actualRate.toFixed(2));
              return actualRate.toFixed(2);
            }
            
            // If no reasonable rates found, take the smallest
            const rate = sortedAmounts[0];
            console.log('🔍 [OCR] Rate extracted (line pattern):', rate.toFixed(2));
            return rate.toFixed(2);
          }
        }
      }
    }

    // Try pattern matching
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const rate = match[1].trim();
        console.log('🔍 [OCR] Rate extracted (pattern):', rate);
        return rate;
      }
    }

    return null;
  }

  /**
   * Extract subtotal using pattern matching
   */
  private extractSubtotal(text: string): string | null {
    const patterns = [
      /Subtotal\s*[:\s]*\$?([\d,]+\.\d{2})/i,
      /Sub\s*Total\s*[:\s]*\$?([\d,]+\.\d{2})/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return null;
  }

  /**
   * Extract HST using pattern matching
   */
  private extractHST(text: string): string | null {
    const patterns = [
      /HST\s*\([^)]*\)\s*[:\s]*\$?([\d,]+\.\d{2})/i,
      /HST\s*[:\s]*\$?([\d,]+\.\d{2})/i,
      /Tax\s*[:\s]*\$?([\d,]+\.\d{2})/i,
      /GST\/HST\s*[:\s]*\$?([\d,]+\.\d{2})/i
    ];

    // First try to find HST in the text
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const hst = match[1].trim();
        console.log('🔍 [OCR] HST extracted (pattern):', hst);
        return hst;
      }
    }

    // Look for HST in lines containing tax information
    const lines = text.split('\n');
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      if (lowerLine.includes('hst') || lowerLine.includes('tax')) {
        const hstMatch = line.match(/\$([\d,]+\.\d{2})/);
        if (hstMatch && hstMatch[1]) {
          const hst = hstMatch[1].trim();
          console.log('🔍 [OCR] HST extracted (line pattern):', hst);
          return hst;
        }
      }
    }

    return null;
  }



  /**
   * Convert PDF buffer to image buffer using direct ImageMagick command
   */
  private async convertPDFToImage(pdfBuffer: Buffer): Promise<Buffer> {
    try {
      console.log('📄 [OCR] Converting PDF to image using direct ImageMagick command');
      
      // Create temp directory if it doesn't exist
      const tempDir = './temp';
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // Save PDF buffer to temp file
      const tempPdfPath = path.join(tempDir, `temp-${Date.now()}.pdf`);
      const tempImagePath = path.join(tempDir, `temp-${Date.now()}.png`);
      fs.writeFileSync(tempPdfPath, pdfBuffer);

             try {
         // Use direct ImageMagick command with better error handling
         const { execSync } = await import('child_process');
        
        // Try different possible ImageMagick paths
        const possiblePaths = [
          'magick',
          'C:\\Program Files\\ImageMagick-7.1.2-Q16-HDRI\\magick.exe',
          'C:\\Program Files\\ImageMagick-7.1.1-Q16-HDRI\\magick.exe',
          'C:\\Program Files\\ImageMagick-7.1.0-Q16-HDRI\\magick.exe'
        ];
        
        let magickCommand = 'magick';
        
        // Try to find the correct ImageMagick path
        for (const possiblePath of possiblePaths) {
          try {
            if (possiblePath === 'magick') {
              // Test if magick is in PATH
              execSync('magick --version', { 
                encoding: 'utf8', 
                timeout: 5000,
                stdio: 'pipe' 
              });
              magickCommand = 'magick';
              console.log('✅ [OCR] Found ImageMagick in PATH');
              break;
            } else {
              // Test specific path
              execSync(`"${possiblePath}" --version`, { 
                encoding: 'utf8', 
                timeout: 5000,
                stdio: 'pipe' 
              });
              magickCommand = possiblePath;
              console.log(`✅ [OCR] Found ImageMagick at: ${possiblePath}`);
              break;
            }
          } catch (pathError) {
            console.log(`⚠️ [OCR] ImageMagick not found at: ${possiblePath}`);
            continue;
          }
        }
        
                 // Try to extract from multiple pages to get more content
         const command = `"${magickCommand}" "${tempPdfPath}[0-2]" -density 300 -quality 100 "${tempImagePath}"`;
        
        console.log('🚀 [OCR] Running ImageMagick command:', command);
        execSync(command, { 
          encoding: 'utf8',
          timeout: 30000,
          stdio: 'pipe',
          env: { ...process.env, PATH: process.env.PATH }
        });

        // Read the generated image
        if (!fs.existsSync(tempImagePath)) {
          throw new Error('Failed to generate image from PDF');
        }
        const imageBuffer = fs.readFileSync(tempImagePath);
        
        // Clean up temp files
        fs.unlinkSync(tempPdfPath);
        fs.unlinkSync(tempImagePath);

        console.log('✅ [OCR] PDF to image conversion completed with ImageMagick');
        return imageBuffer;
      } catch (magickError: any) {
        console.log('⚠️ [OCR] ImageMagick conversion failed:', magickError?.message || 'Unknown error');
        console.log('⚠️ [OCR] Error details:', magickError);
        
        // Clean up temp PDF file
        if (fs.existsSync(tempPdfPath)) {
          fs.unlinkSync(tempPdfPath);
        }
        
        throw new Error('PDF conversion failed: ' + (magickError?.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('❌ [OCR] Error converting PDF to image:', error);
      throw new Error('Failed to convert PDF to image');
    }
  }
}

// Types for OCR results
export interface InvoiceExtractionResult {
  invoiceNumber: string | null;
  invoiceDate: string | null;
  dueDate: string | null;
  amount: string | null;
  description: string | null;
  vendorName: string | null;
  acctNo: string | null;
  quantity: string | null;
  item: string | null;
  rate: string | null;
  subtotal: string | null;
  hst: string | null;
  confidence: {
    invoiceNumber: number;
    invoiceDate: number;
    dueDate: number;
    amount: number;
    description: number;
    vendorName: number;
    acctNo: number;
    quantity: number;
    item: number;
    rate: number;
    subtotal: number;
    hst: number;
  };
  rawText: string;
  templateUsed?: string;
}

export interface InvoiceTemplate {
  id: number;
  vendorId: number;
  templateName: string;
  fieldPatterns: {
    invoiceNumber: string[];
    invoiceDate: string[];
    dueDate: string[];
    amount: string[];
    description: string[];
    vendorName: string[];
  };
  confidenceThreshold: number;
}

// Export singleton instance
export const ocrService = new OCRService(); 