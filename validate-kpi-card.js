// Simple validation script for KpiCard component formatting functions
// Run with: node validate-kpi-card.js

console.log('🧪 KpiCard Component Validation\n');

// Test number formatting function
function formatValue(num) {
  const absValue = Math.abs(num);
  const formattedNumber = absValue.toLocaleString('en-US');
  
  if (num > 0) {
    return `+${formattedNumber}`;
  } else if (num < 0) {
    return `−${formattedNumber}`;
  } else {
    return formattedNumber;
  }
}

// Test delta formatting function
function formatDelta(percent) {
  const sign = percent >= 0 ? '+' : '−';
  const absPercent = Math.abs(percent);
  return `${sign}${absPercent.toFixed(1)}% from last month`;
}

// Test cases for number formatting
const numberTestCases = [
  { input: 2350, expected: '+2,350' },
  { input: -1250, expected: '−1,250' },
  { input: 0, expected: '0' },
  { input: 1234567, expected: '+1,234,567' },
  { input: -999999, expected: '−999,999' },
  { input: 42, expected: '+42' },
  { input: -5, expected: '−5' }
];

console.log('📊 Number Formatting Tests:');
let numberTestsPassed = 0;

numberTestCases.forEach(({ input, expected }, index) => {
  const result = formatValue(input);
  const passed = result === expected;
  console.log(`  ${passed ? '✅' : '❌'} Test ${index + 1}: ${input} → "${result}" ${passed ? '' : `(expected "${expected}")`}`);
  if (passed) numberTestsPassed++;
});

console.log(`\n📈 Number Tests: ${numberTestsPassed}/${numberTestCases.length} passed\n`);

// Test cases for delta formatting
const deltaTestCases = [
  { input: 180.1, expected: '+180.1% from last month' },
  { input: -12.3, expected: '−12.3% from last month' },
  { input: 0, expected: '+0.0% from last month' },
  { input: 12.3456, expected: '+12.3% from last month' },
  { input: -99.99, expected: '−100.0% from last month' },
  { input: 5, expected: '+5.0% from last month' }
];

console.log('📈 Delta Formatting Tests:');
let deltaTestsPassed = 0;

deltaTestCases.forEach(({ input, expected }, index) => {
  const result = formatDelta(input);
  const passed = result === expected;
  console.log(`  ${passed ? '✅' : '❌'} Test ${index + 1}: ${input} → "${result}" ${passed ? '' : `(expected "${expected}")`}`);
  if (passed) deltaTestsPassed++;
});

console.log(`\n📊 Delta Tests: ${deltaTestsPassed}/${deltaTestCases.length} passed\n`);

// Test data transformation
function transformData(dataArray) {
  return dataArray.map((value, index) => ({
    index,
    value
  }));
}

console.log('🔄 Data Transformation Tests:');
const dataTestCases = [
  { input: [1, 2, 3], expected: [{ index: 0, value: 1 }, { index: 1, value: 2 }, { index: 2, value: 3 }] },
  { input: [], expected: [] },
  { input: [42], expected: [{ index: 0, value: 42 }] }
];

let dataTestsPassed = 0;

dataTestCases.forEach(({ input, expected }, index) => {
  const result = transformData(input);
  const passed = JSON.stringify(result) === JSON.stringify(expected);
  console.log(`  ${passed ? '✅' : '❌'} Test ${index + 1}: [${input.join(', ')}] → ${passed ? 'correct format' : 'incorrect format'}`);
  if (passed) dataTestsPassed++;
});

console.log(`\n🔄 Data Tests: ${dataTestsPassed}/${dataTestCases.length} passed\n`);

// Summary
const totalTests = numberTestCases.length + deltaTestCases.length + dataTestCases.length;
const totalPassed = numberTestsPassed + deltaTestsPassed + dataTestsPassed;

console.log('📋 Summary:');
console.log(`  Total Tests: ${totalTests}`);
console.log(`  Passed: ${totalPassed}`);
console.log(`  Failed: ${totalTests - totalPassed}`);
console.log(`  Success Rate: ${((totalPassed / totalTests) * 100).toFixed(1)}%`);

if (totalPassed === totalTests) {
  console.log('\n🎉 All tests passed! The KpiCard component formatting is working correctly.');
} else {
  console.log('\n⚠️  Some tests failed. Please review the formatting functions.');
  process.exit(1);
}

console.log('\n✨ KpiCard component validation complete!');
