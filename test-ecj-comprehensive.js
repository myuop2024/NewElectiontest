const axios = require('axios');

async function testECJ2024ComprehensiveExtraction() {
  console.log('Testing ECJ 2024 Comprehensive Extraction...\n');

  const BASE_URL = 'http://localhost:5000';
  
  try {
    // Login as admin
    console.log('1. Logging in as admin...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: 'admin',
      password: 'password'
    });
    
    const cookies = loginResponse.headers['set-cookie'].join('; ');
    console.log('✓ Login successful\n');

    // Check extraction status
    console.log('2. Checking current extraction status...');
    const statusResponse = await axios.get(`${BASE_URL}/api/ecj-2024-stations/extraction-status`, {
      headers: { Cookie: cookies }
    });
    
    console.log('Current Status:');
    console.log(`  Total Stations: ${statusResponse.data.statistics.totalStations}`);
    console.log(`  Test Data Stations: ${statusResponse.data.statistics.testDataStations}`);
    console.log(`  Has Test Data: ${statusResponse.data.statistics.hasTestData}\n`);

    // Extract comprehensive data
    console.log('3. Starting comprehensive ECJ 2024 extraction...');
    console.log('   This will extract ALL polling stations from:');
    console.log('   - Main ECJ 2024 Local Government document');
    console.log('   - Portmore City Municipality document');
    console.log('   - Final Count document');
    console.log('   - Candidate Listing document\n');
    
    const extractResponse = await axios.post(`${BASE_URL}/api/ecj-2024-stations/extract-2024-stations`, {}, {
      headers: { Cookie: cookies },
      timeout: 300000 // 5 minute timeout for extraction
    });
    
    console.log('✓ Extraction completed!');
    console.log(`  Total Inserted: ${extractResponse.data.data.totalInserted} stations`);
    console.log(`  Parishes Processed: ${extractResponse.data.data.parishesCounts.length}`);
    console.log('\nParish Distribution:');
    
    for (const parish of extractResponse.data.data.parishesCounts) {
      console.log(`  ${parish.parish}: ${parish.count} stations`);
    }

    // Get updated status
    console.log('\n4. Getting updated extraction status...');
    const updatedStatusResponse = await axios.get(`${BASE_URL}/api/ecj-2024-stations/extraction-status`, {
      headers: { Cookie: cookies }
    });
    
    console.log('\nUpdated Status:');
    console.log(`  Total Stations: ${updatedStatusResponse.data.statistics.totalStations}`);
    console.log(`  Test Data Stations: ${updatedStatusResponse.data.statistics.testDataStations}`);
    
    console.log('\nTest Data by Parish:');
    for (const [parish, count] of Object.entries(updatedStatusResponse.data.statistics.testStationsByParish)) {
      console.log(`  ${parish}: ${count} stations`);
    }

    console.log('\n✓ Comprehensive ECJ 2024 extraction test completed successfully!');
    console.log('All polling stations from the official ECJ documents have been extracted as test data.');
    
  } catch (error) {
    console.error('❌ Error during test:', error.response?.data || error.message);
  }
}

// Run the test
testECJ2024ComprehensiveExtraction();