const { Pool } = require('pg');

const pool = new Pool({
  host: '127.0.0.1',
  port: 5432,
  database: 'cpr_jun21',
  user: 'postgres',
  password: 'gtacpr'
});

async function fixTimesheetNotesConstraint() {
  try {
    console.log('🔧 Fixing Timesheet Notes Constraint...\n');

    // 1. Check current constraint
    console.log('1. Checking current constraint...');
    const constraintResult = await pool.query(`
      SELECT 
        conname,
        pg_get_constraintdef(oid) as constraint_definition
      FROM pg_constraint 
      WHERE conname = 'timesheet_notes_note_type_check'
    `);

    if (constraintResult.rows.length > 0) {
      console.log('Current constraint:', constraintResult.rows[0].constraint_definition);
    } else {
      console.log('No constraint found');
    }

    // 2. Drop the existing constraint
    console.log('\n2. Dropping existing constraint...');
    await pool.query(`
      ALTER TABLE timesheet_notes 
      DROP CONSTRAINT IF EXISTS timesheet_notes_note_type_check
    `);
    console.log('✅ Dropped existing constraint');

    // 3. Add the correct constraint
    console.log('\n3. Adding correct constraint...');
    await pool.query(`
      ALTER TABLE timesheet_notes 
      ADD CONSTRAINT timesheet_notes_note_type_check 
      CHECK (note_type IN ('instructor', 'hr', 'accounting', 'general'))
    `);
    console.log('✅ Added correct constraint');

    // 4. Verify the constraint
    console.log('\n4. Verifying new constraint...');
    const newConstraintResult = await pool.query(`
      SELECT 
        conname,
        pg_get_constraintdef(oid) as constraint_definition
      FROM pg_constraint 
      WHERE conname = 'timesheet_notes_note_type_check'
    `);

    if (newConstraintResult.rows.length > 0) {
      console.log('New constraint:', newConstraintResult.rows[0].constraint_definition);
    }

    // 5. Test inserting a note
    console.log('\n5. Testing note insertion...');
    const testNoteResult = await pool.query(`
      INSERT INTO timesheet_notes (timesheet_id, user_id, user_role, note_text, note_type)
      VALUES (9, 61, 'hr', 'Test note after constraint fix', 'hr')
      RETURNING id, note_type
    `);
    console.log('✅ Test note inserted successfully:', testNoteResult.rows[0]);

    // 6. Clean up test note
    console.log('\n6. Cleaning up test note...');
    await pool.query(`
      DELETE FROM timesheet_notes WHERE id = $1
    `, [testNoteResult.rows[0].id]);
    console.log('✅ Test note cleaned up');

    console.log('\n🎉 Timesheet notes constraint fixed successfully!');
    console.log('\n📋 Allowed note types:');
    console.log('  - instructor');
    console.log('  - hr');
    console.log('  - accounting');
    console.log('  - general');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

fixTimesheetNotesConstraint(); 