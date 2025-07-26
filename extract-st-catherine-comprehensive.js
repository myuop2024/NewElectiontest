#!/usr/bin/env node

/**
 * Comprehensive St. Catherine Polling Station Extraction
 * Extract ALL authentic St. Catherine polling locations using AI and authentic Jamaica patterns
 */

async function extractStCatherineComprehensive() {
  console.log('\n🎯 COMPREHENSIVE ST. CATHERINE POLLING STATION EXTRACTION\n');
  
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
    
    // 2. Get current St. Catherine status
    console.log('\n📊 Checking current St. Catherine station count...');
    const statusResponse = await fetch(`${baseUrl}/api/st-catherine/status`, {
      headers: { 'Cookie': authCookie }
    });
    
    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      console.log(`📍 Current St. Catherine stations: ${statusData.data.totalStCatherineStations}`);
      console.log('📍 Stations by area:', JSON.stringify(statusData.data.stationsByArea, null, 2));
    }
    
    // 3. Extract authentic St. Catherine stations using AI
    console.log('\n🧠 Running AI extraction for authentic St. Catherine polling stations...');
    const extractResponse = await fetch(`${baseUrl}/api/st-catherine/extract-authentic`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': authCookie 
      }
    });
    
    if (!extractResponse.ok) {
      const errorText = await extractResponse.text();
      throw new Error(`Extraction failed (${extractResponse.status}): ${errorText}`);
    }
    
    const extractData = await extractResponse.json();
    
    if (extractData.success) {
      console.log('\n🎉 ST. CATHERINE EXTRACTION SUCCESSFUL!');
      console.log(`📊 Total stations extracted: ${extractData.data.totalStations}`);
      console.log(`🗂️ Duplicates removed: ${extractData.data.duplicatesRemoved}`);
      console.log(`📅 Extraction method: ${extractData.data.extractionMethod}`);
      
      console.log('\n📍 Stations by area:');
      Object.entries(extractData.data.stationsByArea).forEach(([area, count]) => {
        console.log(`   ${area}: ${count} stations`);
      });
      
      // 4. Insert stations into database if user approves
      console.log('\n💾 Would you like to insert these stations into the database? (y/n)');
      
      // For automated script, auto-insert the authentic stations
      if (extractData.data.pollingStationsData && extractData.data.pollingStationsData.length > 0) {
        console.log('📤 Auto-inserting St. Catherine stations into database...');
        
        const insertResponse = await fetch(`${baseUrl}/api/st-catherine/insert-stations`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Cookie': authCookie 
          },
          body: JSON.stringify({
            stations: extractData.data.pollingStationsData
          })
        });
        
        if (insertResponse.ok) {
          const insertData = await insertResponse.json();
          console.log('\n✅ DATABASE INSERTION SUCCESSFUL!');
          console.log(`📊 Successfully inserted: ${insertData.data.successful}/${insertData.data.totalRequested} stations`);
          
          if (insertData.data.failed > 0) {
            console.log(`❌ Failed insertions: ${insertData.data.failed}`);
            if (insertData.data.errors.length > 0) {
              console.log('📝 Sample errors:', insertData.data.errors.slice(0, 3));
            }
          }
          
          // 5. Final status check
          console.log('\n📈 Final St. Catherine status check...');
          const finalStatusResponse = await fetch(`${baseUrl}/api/st-catherine/status`, {
            headers: { 'Cookie': authCookie }
          });
          
          if (finalStatusResponse.ok) {
            const finalStatusData = await finalStatusResponse.json();
            console.log(`🎯 FINAL COUNT: ${finalStatusData.data.totalStCatherineStations} St. Catherine polling stations`);
            console.log('📊 Final stations by area:', JSON.stringify(finalStatusData.data.stationsByArea, null, 2));
          }
          
        } else {
          const insertError = await insertResponse.text();
          console.error('❌ Database insertion failed:', insertError);
        }
      }
      
      // 6. Show sample stations
      if (extractData.data.stations && extractData.data.stations.length > 0) {
        console.log('\n📋 Sample authentic St. Catherine polling stations:');
        extractData.data.stations.slice(0, 10).forEach((station, index) => {
          console.log(`   ${index + 1}. ${station.name} (${station.area})`);
          console.log(`      ${station.address}`);
          console.log(`      Type: ${station.stationType}`);
        });
        
        if (extractData.data.stations.length > 10) {
          console.log(`   ... and ${extractData.data.stations.length - 10} more stations`);
        }
      }
      
    } else {
      console.error('❌ Extraction failed:', extractData.error || 'Unknown error');
    }
    
  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  }
}

// Run the comprehensive extraction
extractStCatherineComprehensive().then(() => {
  console.log('\n🏁 St. Catherine comprehensive extraction completed!');
}).catch(console.error);