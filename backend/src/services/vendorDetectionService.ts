import { Pool } from 'pg';

/**
 * Vendor alias interface for fuzzy matching
 */
interface VendorAlias {
  vendorId: number;
  vendorName: string;
  aliases: string[];
  confidence: number;
}

// Vendor detection service for auto-matching vendor names from invoices
export class VendorDetectionService {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      user: 'postgres',
      password: 'gtacpr',
      host: '127.0.0.1',
      port: 5432,
      database: 'cpr_jun21'
    });
  }

  /**
   * Get all vendors with their aliases for matching
   */
  private async getVendorAliases(): Promise<VendorAlias[]> {
    try {
      const result = await this.pool.query(`
        SELECT id, name, contact_email 
        FROM vendors 
        WHERE is_active = true
      `);

      const vendorAliases: VendorAlias[] = result.rows.map(vendor => {
        const aliases = this.generateAliases(vendor.name);
        return {
          vendorId: vendor.id,
          vendorName: vendor.name,
          aliases: aliases,
          confidence: 0
        };
      });

      console.log('🔍 [VENDOR DETECTION] Loaded vendor aliases:', vendorAliases.map(v => `${v.vendorName} (${v.aliases.length} aliases)`));
      return vendorAliases;
    } catch (error) {
      console.error('❌ [VENDOR DETECTION] Error loading vendor aliases:', error);
      return [];
    }
  }

  /**
   * Generate aliases for a vendor name
   */
  private generateAliases(vendorName: string): string[] {
    const aliases: string[] = [vendorName];

    // Common variations for F.A.S.T. Rescue Incorporated
    if (vendorName.toLowerCase().includes('f.a.s.t.') || vendorName.toLowerCase().includes('fast')) {
      aliases.push(
        'FAST Rescue',
        'FAST Rescue Incorporated',
        'F.A.S.T. Rescue',
        'Fast Rescue',
        'Fast Rescue Incorporated',
        'FAST',
        'F.A.S.T.'
      );
    }

    // Common variations for EAST Training Services
    if (vendorName.toLowerCase().includes('east') || vendorName.toLowerCase().includes('training')) {
      aliases.push(
        'EAST Training',
        'EAST Training Services',
        'East Training',
        'East Training Services',
        'EAST',
        'Training Services'
      );
    }

    // Generic business name variations
    const baseName = vendorName.replace(/\./g, '').replace(/\s+/g, ' ').trim();
    if (baseName !== vendorName) {
      aliases.push(baseName);
    }

    // Remove "Incorporated", "Inc.", "Ltd.", etc.
    const cleanName = vendorName
      .replace(/\s+(Incorporated|Inc\.|Ltd\.|LLC|Corp\.|Corporation)\s*$/i, '')
      .trim();
    if (cleanName !== vendorName) {
      aliases.push(cleanName);
    }

    // Remove duplicates and return
    return [...new Set(aliases)];
  }

  /**
   * Calculate similarity between two strings using Levenshtein distance
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Detect vendor from extracted text with confidence scoring
   */
  async detectVendor(extractedVendorName: string | null): Promise<{
    vendorId: number | null;
    vendorName: string | null;
    confidence: number;
    detectedName: string | null;
    allMatches: Array<{vendorId: number, vendorName: string, confidence: number}>;
  }> {
    try {
      console.log('🔍 [VENDOR DETECTION] Starting vendor detection for:', extractedVendorName);

      if (!extractedVendorName) {
        console.log('⚠️ [VENDOR DETECTION] No vendor name extracted from invoice');
        return {
          vendorId: null,
          vendorName: null,
          confidence: 0,
          detectedName: null,
          allMatches: []
        };
      }

      const vendorAliases = await this.getVendorAliases();
      const matches: Array<{vendorId: number, vendorName: string, confidence: number}> = [];

      // Test each vendor's aliases
      for (const vendor of vendorAliases) {
        let bestMatch = 0;
        let bestAlias = '';

        for (const alias of vendor.aliases) {
          const similarity = this.calculateSimilarity(
            extractedVendorName.toLowerCase(),
            alias.toLowerCase()
          );
          
          if (similarity > bestMatch) {
            bestMatch = similarity;
            bestAlias = alias;
          }
        }

        if (bestMatch > 0.3) { // Minimum threshold
          matches.push({
            vendorId: vendor.vendorId,
            vendorName: vendor.vendorName,
            confidence: bestMatch
          });
          
          console.log(`🔍 [VENDOR DETECTION] Match found: "${extractedVendorName}" -> "${bestAlias}" (${vendor.vendorName}) - Confidence: ${(bestMatch * 100).toFixed(1)}%`);
        }
      }

      // Sort matches by confidence (highest first)
      matches.sort((a, b) => b.confidence - a.confidence);

      // Return results
      if (matches.length > 0) {
        const bestMatch = matches[0];
        console.log(`✅ [VENDOR DETECTION] Best match: ${bestMatch.vendorName} (ID: ${bestMatch.vendorId}) - Confidence: ${(bestMatch.confidence * 100).toFixed(1)}%`);
        
        return {
          vendorId: bestMatch.vendorId,
          vendorName: bestMatch.vendorName,
          confidence: bestMatch.confidence,
          detectedName: extractedVendorName,
          allMatches: matches
        };
      } else {
        console.log('❌ [VENDOR DETECTION] No vendor matches found');
        return {
          vendorId: null,
          vendorName: null,
          confidence: 0,
          detectedName: extractedVendorName,
          allMatches: []
        };
      }

    } catch (error) {
      console.error('❌ [VENDOR DETECTION] Error detecting vendor:', error);
      return {
        vendorId: null,
        vendorName: null,
        confidence: 0,
        detectedName: extractedVendorName,
        allMatches: []
      };
    }
  }

  /**
   * Get vendor details by ID
   */
  async getVendorById(vendorId: number): Promise<{id: number, name: string, contact_email: string} | null> {
    try {
      const result = await this.pool.query(
        'SELECT id, name, contact_email FROM vendors WHERE id = $1 AND is_active = true',
        [vendorId]
      );

      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('❌ [VENDOR DETECTION] Error getting vendor by ID:', error);
      return null;
    }
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    await this.pool.end();
  }
}

// Export singleton instance
export const vendorDetectionService = new VendorDetectionService(); 