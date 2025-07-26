/**
 * Extract 2024 ECJ Polling Stations Test Script
 * Populate authentic 2024 ECJ polling stations as removable test data
 */

import axios from 'axios';

async function extract2024PollingStations() {
  try {
    console.log('🏛️ Starting 2024 ECJ Polling Stations Extraction...');
    
    // Login as admin
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@caffe.org.jm',
      password: 'password'
    });
    
    if (!loginResponse.data.success) {
      throw new Error('Failed to authenticate as admin');
    }
    
    const authCookie = loginResponse.headers['set-cookie'];
    console.log('✅ Admin authentication successful');
    
    // Extract and populate 2024 polling stations
    const extractResponse = await axios.post(
      'http://localhost:5000/api/ecj-2024-stations/extract-2024-stations',
      {},
      {
        headers: {
          'Cookie': authCookie?.join('; ') || ''
        }
      }
    );
    
    if (extractResponse.data.success) {
      console.log(`✅ Successfully extracted ${extractResponse.data.data.totalInserted} polling stations`);
      console.log(`📊 Total parishes: ${extractResponse.data.data.parishes}`);
      console.log(`📅 Source: ${extractResponse.data.data.documentSource}`);
      console.log(`🎯 All stations marked as removable test data`);
      
      // Get extraction status
      const statusResponse = await axios.get(
        'http://localhost:5000/api/ecj-2024-stations/extraction-status',
        {
          headers: {
            'Cookie': authCookie?.join('; ') || ''
          }
        }
      );
      
      if (statusResponse.data.success) {
        const stats = statusResponse.data.statistics;
        console.log('\n📈 System Statistics:');
        console.log(`   Total Stations: ${stats.totalStations}`);
        console.log(`   Test Data Stations: ${stats.testDataStations}`);
        console.log(`   Production Stations: ${stats.productionStations}`);
        console.log('   Test Stations by Parish:');
        
        Object.entries(stats.testStationsByParish).forEach(([parish, count]) => {
          console.log(`     ${parish}: ${count} stations`);
        });
      }
      
    } else {
      console.error('❌ Extraction failed:', extractResponse.data.error);
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Extraction error:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Run the extraction
extract2024PollingStations();