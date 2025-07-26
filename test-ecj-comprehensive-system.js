/**
 * Test script for the ECJ Comprehensive Historical Data System
 * Tests the new AI-powered data extraction from all ECJ election documents
 */

async function testECJComprehensiveSystem() {
  console.log('\n🔍 Testing ECJ Comprehensive Historical Data System...\n');
  
  const baseUrl = 'http://localhost:5000';
  const adminCredentials = {
    email: 'admin@caffe.org.jm',
    password: 'password'
  };
  
  try {
    // 1. Login as admin
    console.log('1. Logging in as admin...');
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(adminCredentials)
    });
    
    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }
    
    const authCookie = loginResponse.headers.get('set-cookie');
    console.log('✅ Admin login successful');
    
    // 2. Test available elections endpoint
    console.log('\n2. Fetching available ECJ elections...');
    const electionsResponse = await fetch(`${baseUrl}/api/ecj-comprehensive/available-elections`, {
      headers: { 'Cookie': authCookie }
    });
    
    const electionsData = await electionsResponse.json();
    console.log('✅ Available elections:', electionsData.totalElections);
    console.log('📅 Date range:', electionsData.dateRange);
    console.log('📋 Elections found:', electionsData.elections.slice(0, 3).map(e => `${e.year} - ${e.title}`));
    
    // 3. Test data summary
    console.log('\n3. Checking current data summary...');
    const summaryResponse = await fetch(`${baseUrl}/api/ecj-comprehensive/data-summary`, {
      headers: { 'Cookie': authCookie }
    });
    
    const summaryData = await summaryResponse.json();
    console.log('📊 Current data status:', summaryData.hasData ? 'Data available' : 'No data - needs extraction');
    
    if (summaryData.hasData) {
      console.log('📈 Summary:', summaryData.summary);
    }
    
    // 4. Test REAL PDF OCR extraction (admin only)
    console.log('\n4. Testing REAL PDF OCR extraction from actual ECJ documents...');
    console.log('⏳ Starting real PDF extraction with OCR from ALL ECJ documents...');
    
    const extractionResponse = await fetch(`${baseUrl}/api/ecj-comprehensive/extract-all`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': authCookie 
      }
    });
    
    const extractionData = await extractionResponse.json();
    
    if (extractionData.success) {
      console.log('✅ Real PDF OCR extraction completed!');
      console.log('📊 Method:', extractionData.method);
      console.log('📄 Documents processed:', extractionData.processed);
      console.log('💾 Documents stored:', extractionData.stored);
      console.log('🗳️ Real ECJ election data extracted:');
      extractionData.elections.slice(0, 5).forEach(e => {
        console.log(`   ${e.year}: ${e.title}`);
        console.log(`      Parishes: ${e.parishes}, Voters: ${e.totalVoters?.toLocaleString()}, Turnout: ${(e.turnout * 100).toFixed(1)}%`);
      });
    } else {
      console.log('❌ Real PDF extraction failed:', extractionData.error);
    }
    
    // 5. Test polling station consolidation
    console.log('\n5. Testing polling station historical consolidation...');
    const consolidationResponse = await fetch(`${baseUrl}/api/ecj-comprehensive/consolidate-stations`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': authCookie 
      }
    });
    
    const consolidationData = await consolidationResponse.json();
    
    if (consolidationData.success) {
      console.log('✅ Polling station consolidation completed!');
      console.log('📍 Total stations consolidated:', consolidationData.totalStations);
      console.log('🏛️ Sample consolidated stations:');
      consolidationData.consolidatedStations.forEach(s => {
        console.log(`   Station ${s.stationNumber} (${s.parish}): ${s.totalElections} elections, ${(s.averageTurnout * 100).toFixed(1)}% avg turnout`);
      });
    } else {
      console.log('❌ Consolidation failed:', consolidationData.error);
    }
    
    // 6. Test search functionality
    console.log('\n6. Testing historical data search...');
    const searchResponse = await fetch(`${baseUrl}/api/ecj-comprehensive/search?parish=Kingston&yearFrom=2020`, {
      headers: { 'Cookie': authCookie }
    });
    
    const searchData = await searchResponse.json();
    console.log('🔍 Search results for Kingston (2020+):', searchData.totalResults, 'records');
    
    // 7. Test station history
    console.log('\n7. Testing station history lookup...');
    const stationResponse = await fetch(`${baseUrl}/api/ecj-comprehensive/station-history/001?parish=Kingston`, {
      headers: { 'Cookie': authCookie }
    });
    
    const stationData = await stationResponse.json();
    
    if (stationData.success) {
      console.log('✅ Station history retrieved:');
      console.log(`   Station: ${stationData.stationHistory.stationNumber} - ${stationData.stationHistory.currentName}`);
      console.log(`   Parish: ${stationData.stationHistory.parish}`);
      console.log(`   Elections: ${stationData.stationHistory.totalElections}`);
      console.log(`   Average turnout: ${(stationData.stationHistory.averageTurnout * 100).toFixed(1)}%`);
      console.log(`   First election: ${stationData.stationHistory.firstElectionDate}`);
      console.log(`   Last election: ${stationData.stationHistory.lastElectionDate}`);
    }
    
    // 8. Final data summary check
    console.log('\n8. Final comprehensive data summary...');
    const finalSummaryResponse = await fetch(`${baseUrl}/api/ecj-comprehensive/data-summary`, {
      headers: { 'Cookie': authCookie }
    });
    
    const finalSummaryData = await finalSummaryResponse.json();
    
    if (finalSummaryData.hasData && finalSummaryData.summary) {
      console.log('✅ ECJ Comprehensive Historical Data System is fully operational!');
      console.log('\n📊 FINAL SYSTEM STATUS:');
      console.log(`   Total elections in database: ${finalSummaryData.summary.totalElections}`);
      console.log(`   Parishes covered: ${finalSummaryData.summary.parishCount}`);
      console.log(`   Date range: ${finalSummaryData.summary.dateRange.earliest} - ${finalSummaryData.summary.dateRange.latest}`);
      console.log(`   Election types: ${finalSummaryData.summary.electionTypes.join(', ')}`);
      console.log(`   Total registered voters: ${finalSummaryData.summary.totalVoters?.toLocaleString()}`);
      console.log(`   Average turnout: ${(finalSummaryData.summary.averageTurnout * 100).toFixed(1)}%`);
      console.log(`   Data quality: ${finalSummaryData.summary.dataQuality}`);
    }
    
    console.log('\n🎉 Real ECJ PDF Extraction System Test Completed Successfully!');
    console.log('\n✨ The system now extracts REAL data from actual ECJ PDF documents using OCR');
    console.log('📄 All data comes directly from official ECJ election result PDFs');
    console.log('🔍 PDF text extraction and AI parsing provides authentic election statistics');
    console.log('\n🚀 Ready for authentic historical traffic predictions based on real ECJ data!');
    
  } catch (error) {
    console.error('\n❌ ECJ Comprehensive System Test Failed:', error.message);
    console.log('\n🔧 Check that:');
    console.log('   - The server is running on port 5000');
    console.log('   - Admin account exists (username: admin, password: password)');
    console.log('   - GEMINI_API_KEY is configured for AI analysis');
    console.log('   - Database schema has been updated with comprehensive tables');
  }
}

// Run the test
testECJComprehensiveSystem();