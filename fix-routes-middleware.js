// Script to fix all middleware usage in routes.ts
// This maps old middleware patterns to new Supabase Auth patterns

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const routesPath = path.join(__dirname, 'server', 'routes.ts');
let content = fs.readFileSync(routesPath, 'utf8');

// Define the mapping of old patterns to new patterns
const replacements = [
  // Fix authorize with permission arrays
  {
    from: /authorize\(\[PERMISSIONS\.RESOURCE_MANAGEMENT, PERMISSIONS\.TIME_LOGGING\]\)/g,
    to: 'requirePermission("resource_management")'
  },
  {
    from: /authorize\(\[PERMISSIONS\.PROJECT_MANAGEMENT, PERMISSIONS\.TIME_LOGGING\]\)/g,
    to: 'requirePermission("project_management")'
  },
  {
    from: /authorize\(PERMISSIONS\.RESOURCE_MANAGEMENT\)/g,
    to: 'requirePermission("resource_management")'
  },
  {
    from: /authorize\(PERMISSIONS\.PROJECT_MANAGEMENT\)/g,
    to: 'requirePermission("project_management")'
  },
  {
    from: /authorize\(PERMISSIONS\.REPORTS\)/g,
    to: 'requirePermission("reports")'
  },
  {
    from: /authorize\(PERMISSIONS\.SYSTEM_ADMIN\)/g,
    to: 'requirePermission("system_admin")'
  },
  {
    from: /authorize\(PERMISSIONS\.ROLE_MANAGEMENT\)/g,
    to: 'requirePermission("role_management")'
  },
  {
    from: /authorize\(PERMISSIONS\.USER_MANAGEMENT\)/g,
    to: 'requirePermission("user_management")'
  },
  {
    from: /authorize\(\[PERMISSIONS\.PROJECT_MANAGEMENT, PERMISSIONS\.SYSTEM_ADMIN\]\)/g,
    to: 'requirePermission("project_management")'
  },
  {
    from: /authorize\(\[PERMISSIONS\.RESOURCE_MANAGEMENT, PERMISSIONS\.SYSTEM_ADMIN\]\)/g,
    to: 'requirePermission("resource_management")'
  },
  
  // Fix authorizeResourceOwner calls
  {
    from: /authorizeResourceOwner\(\)/g,
    to: 'authorizeResourceOwner'
  }
];

// Apply all replacements
replacements.forEach(({ from, to }) => {
  content = content.replace(from, to);
});

// Write the updated content back
fs.writeFileSync(routesPath, content, 'utf8');

console.log('Routes middleware patterns updated successfully!');
console.log('Applied replacements:');
replacements.forEach(({ from, to }, index) => {
  console.log(`${index + 1}. ${from} -> ${to}`);
});
