/**
 * Run ECJ PDF Extraction Script
 * Authenticates and runs the complete PDF extraction process
 */

async function runECJExtraction() {
  console.log('\n🚀 Starting Real ECJ PDF Extraction Process...\n');
  
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
    
    // 2. Check available documents
    console.log('\n📄 Discovering available ECJ PDF documents...');
    const documentsResponse = await fetch(`${baseUrl}/api/ecj-comprehensive/available-elections`, {
      headers: { 'Cookie': authCookie }
    });
    
    const documentsData = await documentsResponse.json();
    console.log(`📋 Found ${documentsData.totalDocuments} ECJ PDF documents`);
    console.log(`📅 Date range: ${documentsData.dateRange.earliest} - ${documentsData.dateRange.latest}`);
    
    if (documentsData.documents && documentsData.documents.length > 0) {
      console.log('\n📑 Sample documents to extract:');
      documentsData.documents.slice(0, 5).forEach(doc => {
        console.log(`   • ${doc.year}: ${doc.title} (${doc.type})`);
        if (doc.url) console.log(`     URL: ${doc.url}`);
      });
    }
    
    // 3. Run PDF extraction
    console.log('\n🔍 Starting comprehensive PDF extraction with OCR...');
    console.log('⏳ This may take several minutes as we download and process each PDF...');
    
    const extractionResponse = await fetch(`${baseUrl}/api/ecj-comprehensive/extract-all`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': authCookie 
      },
      body: JSON.stringify({})
    });
    
    if (!extractionResponse.ok) {
      const errorText = await extractionResponse.text();
      throw new Error(`Extraction failed (${extractionResponse.status}): ${errorText}`);
    }
    
    const extractionData = await extractionResponse.json();
    
    if (extractionData.success) {
      console.log('\n🎉 ECJ PDF Extraction Completed Successfully!');
      console.log(`📊 Method: ${extractionData.method}`);
      console.log(`📄 Documents processed: ${extractionData.processed}`);
      console.log(`💾 Documents stored: ${extractionData.stored}`);
      
      if (extractionData.elections && extractionData.elections.length > 0) {
        console.log('\n📈 Historical Election Data Extracted:');
        extractionData.elections.forEach(election => {
          const turnoutPercent = election.turnout ? (election.turnout * 100).toFixed(1) + '%' : 'N/A';
          const votersFormatted = election.totalVoters ? election.totalVoters.toLocaleString() : 'N/A';
          
          console.log(`\n   📊 ${election.year}: ${election.title}`);
          console.log(`      Parishes: ${election.parishes}`);
          console.log(`      Registered voters: ${votersFormatted}`);
          console.log(`      Total votes: ${election.totalVotes ? election.totalVotes.toLocaleString() : 'N/A'}`);
          console.log(`      Turnout: ${turnoutPercent}`);
        });
      }
      
      // 4. Verify data in database
      console.log('\n🔍 Verifying stored historical data...');
      const summaryResponse = await fetch(`${baseUrl}/api/ecj-comprehensive/data-summary`, {
        headers: { 'Cookie': authCookie }
      });
      
      const summaryData = await summaryResponse.json();
      
      if (summaryData.hasData && summaryData.summary) {
        console.log('\n✅ Historical Data Successfully Stored:');
        console.log(`   📋 Total elections: ${summaryData.summary.totalElections}`);
        console.log(`   🏛️ Parishes covered: ${summaryData.summary.parishCount}`);
        console.log(`   📅 Date range: ${summaryData.summary.dateRange.earliest} - ${summaryData.summary.dateRange.latest}`);
        console.log(`   🗳️ Election types: ${summaryData.summary.electionTypes.join(', ')}`);
        console.log(`   👥 Total voters: ${summaryData.summary.totalVoters ? summaryData.summary.totalVoters.toLocaleString() : 'N/A'}`);
        console.log(`   📊 Average turnout: ${(summaryData.summary.averageTurnout * 100).toFixed(1)}%`);
        console.log(`   ✅ Data quality: ${summaryData.summary.dataQuality}`);
      }
      
      console.log('\n🎯 Historical Polling Station Data Ready!');
      console.log('📍 You can now query historical turnout by:');
      console.log('   • Specific polling stations');
      console.log('   • Parish-level trends');
      console.log('   • Election type patterns');
      console.log('   • Date range analysis');
      console.log('\n🚀 Database is populated with authentic ECJ historical election data!');
      
    } else {
      console.log('\n❌ PDF extraction failed:', extractionData.error);
      console.log('💡 This may be due to:');
      console.log('   • Network connectivity issues');
      console.log('   • ECJ website access restrictions');
      console.log('   • PDF parsing errors');
      console.log('   • AI analysis rate limits');
    }
    
  } catch (error) {
    console.error('\n💥 ECJ Extraction Process Failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   • Verify server is running on port 5000');
    console.log('   • Check GEMINI_API_KEY is configured');
    console.log('   • Ensure admin account exists');
    console.log('   • Check internet connectivity');
  }
}

// Run the extraction
runECJExtraction();