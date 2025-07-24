import { Router } from 'express';
import { EnhancedTrafficService } from '../lib/enhanced-traffic-service';
import { enhancedTrafficStorage } from '../lib/enhanced-traffic-storage';
import { storage } from '../storage';

// Authentication middleware
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  req.user = { id: req.session.userId };
  next();
};

const router = Router();

// Initialize Enhanced Traffic Service
let enhancedTrafficService: EnhancedTrafficService | null = null;

async function getTrafficService(): Promise<EnhancedTrafficService> {
  if (!enhancedTrafficService) {
    // Get Google Maps API key from settings
    const settings = await storage.getSettings();
    const apiKeySetting = settings.find(s => s.key === 'google_maps_api_key');
    if (!apiKeySetting?.value) {
      throw new Error('Google Maps API key not configured');
    }
    enhancedTrafficService = new EnhancedTrafficService(apiKeySetting.value);
  }
  return enhancedTrafficService;
}

/**
 * 1. INTERACTIVE TRAFFIC HEAT MAP ENDPOINTS
 */

// Generate traffic heat map data
router.get('/heat-map/:timeWindow?', requireAuth, async (req, res) => {
  try {
    const timeWindow = req.params.timeWindow || '06:00-07:00';
    const forceRefresh = req.query.refresh === 'true';
    
    const service = await getTrafficService();
    const heatMapData = await service.generateTrafficHeatMap(timeWindow, forceRefresh);
    
    res.json({
      success: true,
      timeWindow,
      dataPoints: heatMapData.length,
      heatMapData,
      lastGenerated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error generating traffic heat map:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate traffic heat map'
    });
  }
});

// Get stored heat map data
router.get('/heat-map-data/:timeWindow?', requireAuth, async (req, res) => {
  try {
    const timeWindow = req.params.timeWindow;
    const expiresAfter = new Date(); // Only get non-expired data
    
    const heatMapData = await enhancedTrafficStorage.getHeatMapData(timeWindow, expiresAfter);
    
    res.json({
      success: true,
      timeWindow: timeWindow || 'all',
      dataPoints: heatMapData.length,
      heatMapData: heatMapData.map(point => ({
        lat: parseFloat(point.gridLat),
        lng: parseFloat(point.gridLng),
        intensity: parseFloat(point.intensity),
        trafficDensity: point.trafficDensity,
        congestionLevel: point.congestionLevel,
        stationId: point.pollingStationId
      }))
    });
  } catch (error) {
    console.error('Error fetching heat map data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch heat map data'
    });
  }
});

/**
 * 2. AI-POWERED TRAFFIC PREDICTION ENDPOINTS
 */

// Generate traffic predictions
router.post('/predictions', requireAuth, async (req, res) => {
  try {
    const { targetDate, predictionType = 'election_day' } = req.body;
    
    if (!targetDate) {
      return res.status(400).json({
        success: false,
        error: 'Target date is required'
      });
    }
    
    const service = await getTrafficService();
    const predictions = await service.generateTrafficPredictions(
      new Date(targetDate),
      predictionType
    );
    
    res.json({
      success: true,
      targetDate,
      predictionType,
      predictionsGenerated: predictions.length,
      predictions
    });
  } catch (error) {
    console.error('Error generating traffic predictions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate traffic predictions'
    });
  }
});

// Get traffic predictions
router.get('/predictions/:stationId?', requireAuth, async (req, res) => {
  try {
    const stationId = req.params.stationId ? parseInt(req.params.stationId) : undefined;
    const targetDate = req.query.targetDate ? new Date(req.query.targetDate as string) : undefined;
    
    const predictions = await enhancedTrafficStorage.getTrafficPredictions(stationId, targetDate);
    
    res.json({
      success: true,
      stationId: stationId || 'all',
      targetDate: targetDate?.toISOString() || 'all',
      predictions
    });
  } catch (error) {
    console.error('Error fetching traffic predictions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch traffic predictions'
    });
  }
});

/**
 * 3. REAL-TIME TRAFFIC ALERT SYSTEM ENDPOINTS
 */

