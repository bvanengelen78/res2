// Test script to check project data structure
console.log('Testing Project Data Structure...\n');

// Simulate fetching project data
fetch('http://localhost:5000/api/projects', {
  credentials: 'include'
})
.then(response => response.json())
.then(projects => {
  console.log('=== Project Data Structure ===');
  console.log(`Total projects: ${projects.length}`);
  
  if (projects.length > 0) {
    const firstProject = projects[0];
    console.log('\nFirst project structure:');
    console.log(JSON.stringify(firstProject, null, 2));
    
    console.log('\n=== Business Lead Analysis ===');
    projects.forEach((project, index) => {
      console.log(`Project ${index + 1}: ${project.name}`);
      console.log(`  - Director ID: ${project.directorId || 'Not set'}`);
      console.log(`  - Change Lead ID: ${project.changeLeadId || 'Not set'}`);
      console.log(`  - Business Lead ID: ${project.businessLeadId || 'Not set'}`);
      console.log('');
    });
  }
})
.catch(error => {
  console.error('Error fetching project data:', error);
});

// Also test resources data
fetch('http://localhost:5000/api/resources', {
  credentials: 'include'
})
.then(response => response.json())
.then(resources => {
  console.log('=== Resources Data ===');
  console.log(`Total resources: ${resources.length}`);
  
  if (resources.length > 0) {
    console.log('\nAvailable resources:');
    resources.forEach(resource => {
      console.log(`  - ID: ${resource.id}, Name: ${resource.name}`);
    });
  }
})
.catch(error => {
  console.error('Error fetching resources data:', error);
});

console.log('Test script loaded. Check browser console for results.');
