/**
 * Create notifications tables
 */

exports.up = function(knex) {
  return knex.schema
    .raw(`
      DO $$ BEGIN
        CREATE TYPE notification_type AS ENUM ('info', 'warning', 'error', 'success');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `)
    .createTable('notifications', function(table) {
      table.increments('id').primary();
      table.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.enu('type', ['info', 'warning', 'error', 'success'], { useNative: true, enumName: 'notification_type' }).notNullable().defaultTo('info');
      table.string('title', 255).notNullable();
      table.text('message').notNullable();
      table.boolean('is_read').notNullable().defaultTo(false);
      table.timestamps(true, true);
      
      table.index('user_id');
      table.index('is_read');
    })
    .createTable('notification_preferences', function(table) {
      table.increments('id').primary();
      table.integer('user_id').notNullable().unique().references('id').inTable('users').onDelete('CASCADE');
      table.boolean('email_enabled').notNullable().defaultTo(true);
      table.boolean('push_enabled').notNullable().defaultTo(true);
      table.timestamps(true, true);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('notification_preferences')
    .dropTableIfExists('notifications')
    .raw('DROP TYPE IF EXISTS notification_type');
}; 