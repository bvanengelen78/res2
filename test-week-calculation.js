// Test week calculation to understand the current week issue

function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function testWeekCalculation() {
  console.log('🗓️ Testing Week Calculation...\n');
  
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentWeek = getWeekNumber(now);
  const currentWeekKey = `${currentYear}-W${currentWeek.toString().padStart(2, '0')}`;
  const alternateWeekKey = `W${currentWeek.toString().padStart(2, '0')}`;
  
  console.log('Current date:', now.toISOString());
  console.log('Current year:', currentYear);
  console.log('Current week number:', currentWeek);
  console.log('Current week key:', currentWeekKey);
  console.log('Alternate week key:', alternateWeekKey);
  
  // Test Harold's known weekly data
  const haroldWeeklyData = {
    "2025-W29": 40,
    "2025-W30": 16,
    "2025-W31": 40,
    "2025-W32": 16,
    "2025-W33": 16,
    "2025-W37": 20
  };
  
  console.log('\nHarold\'s weekly data:');
  Object.entries(haroldWeeklyData).forEach(([week, hours]) => {
    console.log(`  ${week}: ${hours}h`);
  });
  
  console.log('\nTesting lookups:');
  console.log(`Harold's hours for ${currentWeekKey}:`, haroldWeeklyData[currentWeekKey] || 'Not found');
  console.log(`Harold's hours for ${alternateWeekKey}:`, haroldWeeklyData[alternateWeekKey] || 'Not found');
  
  // Test specific weeks
  console.log('\nTesting specific weeks:');
  console.log('W29 (2025-W29):', haroldWeeklyData['2025-W29'] || 'Not found');
  console.log('W30 (2025-W30):', haroldWeeklyData['2025-W30'] || 'Not found');
  console.log('W31 (2025-W31):', haroldWeeklyData['2025-W31'] || 'Not found');
  
  // Calculate what Harold's utilization should be for different weeks
  const capacity = 40;
  console.log('\nHarold\'s utilization by week:');
  Object.entries(haroldWeeklyData).forEach(([week, hours]) => {
    const utilization = Math.round((hours / capacity) * 100);
    console.log(`  ${week}: ${hours}h / ${capacity}h = ${utilization}%`);
  });
}

testWeekCalculation();
