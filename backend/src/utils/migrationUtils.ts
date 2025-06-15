// ===============================================
// API Version Migration Utilities
// ===============================================

import { Request, Response } from 'express';
import { getVersionInfo, VERSION_CONFIG } from '../config/versions';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      compatibilityShim?: {
        originalVersion: string;
        targetVersion: string;
        shimVersion: string;
        active: boolean;
      };
    }
  }
}

export interface MigrationRule {
  fromVersion: string;
  toVersion: string;
  transformRequest?: (data: any) => any;
  transformResponse?: (data: any) => any;
  description: string;
  breaking: boolean;
  deprecated?: boolean;
}

export interface MigrationGuide {
  title: string;
  description: string;
  fromVersion: string;
  toVersion: string;
  breaking: boolean;
  estimatedEffort: 'low' | 'medium' | 'high';
  steps: MigrationStep[];
  codeExamples: CodeExample[];
  resources: Resource[];
}

interface MigrationStep {
  step: number;
  title: string;
  description: string;
  required: boolean;
  examples?: string[];
}

interface CodeExample {
  title: string;
  before: string;
  after: string;
  language: string;
}

interface Resource {
  title: string;
  url: string;
  type: 'documentation' | 'tool' | 'example' | 'video';
}

// Migration rules registry
const MIGRATION_RULES: MigrationRule[] = [
  // Example migration rules (would be expanded for actual versions)
  {
    fromVersion: 'v1',
    toVersion: 'v2',
    description: 'Migrate from v1 to v2 API format',
    breaking: true,
    transformResponse: (data: any) => {
      // Example transformation logic
      return {
        ...data,
        // Add new fields, transform existing ones
        metadata: data.meta || {},
        version: 'v2',
      };
    },
  },
];

// Migration guides registry
const MIGRATION_GUIDES: Record<string, MigrationGuide> = {
  'v1-to-v2': {
    title: 'Migrating from API v1 to v2',
    description: 'Complete guide for upgrading from v1 to v2 of the CPR Training API',
    fromVersion: 'v1',
    toVersion: 'v2',
    breaking: true,
    estimatedEffort: 'medium',
    steps: [
      {
        step: 1,
        title: 'Update API endpoints',
        description: 'Change all API calls from /api/v1/ to /api/v2/',
        required: true,
        examples: [
          'Before: GET /api/v1/courses',
          'After: GET /api/v2/courses',
        ],
      },
      {
        step: 2,
        title: 'Update authentication headers',
        description: 'v2 requires additional authentication headers',
        required: true,
        examples: [
          'Add: X-API-Key header',
          'Add: X-Client-Version header',
        ],
      },
      {
        step: 3,
        title: 'Handle new response format',
        description: 'v2 includes additional metadata in responses',
        required: true,
        examples: [
          'New field: response.meta.pagination',
          'New field: response.meta.deprecation',
        ],
      },
    ],
    codeExamples: [
      {
        title: 'Basic API call migration',
        language: 'javascript',
        before: `
// v1 API call
fetch('/api/v1/courses', {
  headers: {
    'Authorization': 'Bearer ' + token
  }
})`,
        after: `
// v2 API call
fetch('/api/v2/courses', {
  headers: {
    'Authorization': 'Bearer ' + token,
    'X-API-Key': apiKey,
    'X-Client-Version': '2.0.0'
  }
})`,
      },
    ],
    resources: [
      {
        title: 'v2 API Documentation',
        url: '/docs/api/v2/',
        type: 'documentation',
      },
      {
        title: 'Migration Testing Tool',
        url: '/tools/migration-tester',
        type: 'tool',
      },
    ],
  },
};

export class MigrationUtils {
  /**
   * Get migration path between versions
   */
  static getMigrationPath(fromVersion: string, toVersion: string): MigrationRule[] {
    return MIGRATION_RULES.filter(
      rule => rule.fromVersion === fromVersion && rule.toVersion === toVersion
    );
  }

