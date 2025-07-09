// Debug script to test the filtering logic
const today = new Date();
today.setHours(0, 0, 0, 0);

console.log('Current date:', today);
console.log('Current date ISO:', today.toISOString());

// Test dates from the availability we added
const testDates = [
  '2025-07-04', // Today
  '2025-07-07', // Monday next week
  '2025-07-08', // Tuesday next week
  '2025-07-11', // Friday next week
  '2025-07-14', // Monday week after
];

testDates.forEach(dateStr => {
  const date = new Date(dateStr);
  const isAfterToday = date >= today;
  console.log(`${dateStr}: ${date.toISOString()} - isAfterToday: ${isAfterToday}`);
});

// Test the exact filtering logic from the component
const availableDates = [
  { id: 1, date: '2025-07-04', status: 'available' },
  { id: 2, date: '2025-07-07', status: 'available' },
  { id: 3, date: '2025-07-08', status: 'available' },
  { id: 4, date: '2025-07-11', status: 'available' },
  { id: 5, date: '2025-07-14', status: 'available' },
];

console.log('\nTesting filtering logic:');
const filteredAvailabilityEntries = availableDates
  .filter((availability) => {
    const date = new Date(availability.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isAfterToday = date >= today;
    console.log(`Filtering ${availability.date}: date=${date.toISOString()}, today=${today.toISOString()}, isAfterToday=${isAfterToday}`);
    return isAfterToday;
  });

console.log('\nFiltered entries:', filteredAvailabilityEntries.length);
filteredAvailabilityEntries.forEach(entry => {
  console.log(`- ${entry.date} (ID: ${entry.id})`);
}); 