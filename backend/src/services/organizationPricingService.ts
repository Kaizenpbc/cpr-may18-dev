import { Pool } from 'pg';
import { pool } from '../config/database.js';

export interface OrganizationPricing {
  id: number;
  organizationId: number;
  classTypeId: number;
  pricePerStudent: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: number;
  lastModifiedBy?: number;
  deletedAt?: Date;
}

export interface CreateOrganizationPricingData {
  organizationId: number;
  classTypeId: number;
  pricePerStudent: number;
  createdBy?: number;
}

export interface UpdateOrganizationPricingData {
  pricePerStudent?: number;
  isActive?: boolean;
  lastModifiedBy?: number;
}

export class OrganizationPricingService {
  private pool: Pool;

  constructor() {
    this.pool = pool;
  }

  /**
   * Get pricing for a specific organization and class type
   */
  async getOrganizationPricing(organizationId: number, classTypeId: number): Promise<OrganizationPricing | null> {
    const query = `
      SELECT 
        id,
        organization_id as "organizationId",
        class_type_id as "classTypeId",
        price_per_student as "pricePerStudent",
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt",
        created_by as "createdBy",
        last_modified_by as "lastModifiedBy",
        deleted_at as "deletedAt"
      FROM organization_pricing
      WHERE organization_id = $1 
        AND class_type_id = $2 
        AND is_active = true 
        AND deleted_at IS NULL
    `;

    const result = await this.pool.query(query, [organizationId, classTypeId]);
    return result.rows[0] || null;
  }

  /**
   * Get all pricing for an organization
   */
  async getOrganizationPricingList(organizationId: number): Promise<OrganizationPricing[]> {
    const query = `
      SELECT 
        cp.id,
        cp.organization_id as "organizationId",
        cp.course_type_id as "classTypeId",
        cp.price_per_student as "pricePerStudent",
        cp.is_active as "isActive",
        cp.created_at as "createdAt",
        cp.updated_at as "updatedAt",
        NULL as "createdBy",
        NULL as "lastModifiedBy",
        NULL as "deletedAt",
        ct.name as "classTypeName"
      FROM course_pricing cp
      JOIN class_types ct ON cp.course_type_id = ct.id
      WHERE cp.organization_id = $1 
        AND cp.is_active = true
      ORDER BY ct.name
    `;

    const result = await this.pool.query(query, [organizationId]);
    return result.rows;
  }

