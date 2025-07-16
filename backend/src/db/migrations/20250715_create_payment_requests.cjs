/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    .createTable('payment_requests', function(table) {
      table.increments('id').primary();
      table.integer('instructor_id').unsigned().notNullable();
      table.integer('timesheet_id').unsigned().notNullable();
      table.decimal('amount', 10, 2).notNullable();
      table.date('payment_date').notNullable();
      table.string('payment_method', 50).defaultTo('direct_deposit');
      table.text('notes');
      table.enum('status', ['pending', 'approved', 'rejected', 'completed']).defaultTo('pending');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      // Foreign keys
      table.foreign('instructor_id').references('id').inTable('users').onDelete('CASCADE');
      table.foreign('timesheet_id').references('id').inTable('timesheets').onDelete('CASCADE');
      
      // Unique constraint
      table.unique(['timesheet_id']);
      
      // Indexes
      table.index(['instructor_id']);
      table.index(['status']);
      table.index(['created_at']);
      table.index(['timesheet_id']);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('payment_requests');
}; 