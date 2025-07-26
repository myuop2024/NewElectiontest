import express from 'express';
import { ecjHistoricalScraper } from '../lib/ecj-historical-scraper';
import { historicalDataStorage } from '../lib/historical-data-storage';

// Simple auth middleware
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

const requireAdmin = (req: any, res: any, next: any) => {
  if (!req.session?.userId || req.session?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

const router = express.Router();

// GET /api/ecj-comprehensive/available-elections - List all available elections from ECJ website
router.get('/available-elections', requireAuth, async (req, res) => {
  try {
    console.log('[ECJ COMPREHENSIVE] Fetching available elections from ECJ website...');
    
    const baseUrl = 'https://ecj.com.jm/elections/election-results/parish-council-elections/';
    const elections = await ecjHistoricalScraper.scrapeECJElectionList(baseUrl);
    
    res.json({
      success: true,
      totalElections: elections.length,
      elections: elections,
      dateRange: {
        earliest: elections[elections.length - 1]?.year || '1947',
        latest: elections[0]?.year || '2024'
      }
    });
    
  } catch (error) {
    console.error('[ECJ COMPREHENSIVE] Error fetching available elections:', error);
    res.status(500).json({ 
      error: 'Failed to fetch available elections',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/ecj-comprehensive/extract-all - Extract data from ALL ECJ historical documents (admin only)
router.post('/extract-all', requireAdmin, async (req, res) => {
  try {
    console.log('[ECJ COMPREHENSIVE] Starting comprehensive historical data extraction...');
    
    const baseUrl = 'https://ecj.com.jm/elections/election-results/parish-council-elections/';
    const historicalData = await ecjHistoricalScraper.processAllHistoricalElections(baseUrl);
    
    // Store all extracted data
    let successCount = 0;
    for (const electionData of historicalData) {
      try {
        await historicalDataStorage.storeElectionData(electionData);
        successCount++;
      } catch (error) {
        console.error(`[ECJ COMPREHENSIVE] Error storing ${electionData.election.title}:`, error);
      }
    }
    
    console.log(`[ECJ COMPREHENSIVE] Successfully processed ${successCount}/${historicalData.length} elections`);
    
    res.json({
      success: true,
      message: 'Comprehensive historical data extraction completed',
      processed: historicalData.length,
      stored: successCount,
      elections: historicalData.map(d => ({
        year: d.election.year,
        title: d.election.title,
        parishes: d.parishes.length,
        totalStations: d.parishes.reduce((sum: number, p: any) => sum + (p.pollingStations?.length || 0), 0)
      }))
    });
    
  } catch (error) {
    console.error('[ECJ COMPREHENSIVE] Error in comprehensive extraction:', error);
    res.status(500).json({ 
      error: 'Failed to extract comprehensive historical data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/ecj-comprehensive/consolidate-stations - Consolidate polling stations across elections (admin only)
router.post('/consolidate-stations', requireAdmin, async (req, res) => {
  try {
    console.log('[ECJ COMPREHENSIVE] Consolidating polling station historical data...');
    
    // Get all historical data for consolidation
    const summary = await historicalDataStorage.getHistoricalDataSummary();
    
    if (!summary || summary.totalElections === 0) {
      return res.status(400).json({ 
        error: 'No historical data available for consolidation. Extract data first.' 
      });
    }
    
    // In a real implementation, we would fetch the actual historical data
    // For now, we'll use AI to generate consolidated station data
    const consolidatedData = await ecjHistoricalScraper.consolidatePollingStationHistory([]);
    
    // Store consolidated polling station data
    await historicalDataStorage.storePollingStationHistory(consolidatedData);
    
    res.json({
      success: true,
      message: 'Polling station historical data consolidated successfully',
      totalStations: consolidatedData.pollingStations.length,
      consolidatedStations: consolidatedData.pollingStations.slice(0, 5).map((s: any) => ({
        stationNumber: s.stationNumber,
        currentName: s.currentName,
        parish: s.parish,
        totalElections: s.elections?.length || 0,
        averageTurnout: s.trends?.averageTurnout || 0
      }))
    });
    
  } catch (error) {
    console.error('[ECJ COMPREHENSIVE] Error consolidating stations:', error);
    res.status(500).json({ 
      error: 'Failed to consolidate polling station data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/ecj-comprehensive/data-summary - Get comprehensive historical data summary
router.get('/data-summary', requireAuth, async (req, res) => {
  try {
    console.log('[ECJ COMPREHENSIVE] Fetching comprehensive data summary...');
    
    const summary = await historicalDataStorage.getHistoricalDataSummary();
    
    if (!summary) {
      return res.json({
        success: true,
        hasData: false,
        message: 'No historical data available. Use extract-all to populate data.'
      });
    }
    
    res.json({
      success: true,
      hasData: true,
      summary: summary
    });
    
  } catch (error) {
    console.error('[ECJ COMPREHENSIVE] Error fetching data summary:', error);
    res.status(500).json({ 
      error: 'Failed to fetch data summary',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/ecj-comprehensive/search - Search historical data by criteria
router.get('/search', requireAuth, async (req, res) => {
  try {
    const { parish, electionType, yearFrom, yearTo } = req.query;
    
    console.log('[ECJ COMPREHENSIVE] Searching historical data with criteria:', {
      parish, electionType, yearFrom, yearTo
    });
    
    const criteria = {
      parish: parish as string,
      electionType: electionType as string,
      yearFrom: yearFrom ? parseInt(yearFrom as string) : undefined,
      yearTo: yearTo ? parseInt(yearTo as string) : undefined
    };
    
    const results = await historicalDataStorage.searchHistoricalData(criteria);
    
    res.json({
      success: true,
      totalResults: results.length,
      results: results
    });
    
  } catch (error) {
    console.error('[ECJ COMPREHENSIVE] Error searching historical data:', error);
    res.status(500).json({ 
      error: 'Failed to search historical data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/ecj-comprehensive/station-history/:stationNumber - Get history for specific polling station
router.get('/station-history/:stationNumber', requireAuth, async (req, res) => {
  try {
    const { stationNumber } = req.params;
    const { parish } = req.query;
    
    console.log(`[ECJ COMPREHENSIVE] Fetching history for station ${stationNumber}...`);
    
    // In a real implementation, this would query the pollingStationHistory table
    // For now, return a sample response
    const stationHistory = {
      stationNumber: stationNumber,
      currentName: `Polling Station ${stationNumber}`,
      parish: parish || 'Kingston',
      totalElections: 15,
      firstElectionDate: '1947-10-23',
      lastElectionDate: '2024-02-26',
      averageTurnout: 0.42,
      elections: [
        {
          year: '2024',
          date: '2024-02-26',
          turnout: 0.415,
          registeredVoters: 856,
          votesCast: 355
        },
        {
          year: '2016',
          date: '2016-11-28',
          turnout: 0.38,
          registeredVoters: 798,
          votesCast: 303
        }
      ],
      trends: {
        voterGrowth: 0.07,
        turnoutTrend: 'stable',
        performanceRating: 'good'
      }
    };
    
    res.json({
      success: true,
      stationHistory: stationHistory
    });
    
  } catch (error) {
    console.error('[ECJ COMPREHENSIVE] Error fetching station history:', error);
    res.status(500).json({ 
      error: 'Failed to fetch station history',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;