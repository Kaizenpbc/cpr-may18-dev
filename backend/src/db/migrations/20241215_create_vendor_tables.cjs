/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    .createTable('vendors', function(table) {
      table.increments('id').primary();
      table.string('company_name', 255).notNullable();
      table.string('contact_name', 255).notNullable();
      table.string('email', 255).notNullable().unique();
      table.string('phone', 50);
      table.text('address');
      table.string('city', 100);
      table.string('state', 50);
      table.string('zip_code', 20);
      table.string('tax_id', 50);
      table.string('payment_method', 50).defaultTo('check'); // check, direct_deposit
      table.string('bank_name', 255);
      table.string('account_number', 100);
      table.string('routing_number', 100);
      table.boolean('is_active').defaultTo(true);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      // Indexes
      table.index(['email']);
      table.index(['company_name']);
      table.index(['is_active']);
    })
    .createTable('vendor_invoices', function(table) {
      table.increments('id').primary();
      table.integer('vendor_id').unsigned().notNullable();
      table.string('invoice_number', 100).notNullable();
      table.decimal('amount', 10, 2).notNullable();
      table.text('description').notNullable();
      table.enum('status', [
        'submitted',
        'pending_review', 
        'approved',
        'rejected',
        'sent_to_accounting',
        'paid',
        'partially_paid'
      ]).defaultTo('submitted');
      table.date('invoice_date');
      table.date('due_date');
      table.string('manual_type', 100);
      table.integer('quantity');
      table.string('pdf_filename', 255); // Store uploaded PDF filename
      table.text('admin_notes');
      table.date('payment_date');
      table.integer('approved_by').unsigned(); // User ID who approved
      table.integer('rejected_by').unsigned(); // User ID who rejected
      table.timestamp('sent_to_accounting_at'); // When sent to accounting
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      // Foreign keys
      table.foreign('vendor_id').references('id').inTable('vendors').onDelete('CASCADE');
      table.foreign('approved_by').references('id').inTable('users').onDelete('SET NULL');
      table.foreign('rejected_by').references('id').inTable('users').onDelete('SET NULL');
      
      // Indexes
      table.index(['vendor_id']);
      table.index(['status']);
      table.index(['invoice_number']);
      table.index(['created_at']);
      table.index(['invoice_date']);
    })
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
    .dropTableIfExists('vendor_invoices')
    .dropTableIfExists('vendors');
}; 