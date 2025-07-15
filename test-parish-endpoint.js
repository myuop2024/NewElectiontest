// Test script for parish analytics endpoint
const fetch = require('node-fetch');

async function testParishEndpoint() {
  try {
    console.log('Testing parish analytics endpoint...');
    
    const response = await fetch('http://localhost:3000/api/analytics/parishes', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'connect.sid=test'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Parish endpoint working!');
      console.log(`📊 Found ${data.length} parishes`);
      console.log('📋 Sample parish data:');
      console.log(JSON.stringify(data[0], null, 2));
    } else {
      console.log('❌ Parish endpoint failed');
      console.log(`Status: ${response.status}`);
      const errorText = await response.text();
      console.log(`Error: ${errorText}`);
    }
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

testParishEndpoint(); 