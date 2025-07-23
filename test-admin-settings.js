// Test script to check admin settings functionality
const fetch = require('node-fetch');

async function testAdminSettings() {
  const baseUrl = 'http://localhost:5000'; // Replit runs on port 5000
  
  console.log('🔍 Testing Admin Settings...\n');
  
  try {
    // Test 1: Check if server is running
    console.log('1️⃣ Testing server connectivity...');
    const healthResponse = await fetch(`${baseUrl}/api/auth/me`);
    console.log('   Health check status:', healthResponse.status);
    
    // Test 2: Try to get settings (should fail without auth)
    console.log('\n2️⃣ Testing settings endpoint without auth...');
    const settingsResponse = await fetch(`${baseUrl}/api/settings`);
    console.log('   Settings endpoint status:', settingsResponse.status);
    
    if (settingsResponse.status === 401) {
      console.log('   ✅ Expected: Authentication required');
    } else {
      console.log('   ❌ Unexpected status:', settingsResponse.status);
    }
    
    // Test 3: Check if admin account exists
    console.log('\n3️⃣ Testing admin login...');
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@caffe.org.jm',
        password: 'password'
      })
    });
    
    console.log('   Login status:', loginResponse.status);
    
    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      console.log('   ✅ Login successful');
      console.log('   User role:', loginData.user.role);
      
      // Test 4: Try to get settings with admin session
      console.log('\n4️⃣ Testing settings with admin session...');
      const cookies = loginResponse.headers.get('set-cookie');
      
      const settingsWithAuthResponse = await fetch(`${baseUrl}/api/settings`, {
        headers: {
          'Cookie': cookies
        }
      });
      
      console.log('   Settings with auth status:', settingsWithAuthResponse.status);
      
      if (settingsWithAuthResponse.ok) {
        const settingsData = await settingsWithAuthResponse.json();
        console.log('   ✅ Settings retrieved successfully');
        console.log('   Settings count:', settingsData.length);
      } else {
        const errorText = await settingsWithAuthResponse.text();
        console.log('   ❌ Settings failed:', errorText);
      }
      
      // Test 5: Try to update a setting
      console.log('\n5️⃣ Testing setting update...');
      const updateResponse = await fetch(`${baseUrl}/api/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookies
        },
        body: JSON.stringify({
          key: 'test_setting',
          value: 'test_value'
        })
      });
      
      console.log('   Update status:', updateResponse.status);
      
      if (updateResponse.ok) {
        const updateData = await updateResponse.json();
        console.log('   ✅ Setting updated successfully');
        console.log('   Response:', updateData);
      } else {
        const errorText = await updateResponse.text();
        console.log('   ❌ Update failed:', errorText);
      }
      
    } else {
      console.log('   ❌ Login failed');
      const errorText = await loginResponse.text();
      console.log('   Error:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
  
  console.log('\n🏁 Test completed');
}

// Run the test
testAdminSettings(); 