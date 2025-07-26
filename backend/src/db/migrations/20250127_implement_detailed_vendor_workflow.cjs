/**
 * Migration to implement detailed vendor invoice workflow with proper status transitions
 * Based on the workflow table: pending_submission -> submitted_to_admin -> submitted_to_accounting -> paid
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    .alterTable('vendor_invoices', function(table) {
      // Update status enum to include detailed workflow statuses
      table.enum('status', [
        'pending_submission',           // Vendor uploads, can review/edit
        'submitted_to_admin',           // Vendor submits to admin for review
        'submitted_to_accounting',      // Admin approves, sent to accounting
        'rejected_by_admin',            // Admin rejects the invoice
        'rejected_by_accountant',       // Accountant rejects the invoice
        'paid'                          // Payment completed
      ], { useNative: true, enumName: 'vendor_invoice_status_detailed' }).alter();
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .alterTable('vendor_invoices', function(table) {
      // Revert to simplified status enum
      table.enum('status', [
        'pending_submission',  // Vendor uploads, can review/edit
        'submitted',           // Vendor submits to admin/accounting
        'paid'                 // Payment completed
      ], { useNative: true, enumName: 'vendor_invoice_status_simplified' }).alter();
    });
}; 