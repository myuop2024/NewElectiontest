/**
 * ECJ 2024 Polling Stations API Routes
 * Extract and manage authentic 2024 ECJ polling stations as test data
 */

import { Router, Request, Response } from 'express';
import { db } from '../db.js';
import { pollingStations } from '../../shared/schema.js';
import { eq, and } from 'drizzle-orm';
import { ecj2024ComprehensiveExtractor } from '../lib/ecj-2024-comprehensive-extractor.js';
import { pollingStationGeocoder } from '../lib/polling-station-geocoder.js';

// Auth interface matching main routes
interface AuthenticatedRequest extends Request {
  user?: { id: number; username: string; role: string };
  session: any;
}

// Authentication middleware matching main routes.ts implementation
const authenticateToken = (req: AuthenticatedRequest, res: Response, next: any) => {
  console.log('[ECJ AUTH DEBUG] Session data:', {
    userId: req.session.userId,
    username: req.session.username,
    role: req.session.role,
    sessionID: req.sessionID
  });
  
  // Check if user is logged in via session
  if (!req.session.userId || !req.session.username || !req.session.role) {
    console.log('[ECJ AUTH DEBUG] Authentication failed - missing session data');
    return res.status(401).json({ error: "Authentication required" });
  }

  // Set user object from session data
  req.user = {
    id: req.session.userId,
    username: req.session.username,
    role: req.session.role
  };
  
  console.log('[ECJ AUTH DEBUG] User authenticated:', req.user);
  next();
};

const router = Router();

/**
 * Extract and populate all 2024 ECJ polling stations
 */
router.post('/extract-2024-stations', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    console.log('[ECJ 2024 STATIONS] Starting extraction process...');

    // Extract polling stations from ECJ 2024 documents comprehensively
    const extractedData = await ecj2024ComprehensiveExtractor.extractComprehensive2024Stations();

    const insertedStations: any[] = [];
    let totalInserted = 0;

    // Process each parish
    for (const parish of extractedData.parishes) {
      console.log(`[ECJ 2024 STATIONS] Processing ${parish.name} (${parish.stations.length} stations)...`);

      // Geocode all stations in this parish
      const geocodeData = await pollingStationGeocoder.batchGeocode(
        parish.stations.map(station => ({
          name: station.name,
          address: station.address,
          parish: station.parish
        }))
      );

      // Insert stations with coordinates
      for (let i = 0; i < parish.stations.length; i++) {
        const station = parish.stations[i];
        const geocode = geocodeData[i];

        try {
          // Check if station already exists
          const existing = await db.select().from(pollingStations)
            .where(eq(pollingStations.stationCode, station.stationCode));

          if (existing.length > 0) {
            console.log(`[ECJ 2024 STATIONS] Station ${station.stationCode} already exists, skipping...`);
            continue;
          }

          // Insert new station
          const [inserted] = await db.insert(pollingStations).values({
            stationCode: station.stationCode,
            name: station.name,
            address: station.address,
            parishId: station.parishId,
            parish: station.parish,
            latitude: geocode?.latitude?.toString(),
            longitude: geocode?.longitude?.toString(),
            capacity: station.capacity || 500, // Default capacity
            isActive: true,
            isTestData: true, // Mark as removable test data
            dataSource: 'ECJ_2024_Extraction',
            extractedFrom: extractedData.documentSource
          }).returning();

          insertedStations.push({
            ...inserted,
            geocode: geocode ? {
              latitude: geocode.latitude,
              longitude: geocode.longitude,
              accuracy: geocode.accuracy
            } : null
          });

          totalInserted++;
          console.log(`[ECJ 2024 STATIONS] Inserted: ${station.stationCode} - ${station.name}`);

        } catch (error) {
          console.error(`[ECJ 2024 STATIONS] Error inserting ${station.stationCode}:`, error.message);
        }
      }
    }

    console.log(`[ECJ 2024 STATIONS] Extraction complete: ${totalInserted} stations inserted`);

    res.json({
      success: true,
      message: `Successfully extracted and populated ${totalInserted} authentic 2024 ECJ polling stations`,
      data: {
        totalExtracted: extractedData.totalStations,
        totalInserted: totalInserted,
        parishes: extractedData.parishes.length,
        documentSource: extractedData.documentSource,
        extractionDate: extractedData.extractionDate,
        stations: insertedStations
      }
    });

  } catch (error) {
    console.error('[ECJ 2024 STATIONS] Extraction error:', error);
    res.status(500).json({
      error: 'Failed to extract 2024 ECJ polling stations',
      details: error.message
    });
  }
});

/**
 * Get all 2024 test data stations
 */
router.get('/test-data-stations', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const testStations = await db.select().from(pollingStations)
      .where(eq(pollingStations.isTestData, true));

    const stationsByParish = testStations.reduce((acc, station) => {
      const parish = station.parish || `Parish ${station.parishId}`;
      if (!acc[parish]) {
        acc[parish] = [];
      }
      acc[parish].push(station);
      return acc;
    }, {} as Record<string, any[]>);

    res.json({
      success: true,
      totalStations: testStations.length,
      parishes: Object.keys(stationsByParish).length,
      stationsByParish: stationsByParish,
      stations: testStations
    });

  } catch (error) {
    console.error('[ECJ 2024 STATIONS] Error fetching test stations:', error);
    res.status(500).json({
      error: 'Failed to fetch test data stations',
      details: error.message
    });
  }
});

/**
 * Remove all test data stations (Admin only)
 */
router.delete('/remove-test-data', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    console.log('[ECJ 2024 STATIONS] Removing all test data stations...');

    // Get count before deletion
    const testStations = await db.select().from(pollingStations)
      .where(eq(pollingStations.isTestData, true));

    const countBefore = testStations.length;

    // Delete all test data stations
    await db.delete(pollingStations)
      .where(eq(pollingStations.isTestData, true));

    console.log(`[ECJ 2024 STATIONS] Removed ${countBefore} test data stations`);

    res.json({
      success: true,
      message: `Successfully removed ${countBefore} test data polling stations`,
      removedCount: countBefore
    });

  } catch (error) {
    console.error('[ECJ 2024 STATIONS] Error removing test data:', error);
    res.status(500).json({
      error: 'Failed to remove test data stations',
      details: error.message
    });
  }
});

/**
 * Get extraction status and statistics
 */
router.get('/extraction-status', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const allStations = await db.select().from(pollingStations);
    const testStations = allStations.filter(s => s.isTestData);
    const productionStations = allStations.filter(s => !s.isTestData);

    const testStationsByParish = testStations.reduce((acc, station) => {
      const parish = station.parish || `Parish ${station.parishId}`;
      if (!acc[parish]) {
        acc[parish] = 0;
      }
      acc[parish]++;
      return acc;
    }, {} as Record<string, number>);

    res.json({
      success: true,
      statistics: {
        totalStations: allStations.length,
        testDataStations: testStations.length,
        productionStations: productionStations.length,
        testStationsByParish: testStationsByParish,
        hasTestData: testStations.length > 0
      }
    });

  } catch (error) {
    console.error('[ECJ 2024 STATIONS] Error fetching status:', error);
    res.status(500).json({
      error: 'Failed to fetch extraction status',
      details: error.message
    });
  }
});

export default router;