  /**
   * Get organization pricing by ID
   */
  async getOrganizationPricingById(id: number): Promise<OrganizationPricing | null> {
    const query = `
      SELECT 
        op.id,
        op.organization_id as "organizationId",
        op.class_type_id as "classTypeId",
        op.price_per_student as "pricePerStudent",
        op.is_active as "isActive",
        op.created_at as "createdAt",
        op.updated_at as "updatedAt",
        op.created_by as "createdBy",
        op.last_modified_by as "lastModifiedBy",
        op.deleted_at as "deletedAt",
        o.name as "organizationName",
        ct.name as "classTypeName"
      FROM organization_pricing op
      JOIN organizations o ON op.organization_id = o.id
      JOIN class_types ct ON op.class_type_id = ct.id
      WHERE op.id = $1 AND op.deleted_at IS NULL
    `;

    const result = await this.pool.query(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Get all organization pricing (admin view)
   */
  async getAllOrganizationPricing(filters?: {
    organizationId?: number;
    classTypeId?: number;
    isActive?: boolean;
  }): Promise<OrganizationPricing[]> {
    let query = `
      SELECT 
        op.id,
        op.organization_id as "organizationId",
        op.class_type_id as "classTypeId",
        op.price_per_student as "pricePerStudent",
        op.is_active as "isActive",
        op.created_at as "createdAt",
        op.updated_at as "updatedAt",
        op.created_by as "createdBy",
        op.last_modified_by as "lastModifiedBy",
        op.deleted_at as "deletedAt",
        o.name as "organizationName",
        ct.name as "classTypeName"
      FROM organization_pricing op
      JOIN organizations o ON op.organization_id = o.id
      JOIN class_types ct ON op.class_type_id = ct.id
      WHERE op.deleted_at IS NULL
    `;

    const params: (string | number | boolean)[] = [];
    let paramIndex = 1;

    if (filters?.organizationId) {
      query += ` AND op.organization_id = $${paramIndex}`;
      params.push(filters.organizationId);
      paramIndex++;
    }

    if (filters?.classTypeId) {
      query += ` AND op.class_type_id = $${paramIndex}`;
      params.push(filters.classTypeId);
      paramIndex++;
    }

    if (filters?.isActive !== undefined) {
      query += ` AND op.is_active = $${paramIndex}`;
      params.push(filters.isActive);
      paramIndex++;
    }

    query += ` ORDER BY o.name, ct.name`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  /**
   * Create new organization pricing
   */
  async createOrganizationPricing(data: CreateOrganizationPricingData): Promise<OrganizationPricing> {
    const query = `
      INSERT INTO organization_pricing (
        organization_id, 
        class_type_id, 
        price_per_student, 
        created_by
      ) VALUES ($1, $2, $3, $4)
      RETURNING 
        id,
        organization_id as "organizationId",
        class_type_id as "classTypeId",
        price_per_student as "pricePerStudent",
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt",
        created_by as "createdBy",
        last_modified_by as "lastModifiedBy",
        deleted_at as "deletedAt"
    `;

    const result = await this.pool.query(query, [
      data.organizationId,
      data.classTypeId,
      data.pricePerStudent,
      data.createdBy
    ]);

    return result.rows[0];
  }

  /**
   * Update organization pricing
   */
  async updateOrganizationPricing(
    id: number, 
    data: UpdateOrganizationPricingData
  ): Promise<OrganizationPricing | null> {
    const updateFields: string[] = [];
    const params: (string | number | boolean)[] = [];
    let paramIndex = 1;

    if (data.pricePerStudent !== undefined) {
      updateFields.push(`price_per_student = $${paramIndex}`);
      params.push(data.pricePerStudent);
      paramIndex++;
    }

    if (data.isActive !== undefined) {
      updateFields.push(`is_active = $${paramIndex}`);
      params.push(data.isActive);
      paramIndex++;
    }

    if (data.lastModifiedBy !== undefined) {
      updateFields.push(`last_modified_by = $${paramIndex}`);
      params.push(data.lastModifiedBy);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      return null;
    }

    params.push(id);
    const query = `
      UPDATE organization_pricing 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex} AND deleted_at IS NULL
      RETURNING 
        id,
        organization_id as "organizationId",
        class_type_id as "classTypeId",
        price_per_student as "pricePerStudent",
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt",
        created_by as "createdBy",
        last_modified_by as "lastModifiedBy",
        deleted_at as "deletedAt"
    `;

    const result = await this.pool.query(query, params);
    return result.rows[0] || null;
  }

  /**
   * Soft delete organization pricing
   */
  async deleteOrganizationPricing(id: number): Promise<boolean> {
    const query = `
      UPDATE organization_pricing 
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND deleted_at IS NULL
    `;

    const result = await this.pool.query(query, [id]);
    return (result.rowCount || 0) > 0;
  }

  /**
   * Get pricing for course calculation (with fallback to class_type pricing)
   */
  async getPricingForCourse(organizationId: number, classTypeId: number): Promise<{
    pricePerStudent: number;
    isCustomPricing: boolean;
  }> {
    // First try to get organization-specific pricing
    const orgPricing = await this.getOrganizationPricing(organizationId, classTypeId);
    
    if (orgPricing) {
      return {
        pricePerStudent: orgPricing.pricePerStudent,
        isCustomPricing: true
      };
    }

    // Fallback to class_type pricing
    const classTypeQuery = `
      SELECT price_per_student as "pricePerStudent"
      FROM class_types
      WHERE id = $1 AND deleted_at IS NULL
    `;

    const result = await this.pool.query(classTypeQuery, [classTypeId]);
    const classTypePricing = result.rows[0];

    if (!classTypePricing) {
      throw new Error(`No pricing found for class type ${classTypeId}`);
    }

    return {
      pricePerStudent: classTypePricing.pricePerStudent,
      isCustomPricing: false
    };
  }

  /**
   * Calculate total course cost
   */
  async calculateCourseCost(
    organizationId: number, 
    classTypeId: number, 
    studentCount: number
  ): Promise<{
    totalCost: number;
    pricePerStudent: number;
    isCustomPricing: boolean;
  }> {
    const pricing = await this.getPricingForCourse(organizationId, classTypeId);
    
    return {
      totalCost: pricing.pricePerStudent * studentCount,
      pricePerStudent: pricing.pricePerStudent,
      isCustomPricing: pricing.isCustomPricing
    };
  }
}

export const organizationPricingService = new OrganizationPricingService(); 