// Monitor and create new traffic alerts
router.post('/alerts/monitor', requireAuth, async (req, res) => {
  try {
    const service = await getTrafficService();
    const newAlerts = await service.monitorTrafficAlerts();
    
    res.json({
      success: true,
      newAlertsCreated: newAlerts.length,
      alerts: newAlerts
    });
  } catch (error) {
    console.error('Error monitoring traffic alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to monitor traffic alerts'
    });
  }
});

// Get active traffic alerts
router.get('/alerts/active', requireAuth, async (req, res) => {
  try {
    const activeAlerts = await enhancedTrafficStorage.getActiveTrafficAlerts();
    
    res.json({
      success: true,
      activeAlerts: activeAlerts.length,
      alerts: activeAlerts
    });
  } catch (error) {
    console.error('Error fetching active alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch active alerts'
    });
  }
});

// Get alerts for specific station
router.get('/alerts/station/:stationId', requireAuth, async (req, res) => {
  try {
    const stationId = parseInt(req.params.stationId);
    const alerts = await enhancedTrafficStorage.getTrafficAlertsByStation(stationId);
    
    res.json({
      success: true,
      stationId,
      alerts
    });
  } catch (error) {
    console.error('Error fetching station alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch station alerts'
    });
  }
});

// Resolve traffic alert
router.patch('/alerts/:alertId/resolve', requireAuth, async (req: any, res) => {
  try {
    const alertId = parseInt(req.params.alertId);
    const { notes } = req.body;
    const userId = req.user!.id;
    
    const resolvedAlert = await enhancedTrafficStorage.resolveTrafficAlert(alertId, userId, notes);
    
    res.json({
      success: true,
      resolvedAlert
    });
  } catch (error) {
    console.error('Error resolving traffic alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resolve traffic alert'
    });
  }
});

/**
 * 4. OBSERVER ROUTE OPTIMIZATION ENDPOINTS
 */

// Create optimized observer route
router.post('/routes/optimize', requireAuth, async (req, res) => {
  try {
    const { observerId, startLat, startLng, waypointStationIds, routeType = 'daily_patrol' } = req.body;
    
    if (!observerId || !startLat || !startLng || !waypointStationIds?.length) {
      return res.status(400).json({
        success: false,
        error: 'Observer ID, start location, and waypoint stations are required'
      });
    }
    
    const service = await getTrafficService();
    const optimizedRoute = await service.optimizeObserverRoute(
      observerId,
      startLat,
      startLng,
      waypointStationIds,
      routeType
    );
    
    res.json({
      success: true,
      optimizedRoute
    });
  } catch (error) {
    console.error('Error optimizing observer route:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to optimize observer route'
    });
  }
});

// Get observer routes
router.get('/routes/observer/:observerId?', requireAuth, async (req, res) => {
  try {
    const observerId = req.params.observerId ? parseInt(req.params.observerId) : undefined;
    const status = req.query.status as string | undefined;
    
    const routes = await enhancedTrafficStorage.getObserverRoutes(observerId, status);
    
    res.json({
      success: true,
      observerId: observerId || 'all',
      status: status || 'all',
      routes
    });
  } catch (error) {
    console.error('Error fetching observer routes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch observer routes'
    });
  }
});

// Update observer route status
router.patch('/routes/:routeId/status', requireAuth, async (req, res) => {
  try {
    const routeId = parseInt(req.params.routeId);
    const { status, notes } = req.body;
    
    const updatedRoute = await enhancedTrafficStorage.updateObserverRouteStatus(routeId, status, notes);
    
    res.json({
      success: true,
      updatedRoute
    });
  } catch (error) {
    console.error('Error updating route status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update route status'
    });
  }
});

/**
 * 5. EMERGENCY ROUTE PLANNING ENDPOINTS
 */