  /**
   * Get migration guide for version transition
   */
  static getMigrationGuide(fromVersion: string, toVersion: string): MigrationGuide | null {
    const guideKey = `${fromVersion}-to-${toVersion}`;
    return MIGRATION_GUIDES[guideKey] || null;
  }

  /**
   * Apply migration transformations to request data
   */
  static transformRequest(
    data: any,
    fromVersion: string,
    toVersion: string
  ): any {
    const migrationRules = this.getMigrationPath(fromVersion, toVersion);
    
    return migrationRules.reduce((transformedData, rule) => {
      if (rule.transformRequest) {
        return rule.transformRequest(transformedData);
      }
      return transformedData;
    }, data);
  }

  /**
   * Apply migration transformations to response data
   */
  static transformResponse(
    data: any,
    fromVersion: string,
    toVersion: string
  ): any {
    const migrationRules = this.getMigrationPath(fromVersion, toVersion);
    
    return migrationRules.reduce((transformedData, rule) => {
      if (rule.transformResponse) {
        return rule.transformResponse(transformedData);
      }
      return transformedData;
    }, data);
  }

  /**
   * Check if migration between versions is breaking
   */
  static isBreakingMigration(fromVersion: string, toVersion: string): boolean {
    const migrationRules = this.getMigrationPath(fromVersion, toVersion);
    return migrationRules.some(rule => rule.breaking);
  }

  /**
   * Get migration complexity estimate
   */
  static getMigrationComplexity(
    fromVersion: string,
    toVersion: string
  ): 'low' | 'medium' | 'high' {
    const guide = this.getMigrationGuide(fromVersion, toVersion);
    if (guide) {
      return guide.estimatedEffort;
    }

    // Fallback logic
    const migrationRules = this.getMigrationPath(fromVersion, toVersion);
    const hasBreaking = migrationRules.some(rule => rule.breaking);
    const ruleCount = migrationRules.length;

    if (hasBreaking && ruleCount > 3) return 'high';
    if (hasBreaking || ruleCount > 1) return 'medium';
    return 'low';
  }

  /**
   * Generate migration checklist
   */
  static generateMigrationChecklist(
    fromVersion: string,
    toVersion: string
  ): string[] {
    const guide = this.getMigrationGuide(fromVersion, toVersion);
    
    if (guide) {
      return guide.steps.map(step => 
        `${step.step}. ${step.title}: ${step.description}`
      );
    }

    // Fallback generic checklist
    return [
      '1. Update API version in URLs',
      '2. Test all API endpoints',
      '3. Update error handling',
      '4. Verify response format compatibility',
      '5. Update documentation',
    ];
  }

  /**
   * Validate client compatibility
   */
  static validateClientCompatibility(
    clientVersion: string,
    apiVersion: string
  ): {
    compatible: boolean;
    warnings: string[];
    migrationRequired: boolean;
    migrationGuide?: string;
  } {
    const clientVersionInfo = getVersionInfo(clientVersion);
    const apiVersionInfo = getVersionInfo(apiVersion);

    if (!clientVersionInfo || !apiVersionInfo) {
      return {
        compatible: false,
        warnings: ['Invalid version information'],
        migrationRequired: true,
      };
    }

    // Same version - fully compatible
    if (clientVersion === apiVersion) {
      return {
        compatible: true,
        warnings: [],
        migrationRequired: false,
      };
    }

    // Check for deprecation warnings
    const warnings: string[] = [];
    if (clientVersionInfo.status === 'deprecated') {
      warnings.push(`Client is using deprecated API version ${clientVersion}`);
    }
    if (clientVersionInfo.status === 'sunset') {
      warnings.push(`Client API version ${clientVersion} is scheduled for removal`);
    }

    // Determine migration requirements
    const isBreaking = this.isBreakingMigration(clientVersion, apiVersion);
    const migrationGuide = this.getMigrationGuide(clientVersion, apiVersion);

    return {
      compatible: !isBreaking,
      warnings,
      migrationRequired: isBreaking,
      migrationGuide: migrationGuide ? `/docs/migrations/${clientVersion}-to-${apiVersion}` : undefined,
    };
  }

