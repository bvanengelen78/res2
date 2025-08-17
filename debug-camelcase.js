// Test script to debug the camelCase transformation issue

// Simulate the SupabaseUtils.toCamelCase function
function toCamelCase(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(item => toCamelCase(item));

  const converted = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    converted[camelKey] = toCamelCase(value);
  }
  return converted;
}

// Test data that simulates what comes from the database
const testAllocation = {
  id: 1,
  project_id: 1,
  resource_id: 1,
  allocated_hours: "20.00",
  start_date: "2025-01-01",
  end_date: "2025-12-31",
  role: "Developer",
  status: "active",
  weekly_allocations: {
    "2025-W12": 1,
    "2025-W13": 1,
    "2025-W14": 1,
    "2025-W15": 1
  },
  created_at: "2025-01-17T18:39:54.000Z"
};

console.log("=== ORIGINAL DATA ===");
console.log("weekly_allocations:", testAllocation.weekly_allocations);

console.log("\n=== AFTER toCamelCase TRANSFORMATION ===");
const transformed = toCamelCase(testAllocation);
console.log("weeklyAllocations:", transformed.weeklyAllocations);

console.log("\n=== COMPARISON ===");
console.log("Original keys:", Object.keys(testAllocation.weekly_allocations));
console.log("Transformed keys:", Object.keys(transformed.weeklyAllocations));

// Test if the keys are preserved
const originalKeys = Object.keys(testAllocation.weekly_allocations);
const transformedKeys = Object.keys(transformed.weeklyAllocations);
const keysMatch = originalKeys.every(key => transformedKeys.includes(key));

console.log("\n=== RESULT ===");
console.log("Keys preserved:", keysMatch);
console.log("Values preserved:", JSON.stringify(testAllocation.weekly_allocations) === JSON.stringify(transformed.weeklyAllocations));
