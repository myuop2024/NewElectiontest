#!/usr/bin/env node

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// Read cookies from file for authentication
const cookiesPath = path.join(__dirname, 'cookies.txt');
let authToken = '';

try {
  const cookieData = fs.readFileSync(cookiesPath, 'utf8');
  const tokenMatch = cookieData.match(/auth_token=([^;]+)/);
  if (tokenMatch) {
    authToken = tokenMatch[1];
  }
} catch (error) {
  console.error('Could not read auth token from cookies.txt');
}

const API_BASE = 'http://localhost:5000';

async function testAdminSettings() {
  console.log('Testing Admin Settings API...\n');

  // Test 1: Get all settings
  console.log('1. Testing GET /api/settings');
  try {
    const response = await fetch(`${API_BASE}/api/settings`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (response.ok) {
      const settings = await response.json();
      console.log(`✓ Successfully retrieved ${settings.length} settings`);
    } else {
      console.log(`✗ Failed to get settings: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.log(`✗ Error getting settings: ${error.message}`);
  }

  // Test 2: Update a setting
  console.log('\n2. Testing POST /api/settings');
  try {
    const response = await fetch(`${API_BASE}/api/settings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        key: 'test_setting',
        value: 'test_value_' + Date.now()
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✓ Successfully updated setting:', result);
    } else {
      const error = await response.text();
      console.log(`✗ Failed to update setting: ${response.status} ${error}`);
    }
  } catch (error) {
    console.log(`✗ Error updating setting: ${error.message}`);
  }

  // Test 3: Initialize default settings
  console.log('\n3. Testing POST /api/admin/settings/initialize');
  try {
    const response = await fetch(`${API_BASE}/api/admin/settings/initialize`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✓ Successfully initialized default settings:', result);
    } else {
      const error = await response.text();
      console.log(`✗ Failed to initialize settings: ${response.status} ${error}`);
    }
  } catch (error) {
    console.log(`✗ Error initializing settings: ${error.message}`);
  }

  // Test 4: Get feature status
  console.log('\n4. Testing GET /api/admin/features/status');
  try {
    const response = await fetch(`${API_BASE}/api/admin/features/status`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (response.ok) {
      const features = await response.json();
      console.log(`✓ Successfully retrieved ${features.length} feature statuses`);
      
      // Show summary
      const activeFeatures = features.filter(f => f.enabled && f.configured);
      const needsConfig = features.filter(f => f.enabled && !f.configured);
      const disabled = features.filter(f => !f.enabled);
      
      console.log(`   - Active: ${activeFeatures.length}`);
      console.log(`   - Needs Config: ${needsConfig.length}`);
      console.log(`   - Disabled: ${disabled.length}`);
    } else {
      console.log(`✗ Failed to get feature status: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.log(`✗ Error getting feature status: ${error.message}`);
  }

  // Test 5: Get system health
  console.log('\n5. Testing GET /api/admin/system/health');
  try {
    const response = await fetch(`${API_BASE}/api/admin/system/health`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (response.ok) {
      const health = await response.json();
      console.log(`✓ System health status: ${health.overall}`);
      if (health.warnings?.length > 0) {
        console.log('   Warnings:', health.warnings);
      }
      if (health.errors?.length > 0) {
        console.log('   Errors:', health.errors);
      }
    } else {
      console.log(`✗ Failed to get system health: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.log(`✗ Error getting system health: ${error.message}`);
  }
}

// Run the tests
testAdminSettings().then(() => {
  console.log('\nAdmin Settings API test completed.');
}).catch(error => {
  console.error('Test failed:', error);
}); 