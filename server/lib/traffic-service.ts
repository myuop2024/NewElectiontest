import { storage } from "../storage";

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
  async getTrafficConditions(latitude: number, longitude: number, radiusKm: number = 2): Promise<TrafficCondition> {
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
        throw new Error(`Traffic API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.status !== 'OK' || !data.routes || data.routes.length === 0) {
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
      console.error('Error fetching traffic conditions:', error);
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
      // Get polling station data from database
      const stations = await storage.getPollingStations();
      const station = stations.find(s => s.id === stationId);
      
      if (!station) {
        throw new Error(`Polling station not found: ${stationId}`);
      }

      if (!station.latitude || !station.longitude) {
        throw new Error(`Location coordinates not available for station: ${station.stationCode}`);
      }

      const location = {
        latitude: parseFloat(station.latitude),
        longitude: parseFloat(station.longitude)
      };

      // Get nearby traffic conditions
      const nearbyTraffic = await this.getTrafficConditions(location.latitude, location.longitude);

      // Get access routes from major nearby points
      const accessRoutes: RouteTraffic[] = [];
      
      // Define key access points for Jamaica (major towns/intersections)
      const majorPoints = [
        { name: 'Kingston', lat: 18.0179, lng: -76.8099 },
        { name: 'Spanish Town', lat: 17.9909, lng: -76.9570 },
        { name: 'Portmore', lat: 17.9470, lng: -76.8827 },
        { name: 'May Pen', lat: 17.9651, lng: -77.2456 }
      ];

      // Calculate routes from nearby major points
      for (const point of majorPoints) {
        const distance = this.calculateDistance(location.latitude, location.longitude, point.lat, point.lng);
        
        // Only calculate routes for points within 50km
        if (distance < 50) {
          try {
            const routeTraffic = await this.getRouteTraffic(
              { latitude: point.lat, longitude: point.lng },
              location
            );
            accessRoutes.push(routeTraffic);
          } catch (error) {
            console.warn(`Failed to get route from ${point.name}:`, error);
          }
        }
      }

      // Simulate public transport and parking data (would integrate with real APIs in production)
      const publicTransportAccess = {
        busStops: Math.floor(Math.random() * 5) + 1,
        busRoutes: ['Route 1A', 'Route 2B', 'Route 3C'].slice(0, Math.floor(Math.random() * 3) + 1),
        accessibility: (['excellent', 'good', 'fair', 'poor'] as const)[Math.floor(Math.random() * 4)]
      };

      const parkingAvailability = {
        spaces: Math.floor(Math.random() * 100) + 20,
        occupancyRate: Math.floor(Math.random() * 60) + 20, // 20-80%
        restrictions: ['No overnight parking', 'Resident permits required', '2-hour limit'].slice(0, Math.floor(Math.random() * 2))
      };

      return {
        stationId: station.id,
        stationCode: station.stationCode,
        stationName: station.name,
        location,
        nearbyTraffic,
        accessRoutes,
        publicTransportAccess,
        parkingAvailability,
        lastUpdated: new Date().toISOString()
      };

    } catch (error) {
      console.error(`Error getting traffic data for station ${stationId}:`, error);
      throw error;
    }
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
            console.warn(`Failed to get traffic for station ${station.stationCode}:`, error);
            return null;
          })
        );

      const results = await Promise.all(trafficPromises);
      return results.filter((result): result is PollingStationTrafficData => result !== null);

    } catch (error) {
      console.error('Error getting traffic data for all stations:', error);
      throw error;
    }
  }

  /**
   * Calculate distance between two points in kilometers
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
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