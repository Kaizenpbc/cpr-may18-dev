-- Fix invoice ID 9 calculations
-- Rate per student: $9.00
-- Students: 3
-- Base cost: $9.00 * 3 = $27.00
-- Tax (HST): $27.00 * 0.13 = $3.51
-- Total: $27.00 + $3.51 = $30.51

UPDATE invoices 
SET base_cost = 27.00,
    tax_amount = 3.51,
    amount = 30.51,
    updated_at = CURRENT_TIMESTAMP
WHERE id = 9;

-- Verify the update
SELECT 
    id,
    invoice_number,
    students_billed,
    base_cost,
    tax_amount,
    amount,
    updated_at
FROM invoices 
WHERE id = 9; 