// Test script to verify date formatting fix for project form
console.log('Testing Date Formatting Fix for Project Form...\n');

// Helper function to format date for HTML date input (same as in ProjectForm)
const formatDateForInput = (date) => {
  if (!date) return "";
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return "";
    
    // Format as YYYY-MM-DD for HTML date input
    return dateObj.toISOString().split('T')[0];
  } catch (error) {
    console.warn('Error formatting date for input:', error);
    return "";
  }
};

// Test scenarios
console.log('=== Date Formatting Test Scenarios ===');

// Test 1: Date object (what comes from database after parseDates)
const testDate1 = new Date('2025-07-01T00:00:00.000Z');
const formatted1 = formatDateForInput(testDate1);
console.log(`Test 1 - Date object: ${testDate1} → "${formatted1}"`);
console.log(`✅ Expected: "2025-07-01", Got: "${formatted1}", Match: ${formatted1 === '2025-07-01'}`);

// Test 2: ISO string
const testDate2 = '2025-10-31T00:00:00.000Z';
const formatted2 = formatDateForInput(testDate2);
console.log(`\nTest 2 - ISO string: "${testDate2}" → "${formatted2}"`);
console.log(`✅ Expected: "2025-10-31", Got: "${formatted2}", Match: ${formatted2 === '2025-10-31'}`);

// Test 3: Simple date string
const testDate3 = '2025-12-25';
const formatted3 = formatDateForInput(testDate3);
console.log(`\nTest 3 - Simple date: "${testDate3}" → "${formatted3}"`);
console.log(`✅ Expected: "2025-12-25", Got: "${formatted3}", Match: ${formatted3 === '2025-12-25'}`);

// Test 4: Null/undefined values
const formatted4 = formatDateForInput(null);
const formatted5 = formatDateForInput(undefined);
const formatted6 = formatDateForInput("");
console.log(`\nTest 4 - Null/empty values:`);
console.log(`  null → "${formatted4}" (should be empty)`);
console.log(`  undefined → "${formatted5}" (should be empty)`);
console.log(`  empty string → "${formatted6}" (should be empty)`);

// Test 5: Invalid date
const formatted7 = formatDateForInput('invalid-date');
console.log(`\nTest 5 - Invalid date: "invalid-date" → "${formatted7}" (should be empty)`);

// Test 6: Simulate actual project data structure
const mockProject = {
  id: 1,
  name: "New last mile transport planning system (RoutiGO)",
  startDate: new Date('2025-07-01T00:00:00.000Z'), // This is what comes from parseDates
  endDate: new Date('2025-10-31T00:00:00.000Z'),   // This is what comes from parseDates
  status: 'active',
  priority: 'high'
};

console.log('\n=== Simulated Project Form Data ===');
console.log('Mock project data:');
console.log(`  startDate: ${mockProject.startDate} (${typeof mockProject.startDate})`);
console.log(`  endDate: ${mockProject.endDate} (${typeof mockProject.endDate})`);

const formattedStartDate = formatDateForInput(mockProject.startDate);
const formattedEndDate = formatDateForInput(mockProject.endDate);

console.log('\nFormatted for HTML date inputs:');
console.log(`  startDate: "${formattedStartDate}"`);
console.log(`  endDate: "${formattedEndDate}"`);

// Verify the fix
const allTestsPassed = 
  formatted1 === '2025-07-01' &&
  formatted2 === '2025-10-31' &&
  formatted3 === '2025-12-25' &&
  formatted4 === '' &&
  formatted5 === '' &&
  formatted6 === '' &&
  formatted7 === '' &&
  formattedStartDate === '2025-07-01' &&
  formattedEndDate === '2025-10-31';

console.log('\n=== Test Results Summary ===');
console.log(`✅ Date object formatting: ${formatted1 === '2025-07-01' ? 'PASS' : 'FAIL'}`);
console.log(`✅ ISO string formatting: ${formatted2 === '2025-10-31' ? 'PASS' : 'FAIL'}`);
console.log(`✅ Simple date formatting: ${formatted3 === '2025-12-25' ? 'PASS' : 'FAIL'}`);
console.log(`✅ Null/empty handling: ${formatted4 === '' && formatted5 === '' && formatted6 === '' ? 'PASS' : 'FAIL'}`);
console.log(`✅ Invalid date handling: ${formatted7 === '' ? 'PASS' : 'FAIL'}`);
console.log(`✅ Project data simulation: ${formattedStartDate === '2025-07-01' && formattedEndDate === '2025-10-31' ? 'PASS' : 'FAIL'}`);

console.log(`\n🎯 Overall Result: ${allTestsPassed ? 'SUCCESS' : 'FAILED'}`);

if (allTestsPassed) {
  console.log('\n🎉 Date formatting fix is working correctly!');
  console.log('The project edit form should now properly display start and end dates.');
} else {
  console.log('\n❌ Some tests failed. The fix needs further investigation.');
}

console.log('\nTest completed!');
