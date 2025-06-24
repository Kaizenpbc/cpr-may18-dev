exports.up = function(knex) {
  return knex.schema.alterTable('course_requests', function(table) {
    // Add instructor_comments column for storing instructor notes when completing courses
    table.text('instructor_comments');
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('course_requests', function(table) {
    table.dropColumn('instructor_comments');
  });
};