// Plan emergency route
router.post('/emergency/plan', requireAuth, async (req, res) => {
  try {
    const {
      emergencyType,
      sourceLat,
      sourceLng,
      destinationStationId,
      emergencyServiceType
    } = req.body;
    
    if (!emergencyType || !sourceLat || !sourceLng || !destinationStationId || !emergencyServiceType) {
      return res.status(400).json({
        success: false,
        error: 'All emergency planning parameters are required'
      });
    }
    
    const service = await getTrafficService();
    const emergencyPlan = await service.planEmergencyRoute(
      emergencyType,
      sourceLat,
      sourceLng,
      destinationStationId,
      emergencyServiceType
    );
    
    res.json({
      success: true,
      emergencyPlan
    });
  } catch (error) {
    console.error('Error planning emergency route:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to plan emergency route'
    });
  }
});

// Get emergency routes
router.get('/emergency/routes', requireAuth, async (req, res) => {
  try {
    const emergencyType = req.query.emergencyType as string | undefined;
    const status = req.query.status as string | undefined;
    
    const routes = await enhancedTrafficStorage.getEmergencyRoutes(emergencyType, status);
    
    res.json({
      success: true,
      emergencyType: emergencyType || 'all',
      status: status || 'all',
      routes
    });
  } catch (error) {
    console.error('Error fetching emergency routes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch emergency routes'
    });
  }
});

/**
 * 6. CRITICAL PATH ANALYSIS ENDPOINTS
 */

// Run critical path analysis
router.post('/critical-paths/analyze', requireAuth, async (req, res) => {
  try {
    const service = await getTrafficService();
    const analyses = await service.analyzeCriticalPaths();
    
    res.json({
      success: true,
      analysesCompleted: analyses.length,
      analyses
    });
  } catch (error) {
    console.error('Error analyzing critical paths:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze critical paths'
    });
  }
});

// Get critical path analyses
router.get('/critical-paths/:priority?', requireAuth, async (req, res) => {
  try {
    const priority = req.params.priority;
    const analyses = await enhancedTrafficStorage.getCriticalPathAnalyses(priority);
    
    res.json({
      success: true,
      priority: priority || 'all',
      analyses
    });
  } catch (error) {
    console.error('Error fetching critical path analyses:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch critical path analyses'
    });
  }
});

/**
 * 7. ANALYTICS AND REPORTING ENDPOINTS
 */

// Get traffic summary for specific station
router.get('/analytics/station/:stationId', requireAuth, async (req, res) => {
  try {
    const stationId = parseInt(req.params.stationId);
    const days = req.query.days ? parseInt(req.query.days as string) : 7;
    
    const summary = await enhancedTrafficStorage.getTrafficSummaryByStation(stationId, days);
    
    res.json({
      success: true,
      summary
    });
  } catch (error) {
    console.error('Error fetching station traffic summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch station traffic summary'
    });
  }
});

// Get system-wide traffic metrics
router.get('/analytics/system', requireAuth, async (req, res) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
    
    const metrics = await enhancedTrafficStorage.getSystemWideTrafficMetrics(startDate, endDate);
    
    res.json({
      success: true,
      metrics
    });
  } catch (error) {
    console.error('Error fetching system traffic metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch system traffic metrics'
    });
  }
});

// Get traffic trends
router.get('/analytics/trends/:timeframe', requireAuth, async (req, res) => {
  try {
    const timeframe = req.params.timeframe as 'daily' | 'weekly' | 'monthly';
    
    if (!['daily', 'weekly', 'monthly'].includes(timeframe)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid timeframe. Must be daily, weekly, or monthly'
      });
    }
    
    const trends = await enhancedTrafficStorage.getTrafficTrends(timeframe);
    
    res.json({
      success: true,
      trends
    });
  } catch (error) {
    console.error('Error fetching traffic trends:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch traffic trends'
    });
  }
});

// Cleanup expired heat map data
router.post('/maintenance/cleanup', requireAuth, async (req, res) => {
  try {
    const deletedRecords = await enhancedTrafficStorage.cleanupExpiredHeatMapData();
    
    res.json({
      success: true,
      deletedRecords
    });
  } catch (error) {
    console.error('Error cleaning up expired data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup expired data'
    });
  }
});

export default router;