// Test script for Central AI Hub API endpoints
const baseUrl = 'http://localhost:3000'; // Adjust if your server runs on a different port

async function testEndpoint(endpoint, method = 'GET', body = null) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    console.log(`Testing ${method} ${endpoint}...`);
    const response = await fetch(`${baseUrl}${endpoint}`, options);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`✅ ${endpoint} - Success:`, data);
    return data;
  } catch (error) {
    console.error(`❌ ${endpoint} - Error:`, error.message);
    return null;
  }
}

async function runTests() {
  console.log('🧪 Testing Central AI Hub API Endpoints...\n');

  // Test AI Status
  await testEndpoint('/api/central-ai/status');
  
  // Test X Sentiment Status
  await testEndpoint('/api/x-sentiment/status');
  
  // Test News Aggregation
  await testEndpoint('/api/news/jamaica-aggregated');
  
  // Test Parish Analytics
  await testEndpoint('/api/analytics/parishes');
  
  // Test Social Monitoring Sentiment
  await testEndpoint('/api/social-monitoring/sentiment');

  console.log('\n🎯 Central AI Hub API Tests Complete!');
}

// Run the tests
runTests().catch(console.error); 