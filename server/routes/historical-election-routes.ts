import { Router } from 'express';
import { historicalElectionService } from '../lib/historical-election-service';

// Authentication middleware
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  req.user = { id: req.session.userId };
  next();
};

const requireAdmin = (req: any, res: any, next: any) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  // Check if user has admin role (you may need to add role to session)
  if (req.session.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  req.user = { id: req.session.userId, role: req.session.role };
  next();
};

const router = Router();

/**
 * Historical Election Data API Routes
 * Manages authentic Jamaica election traffic patterns for AI predictions
 */

// GET /api/historical-election - Get all historical election data
router.get('/', requireAuth, async (req, res) => {
  try {
    console.log('[HISTORICAL API] Fetching all historical election data');
    const data = await historicalElectionService.getAllHistoricalData();
    res.json(data);
  } catch (error) {
    console.error('[HISTORICAL API] Error fetching historical data:', error);
    res.status(500).json({ error: 'Failed to fetch historical election data' });
  }
});

// GET /api/historical-election/parish/:parish - Get historical data by parish
router.get('/parish/:parish', requireAuth, async (req, res) => {
  try {
    const { parish } = req.params;
    console.log('[HISTORICAL API] Fetching historical data for parish:', parish);
    const data = await historicalElectionService.getHistoricalDataByParish(parish);
    res.json(data);
  } catch (error) {
    console.error('[HISTORICAL API] Error fetching parish historical data:', error);
    res.status(500).json({ error: 'Failed to fetch parish historical data' });
  }
});

// GET /api/historical-election/most-recent/:parish - Get most recent data for parish (for AI)
router.get('/most-recent/:parish', requireAuth, async (req, res) => {
  try {
    const { parish } = req.params;
    console.log('[HISTORICAL API] Fetching most recent data for parish:', parish);
    const data = await historicalElectionService.getMostRecentParishData(parish);
    res.json(data);
  } catch (error) {
    console.error('[HISTORICAL API] Error fetching recent parish data:', error);
    res.status(500).json({ error: 'Failed to fetch recent parish data' });
  }
});

// GET /api/historical-election/statistics - Get aggregate statistics
router.get('/statistics', requireAuth, async (req, res) => {
  try {
    console.log('[HISTORICAL API] Fetching historical statistics');
    const stats = await historicalElectionService.getHistoricalStatistics();
    res.json(stats);
  } catch (error) {
    console.error('[HISTORICAL API] Error fetching statistics:', error);
    res.status(500).json({ error: 'Failed to fetch historical statistics' });
  }
});

// POST /api/historical-election - Create new historical data (admin only)
router.post('/', requireAdmin, async (req, res) => {
  try {
    console.log('[HISTORICAL API] Creating new historical election data');
    const data = await historicalElectionService.createHistoricalData(req.body);
    res.status(201).json(data);
  } catch (error) {
    console.error('[HISTORICAL API] Error creating historical data:', error);
    res.status(500).json({ error: 'Failed to create historical data' });
  }
});

// PUT /api/historical-election/:id - Update historical data (admin only)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    console.log('[HISTORICAL API] Updating historical data ID:', id);
    const data = await historicalElectionService.updateHistoricalData(id, req.body);
    res.json(data);
  } catch (error) {
    console.error('[HISTORICAL API] Error updating historical data:', error);
    res.status(500).json({ error: 'Failed to update historical data' });
  }
});

// DELETE /api/historical-election/:id - Delete historical data (admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    console.log('[HISTORICAL API] Deleting historical data ID:', id);
    const success = await historicalElectionService.deleteHistoricalData(id);
    if (success) {
      res.json({ message: 'Historical data deleted successfully' });
    } else {
      res.status(404).json({ error: 'Historical data not found' });
    }
  } catch (error) {
    console.error('[HISTORICAL API] Error deleting historical data:', error);
    res.status(500).json({ error: 'Failed to delete historical data' });
  }
});

// POST /api/historical-election/initialize - Initialize comprehensive Jamaica data (admin only)
router.post('/initialize', requireAdmin, async (req, res) => {
  try {
    console.log('[HISTORICAL API] Initializing comprehensive Jamaica election data');
    await historicalElectionService.initializeJamaicaElectionData();
    res.json({ message: 'Jamaica election data initialized successfully' });
  } catch (error) {
    console.error('[HISTORICAL API] Error initializing Jamaica data:', error);
    res.status(500).json({ error: 'Failed to initialize Jamaica election data' });
  }
});

// POST /api/historical-election/process-ecj - Process official ECJ results (admin only)
router.post('/process-ecj', requireAdmin, async (req, res) => {
  try {
    const { ecjDataProcessor } = await import('../lib/ecj-data-processor');
    console.log('[HISTORICAL API] Processing official ECJ 2024 Local Government results');
    await ecjDataProcessor.processECJResults();
    res.json({ message: 'ECJ official results processed successfully' });
  } catch (error) {
    console.error('[HISTORICAL API] Error processing ECJ results:', error);
    res.status(500).json({ error: 'Failed to process ECJ results' });
  }
});

// GET /api/historical-election/ecj-statistics - Get ECJ official statistics
router.get('/ecj-statistics', requireAuth, async (req, res) => {
  try {
    const { ecjDataProcessor } = await import('../lib/ecj-data-processor');
    console.log('[HISTORICAL API] Fetching ECJ official statistics');
    const stats = ecjDataProcessor.getECJStatistics();
    res.json(stats);
  } catch (error) {
    console.error('[HISTORICAL API] Error fetching ECJ statistics:', error);
    res.status(500).json({ error: 'Failed to fetch ECJ statistics' });
  }
});

export default router;