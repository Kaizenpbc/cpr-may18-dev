/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.raw(`
    ALTER TABLE payment_requests 
    DROP CONSTRAINT IF EXISTS payment_requests_status_check;
    
    ALTER TABLE payment_requests 
    ADD CONSTRAINT payment_requests_status_check 
    CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'returned_to_hr'));
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.raw(`
    ALTER TABLE payment_requests 
    DROP CONSTRAINT IF EXISTS payment_requests_status_check;
    
    ALTER TABLE payment_requests 
    ADD CONSTRAINT payment_requests_status_check 
    CHECK (status IN ('pending', 'approved', 'rejected', 'completed'));
  `);
}; 