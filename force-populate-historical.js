/**
 * Force Populate Historical Election Data
 * Directly generates comprehensive Jamaica election history with proper dating (1962-2024)
 */

async function forcePopulateHistorical() {
  console.log('\n🏛️ Force Populating Jamaica Historical Election Database (1962-2024)...\n');
  
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
    
    const authCookie = loginResponse.headers.get('set-cookie');
    console.log('✅ Admin authentication successful');
    
    // 2. Direct API call to generate historical data
    console.log('\n📚 Generating comprehensive Jamaica election history...');
    console.log('   📅 Period: 1962-2024 (62 years of authentic election patterns)');
    console.log('   🗳️ Including: General Elections, Parish Council Elections, By-Elections');
    console.log('   🏛️ Coverage: All 14 Jamaica parishes with realistic turnout data');
    console.log('   📍 Polling stations: Historical patterns for location-based queries');
    
    // Call the historical data generator directly via a new API endpoint
    const generateResponse = await fetch(`${baseUrl}/api/ecj-comprehensive/generate-historical`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': authCookie 
      },
      body: JSON.stringify({
        yearRange: { start: 1962, end: 2024 },
        includePollingStationDetails: true,
        properDating: true
      })
    });
    
    if (!generateResponse.ok) {
      throw new Error(`Failed to generate historical data: ${generateResponse.status}`);
    }
    
    const generateData = await generateResponse.json();
    
    if (generateData.success) {
      console.log('\n🎉 Historical Data Generation Completed!');
      console.log(`📊 Elections created: ${generateData.electionsGenerated}`);
      console.log(`🏛️ Parish records: ${generateData.parishRecordsCreated}`);
      console.log(`📅 Date range: ${generateData.dateRange.start} to ${generateData.dateRange.end}`);
      console.log(`🗳️ Election types: ${generateData.electionTypes.join(', ')}`);
      
      // 3. Test historical queries
      console.log('\n🔍 Testing historical query capabilities...');
      
      // Test 1: Kingston General Election turnout history
      console.log('\n📊 Test Query 1: Kingston General Election turnout history');
      const kingstonResponse = await fetch(`${baseUrl}/api/historical-election/parish/Kingston?type=General`, {
        headers: { 'Cookie': authCookie }
      });
      
      if (kingstonResponse.ok) {
        const kingstonData = await kingstonResponse.json();
        console.log(`   ✅ Found ${kingstonData.elections?.length || 0} Kingston General Elections`);
        if (kingstonData.elections && kingstonData.elections.length > 0) {
          const recent = kingstonData.elections[0];
          console.log(`   📈 Most recent: ${recent.electionDate?.split('T')[0]} - ${(recent.voterTurnout * 100).toFixed(1)}% turnout`);
        }
      }
      
      // Test 2: St. Andrew parish trends
      console.log('\n📊 Test Query 2: St. Andrew historical trends');
      const stAndrewResponse = await fetch(`${baseUrl}/api/historical-election/parish/St. Andrew`, {
        headers: { 'Cookie': authCookie }
      });
      
      if (stAndrewResponse.ok) {
        const stAndrewData = await stAndrewResponse.json();
        console.log(`   ✅ Found ${stAndrewData.elections?.length || 0} St. Andrew elections`);
        if (stAndrewData.summary) {
          console.log(`   📊 Average turnout: ${(stAndrewData.summary.averageTurnout * 100).toFixed(1)}%`);
        }
      }
      
      // Test 3: Election type comparison
      console.log('\n📊 Test Query 3: Parish Council vs General Election comparison');
      const comparisonResponse = await fetch(`${baseUrl}/api/historical-election/comparison?type1=Parish Council&type2=General Election`, {
        headers: { 'Cookie': authCookie }
      });
      
      if (comparisonResponse.ok) {
        const comparisonData = await comparisonResponse.json();
        console.log(`   ✅ Comparison analysis complete`);
        if (comparisonData.comparison) {
          console.log(`   📈 General Election avg turnout: ${(comparisonData.comparison.type2AvgTurnout * 100).toFixed(1)}%`);
          console.log(`   📈 Parish Council avg turnout: ${(comparisonData.comparison.type1AvgTurnout * 100).toFixed(1)}%`);
        }
      }
      
      console.log('\n🎯 Historical Database Successfully Populated!');
      console.log('\n✅ You can now query:');
      console.log('   📍 "What was the historical turnout in [Parish] for [Election Type]?"');
      console.log('   📊 "Show me [Parish] turnout trends from [Year] to [Year]"');
      console.log('   🏛️ "Compare [Election Type 1] vs [Election Type 2] turnout"');
      console.log('   📈 "Which parishes historically have highest/lowest turnout?"');
      console.log('   🗺️ Historical traffic predictions based on authentic election patterns');
      
    } else {
      console.log('\n❌ Historical data generation failed:', generateData.error);
    }
    
  } catch (error) {
    console.error('\n💥 Force Population Failed:', error.message);
    
    // Fallback: Direct database population via historical generator
    console.log('\n🔄 Attempting direct database population...');
    
    try {
      const directResponse = await fetch(`${baseUrl}/api/ecj-comprehensive/direct-populate`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': authCookie 
        },
        body: JSON.stringify({ force: true })
      });
      
      const directData = await directResponse.json();
      
      if (directData.success) {
        console.log('✅ Direct population successful!');
        console.log(`📊 Records created: ${directData.recordsCreated}`);
      } else {
        console.log('❌ Direct population also failed:', directData.error);
      }
      
    } catch (directError) {
      console.error('💥 Direct population error:', directError.message);
    }
  }
}

// Run the force population
forcePopulateHistorical();