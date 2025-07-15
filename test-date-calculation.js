const today = new Date();
const dayOfWeek = today.getDay();
const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
const monday = new Date(today);
monday.setDate(today.getDate() - daysToSubtract);

// Format as YYYY-MM-DD in local time (not UTC)
const pad = (n) => n.toString().padStart(2, '0');
const mondayLocal = `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`;

console.log('Today:', today.toLocaleDateString());
console.log('Today day of week:', ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][today.getDay()]);
console.log('Calculated Monday (local):', mondayLocal);
console.log('Monday day of week:', ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][monday.getDay()]);

// Compare with UTC
console.log('\nUTC comparison:');
console.log('Today (UTC):', today.toISOString().split('T')[0]);
console.log('Monday (UTC):', monday.toISOString().split('T')[0]);
console.log('Monday (local):', mondayLocal); 