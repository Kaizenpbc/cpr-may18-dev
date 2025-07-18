const { Pool } = require('pg');

const pool = new Pool({
  host: '127.0.0.1',
  port: 5432,
  database: 'cpr_jun21',
  user: 'postgres',
  password: 'gtacpr'
});

async function enhanceTimesheetNotes() {
  try {
    console.log('🔧 Enhancing Timesheet Notes System with User Attribution...\n');

    // 1. Create timesheet_notes table
    console.log('1. Creating timesheet_notes table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS timesheet_notes (
        id SERIAL PRIMARY KEY,
        timesheet_id INTEGER NOT NULL REFERENCES timesheets(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id),
        user_role VARCHAR(50) NOT NULL,
        note_text TEXT NOT NULL,
        note_type VARCHAR(20) DEFAULT 'general' CHECK (note_type IN ('instructor', 'hr', 'accounting')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created timesheet_notes table');

    // 2. Create indexes for performance
    console.log('\n2. Creating indexes...');
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_timesheet_notes_timesheet_id ON timesheet_notes(timesheet_id);
      CREATE INDEX IF NOT EXISTS idx_timesheet_notes_user_id ON timesheet_notes(user_id);
      CREATE INDEX IF NOT EXISTS idx_timesheet_notes_created_at ON timesheet_notes(created_at);
    `);
    console.log('✅ Created indexes');

    // 3. Create trigger for updated_at
    console.log('\n3. Creating updated_at trigger...');
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_timesheet_notes_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await pool.query(`
      DROP TRIGGER IF EXISTS trigger_timesheet_notes_updated_at ON timesheet_notes;
      CREATE TRIGGER trigger_timesheet_notes_updated_at 
      BEFORE UPDATE ON timesheet_notes 
      FOR EACH ROW EXECUTE FUNCTION update_timesheet_notes_updated_at();
    `);
    console.log('✅ Created updated_at trigger');

    // 4. Migrate existing notes
    console.log('\n4. Migrating existing notes...');
    
    // Get all timesheets with notes or hr_comments
    const timesheetsResult = await pool.query(`
      SELECT id, instructor_id, notes, hr_comment, created_at
      FROM timesheets 
      WHERE notes IS NOT NULL AND notes != '' 
         OR hr_comment IS NOT NULL AND hr_comment != ''
    `);

    console.log(`Found ${timesheetsResult.rows.length} timesheets with existing notes`);

    for (const timesheet of timesheetsResult.rows) {
      // Migrate instructor notes
      if (timesheet.notes && timesheet.notes.trim() !== '') {
        await pool.query(`
          INSERT INTO timesheet_notes (timesheet_id, user_id, user_role, note_text, note_type, created_at)
          VALUES ($1, $2, 'instructor', $3, 'instructor', $4)
        `, [timesheet.id, timesheet.instructor_id, timesheet.notes.trim(), timesheet.created_at]);
        console.log(`  - Migrated instructor note for timesheet ${timesheet.id}`);
      }

      // Migrate HR comments
      if (timesheet.hr_comment && timesheet.hr_comment.trim() !== '') {
        // Find HR user (assuming first HR user)
        const hrUserResult = await pool.query(`
          SELECT id FROM users WHERE role = 'hr' LIMIT 1
        `);
        
        if (hrUserResult.rows.length > 0) {
          await pool.query(`
            INSERT INTO timesheet_notes (timesheet_id, user_id, user_role, note_text, note_type, created_at)
            VALUES ($1, $2, 'hr', $3, 'hr', $4)
          `, [timesheet.id, hrUserResult.rows[0].id, timesheet.hr_comment.trim(), timesheet.created_at]);
          console.log(`  - Migrated HR comment for timesheet ${timesheet.id}`);
        }
      }
    }

    // 5. Add sample notes for demonstration
    console.log('\n5. Adding sample notes for demonstration...');
    
    // Get Mike's timesheet
    const mikeTimesheetResult = await pool.query(`
      SELECT t.id, t.instructor_id, u.username
      FROM timesheets t
      JOIN users u ON t.instructor_id = u.id
      WHERE u.username = 'mike' AND t.status = 'pending'
      ORDER BY t.created_at DESC
      LIMIT 1
    `);

    if (mikeTimesheetResult.rows.length > 0) {
      const timesheet = mikeTimesheetResult.rows[0];
      
      // Add a sample HR note
      const hrUserResult = await pool.query(`
        SELECT id FROM users WHERE role = 'hr' LIMIT 1
      `);
      
      if (hrUserResult.rows.length > 0) {
        await pool.query(`
          INSERT INTO timesheet_notes (timesheet_id, user_id, user_role, note_text, note_type)
          VALUES ($1, $2, 'hr', $3, 'hr')
        `, [timesheet.id, hrUserResult.rows[0].id, 'Timesheet reviewed. All courses confirmed and hours look accurate.']);
        console.log(`  - Added sample HR note for Mike's timesheet`);
      }
    }

    // 6. Show the enhanced structure
    console.log('\n6. Enhanced Timesheet Notes Structure:');
    const structureResult = await pool.query(`
      SELECT 
        tn.id,
        tn.timesheet_id,
        u.username as added_by,
        tn.user_role,
        tn.note_type,
        tn.note_text,
        tn.created_at
      FROM timesheet_notes tn
      JOIN users u ON tn.user_id = u.id
      ORDER BY tn.created_at DESC
      LIMIT 5
    `);

    console.log('\nRecent notes:');
    structureResult.rows.forEach((note, index) => {
      console.log(`  ${index + 1}. [${note.note_type.toUpperCase()}] ${note.added_by} (${note.user_role}): ${note.note_text.substring(0, 50)}...`);
      console.log(`     Timesheet ID: ${note.timesheet_id}, Added: ${note.created_at}`);
    });

    console.log('\n🎉 Timesheet notes enhancement complete!');
    console.log('\n📋 New Features:');
    console.log('1. Multiple notes per timesheet with user attribution');
    console.log('2. Different note types: instructor, hr, accounting');
    console.log('3. Timestamp tracking for all notes');
    console.log('4. Clear audit trail of who added what and when');
    console.log('5. Existing notes migrated to new system');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

enhanceTimesheetNotes(); 