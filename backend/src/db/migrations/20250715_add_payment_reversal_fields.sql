-- Migration: Add payment reversal fields
-- Add missing columns to payments table for reversal functionality

-- Add reversed_at timestamp
ALTER TABLE payments ADD COLUMN IF NOT EXISTS reversed_at TIMESTAMP;

-- Add reversed_by user reference
ALTER TABLE payments ADD COLUMN IF NOT EXISTS reversed_by INTEGER REFERENCES users(id);

-- Add index for reversal queries
CREATE INDEX IF NOT EXISTS idx_payments_reversed_at ON payments(reversed_at) WHERE reversed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_status_reversed ON payments(status) WHERE status = 'reversed';

-- Add index for verification timestamp queries
CREATE INDEX IF NOT EXISTS idx_payments_verified_by_accounting_at ON payments(verified_by_accounting_at) WHERE verified_by_accounting_at IS NOT NULL; 