-- Add sub_category column to email_templates table
-- Migration: 20250702_add_sub_category_to_email_templates.sql

-- Add the sub_category column
ALTER TABLE email_templates 
ADD COLUMN IF NOT EXISTS sub_category VARCHAR(100);

-- Add a comment to document the column
COMMENT ON COLUMN email_templates.sub_category IS 'Sub-category for organizing email templates within categories';

-- Update existing records to have a default sub_category if needed
UPDATE email_templates 
SET sub_category = 'general' 
WHERE sub_category IS NULL;

-- Make the column NOT NULL after setting default values
ALTER TABLE email_templates 
ALTER COLUMN sub_category SET NOT NULL;

-- Add an index for better query performance
CREATE INDEX IF NOT EXISTS idx_email_templates_sub_category 
ON email_templates(sub_category);

-- Add a composite index for category and sub_category
CREATE INDEX IF NOT EXISTS idx_email_templates_category_sub_category 
ON email_templates(category, sub_category); 