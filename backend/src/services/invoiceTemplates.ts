// Invoice Templates Service
// Manages vendor-specific templates for improved OCR accuracy

export interface InvoiceTemplate {
  id: number;
  vendorId: number;
  vendorName: string;
  templateName: string;
  fieldPatterns: {
    invoiceNumber: RegExp[];
    invoiceDate: RegExp[];
    dueDate: RegExp[];
    amount: RegExp[];
    description: RegExp[];
    vendorName: RegExp[];
  };
  confidenceThreshold: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class InvoiceTemplateService {
  private templates: Map<number, InvoiceTemplate> = new Map();

  constructor() {
    this.initializeDefaultTemplates();
  }

  /**
   * Initialize default templates for known vendors
   */
  private initializeDefaultTemplates() {
    // F.A.S.T. Rescue template
    const fastRescueTemplate: InvoiceTemplate = {
      id: 1,
      vendorId: 1, // Assuming F.A.S.T. Rescue is vendor ID 1
      vendorName: 'F.A.S.T. Rescue Incorporated',
      templateName: 'FAST Rescue Standard Invoice',
      fieldPatterns: {
        invoiceNumber: [
          /Invoice #\s*(\d+)/i,
          /Invoice[:\s#]*(\w+)/i
        ],
        invoiceDate: [
          /Date\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
          /Invoice Date[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i
        ],
        dueDate: [
          /Due Date\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
          /Payment Due[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i
        ],
        amount: [
          /Amount Due\s*\$?([\d,]+\.\d{2})/i,
          /Total\s*([\d,]+\.\d{2})/i
        ],
        description: [
          /FAST.*Training.*Theory.*Completed.*Part.*Online.*Training/i,
          /Standard.*First.*Aid.*Theory.*Training/i
        ],
        vendorName: [
          /F\.A\.S\.T\. Rescue Incorporated/i,
          /FAST Rescue/i
        ]
      },
      confidenceThreshold: 0.8,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Generic template for unknown vendors
    const genericTemplate: InvoiceTemplate = {
      id: 2,
      vendorId: 0, // Generic template
      vendorName: 'Generic Invoice',
      templateName: 'Generic Invoice Template',
      fieldPatterns: {
        invoiceNumber: [
          /Invoice[:\s#]*(\w+)/i,
          /INV[:\s-]*(\w+)/i,
          /Bill[:\s#]*(\w+)/i,
          /Invoice Number[:\s]*(\w+)/i
        ],
        invoiceDate: [
          /Date[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
          /Invoice Date[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
          /(\d{4}-\d{2}-\d{2})/,
          /(\d{1,2}\/\d{1,2}\/\d{2,4})/
        ],
        dueDate: [
          /Due Date[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
          /Payment Due[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
          /Due[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i
        ],
        amount: [
          /Total[:\s]*\$?([\d,]+\.\d{2})/i,
          /Amount Due[:\s]*\$?([\d,]+\.\d{2})/i,
          /Balance[:\s]*\$?([\d,]+\.\d{2})/i,
          /Grand Total[:\s]*\$?([\d,]+\.\d{2})/i,
          /\$([\d,]+\.\d{2})/g
        ],
        description: [
          /Description[:\s]*(.+?)(?:\n|$)/i,
          /Item[:\s]*(.+?)(?:\n|$)/i,
          /Service[:\s]*(.+?)(?:\n|$)/i
        ],
        vendorName: [
          /From[:\s]*(.+?)(?:\n|$)/i,
          /Vendor[:\s]*(.+?)(?:\n|$)/i,
          /Company[:\s]*(.+?)(?:\n|$)/i
        ]
      },
      confidenceThreshold: 0.6,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.templates.set(fastRescueTemplate.id, fastRescueTemplate);
    this.templates.set(genericTemplate.id, genericTemplate);
  }

  /**
   * Get template for a specific vendor
   */
  getTemplateForVendor(vendorId: number): InvoiceTemplate | null {
    // First try to find vendor-specific template
    for (const template of this.templates.values()) {
      if (template.vendorId === vendorId && template.isActive) {
        return template;
      }
    }

    // Fall back to generic template
    for (const template of this.templates.values()) {
      if (template.vendorId === 0 && template.isActive) {
        return template;
      }
    }

    return null;
  }

  /**
   * Get template by ID
   */
  getTemplateById(templateId: number): InvoiceTemplate | null {
    return this.templates.get(templateId) || null;
  }

  /**
   * Add new template
   */
  addTemplate(template: Omit<InvoiceTemplate, 'id' | 'createdAt' | 'updatedAt'>): InvoiceTemplate {
    const newId = Math.max(...Array.from(this.templates.keys())) + 1;
    const newTemplate: InvoiceTemplate = {
      ...template,
      id: newId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.templates.set(newId, newTemplate);
    return newTemplate;
  }

  /**
   * Update existing template
   */
  updateTemplate(templateId: number, updates: Partial<InvoiceTemplate>): InvoiceTemplate | null {
    const template = this.templates.get(templateId);
    if (!template) {
      return null;
    }

    const updatedTemplate: InvoiceTemplate = {
      ...template,
      ...updates,
      updatedAt: new Date()
    };

    this.templates.set(templateId, updatedTemplate);
    return updatedTemplate;
  }

  /**
   * Delete template
   */
  deleteTemplate(templateId: number): boolean {
    return this.templates.delete(templateId);
  }

  /**
   * Get all templates
   */
  getAllTemplates(): InvoiceTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Extract data using template patterns
   */
  extractDataWithTemplate(text: string, template: InvoiceTemplate): any {
    const result: any = {};
    const confidence: any = {};

    // Extract each field using template patterns
    Object.keys(template.fieldPatterns).forEach(field => {
      const patterns = template.fieldPatterns[field as keyof typeof template.fieldPatterns];
      let bestMatch = null;
      let bestConfidence = 0;

      for (const pattern of patterns) {
        const match = text.match(new RegExp(pattern, 'i'));
        if (match && match[1]) {
          const matchConfidence = this.calculateConfidence(match[0], pattern.source);
          if (matchConfidence > bestConfidence) {
            bestMatch = match[1].trim();
            bestConfidence = matchConfidence;
          }
        }
      }

      result[field] = bestMatch;
      confidence[field] = bestConfidence;
    });

    const confidenceValues = Object.values(confidence) as number[];
    return {
      data: result,
      confidence: confidence,
      overallConfidence: confidenceValues.reduce((a, b) => a + b, 0) / confidenceValues.length
    };
  }

  /**
   * Calculate confidence score for a match
   */
  private calculateConfidence(matchText: string, pattern: string): number {
    // Simple confidence calculation based on pattern complexity and match quality
    const patternComplexity = pattern.length / 100; // Normalize pattern length
    const matchQuality = matchText.length / 50; // Normalize match length
    
    return Math.min(1, (patternComplexity + matchQuality) / 2);
  }

  /**
   * Learn from successful extractions to improve templates
   */
  learnFromExtraction(vendorId: number, text: string, successfulExtraction: any): void {
    const template = this.getTemplateForVendor(vendorId);
    if (!template) {
      return;
    }

    // Analyze successful extraction and potentially update patterns
    // This is a simplified learning mechanism
    console.log(`📚 [TEMPLATE LEARNING] Learning from successful extraction for vendor ${vendorId}`);
    
    // In a more sophisticated implementation, you would:
    // 1. Analyze the text around successful extractions
    // 2. Identify new patterns
    // 3. Update template patterns
    // 4. Validate new patterns against existing data
  }
}

// Export singleton instance
export const invoiceTemplateService = new InvoiceTemplateService(); 