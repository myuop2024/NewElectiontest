import { storage } from "../storage";
import { logError } from './logger';

interface TrafficLocation {
  latitude: number;
  longitude: number;
}

interface TrafficCondition {
  severity: 'light' | 'moderate' | 'heavy' | 'severe';
  speed: number; // km/h
  delayMinutes: number;
  description: string;
}

interface RouteTraffic {
  origin: TrafficLocation;
  destination: TrafficLocation;
  distance: string;
  duration: string;
  durationInTraffic: string;
  trafficCondition: TrafficCondition;
  alternativeRoutes: number;
}

interface PollingStationTrafficData {
  stationId: number;
  stationCode: string;
  stationName: string;
  location: TrafficLocation;
  nearbyTraffic: TrafficCondition;
  accessRoutes: RouteTraffic[];
  approachRoutes: {
    from: string; // area name
    route: RouteTraffic;
    importance: 'high' | 'medium' | 'low';
  }[];
  locationBusyness: {
    currentLevel: 'quiet' | 'moderate' | 'busy' | 'very_busy';
    percentageBusy: number; // 0-100
    usuallyBusyAt: string[]; // time periods
    liveData: boolean;
  };
  publicTransportAccess: {
    busStops: number;
    busRoutes: string[];
    accessibility: 'excellent' | 'good' | 'fair' | 'poor';
  };
  parkingAvailability: {
    spaces: number;
    occupancyRate: number; // percentage
    restrictions: string[];
  };
  lastUpdated: string;
}

