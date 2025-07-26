#!/usr/bin/env node

/**
 * Extract ALL authentic St. Catherine polling locations from ECJ PDF documents
 * Using Google Gemini AI for accurate document analysis
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

// ECJ Document URLs (from original requirements)
const ECJ_DOCUMENTS = {
  mainDocument: 'https://ecj.com.jm/wp-content/uploads/2024/05/2024LocalGovernmentSummaryResults.pdf',
  portmoreDocument: 'https://ecj.com.jm/wp-content/uploads/2024/03/PortmoreCityMunicipalityElection2024-Summary.pdf',
  finalCount: 'https://ecj.com.jm/wp-content/uploads/2024/05/2024LocalGovernmentFinalCount.pdf',
  candidateListing: 'https://ecj.com.jm/wp-content/uploads/2024/02/CandidateListingLocalGovernment2024.pdf'
};

async function initializeAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is required');
  }
  
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
}

async function downloadAndAnalyzePDF(url, documentName) {
  console.log(`[ST. CATHERINE EXTRACTION] Downloading ${documentName}...`);
  
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    console.log(`[ST. CATHERINE EXTRACTION] Successfully downloaded ${documentName} (${response.data.length} bytes)`);
    return response.data;
    
  } catch (error) {
    console.error(`[ST. CATHERINE EXTRACTION] Error downloading ${documentName}:`, error.message);
    return null;
  }
}

async function extractStCatherineWithAI(model, pdfContent, documentName) {
  const prompt = `
Analyze this ECJ (Electoral Commission of Jamaica) 2024 election document and extract ALL polling station locations specifically for ST. CATHERINE parish.

CRITICAL REQUIREMENTS:
1. Extract EVERY polling station name mentioned for St. Catherine
2. Include exact addresses or location details
3. Look for areas like: Spanish Town, Portmore, Old Harbour, Bog Walk, Ewarton, Linstead
4. Extract both regular polling stations AND Portmore Municipality stations
5. Include schools, churches, community centers, civic buildings
6. Do NOT duplicate locations
7. Provide station codes if mentioned

Please return a JSON array with this format:
[
  {
    "name": "Exact station name from document",
    "address": "Full address or location details",
    "area": "Spanish Town/Portmore/Old Harbour/etc",
    "stationCode": "Station code if available",
    "stationType": "School/Church/Community Center/etc"
  }
]

Focus ONLY on St. Catherine parish. Be comprehensive and extract every single location mentioned.

Document: ${documentName}
`;

  try {
    console.log(`[ST. CATHERINE EXTRACTION] Analyzing ${documentName} with AI...`);
    
    const result = await model.generateContent([
      { text: prompt },
      {
        inlineData: {
          mimeType: 'application/pdf',
          data: Buffer.from(pdfContent).toString('base64')
        }
      }
    ]);
    
    const response = await result.response;
    const text = response.text();
    
    // Extract JSON from response
    const jsonMatch = text.match(/\[[\s\S]*?\]/);
    if (jsonMatch) {
      const stationsData = JSON.parse(jsonMatch[0]);
      console.log(`[ST. CATHERINE EXTRACTION] Found ${stationsData.length} St. Catherine stations in ${documentName}`);
      return stationsData;
    }
    
    console.log(`[ST. CATHERINE EXTRACTION] No valid JSON found in ${documentName} response`);
    return [];
    
  } catch (error) {
    console.error(`[ST. CATHERINE EXTRACTION] AI analysis error for ${documentName}:`, error.message);
    return [];
  }
}

async function removeDuplicates(allStations) {
  const unique = [];
  const seen = new Set();
  
  for (const station of allStations) {
    const key = `${station.name.toLowerCase().trim()}_${station.address?.toLowerCase().trim() || ''}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(station);
    }
  }
  
  console.log(`[ST. CATHERINE EXTRACTION] Removed ${allStations.length - unique.length} duplicates, ${unique.length} unique stations remain`);
  return unique;
}

async function main() {
  try {
    console.log('[ST. CATHERINE EXTRACTION] Starting authentic ECJ document analysis...');
    
    const model = await initializeAI();
    const allStCatherineStations = [];
    
    // Process each ECJ document
    for (const [key, url] of Object.entries(ECJ_DOCUMENTS)) {
      const documentName = key.replace(/([A-Z])/g, ' $1').trim();
      const pdfContent = await downloadAndAnalyzePDF(url, documentName);
      
      if (pdfContent) {
        const stations = await extractStCatherineWithAI(model, pdfContent, documentName);
        allStCatherineStations.push(...stations);
      }
      
      // Add delay between requests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Remove duplicates
    const uniqueStations = await removeDuplicates(allStCatherineStations);
    
    // Save results
    const outputFile = 'st-catherine-authentic-stations.json';
    fs.writeFileSync(outputFile, JSON.stringify(uniqueStations, null, 2));
    
    console.log(`[ST. CATHERINE EXTRACTION] COMPLETE! Extracted ${uniqueStations.length} authentic St. Catherine polling stations`);
    console.log(`[ST. CATHERINE EXTRACTION] Results saved to: ${outputFile}`);
    
    // Display summary by area
    const areaGroups = {};
    uniqueStations.forEach(station => {
      const area = station.area || 'Unknown';
      if (!areaGroups[area]) areaGroups[area] = 0;
      areaGroups[area]++;
    });
    
    console.log('\n[ST. CATHERINE EXTRACTION] Stations by area:');
    Object.entries(areaGroups).forEach(([area, count]) => {
      console.log(`  ${area}: ${count} stations`);
    });
    
    return uniqueStations;
    
  } catch (error) {
    console.error('[ST. CATHERINE EXTRACTION] Fatal error:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main as extractStCatherineAuthentic };