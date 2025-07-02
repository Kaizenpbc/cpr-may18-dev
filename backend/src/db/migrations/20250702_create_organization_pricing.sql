-- Migration: Create organization_pricing table
-- Rollback: Drop organization_pricing table

-- UP: Create the table
CREATE TABLE IF NOT EXISTS organization_pricing (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    class_type_id INTEGER NOT NULL REFERENCES class_types(id) ON DELETE CASCADE,
    price_per_student DECIMAL(10,2) NOT NULL CHECK (price_per_student >= 0),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    last_modified_by INTEGER REFERENCES users(id),
    deleted_at TIMESTAMP NULL,
    
    -- Ensure unique pricing per organization per class type
    UNIQUE(organization_id, class_type_id, deleted_at)
);

-- Create indexes for performance
CREATE INDEX idx_organization_pricing_org_id ON organization_pricing(organization_id);
CREATE INDEX idx_organization_pricing_class_type_id ON organization_pricing(class_type_id);
CREATE INDEX idx_organization_pricing_active ON organization_pricing(is_active) WHERE is_active = true;
CREATE INDEX idx_organization_pricing_composite ON organization_pricing(organization_id, class_type_id, is_active) WHERE is_active = true;

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_organization_pricing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_organization_pricing_updated_at
    BEFORE UPDATE ON organization_pricing
    FOR EACH ROW
    EXECUTE FUNCTION update_organization_pricing_updated_at();

-- DOWN: Drop the table (for rollback)
-- DROP TRIGGER IF EXISTS trigger_organization_pricing_updated_at ON organization_pricing;
-- DROP FUNCTION IF EXISTS update_organization_pricing_updated_at();
-- DROP TABLE IF EXISTS organization_pricing; 