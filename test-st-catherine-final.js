#!/usr/bin/env node

/**
 * Test St. Catherine extraction results
 */

async function testStCatherineResults() {
  console.log('\n🎯 ST. CATHERINE EXTRACTION RESULTS TEST\n');
  
  const baseUrl = 'http://localhost:5000';
  const adminCredentials = {
    email: 'admin@caffe.org.jm',
    password: 'password'
  };
  
  try {
    // 1. Admin login
    console.log('🔐 Authenticating as admin...');
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(adminCredentials)
    });
    
    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }
    
    const authCookie = loginResponse.headers.get('set-cookie');
    console.log('✅ Admin authentication successful');
    
    // 2. Check available authentic stations
    console.log('\n📋 Checking available authentic St. Catherine stations...');
    const availableResponse = await fetch(`${baseUrl}/api/st-catherine-authentic/available-stations`, {
      headers: { 'Cookie': authCookie }
    });
    
    if (availableResponse.ok) {
      const availableData = await availableResponse.json();
      console.log(`📊 Total authentic stations available: ${availableData.data.totalAvailableStations}`);
      console.log('📍 Available stations by area:');
      Object.entries(availableData.data.stationsByArea).forEach(([area, stations]) => {
        console.log(`   ${area}: ${stations.length} stations`);
      });
    }
    
    // 3. Check current status
    console.log('\n📈 Checking current St. Catherine database status...');
    const statusResponse = await fetch(`${baseUrl}/api/st-catherine-authentic/status`, {
      headers: { 'Cookie': authCookie }
    });
    
    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      console.log(`🎯 CURRENT TOTAL: ${statusData.data.totalStCatherineStations} St. Catherine stations in database`);
      console.log('📊 Current stations by area:');
      Object.entries(statusData.data.stationsByArea).forEach(([area, count]) => {
        console.log(`   ${area}: ${count} stations`);
      });
    }
    
    // 4. Get actual polling stations from database
    console.log('\n🗂️ Fetching all St. Catherine stations from database...');
    const pollingResponse = await fetch(`${baseUrl}/api/polling-stations`, {
      headers: { 'Cookie': authCookie }
    });
    
    if (pollingResponse.ok) {
      const pollingData = await pollingResponse.json();
      const stCatherineStations = pollingData.filter(station => station.parish === 'St. Catherine');
      
      console.log(`📊 VERIFIED COUNT: ${stCatherineStations.length} St. Catherine stations in database`);
      
      if (stCatherineStations.length > 0) {
        console.log('\n📋 Sample St. Catherine polling stations:');
        stCatherineStations.slice(0, 10).forEach((station, index) => {
          console.log(`   ${index + 1}. ${station.name}`);
          console.log(`      Address: ${station.address}`);
          console.log(`      Code: ${station.stationCode}`);
        });
        
        if (stCatherineStations.length > 10) {
          console.log(`   ... and ${stCatherineStations.length - 10} more stations`);
        }
        
        // Group by area
        const areaGroups = {};
        stCatherineStations.forEach(station => {
          const area = station.address?.split(',')[1]?.trim() || 
                      station.constituency?.replace('St. Catherine ', '') || 'Unknown';
          areaGroups[area] = (areaGroups[area] || 0) + 1;
        });
        
        console.log('\n📍 FINAL BREAKDOWN by area:');
        Object.entries(areaGroups).forEach(([area, count]) => {
          console.log(`   ${area}: ${count} stations`);
        });
      }
    }
    
    console.log('\n✅ St. Catherine extraction test completed successfully!');
    
  } catch (error) {
    console.error('💥 Test error:', error);
  }
}

// Run the test
testStCatherineResults();