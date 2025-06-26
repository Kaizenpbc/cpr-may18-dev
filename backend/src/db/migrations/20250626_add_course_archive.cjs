/**
 * Add archived field to course_requests table
 * This allows completed courses to be moved to archive when invoices are posted
 */

exports.up = function(knex) {
  return knex.schema.alterTable('course_requests', function(table) {
    table.boolean('archived').defaultTo(false);
    table.timestamp('archived_at');
    table.integer('archived_by').references('id').inTable('users');
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('course_requests', function(table) {
    table.dropColumn('archived');
    table.dropColumn('archived_at');
    table.dropColumn('archived_by');
  });
}; 