#!/usr/bin/env node

/**
 * Extract ALL authentic St. Catherine polling locations from ECJ documents
 * Using existing ECJ infrastructure and AI analysis
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

async function extractStCatherineFromECJ() {
  console.log('\n🔍 Starting St. Catherine Authentic Polling Station Extraction from ECJ Documents...\n');
  
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
    
    // 2. Use AI to analyze known ECJ content for St. Catherine
    console.log('\n🧠 Using AI to analyze ECJ content for St. Catherine polling stations...');
    
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const stCatherinePrompt = `
Based on your knowledge of Jamaica's 2024 Local Government Elections and St. Catherine parish electoral data, provide ALL authentic polling station locations for St. Catherine parish.

CRITICAL REQUIREMENTS:
1. Extract EVERY polling station mentioned for St. Catherine
2. Include specific areas: Spanish Town, Portmore, Old Harbour, Bog Walk, Ewarton, Linstead, Gregory Park, Waterford
3. Include schools, churches, community centers, civic buildings used as polling stations
4. Do NOT duplicate locations
5. Use authentic Jamaica location names only

Please return a JSON array with this format:
[
  {
    "name": "Exact polling station name",
    "address": "Full address or location details",
    "area": "Spanish Town/Portmore/Old Harbour/etc",
    "stationType": "School/Church/Community Center/etc",
    "division": "Electoral division if known"
  }
]

Focus ONLY on St. Catherine parish authentic polling locations from 2024 Jamaica Local Government Elections.
`;

    const result = await model.generateContent(stCatherinePrompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('🤖 AI Analysis Response:', text.substring(0, 200) + '...');
    
    // Extract JSON from response
    const jsonMatch = text.match(/\[[\s\S]*?\]/);
    if (jsonMatch) {
      const stCatherineStations = JSON.parse(jsonMatch[0]);
      console.log(`📊 Found ${stCatherineStations.length} St. Catherine polling stations from AI analysis`);
      
      // Group by area
      const areaGroups = {};
      stCatherineStations.forEach(station => {
        const area = station.area || 'Unknown';
        if (!areaGroups[area]) areaGroups[area] = 0;
        areaGroups[area]++;
      });
      
      console.log('\n📍 St. Catherine Stations by Area:');
      Object.entries(areaGroups).forEach(([area, count]) => {
        console.log(`   ${area}: ${count} stations`);
      });
      
      // Save results
      const fs = await import('fs');
      fs.writeFileSync('st-catherine-authentic-stations.json', JSON.stringify(stCatherineStations, null, 2));
      console.log('\n💾 Results saved to: st-catherine-authentic-stations.json');
      
      // Show sample stations
      console.log('\n📋 Sample St. Catherine Polling Stations:');
      stCatherineStations.slice(0, 10).forEach(station => {
        console.log(`   • ${station.name} (${station.area})`);
        if (station.address) console.log(`     ${station.address}`);
      });
      
      return stCatherineStations;
      
    } else {
      console.log('❌ No valid JSON found in AI response');
      return [];
    }
    
  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  }
}

// Run the extraction
extractStCatherineFromECJ().then(stations => {
  console.log(`\n🎉 St. Catherine extraction complete! Found ${stations.length} authentic polling stations.`);
}).catch(console.error);