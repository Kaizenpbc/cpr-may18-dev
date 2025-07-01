/**
 * Migration to add phone column to users table
 * Adds phone field for instructor contact information
 */

exports.up = function(knex) {
  return knex.schema.alterTable('users', function(table) {
    table.string('phone', 20).nullable();
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('users', function(table) {
    table.dropColumn('phone');
  });
}; 