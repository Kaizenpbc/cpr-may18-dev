const { format, parseISO } = require('date-fns');

// Simulate the CustomPickersDay logic
function testCalendarLogic() {
  console.log('🔍 Testing calendar date comparison logic...\n');
  
  // Simulate the availability data from backend
  const availableDates = [
    {
      id: 52,
      instructor_id: 2,
      date: "2025-07-15",
      status: "available",
      created_at: "2025-07-05T02:28:23.294Z",
      updated_at: "2025-07-05T02:28:23.294Z"
    }
  ];
  
  // Test dates to check
  const testDates = [
    '2025-07-15', // Should match availability
    '2025-07-16', // Should not match
    '2025-07-14', // Should not match
    '2025-07-05', // Should not match
  ];
  
  console.log('📊 Available dates:', JSON.stringify(availableDates, null, 2));
  console.log('\n🔍 Testing date matching logic...\n');
  
  testDates.forEach(testDate => {
    console.log(`Testing date: ${testDate}`);
    
    const isAvailable = availableDates.some((availability) => {
      // This is the exact logic from CustomPickersDay
      const availabilityDate = availability.date.includes('T') 
        ? format(parseISO(availability.date), 'yyyy-MM-dd')
        : availability.date;
      
      const matches = availabilityDate === testDate;
      
      console.log(`  Availability date: ${availability.date}`);
      console.log(`  Parsed availability date: ${availabilityDate}`);
      console.log(`  Test date: ${testDate}`);
      console.log(`  Matches: ${matches}`);
      console.log('');
      
      return matches;
    });
    
    console.log(`✅ Result for ${testDate}: ${isAvailable ? 'AVAILABLE' : 'NOT AVAILABLE'}\n`);
  });
  
  // Test the date filtering logic from the schedule computation
  console.log('🔍 Testing schedule filtering logic...\n');
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  console.log(`Today (start of day): ${today.toISOString()}`);
  
  const filteredAvailability = availableDates.filter((availability) => {
    const availabilityDate = new Date(availability.date);
    const isAfterToday = availabilityDate >= today;
    
    console.log(`Filtering ${availability.date}:`);
    console.log(`  Availability date: ${availabilityDate.toISOString()}`);
    console.log(`  Today: ${today.toISOString()}`);
    console.log(`  Is after today: ${isAfterToday}`);
    console.log('');
    
    return isAfterToday;
  });
  
  console.log(`📅 Filtered availability count: ${filteredAvailability.length}`);
  if (filteredAvailability.length > 0) {
    console.log('Filtered dates:');
    filteredAvailability.forEach(avail => {
      console.log(`  - ${avail.date} (${avail.status})`);
    });
  }
}

testCalendarLogic(); 