export class TrafficService {
  private apiKey: string;
  private baseUrl = 'https://maps.googleapis.com/maps/api';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Get real-time traffic conditions around a specific location
   */
  async getTrafficConditions(latitude: number, longitude: number, radiusKm: number = 0.5): Promise<TrafficCondition> {
    try {
      // Use Google Maps Roads API to get traffic data
      const url = `${this.baseUrl}/directions/json`;
      const params = new URLSearchParams({
        origin: `${latitude},${longitude}`,
        destination: `${latitude + 0.01},${longitude + 0.01}`, // Small offset for traffic analysis
        departure_time: 'now',
        traffic_model: 'best_guess',
        key: this.apiKey
      });

      const response = await fetch(`${url}?${params}`);
      if (!response.ok) {
        const errorMsg = `[TRAFFIC API ERROR] HTTP ${response.status} ${response.statusText} for location ${latitude},${longitude}`;
        console.error(errorMsg);
        logError(new Error(errorMsg));
        throw new Error(`Traffic API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[TRAFFIC API RESPONSE]', JSON.stringify(data, null, 2));
      
      if (data.status !== 'OK' || !data.routes || data.routes.length === 0) {
        const errorMsg = `[TRAFFIC API ERROR] status: ${data.status}, routes: ${data.routes ? data.routes.length : 0} for location ${latitude},${longitude}`;
        console.error(errorMsg);
        logError(new Error(errorMsg));
        throw new Error(`Traffic data unavailable: ${data.status}`);
      }

      const route = data.routes[0];
      const leg = route.legs[0];
      
      // Calculate traffic severity based on duration difference
      const normalDuration = leg.duration.value; // seconds
      const trafficDuration = leg.duration_in_traffic?.value || normalDuration;
      const delaySeconds = trafficDuration - normalDuration;
      const delayMinutes = Math.round(delaySeconds / 60);

      // Estimate speed and severity
      const distanceKm = leg.distance.value / 1000;
      const timeHours = trafficDuration / 3600;
      const averageSpeed = distanceKm / timeHours;

      let severity: TrafficCondition['severity'] = 'light';
      let description = 'Traffic is flowing smoothly';

      if (delayMinutes > 15) {
        severity = 'severe';
        description = 'Heavy traffic with significant delays';
      } else if (delayMinutes > 8) {
        severity = 'heavy';
        description = 'Heavy traffic conditions';
      } else if (delayMinutes > 3) {
        severity = 'moderate';
        description = 'Moderate traffic conditions';
      }

      return {
        severity,
        speed: Math.round(averageSpeed),
        delayMinutes: Math.max(0, delayMinutes),
        description
      };

    } catch (error) {
      const errorMsg = `[TRAFFIC SERVICE ERROR] Failed to get traffic conditions for ${latitude},${longitude}: ${error instanceof Error ? error.message : String(error)}`;
      console.error(errorMsg);
      logError(new Error(errorMsg));
      // Return default conditions instead of throwing
      return {
        severity: 'light',
        speed: 50,
        delayMinutes: 0,
        description: 'Traffic data unavailable'
      };
    }
  }

  /**
   * Get route traffic information between two points
   */
  async getRouteTraffic(origin: TrafficLocation, destination: TrafficLocation): Promise<RouteTraffic> {
    try {
      const url = `${this.baseUrl}/directions/json`;
      const params = new URLSearchParams({
        origin: `${origin.latitude},${origin.longitude}`,
        destination: `${destination.latitude},${destination.longitude}`,
        departure_time: 'now',
        traffic_model: 'best_guess',
        alternatives: 'true',
        key: this.apiKey
      });

      const response = await fetch(`${url}?${params}`);
      if (!response.ok) {
        throw new Error(`Directions API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.status !== 'OK' || !data.routes || data.routes.length === 0) {
        throw new Error(`Route data unavailable: ${data.status}`);
      }

      const mainRoute = data.routes[0];
      const leg = mainRoute.legs[0];
      
      const normalDuration = leg.duration.value;
      const trafficDuration = leg.duration_in_traffic?.value || normalDuration;
      const delaySeconds = trafficDuration - normalDuration;
      
      const trafficCondition = await this.getTrafficConditions(
        (origin.latitude + destination.latitude) / 2,
        (origin.longitude + destination.longitude) / 2
      );

      return {
        origin,
        destination,
        distance: leg.distance.text,
        duration: leg.duration.text,
        durationInTraffic: leg.duration_in_traffic?.text || leg.duration.text,
        trafficCondition,
        alternativeRoutes: data.routes.length - 1
      };

    } catch (error) {
      console.error('Error fetching route traffic:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive traffic data for a polling station
   */
  async getPollingStationTraffic(stationId: number): Promise<PollingStationTrafficData> {
    try {
      const station = await storage.getPollingStationById(stationId);
      if (!station) {
        const errorMsg = `[STATION TRAFFIC ERROR] Station ${stationId} not found`;
        console.error(errorMsg);
        logError(new Error(errorMsg));
        throw new Error(`Station ${stationId} not found`);
      }

      if (!station.latitude || !station.longitude) {
        const errorMsg = `[STATION TRAFFIC ERROR] Station ${stationId} (${station.stationCode}) missing coordinates`;
        console.error(errorMsg);
        logError(new Error(errorMsg));
        throw new Error(`Station ${station.stationCode} missing coordinates`);
      }

      // Convert string coordinates to numbers
      const lat = parseFloat(station.latitude);
      const lng = parseFloat(station.longitude);

      // Use adaptive radius based on location type and road density
      const adaptiveRadius = this.calculateAdaptiveRadius(lat, lng);
      const trafficConditions = await this.getTrafficConditions(lat, lng, adaptiveRadius);
      
      return {
        stationId: station.id,
        stationCode: station.stationCode,
        stationName: station.name, // Use 'name' field from schema
        location: {
          latitude: lat,
          longitude: lng
        },
        nearbyTraffic: trafficConditions,
        accessRoutes: [],
        approachRoutes: await this.getApproachRoutes(lat, lng),
        locationBusyness: await this.getLocationBusyness(station.name, station.address || ''),
        publicTransportAccess: {
          busStops: 0,
          busRoutes: [],
          accessibility: 'fair'
        },
        parkingAvailability: {
          spaces: 0,
          occupancyRate: 0,
          restrictions: []
        },
        lastUpdated: new Date().toISOString()
      };

    } catch (error) {
      const errorMsg = `[STATION TRAFFIC ERROR] Failed to get traffic for station ${stationId}: ${error instanceof Error ? error.message : String(error)}`;
      console.error(errorMsg);
      logError(new Error(errorMsg));
      throw error;
    }
  }

  /**
   * Get approach routes to a polling station from key population centers
   */
  async getApproachRoutes(stationLat: number, stationLng: number): Promise<{from: string; route: RouteTraffic; importance: 'high' | 'medium' | 'low'}[]> {
    const destination = { latitude: stationLat, longitude: stationLng };
    
    // Define key population centers in Jamaica (major towns/cities)
    const populationCenters = [
      { name: 'Kingston', lat: 17.9714, lng: -76.7931, importance: 'high' as const },
      { name: 'Spanish Town', lat: 17.9911, lng: -76.9569, importance: 'high' as const },
      { name: 'Montego Bay', lat: 18.4762, lng: -77.8938, importance: 'high' as const },
      { name: 'Mandeville', lat: 18.0431, lng: -77.5069, importance: 'medium' as const },
      { name: 'May Pen', lat: 17.9647, lng: -77.2411, importance: 'medium' as const },
      { name: 'Half Way Tree', lat: 18.0175, lng: -76.7947, importance: 'medium' as const }
    ];

    const routes = [];
    
    for (const center of populationCenters) {
      // Only check routes from centers that are reasonably close (within ~50km)
      const distance = this.calculateDistance(center.lat, center.lng, stationLat, stationLng);
      if (distance > 50) continue; // Skip if too far
      
      try {
        const origin = { latitude: center.lat, longitude: center.lng };
        const routeTraffic = await this.getRouteTraffic(origin, destination);
        
        routes.push({
          from: center.name,
          route: routeTraffic,
          importance: center.importance
        });
        
        console.log(`[APPROACH ROUTE] Added route from ${center.name} to polling station: ${routeTraffic.distance}, ${routeTraffic.durationInTraffic}`);
      } catch (error) {
        console.warn(`[APPROACH ROUTE ERROR] Failed to get route from ${center.name} to polling station:`, error);
      }
    }

    console.log(`[APPROACH ROUTE SUMMARY] Found ${routes.length} approach routes for polling station at ${stationLat}, ${stationLng}`);
    return routes;
  }

  /**
   * Get location busyness data for a polling station
   */
  async getLocationBusyness(locationName: string, address: string): Promise<{currentLevel: 'quiet' | 'moderate' | 'busy' | 'very_busy'; percentageBusy: number; usuallyBusyAt: string[]; liveData: boolean}> {
    try {
      // For now, we'll use Google Places to check if the location exists
      // In the future, we can integrate with BestTime.app API for actual busyness data
      const placesUrl = `${this.baseUrl}/place/findplacefromtext/json`;
      const params = new URLSearchParams({
        input: `${locationName} ${address}`,
        inputtype: 'textquery',
        fields: 'place_id,name,rating,user_ratings_total',
        key: this.apiKey
      });

      const response = await fetch(`${placesUrl}?${params}`);
      const data = await response.json();

      if (data.status === 'OK' && data.candidates.length > 0) {
        const place = data.candidates[0];
        
        // Estimate busyness based on ratings and reviews (basic heuristic)
        const ratingsCount = place.user_ratings_total || 0;
        let busynessLevel: 'quiet' | 'moderate' | 'busy' | 'very_busy' = 'quiet';
        let percentageBusy = 20; // Default low busyness

        if (ratingsCount > 500) {
          busynessLevel = 'very_busy';
          percentageBusy = 80;
        } else if (ratingsCount > 200) {
          busynessLevel = 'busy';
          percentageBusy = 60;
        } else if (ratingsCount > 50) {
          busynessLevel = 'moderate';
          percentageBusy = 40;
        }

        return {
          currentLevel: busynessLevel,
          percentageBusy,
          usuallyBusyAt: ['8:00 AM - 10:00 AM', '4:00 PM - 6:00 PM'], // Typical voting hours
          liveData: false // We don't have live data yet
        };
      }
    } catch (error) {
      console.warn('Failed to get location busyness:', error);
    }

    // Default fallback
    return {
      currentLevel: 'moderate',
      percentageBusy: 30,
      usuallyBusyAt: ['8:00 AM - 10:00 AM', '4:00 PM - 6:00 PM'],
      liveData: false
    };
  }

  /**
   * Calculate adaptive radius based on location characteristics
   */
  private calculateAdaptiveRadius(lat: number, lng: number): number {
    // Urban areas (Kingston, Spanish Town, Montego Bay) - smaller radius
    const urbanCenters = [
      { lat: 17.9714, lng: -76.7931, radius: 0.3 }, // Kingston
      { lat: 17.9911, lng: -76.9569, radius: 0.4 }, // Spanish Town
      { lat: 18.4762, lng: -77.8938, radius: 0.4 }, // Montego Bay
    ];
    
    // Check if polling station is in urban area
    for (const center of urbanCenters) {
      const distance = this.calculateDistance(lat, lng, center.lat, center.lng);
      if (distance < 10) { // Within 10km of urban center
        return center.radius;
      }
    }
    
    // Rural areas - larger radius to capture sparse road network
    return 0.8;
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Radius of Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  /**
   * Get traffic summary for all polling stations
   */
  async getAllPollingStationsTraffic(): Promise<PollingStationTrafficData[]> {
    try {
      const stations = await storage.getPollingStations();
      const trafficPromises = stations
        .filter(station => station.latitude && station.longitude)
        .map(station => 
          this.getPollingStationTraffic(station.id).catch(error => {
            const errorMsg = `[STATION TRAFFIC ERROR] Station ${station.stationCode}: ${error instanceof Error ? error.message : String(error)}`;
            console.warn(errorMsg);
            logError(new Error(errorMsg));
            return null;
          })
        );

      const results = await Promise.all(trafficPromises);
      console.log('[ALL STATIONS TRAFFIC RESULTS]', results);
      
      const successfulResults = results.filter((result): result is PollingStationTrafficData => result !== null);
      const failedCount = results.length - successfulResults.length;
      
      if (failedCount > 0) {
        const errorMsg = `[TRAFFIC SUMMARY] ${failedCount} out of ${results.length} stations failed to load traffic data`;
        console.warn(errorMsg);
        logError(new Error(errorMsg));
      }
      
      return successfulResults;

    } catch (error) {
      const errorMsg = `[ALL STATIONS TRAFFIC ERROR] Failed to get traffic data for all stations: ${error instanceof Error ? error.message : String(error)}`;
      console.error(errorMsg);
      logError(new Error(errorMsg));
      throw error;
    }
  }



  /**
   * Get traffic alerts and incidents near polling stations
   */
  async getTrafficAlerts(latitude: number, longitude: number, radiusKm: number = 5): Promise<any[]> {
    try {
      // In production, this would integrate with traffic incident APIs
      // For now, return simulated alerts based on traffic conditions
      const traffic = await this.getTrafficConditions(latitude, longitude);
      
      const alerts = [];
      
      if (traffic.severity === 'severe') {
        alerts.push({
          type: 'heavy_traffic',
          severity: 'high',
          message: 'Heavy traffic conditions detected - expect significant delays',
          recommendedAction: 'Consider alternative routes or allow extra travel time'
        });
      } else if (traffic.severity === 'heavy') {
        alerts.push({
          type: 'traffic_congestion',
          severity: 'medium',
          message: 'Traffic congestion in the area',
          recommendedAction: 'Allow additional 10-15 minutes for travel'
        });
      }

      return alerts;

    } catch (error) {
      console.error('Error getting traffic alerts:', error);
      return [];
    }
  }
}

// Export factory function
export function createTrafficService(apiKey?: string): TrafficService {
  if (!apiKey) {
    throw new Error("Google Maps API key is required for traffic service");
  }
  return new TrafficService(apiKey);
}

// Export singleton
let trafficServiceInstance: TrafficService | null = null;

export function getTrafficService(): TrafficService {
  if (!trafficServiceInstance) {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error("GOOGLE_MAPS_API_KEY or GOOGLE_API_KEY environment variable is required");
    }
    trafficServiceInstance = new TrafficService(apiKey);
  }
  return trafficServiceInstance;
}