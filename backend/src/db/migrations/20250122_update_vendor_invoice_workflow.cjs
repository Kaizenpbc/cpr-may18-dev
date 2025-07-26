/**
 * Migration to update vendor invoice workflow for admin approval -> accounting payment processing
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    // Update vendor_invoices table
    .alterTable('vendor_invoices', function(table) {
      // Simplified status values for the workflow
      table.enum('status', [
        'pending_submission',  // Vendor uploads, can review/edit
        'submitted',           // Vendor submits to admin/accounting
        'paid'                 // Payment completed
      ], { useNative: true, enumName: 'vendor_invoice_status_simplified' }).alter();
      
      // Add accounting workflow fields
      table.timestamp('sent_to_accounting_at');
      table.timestamp('paid_at');
    })
    // Create vendor_payments table
    .createTable('vendor_payments', function(table) {
      table.increments('id').primary();
      table.integer('vendor_invoice_id').unsigned().notNullable();
      table.decimal('amount', 10, 2).notNullable();
      table.date('payment_date').notNullable();
      table.string('payment_method', 50).notNullable(); // check, direct_deposit, wire_transfer
      table.string('reference_number', 100); // Check number, transaction ID, etc.
      table.text('notes');
      table.enum('status', [
        'pending',
        'processed',
        'reversed'
      ]).defaultTo('pending');
      table.integer('processed_by').unsigned(); // User ID who processed payment
      table.timestamp('processed_at');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      // Foreign keys
      table.foreign('vendor_invoice_id').references('id').inTable('vendor_invoices').onDelete('CASCADE');
      table.foreign('processed_by').references('id').inTable('users').onDelete('SET NULL');
      
      // Indexes
      table.index(['vendor_invoice_id']);
      table.index(['status']);
      table.index(['payment_date']);
      table.index(['created_at']);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('vendor_payments')
    .alterTable('vendor_invoices', function(table) {
      // Revert status enum
      table.enum('status', [
        'submitted',
        'pending_review', 
        'approved',
        'rejected',
        'paid'
      ], { useNative: true, enumName: 'vendor_invoice_status' }).alter();
      
      // Remove accounting workflow fields
      table.dropColumn('sent_to_accounting_at');
      table.dropColumn('paid_at');
    });
}; 