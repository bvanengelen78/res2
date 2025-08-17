// Test script to verify time entry validation fix
import { insertTimeEntrySchema } from './shared/schema.js';

console.log('Testing Time Entry Validation Fix...\n');

// Test cases for hour field validation
const testCases = [
  // Valid cases - should all pass
  { 
    data: { mondayHours: "8.00", tuesdayHours: "7.5", fridayHours: "0.00" }, 
    expected: true, 
    description: "Valid string hours" 
  },
  { 
    data: { mondayHours: 8, tuesdayHours: 7.5, fridayHours: 0 }, 
    expected: true, 
    description: "Valid number hours (the original issue)" 
  },
  { 
    data: { mondayHours: "0", tuesdayHours: "24", fridayHours: "12.25" }, 
    expected: true, 
    description: "Boundary values as strings" 
  },
  { 
    data: { mondayHours: 0, tuesdayHours: 24, fridayHours: 12.25 }, 
    expected: true, 
    description: "Boundary values as numbers" 
  },
  { 
    data: { mondayHours: "", tuesdayHours: null, fridayHours: undefined }, 
    expected: true, 
    description: "Empty/null values (should convert to 0.00)" 
  },
  
  // Invalid cases - should fail
  { 
    data: { mondayHours: "25", tuesdayHours: "8.00" }, 
    expected: false, 
    description: "Hours over 24" 
  },
  { 
    data: { mondayHours: "-1", tuesdayHours: "8.00" }, 
    expected: false, 
    description: "Negative hours" 
  },
  { 
    data: { mondayHours: "abc", tuesdayHours: "8.00" }, 
    expected: false, 
    description: "Non-numeric string" 
  },
];

// Base valid time entry data
const baseTimeEntry = {
  resourceId: 1,
  allocationId: 1,
  weekStartDate: "2025-07-07",
  notes: "Test entry",
};

// Run tests
testCases.forEach((testCase, index) => {
  const timeEntryData = {
    ...baseTimeEntry,
    ...testCase.data
  };
  
  try {
    const result = insertTimeEntrySchema.parse(timeEntryData);
    const success = testCase.expected;
    console.log(`✅ Test ${index + 1}: ${testCase.description} - ${success ? 'PASSED' : 'FAILED (should have failed)'}`);
    if (!success) {
      console.log(`   Expected failure but got success`);
      console.log(`   Result hours:`, {
        mondayHours: result.mondayHours,
        tuesdayHours: result.tuesdayHours,
        fridayHours: result.fridayHours
      });
    } else {
      console.log(`   Transformed hours:`, {
        mondayHours: result.mondayHours,
        tuesdayHours: result.tuesdayHours,
        fridayHours: result.fridayHours
      });
    }
  } catch (error) {
    const success = !testCase.expected;
    console.log(`${success ? '✅' : '❌'} Test ${index + 1}: ${testCase.description} - ${success ? 'PASSED' : 'FAILED'}`);
    if (!success) {
      console.log(`   Unexpected error: ${error.message}`);
    } else {
      console.log(`   Expected error: ${error.errors?.[0]?.message || error.message}`);
    }
  }
});

console.log('\nTime Entry Validation Test completed!');