  /**
   * Generate migration report
   */
  static generateMigrationReport(
    currentVersion: string,
    targetVersion: string
  ): {
    summary: string;
    complexity: string;
    breaking: boolean;
    estimatedTime: string;
    checklist: string[];
    resources: Resource[];
  } {
    const guide = this.getMigrationGuide(currentVersion, targetVersion);
    const complexity = this.getMigrationComplexity(currentVersion, targetVersion);
    const breaking = this.isBreakingMigration(currentVersion, targetVersion);
    const checklist = this.generateMigrationChecklist(currentVersion, targetVersion);

    // Estimate time based on complexity
    const timeEstimates = {
      low: '1-2 hours',
      medium: '1-3 days',
      high: '1-2 weeks',
    };

    return {
      summary: guide 
        ? guide.description 
        : `Migration from ${currentVersion} to ${targetVersion}`,
      complexity,
      breaking,
      estimatedTime: timeEstimates[complexity],
      checklist,
      resources: guide ? guide.resources : [],
    };
  }

  /**
   * Create backward compatibility shim
   */
  static createCompatibilityShim(
    targetVersion: string,
    shimVersion: string
  ) {
    return (req: Request, res: Response, next: Function) => {
      // Store original version
      const originalVersion = req.apiVersion;
      
      // Temporarily set to target version
      req.apiVersion = targetVersion;
      
      // Add shim metadata
      req.compatibilityShim = {
        originalVersion,
        targetVersion,
        shimVersion,
        active: true,
      };

      next();
    };
  }

  /**
   * Log migration events for analytics
   */
  static logMigrationEvent(
    event: 'migration_started' | 'migration_completed' | 'compatibility_check' | 'shim_used',
    context: {
      fromVersion?: string;
      toVersion?: string;
      clientId?: string;
      endpoint?: string;
      success?: boolean;
      errors?: string[];
    }
  ): void {
    const migrationEvent = {
      timestamp: new Date().toISOString(),
      event,
      ...context,
      source: 'migration-utils',
    };

    console.log('[MIGRATION EVENT]', migrationEvent);
    
    // Could extend to send to external analytics service
  }

  /**
   * Get all available migration guides
   */
  static getAllMigrationGuides(): MigrationGuide[] {
    return Object.values(MIGRATION_GUIDES);
  }

  /**
   * Check if automatic migration is possible
   */
  static canAutoMigrate(fromVersion: string, toVersion: string): boolean {
    const migrationRules = this.getMigrationPath(fromVersion, toVersion);
    
    // Auto-migration is possible if:
    // 1. Migration rules exist
    // 2. No breaking changes
    // 3. Transformations are defined
    return migrationRules.length > 0 && 
           !migrationRules.some(rule => rule.breaking) &&
           migrationRules.every(rule => rule.transformRequest || rule.transformResponse);
  }

  /**
   * Perform automatic migration if possible
   */
  static performAutoMigration(
    data: any,
    fromVersion: string,
    toVersion: string,
    direction: 'request' | 'response'
  ): { success: boolean; data?: any; errors?: string[] } {
    if (!this.canAutoMigrate(fromVersion, toVersion)) {
      return {
        success: false,
        errors: ['Automatic migration not available for this version transition'],
      };
    }

    try {
      const transformedData = direction === 'request' 
        ? this.transformRequest(data, fromVersion, toVersion)
        : this.transformResponse(data, fromVersion, toVersion);

      this.logMigrationEvent('migration_completed', {
        fromVersion,
        toVersion,
        success: true,
      });

      return {
        success: true,
        data: transformedData,
      };
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      this.logMigrationEvent('migration_completed', {
        fromVersion,
        toVersion,
        success: false,
        errors: [errorMessage],
      });

      return {
        success: false,
        errors: [errorMessage],
      };
    }
  }
}

export default MigrationUtils; 