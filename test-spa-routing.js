/**
 * Test script to verify SPA routing works correctly on deployed Vercel app
 * Tests direct URL access to dynamic routes that were previously failing
 */

const testUrls = [
  'https://resourcio.vercel.app/',
  'https://resourcio.vercel.app/projects',
  'https://resourcio.vercel.app/projects/1',
  'https://resourcio.vercel.app/resources',
  'https://resourcio.vercel.app/resources/16',
  'https://resourcio.vercel.app/dashboard',
  'https://resourcio.vercel.app/api/ping'
];

async function testUrl(url) {
  try {
    console.log(`Testing: ${url}`);
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    
    const status = response.status;
    const contentType = response.headers.get('content-type') || '';
    
    if (url.includes('/api/')) {
      // API endpoints should return JSON
      console.log(`  ✓ Status: ${status}, Content-Type: ${contentType}`);
      if (status === 200 && contentType.includes('application/json')) {
        const data = await response.json();
        console.log(`  ✓ API Response: ${JSON.stringify(data)}`);
      }
    } else {
      // SPA routes should return HTML with status 200
      console.log(`  ✓ Status: ${status}, Content-Type: ${contentType}`);
      if (status === 200 && contentType.includes('text/html')) {
        const html = await response.text();
        const hasReactRoot = html.includes('<div id="root">');
        const hasTitle = html.includes('Resourcio');
        console.log(`  ✓ Has React root: ${hasReactRoot}, Has title: ${hasTitle}`);
      } else if (status === 404) {
        console.log(`  ❌ 404 Error - SPA routing not working`);
      }
    }
    
    console.log('');
    return { url, status, success: status === 200 };
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
    console.log('');
    return { url, status: 'ERROR', success: false, error: error.message };
  }
}

async function runTests() {
  console.log('🧪 Testing SPA Routing on Vercel Deployment');
  console.log('='.repeat(50));
  console.log('');
  
  const results = [];
  
  for (const url of testUrls) {
    const result = await testUrl(url);
    results.push(result);
    
    // Wait a bit between requests to be nice to the server
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('📊 Test Results Summary');
  console.log('='.repeat(50));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Successful: ${successful.length}/${results.length}`);
  console.log(`❌ Failed: ${failed.length}/${results.length}`);
  
  if (failed.length > 0) {
    console.log('\nFailed URLs:');
    failed.forEach(r => {
      console.log(`  - ${r.url} (${r.status})`);
    });
  }
  
  console.log('\n🎯 Key Tests:');
  const projectDetailTest = results.find(r => r.url.includes('/projects/1'));
  const resourceDetailTest = results.find(r => r.url.includes('/resources/16'));
  
  console.log(`  Project Detail (/projects/1): ${projectDetailTest?.success ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Resource Detail (/resources/16): ${resourceDetailTest?.success ? '✅ PASS' : '❌ FAIL'}`);
  
  if (projectDetailTest?.success && resourceDetailTest?.success) {
    console.log('\n🎉 SPA routing fix is working! Direct URL access should now work correctly.');
  } else {
    console.log('\n⚠️  SPA routing may still have issues. Check Vercel deployment status.');
  }
}

// Run the tests
runTests().catch(console.error);
