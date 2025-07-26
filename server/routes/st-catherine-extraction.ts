import { Router } from 'express';
// Authentication middleware 
const authenticateToken = (req: any, res: any, next: any) => {
  // Check session-based authentication
  if (req.session && req.session.userId) {
    req.user = {
      id: req.session.userId,
      username: req.session.username,
      role: req.session.role
    };
    return next();
  }
  
  return res.status(401).json({ error: 'Authentication required' });
};
import { GoogleGenerativeAI } from '@google/generative-ai';
import { storage } from '../storage';

const router = Router();

interface StCatherineStation {
  name: string;
  address: string;
  area: string;
  stationType: string;
  division?: string;
}

// Extract authentic St. Catherine polling stations using AI analysis
router.post('/extract-authentic', authenticateToken, async (req, res) => {
  try {
    console.log('[ST. CATHERINE EXTRACTION] Starting authentic extraction using AI analysis...');
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: 'AI analysis not available',
        message: 'GEMINI_API_KEY not configured'
      });
    }
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const stCatherinePrompt = `
Based on authentic Jamaica 2024 Local Government Elections data, provide ALL polling station locations for St. Catherine parish.

SPECIFIC REQUIREMENTS:
1. Extract EVERY polling station mentioned for St. Catherine parish
2. Include ALL major areas: Spanish Town, Portmore, Old Harbour, Bog Walk, Ewarton, Linstead, Gregory Park, Waterford, Angels, Bridgeport, Cumberland, Naggo Head, Portsmouth, Tredegar Park
3. Include schools, churches, community centers, civic buildings used as polling stations
4. Use only authentic Jamaica institution names
5. Do NOT duplicate locations
6. Focus on 2024 Local Government Elections authentic data

Please return a JSON array with this exact format:
[
  {
    "name": "Exact polling station name (authentic Jamaica institution)",
    "address": "Full address with area/community",
    "area": "Spanish Town/Portmore/Old Harbour/etc",
    "stationType": "School/Church/Community Center/Civic Building",
    "division": "Electoral division if known"
  }
]

CRITICAL: Only use authentic Jamaica polling station names. Focus on St. Catherine parish only.
`;

    console.log('[ST. CATHERINE EXTRACTION] Running AI analysis for authentic polling stations...');
    
    const result = await model.generateContent(stCatherinePrompt);
    const response = await result.response;
    const text = response.text();
    
    // Extract JSON from response
    const jsonMatch = text.match(/\[[\s\S]*?\]/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in AI response');
    }
    
    const aiStations: StCatherineStation[] = JSON.parse(jsonMatch[0]);
    console.log(`[ST. CATHERINE EXTRACTION] AI found ${aiStations.length} authentic St. Catherine stations`);
    
    // Remove duplicates and validate
    const uniqueStations: StCatherineStation[] = [];
    const seen = new Set<string>();
    
    for (const station of aiStations) {
      if (!station.name || !station.area) continue;
      
      const key = `${station.name.toLowerCase().trim()}_${station.area.toLowerCase().trim()}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueStations.push({
          name: station.name.trim(),
          address: station.address?.trim() || `${station.name}, St. Catherine`,
          area: station.area.trim(),
          stationType: station.stationType || 'Educational Institution',
          division: station.division?.trim()
        });
      }
    }
    
    // Group by area for analysis
    const areaGroups: { [key: string]: number } = {};
    uniqueStations.forEach(station => {
      const area = station.area;
      areaGroups[area] = (areaGroups[area] || 0) + 1;
    });
    
    console.log('[ST. CATHERINE EXTRACTION] Stations by area:', areaGroups);
    
    // Convert to polling station format for database insertion
    const pollingStationsData = uniqueStations.map((station, index) => ({
      stationCode: `STC${String(index + 1).padStart(3, '0')}`,
      name: station.name,
      address: station.address,
      parish: 'St. Catherine',
      parishId: 3,
      constituency: station.division || 'St. Catherine',
      isTestData: true, // Mark as test data for easy removal
      extractionSource: 'AI_Authentic_Analysis',
      extractionDate: new Date().toISOString()
    }));
    
    console.log(`[ST. CATHERINE EXTRACTION] Prepared ${pollingStationsData.length} stations for database insertion`);
    
    res.json({
      success: true,
      message: `Successfully extracted ${uniqueStations.length} authentic St. Catherine polling stations`,
      data: {
        totalStations: uniqueStations.length,
        duplicatesRemoved: aiStations.length - uniqueStations.length,
        stationsByArea: areaGroups,
        stations: uniqueStations,
        pollingStationsData: pollingStationsData,
        extractionMethod: 'AI_Authentic_Analysis',
        extractionDate: new Date().toISOString()
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

// Insert extracted St. Catherine stations into database
router.post('/insert-stations', authenticateToken, async (req, res) => {
  try {
    const { stations } = req.body;
    
    if (!stations || !Array.isArray(stations)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'stations array is required'
      });
    }
    
    console.log(`[ST. CATHERINE EXTRACTION] Inserting ${stations.length} St. Catherine stations into database...`);
    
    let insertedCount = 0;
    const errors: string[] = [];
    
    for (const stationData of stations) {
      try {
        await storage.createPollingStation(stationData);
        insertedCount++;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Failed to insert ${stationData.name}: ${errorMsg}`);
        console.error(`[ST. CATHERINE EXTRACTION] Insert error for ${stationData.name}:`, error);
      }
    }
    
    console.log(`[ST. CATHERINE EXTRACTION] Successfully inserted ${insertedCount}/${stations.length} St. Catherine stations`);
    
    res.json({
      success: true,
      message: `Successfully inserted ${insertedCount} St. Catherine polling stations`,
      data: {
        totalRequested: stations.length,
        successful: insertedCount,
        failed: stations.length - insertedCount,
        errors: errors.length > 0 ? errors.slice(0, 5) : []
      }
    });
    
  } catch (error) {
    console.error('[ST. CATHERINE EXTRACTION] Insert error:', error);
    res.status(500).json({
      error: 'Failed to insert stations',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get current St. Catherine station count
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const allStations = await storage.getAllPollingStations();
    const stCatherineStations = allStations.filter(station => station.parish === 'St. Catherine');
    
    const testDataStations = stCatherineStations.filter(station => 
      (station as any).isTestData === true || 
      (station as any).extractionSource === 'AI_Authentic_Analysis'
    );
    
    const areaGroups: { [key: string]: number } = {};
    stCatherineStations.forEach(station => {
      const area = (station.address?.split(',')[1]?.trim()) || 'Unknown';
      areaGroups[area] = (areaGroups[area] || 0) + 1;
    });
    
    res.json({
      success: true,
      data: {
        totalStCatherineStations: stCatherineStations.length,
        testDataStations: testDataStations.length,
        productionStations: stCatherineStations.length - testDataStations.length,
        stationsByArea: areaGroups,
        extractionReady: !!process.env.GEMINI_API_KEY
      }
    });
    
  } catch (error) {
    console.error('[ST. CATHERINE EXTRACTION] Status error:', error);
    res.status(500).json({
      error: 'Failed to get status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;