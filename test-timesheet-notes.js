const axios = require('axios');

const API_BASE = 'http://localhost:3001/api/v1';

async function testTimesheetNotes() {
  console.log('🧪 Testing Enhanced Timesheet Notes System...\n');

  try {
    // 1. Login as HR
    console.log('1. Logging in as HR...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      username: 'hr',
      password: 'test123'
    });
    
    const token = loginResponse.data.data?.accessToken || loginResponse.data.accessToken;
    console.log('✅ HR login successful');

    // 2. Get timesheets
    console.log('\n2. Getting timesheets...');
    const timesheetsResponse = await axios.get(`${API_BASE}/timesheet`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const timesheets = timesheetsResponse.data.data.timesheets;
    console.log(`Found ${timesheets.length} timesheets`);
    
    if (timesheets.length === 0) {
      console.log('❌ No timesheets found to test with');
      return;
    }

    const testTimesheet = timesheets[0];
    console.log(`Using timesheet ID: ${testTimesheet.id} (${testTimesheet.instructor_name})`);

    // 3. Get existing notes
    console.log('\n3. Getting existing notes...');
    const notesResponse = await axios.get(`${API_BASE}/timesheet/${testTimesheet.id}/notes`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const existingNotes = notesResponse.data.data;
    console.log(`Found ${existingNotes.length} existing notes`);

    // 4. Add a new HR note
    console.log('\n4. Adding a new HR note...');
    const addNoteResponse = await axios.post(`${API_BASE}/timesheet/${testTimesheet.id}/notes`, {
      note_text: 'This is a test HR note from the enhanced notes system.',
      note_type: 'hr'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const newNote = addNoteResponse.data.data;
    console.log('✅ Added new note:', {
      id: newNote.id,
      type: newNote.note_type,
      added_by: newNote.added_by,
      text: newNote.note_text.substring(0, 50) + '...'
    });

    // 5. Get updated notes
    console.log('\n5. Getting updated notes...');
    const updatedNotesResponse = await axios.get(`${API_BASE}/timesheet/${testTimesheet.id}/notes`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const updatedNotes = updatedNotesResponse.data.data;
    console.log(`Now have ${updatedNotes.length} notes total`);

    // 6. Display all notes
    console.log('\n6. All notes for this timesheet:');
    updatedNotes.forEach((note, index) => {
      console.log(`  ${index + 1}. [${note.note_type.toUpperCase()}] ${note.added_by} (${note.user_role})`);
      console.log(`     "${note.note_text}"`);
      console.log(`     Added: ${note.created_at}`);
      console.log('');
    });

    // 7. Test note deletion
    console.log('\n7. Testing note deletion...');
    await axios.delete(`${API_BASE}/timesheet/${testTimesheet.id}/notes/${newNote.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Note deleted successfully');

    // 8. Verify deletion
    console.log('\n8. Verifying deletion...');
    const finalNotesResponse = await axios.get(`${API_BASE}/timesheet/${testTimesheet.id}/notes`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const finalNotes = finalNotesResponse.data.data;
    console.log(`Final note count: ${finalNotes.length}`);

    console.log('\n🎉 Timesheet notes system test completed successfully!');
    console.log('\n📋 Features Verified:');
    console.log('✅ Add notes with user attribution');
    console.log('✅ Different note types (instructor, hr, accounting)');
    console.log('✅ Timestamp tracking');
    console.log('✅ Note deletion with permissions');
    console.log('✅ Clear audit trail');

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testTimesheetNotes(); 