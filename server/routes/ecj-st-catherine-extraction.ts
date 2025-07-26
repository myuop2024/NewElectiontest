import { Router } from 'express';
import { authenticateToken } from '../lib/middleware';
import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';

const router = Router();

// ECJ Document URLs for St. Catherine extraction
const ECJ_DOCUMENTS = {
  mainDocument: 'https://ecj.com.jm/wp-content/uploads/2024/05/2024LocalGovernmentSummaryResults.pdf',
  portmoreDocument: 'https://ecj.com.jm/wp-content/uploads/2024/03/PortmoreCityMunicipalityElection2024-Summary.pdf',
  finalCount: 'https://ecj.com.jm/wp-content/uploads/2024/05/2024LocalGovernmentFinalCount.pdf',
  candidateListing: 'https://ecj.com.jm/wp-content/uploads/2024/02/CandidateListingLocalGovernment2024.pdf'
};

async function downloadPDF(url: string, documentName: string): Promise<Buffer | null> {
  console.log(`[ST. CATHERINE EXTRACTION] Downloading ${documentName}...`);
  
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    console.log(`[ST. CATHERINE EXTRACTION] Downloaded ${documentName} (${response.data.length} bytes)`);
    return Buffer.from(response.data);
    
  } catch (error) {
    console.error(`[ST. CATHERINE EXTRACTION] Download error for ${documentName}:`, error);
    return null;
  }
}

async function extractStCatherineWithAI(pdfContent: Buffer, documentName: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }
  
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  
  const prompt = `
Analyze this ECJ (Electoral Commission of Jamaica) 2024 election document and extract ALL polling station locations specifically for ST. CATHERINE parish.

CRITICAL REQUIREMENTS:
1. Extract EVERY polling station name mentioned for St. Catherine
2. Include exact addresses or location details
3. Look for areas like: Spanish Town, Portmore, Old Harbour, Bog Walk, Ewarton, Linstead, Gregory Park, Waterford
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
    console.log(`[ST. CATHERINE EXTRACTION] AI analyzing ${documentName}...`);
    
    const result = await model.generateContent([
      { text: prompt },
      {
        inlineData: {
          mimeType: 'application/pdf',
          data: pdfContent.toString('base64')
        }
      }
    ]);
    
    const response = await result.response;
    const text = response.text();
    
    // Extract JSON from response
    const jsonMatch = text.match(/\[[\s\S]*?\]/);
    if (jsonMatch) {
      const stationsData = JSON.parse(jsonMatch[0]);
      console.log(`[ST. CATHERINE EXTRACTION] Found ${stationsData.length} stations in ${documentName}`);
      return stationsData;
    }
    
    console.log(`[ST. CATHERINE EXTRACTION] No JSON found in ${documentName}`);
    return [];
    
  } catch (error) {
    console.error(`[ST. CATHERINE EXTRACTION] AI error for ${documentName}:`, error);
    return [];
  }
}

// Extract authentic St. Catherine polling stations from ECJ documents
router.post('/extract-st-catherine-authentic', authenticateToken, async (req, res) => {
  try {
    console.log('[ST. CATHERINE EXTRACTION] Starting authentic extraction from ECJ documents...');
    
    const allStations: any[] = [];
    
    // Process each ECJ document
    for (const [key, url] of Object.entries(ECJ_DOCUMENTS)) {
      const documentName = key.replace(/([A-Z])/g, ' $1').trim();
      const pdfContent = await downloadPDF(url, documentName);
      
      if (pdfContent) {
        const stations = await extractStCatherineWithAI(pdfContent, documentName);
        allStations.push(...stations);
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Remove duplicates
    const uniqueStations = [];
    const seen = new Set();
    
    for (const station of allStations) {
      const key = `${station.name?.toLowerCase().trim()}_${station.address?.toLowerCase().trim() || ''}`;
      if (!seen.has(key) && station.name) {
        seen.add(key);
        uniqueStations.push(station);
      }
    }
    
    // Group by area for summary
    const areaGroups: { [key: string]: number } = {};
    uniqueStations.forEach(station => {
      const area = station.area || 'Unknown';
      areaGroups[area] = (areaGroups[area] || 0) + 1;
    });
    
    console.log(`[ST. CATHERINE EXTRACTION] Extracted ${uniqueStations.length} unique authentic St. Catherine stations`);
    console.log('[ST. CATHERINE EXTRACTION] By area:', areaGroups);
    
    res.json({
      success: true,
      message: `Successfully extracted ${uniqueStations.length} authentic St. Catherine polling stations`,
      data: {
        totalStations: uniqueStations.length,
        duplicatesRemoved: allStations.length - uniqueStations.length,
        stationsByArea: areaGroups,
        stations: uniqueStations
      }
    });
    
  } catch (error) {
    console.error('[ST. CATHERINE EXTRACTION] Error:', error);
    res.status(500).json({
      error: 'Failed to extract St. Catherine stations',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get St. Catherine extraction status
router.get('/st-catherine-status', authenticateToken, async (req, res) => {
  try {
    // This would check database for St. Catherine stations
    res.json({
      success: true,
      message: 'St. Catherine extraction status',
      documentsAvailable: Object.keys(ECJ_DOCUMENTS),
      extractionReady: !!process.env.GEMINI_API_KEY
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get status' });
  }
});

export default router;