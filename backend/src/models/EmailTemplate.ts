import { pool } from '../config/database.js';
import { ApiResponseBuilder } from '../utils/apiResponse.js';
import { AppError } from '../utils/errorHandler.js';

export interface EmailTemplate {
  id: number;
  name: string;
  key: string;
  category: string;
  subCategory?: string;
  subject: string;
  body: string;
  isActive: boolean;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: number;
  lastModifiedBy?: number;
  deletedAt?: Date;
}

export type EmailTemplateInput = Omit<
  EmailTemplate,
  'id' | 'createdAt' | 'updatedAt' | 'deletedAt'
> & {
  category: string;
  subCategory?: string;
  createdBy?: number;
  lastModifiedBy?: number;
};

export type EmailTemplatePartialInput = Partial<EmailTemplateInput> & {
  category?: string;
  subCategory?: string;
};

export class EmailTemplateService {
  static async getAll(
    category?: string | string[],
    isActive?: boolean,
    search?: string
  ): Promise<EmailTemplate[]> {
    try {
      console.log('[EmailTemplateService.getAll] Called with params:', {
        category,
        isActive,
        search,
      });

      const params: any[] = [];
      let query = `
        SELECT 
          id,
          name,
          key,
          category,
          sub_category as "subCategory",
          subject,
          body,
          is_active as "isActive",
          is_system as "isSystem",
          created_at as "createdAt",
          updated_at as "updatedAt",
          created_by as "createdBy",
          last_modified_by as "lastModifiedBy",
          deleted_at as "deletedAt"
        FROM email_templates
        WHERE deleted_at IS NULL
      `;

      if (category) {
        if (Array.isArray(category)) {
          params.push(category);
          query += ` AND category = ANY($${params.length})`;
        } else {
          params.push(category);
          query += ` AND category = $${params.length}`;
        }
      }

      if (isActive !== undefined) {
        params.push(isActive);
        query += ` AND is_active = $${params.length}`;
      }

      if (search) {
        params.push(`%${search}%`);
        query += `
          AND (
            name ILIKE $${params.length} 
            OR subject ILIKE $${params.length}
            OR body ILIKE $${params.length}
          )
        `;
      }

      query += ' ORDER BY category, sub_category, name ASC';

      console.log('[EmailTemplateService.getAll] Final query:', query);
      console.log('[EmailTemplateService.getAll] Query params:', params);

      const result = await pool.query(query, params);

      console.log(
        '[EmailTemplateService.getAll] Query returned',
        result.rows.length,
        'rows'
      );
      if (result.rows.length > 0) {
        console.log(
          '[EmailTemplateService.getAll] First row sample:',
          result.rows[0]
        );
      }

      return result.rows;
    } catch (error) {
      console.error('[EmailTemplateService.getAll] Error:', error);
      if (error instanceof Error) {
        console.error('[EmailTemplateService.getAll] Error stack:', error.stack);
      }
      console.error('[EmailTemplateService.getAll] Query:', query);
      console.error('[EmailTemplateService.getAll] Params:', params);
      throw new AppError(
        500,
        'DATABASE_ERROR',
        'Failed to fetch email templates'
      );
    }
  }

