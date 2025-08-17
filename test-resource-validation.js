// Test script to verify resource validation fix
import { insertResourceSchema } from './shared/schema.js';

console.log('Testing Resource Validation Fix...\n');

// Test cases for weeklyCapacity validation
const testCases = [
  // Valid cases
  { weeklyCapacity: "40", expected: true, description: "Valid integer as string" },
  { weeklyCapacity: "40.00", expected: true, description: "Valid decimal as string" },
  { weeklyCapacity: "37.5", expected: true, description: "Valid decimal with one decimal place" },
  { weeklyCapacity: "32.25", expected: true, description: "Valid decimal with two decimal places" },
  { weeklyCapacity: "1", expected: true, description: "Minimum valid value" },
  { weeklyCapacity: "60", expected: true, description: "Maximum valid value" },
  
  // Invalid cases that should fail
  { weeklyCapacity: 40, expected: false, description: "Number instead of string (the original issue)" },
  { weeklyCapacity: "0", expected: false, description: "Below minimum" },
  { weeklyCapacity: "61", expected: false, description: "Above maximum" },
  { weeklyCapacity: "40.123", expected: false, description: "Too many decimal places" },
  { weeklyCapacity: "abc", expected: false, description: "Non-numeric string" },
  { weeklyCapacity: "", expected: false, description: "Empty string" },
];

// Base valid resource data
const baseResource = {
  name: "Test User",
  email: "test@example.com",
  role: "Developer",
  department: "IT Architecture & Delivery",
  roles: [],
  skills: [],
  isActive: true,
};

// Run tests
testCases.forEach((testCase, index) => {
  const resourceData = {
    ...baseResource,
    weeklyCapacity: testCase.weeklyCapacity
  };
  
  try {
    const result = insertResourceSchema.parse(resourceData);
    const success = testCase.expected;
    console.log(`✅ Test ${index + 1}: ${testCase.description} - ${success ? 'PASSED' : 'FAILED (should have failed)'}`);
    if (!success) {
      console.log(`   Expected failure but got success with value: ${result.weeklyCapacity}`);
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

console.log('\nTest completed!');
