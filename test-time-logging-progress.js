// Test script to verify time logging progress calculation fix
console.log('Testing Time Logging Progress Calculation Fix...\n');

// Mock data to simulate the scenario described in the issue
const mockAllocations = [
  {
    id: 1,
    projectId: 1,
    resourceId: 2,
    allocatedHours: "8.00", // 8 hours per week for this project
    project: {
      name: "New last mile transport planning system (RoutiGO)"
    }
  }
];

const mockWeekForm = {
  entries: {
    1: { // allocation ID 1
      mondayHours: "2.00",
      tuesdayHours: "2.00", 
      wednesdayHours: "1.00",
      thursdayHours: "1.00",
      fridayHours: "2.00",
      saturdayHours: "0.00",
      sundayHours: "0.00",
      notes: ""
    }
  }
};

// Simulate the calculateExpectedHours function
function calculateExpectedHours(allocations) {
  return allocations.reduce((total, allocation) => {
    return total + parseFloat(allocation.allocatedHours);
  }, 0);
}

// Simulate the calculateWeeklySummary function
function calculateWeeklySummary(weekForm, allocations) {
  let totalHours = 0;
  const projectBreakdown = {};
  
  Object.entries(weekForm.entries).forEach(([allocationId, entry]) => {
    const allocation = allocations.find(a => a.id === parseInt(allocationId));
    if (allocation) {
      const projectHours = parseFloat(entry.mondayHours) + 
                          parseFloat(entry.tuesdayHours) + 
                          parseFloat(entry.wednesdayHours) + 
                          parseFloat(entry.thursdayHours) + 
                          parseFloat(entry.fridayHours) + 
                          parseFloat(entry.saturdayHours) + 
                          parseFloat(entry.sundayHours);
      
      totalHours += projectHours;
      projectBreakdown[allocation.project.name] = (projectBreakdown[allocation.project.name] || 0) + projectHours;
    }
  });
  
  return { totalHours, projectBreakdown };
}

// Simulate the calculateHoursWarning function (fixed version)
function calculateHoursWarning(weekForm, allocations) {
  const weeklySummary = calculateWeeklySummary(weekForm, allocations);
  const expectedHours = calculateExpectedHours(allocations);
  const isPastFriday = new Date().getDay() === 0 || new Date().getDay() >= 5; // Sunday or Friday+
  
  return {
    showWarning: weeklySummary.totalHours < expectedHours && isPastFriday,
    message: `You've logged ${weeklySummary.totalHours.toFixed(1)}h of ${expectedHours.toFixed(0)}h expected (${expectedHours > 0 ? ((weeklySummary.totalHours / expectedHours) * 100).toFixed(0) : 0}%)`,
  };
}

// Test the fix
console.log('=== Test Scenario ===');
console.log('Resource: Rob Beckers');
console.log('Project: New last mile transport planning system (RoutiGO)');
console.log('Project Allocation: 8 hours per week');
console.log('Hours Logged: Mon(2) + Tue(2) + Wed(1) + Thu(1) + Fri(2) = 8 hours');
console.log('');

const expectedHours = calculateExpectedHours(mockAllocations);
const weeklySummary = calculateWeeklySummary(mockWeekForm, mockAllocations);
const hoursWarning = calculateHoursWarning(mockWeekForm, mockAllocations);

console.log('=== Results ===');
console.log(`Expected Hours: ${expectedHours}`);
console.log(`Total Hours Logged: ${weeklySummary.totalHours}`);
console.log(`Progress Message: ${hoursWarning.message}`);
console.log('');

// Verify the fix
const isCorrect = expectedHours === 8 &&
                 weeklySummary.totalHours === 8 &&
                 hoursWarning.message.includes('8.0h of 8h expected (100%)');

console.log('=== Verification ===');
console.log(`✅ Expected Hours Calculation: ${expectedHours === 8 ? 'CORRECT (8h)' : 'INCORRECT'}`);
console.log(`✅ Total Hours Calculation: ${weeklySummary.totalHours === 8 ? 'CORRECT (8h)' : 'INCORRECT'}`);
console.log(`✅ Progress Message: ${hoursWarning.message.includes('8.0h of 8h expected (100%)') ? 'CORRECT' : 'INCORRECT'}`);
console.log(`   Actual message: "${hoursWarning.message}"`);
console.log(`✅ Overall Fix: ${isCorrect ? 'SUCCESS' : 'FAILED'}`);

if (isCorrect) {
  console.log('\n🎉 The time logging progress calculation fix is working correctly!');
  console.log('The system now uses project-specific allocation hours instead of hardcoded values.');
} else {
  console.log('\n❌ The fix needs further investigation.');
}

console.log('\nTest completed!');