  static async getById(id: number): Promise<EmailTemplate | null> {
    try {
      const result = await pool.query(
        `
          SELECT 
            id,
            name,
            key,
            category,
            sub_category as "subCategory",
            subject,
            body,
            is_active as "isActive",
            is_system as "isSystem",
            created_at as "createdAt",
            updated_at as "updatedAt",
            created_by as "createdBy",
            last_modified_by as "lastModifiedBy",
            deleted_at as "deletedAt"
          FROM email_templates
          WHERE id = $1 AND deleted_at IS NULL
        `,
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      throw new AppError(
        500,
        'DATABASE_ERROR',
        'Failed to fetch email template'
      );
    }
  }

  static async create(template: EmailTemplateInput): Promise<EmailTemplate> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const result = await client.query(
        `
        INSERT INTO email_templates (
          name, 
          key,
          category,
          sub_category,
          subject,
          body,
          is_active,
          is_system,
          created_by,
          last_modified_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING 
          id,
          name,
          key,
          category,
          sub_category as "subCategory",
          subject,
          body,
          is_active as "isActive",
          is_system as "isSystem",
          created_at as "createdAt",
          updated_at as "updatedAt",
          created_by as "createdBy",
          last_modified_by as "lastModifiedBy",
          deleted_at as "deletedAt"
      `,
        [
          template.name,
          template.key,
          template.category,
          template.subCategory || null,
          template.subject,
          template.body,
          template.isActive,
          template.isSystem || false,
          template.createdBy,
          template.lastModifiedBy,
        ]
      );

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('Database error in EmailTemplate.create:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        detail: error.detail,
        constraint: error.constraint,
      });
      throw new AppError(
        500,
        'DATABASE_ERROR',
        `Failed to create email template: ${error.message}`
      );
    } finally {
      client.release();
    }
  }

  static async update(
    id: number,
    template: EmailTemplatePartialInput
  ): Promise<EmailTemplate> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // First get the existing template
      const existing = await client.query(
        'SELECT * FROM email_templates WHERE id = $1 AND deleted_at IS NULL',
        [id]
      );

      if (existing.rows.length === 0) {
        throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Template not found');
      }

      const existingTemplate = existing.rows[0];

      // Merge provided fields with existing data
      const updateData = {
        name: template.name ?? existingTemplate.name,
        key: template.key ?? existingTemplate.key,
        category: template.category ?? existingTemplate.category,
        subCategory: template.subCategory ?? existingTemplate.sub_category,
        subject: template.subject ?? existingTemplate.subject,
        body: template.body ?? existingTemplate.body,
        isActive: template.isActive ?? existingTemplate.is_active,
        lastModifiedBy:
          template.lastModifiedBy ?? existingTemplate.last_modified_by,
      };

      const result = await client.query(
        `
        UPDATE email_templates
        SET 
          name = $1,
          key = $2,
          category = $3,
          sub_category = $4,
          subject = $5,
          body = $6,
          is_active = $7,
          last_modified_by = $8,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $9 AND deleted_at IS NULL
        RETURNING 
          id,
          name,
          key,
          category,
          sub_category as "subCategory",
          subject,
          body,
          is_active as "isActive",
          is_system as "isSystem",
          created_at as "createdAt",
          updated_at as "updatedAt",
          created_by as "createdBy",
          last_modified_by as "lastModifiedBy",
          deleted_at as "deletedAt"
      `,
        [
          updateData.name,
          updateData.key,
          updateData.category,
          updateData.subCategory || null,
          updateData.subject,
          updateData.body,
          updateData.isActive,
          updateData.lastModifiedBy,
          id,
        ]
      );

      if (result.rows.length === 0) {
        throw new AppError(
          404,
          'RESOURCE_NOT_FOUND',
          'Template not found or could not be updated'
        );
      }

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error updating email template:', error);
      throw new AppError(
        500,
        'DATABASE_ERROR',
        'Failed to update email template'
      );
    } finally {
      client.release();
    }
  }

  static async delete(id: number): Promise<void> {
    try {
      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        await client.query(
          'UPDATE email_templates SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1',
          [id]
        );

        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw new AppError(
          500,
          'DATABASE_ERROR',
          'Failed to delete email template'
        );
      } finally {
        client.release();
      }
    } catch (error) {
      throw new AppError(
        500,
        'DATABASE_ERROR',
        'Failed to delete email template'
      );
    }
  }

  static async getTemplateByEvent(
    eventTrigger: string
  ): Promise<EmailTemplate | null> {
    try {
      const result = await pool.query(
        `
          SELECT 
            id,
            name,
            key,
            category,
            sub_category as "subCategory",
            subject,
            body,
            is_active as "isActive",
            is_system as "isSystem",
            created_at as "createdAt",
            updated_at as "updatedAt",
            created_by as "createdBy",
            last_modified_by as "lastModifiedBy",
            deleted_at as "deletedAt"
          FROM email_templates
          WHERE key = $1 AND deleted_at IS NULL
        `,
        [eventTrigger]
      );
      return result.rows[0] || null;
    } catch (error) {
      throw new AppError(
        500,
        'DATABASE_ERROR',
        'Failed to fetch template by event'
      );
    }
  }

  static async renderTemplate(
    template: EmailTemplate,
    variables: Record<string, string>
  ): Promise<string> {
    try {
      return template.body.replace(
        /{{\s*(.*?)\s*}}/g,
        (match, key) => variables[key] || ''
      );
    } catch (error) {
      throw new AppError(
        500,
        'TEMPLATE_RENDER_ERROR',
        'Failed to render email template'
      );
    }
  }
}
