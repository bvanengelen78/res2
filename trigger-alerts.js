// Simple script to trigger the alerts endpoint and see server logs

async function triggerAlerts() {
  console.log('🔄 Triggering alerts endpoint to see server logs...\n');

  try {
    const response = await fetch('http://localhost:5000/api/dashboard/alerts');
    
    if (!response.ok) {
      console.log(`Response status: ${response.status}`);
      const text = await response.text();
      console.log('Response body:', text);
      return;
    }

    const data = await response.json();
    console.log('✅ Alerts endpoint triggered successfully');
    console.log('📊 Response summary:');
    console.log(`   - Categories: ${data.categories?.length || 0}`);
    console.log(`   - Total Alerts: ${data.summary?.totalAlerts || 0}`);
    
    // Look for Harold specifically
    let haroldFound = false;
    if (data.categories) {
      data.categories.forEach(category => {
        const haroldInCategory = category.resources.find(r => 
          r.name.includes('Harold') || r.name.includes('Lunenburg')
        );
        if (haroldInCategory) {
          haroldFound = true;
          console.log(`🔍 Harold found in ${category.type}: ${haroldInCategory.utilization}%`);
        }
      });
    }
    
    if (!haroldFound) {
      console.log('❌ Harold not found in any alert category');
    }
    
    console.log('\n📋 Check server logs above for detailed Harold debugging info');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

triggerAlerts();
