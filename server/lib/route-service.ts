export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
  name?: string;
}

export interface RouteOptimization {
  startLocation: Location;
  endLocation: Location;
  waypoints: Location[];
  constraints: {
    maxDistance?: number;
    timeWindows?: Array<{ start: string; end: string }>;
    vehicleType?: 'car' | 'motorcycle' | 'walking';
    avoidTolls?: boolean;
    avoidHighways?: boolean;
  };
}

export interface OptimizedRoute {
  routeId: string;
  totalDistance: number;
  estimatedDuration: number;
  actualDuration?: number;
  waypoints: Location[];
  segments: RouteSegment[];
  mileageCalculation: {
    totalMiles: number;
    ratePerMile: number;
    totalCost: number;
  };
  gpsTrackingPoints: GpsPoint[];
}

export interface RouteSegment {
  startPoint: Location;
  endPoint: Location;
  distance: number;
  duration: number;
  instructions: string;
  polyline: string;
}

export interface GpsPoint {
  latitude: number;
  longitude: number;
  timestamp: Date;
  accuracy: number;
  speed?: number;
  heading?: number;
  altitude?: number;
}

import { storage } from "../storage";

export class RouteService {
  private static readonly HERE_API_URL = 'https://router.hereapi.com/v8/routes';
  private static readonly GEOCODING_URL = 'https://geocode.search.hereapi.com/v1/geocode';
  private static apiKey: string | null = null;

  // Get HERE API key from environment or database
  private static async getHereApiKey(): Promise<string> {
    // Check if we already have it cached
    if (this.apiKey) {
      return this.apiKey;
    }

    // First check environment variable
    if (process.env.HERE_API_KEY) {
      this.apiKey = process.env.HERE_API_KEY;
      return this.apiKey;
    }

    // Fall back to database
    try {
      const setting = await storage.getSettingByKey("HERE_API_KEY");
      if (setting?.value) {
        this.apiKey = setting.value;
        return this.apiKey;
      }
    } catch (error) {
      console.error("Failed to get HERE API key from database:", error);
    }

    throw new Error("HERE API key not configured in environment or database");
  }

  // Optimize route using HERE API
  static async optimizeRoute(optimization: RouteOptimization): Promise<OptimizedRoute> {
    const apiKey = await this.getHereApiKey();

    try {
      const origin = `${optimization.startLocation.latitude},${optimization.startLocation.longitude}`;
      const destination = `${optimization.endLocation.latitude},${optimization.endLocation.longitude}`;
      
      let waypoints = '';
      if (optimization.waypoints.length > 0) {
        waypoints = '&via=' + optimization.waypoints
          .map(wp => `${wp.latitude},${wp.longitude}`)
          .join('&via=');
      }

      const transportMode = this.getTransportMode(optimization.constraints.vehicleType);
      const avoidFeatures = this.getAvoidFeatures(optimization.constraints);

      const url = `${this.HERE_API_URL}?transportMode=${transportMode}&origin=${origin}&destination=${destination}${waypoints}&return=polyline,summary,instructions${avoidFeatures}&apikey=${apiKey}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HERE API error: ${response.status}`);
      }

      const data = await response.json();
      const route = data.routes[0];

      if (!route) {
        throw new Error('No route found');
      }

      return {
        routeId: this.generateRouteId(),
        totalDistance: route.sections[0].summary.length,
        estimatedDuration: route.sections[0].summary.duration,
        waypoints: [optimization.startLocation, ...optimization.waypoints, optimization.endLocation],
        segments: this.parseRouteSegments(route.sections[0]),
        mileageCalculation: this.calculateMileage(route.sections[0].summary.length),
        gpsTrackingPoints: []
      };
    } catch (error) {
      console.error('Route optimization error:', error);
      throw new Error('Failed to optimize route');
    }
  }

  // Real-time GPS tracking
  static async trackGpsLocation(userId: number, routeId: string, gpsPoint: GpsPoint) {
    try {
      // Store GPS point in database
      const trackingData = {
        userId,
        routeId,
        ...gpsPoint
      };

      // Calculate if user is on route
      const onRoute = await this.verifyOnRoute(routeId, gpsPoint);
      
      // Generate alerts if off-route
      if (!onRoute) {
        await this.generateOffRouteAlert(userId, routeId, gpsPoint);
      }

      return {
        tracked: true,
        onRoute,
        timestamp: gpsPoint.timestamp
      };
    } catch (error) {
      console.error('GPS tracking error:', error);
      throw new Error('Failed to track GPS location');
    }
  }

  // Jamaica-specific geofencing
  static async setupJamaicaGeofencing() {
    const jamaicaParishes = [
      { name: 'Kingston', center: { lat: 18.0179, lng: -76.8099 }, radius: 10000 },
      { name: 'Spanish Town', center: { lat: 17.9909, lng: -76.9571 }, radius: 8000 },
      { name: 'Mandeville', center: { lat: 18.0456, lng: -77.5058 }, radius: 6000 },
      { name: 'Montego Bay', center: { lat: 18.4762, lng: -77.8937 }, radius: 12000 },
      { name: 'Port Antonio', center: { lat: 18.1745, lng: -76.4440 }, radius: 5000 },
      { name: 'Ocho Rios', center: { lat: 18.4078, lng: -77.1037 }, radius: 4000 }
    ];

    return jamaicaParishes.map(parish => ({
      id: `jamaica_${parish.name.toLowerCase().replace(' ', '_')}`,
      name: parish.name,
      type: 'parish_boundary',
      geometry: this.createCircularGeofence(parish.center, parish.radius),
      alertOnEntry: true,
      alertOnExit: true
    }));
  }

  // Mileage calculation for reimbursement
  static calculateMileage(distanceInMeters: number) {
    const miles = distanceInMeters * 0.000621371; // Convert meters to miles
    const ratePerMile = 0.50; // USD per mile (adjustable)
    
    return {
      totalMiles: Math.round(miles * 100) / 100,
      ratePerMile,
      totalCost: Math.round(miles * ratePerMile * 100) / 100
    };
  }

  // Offline route caching
  static async cacheRouteForOffline(routeId: string, route: OptimizedRoute) {
    const cachedRoute = {
      routeId,
      route,
      cachedAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    };

    // Store in local cache/database for offline access
    return cachedRoute;
  }

  // Geocoding for address lookup
  static async geocodeAddress(address: string): Promise<Location | null> {
    const apiKey = await this.getHereApiKey();

    try {
      const url = `${this.GEOCODING_URL}?q=${encodeURIComponent(address)}&in=countryCode:JAM&apikey=${apiKey}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Geocoding API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.items && data.items.length > 0) {
        const location = data.items[0].position;
        return {
          latitude: location.lat,
          longitude: location.lng,
          address: data.items[0].address.label,
          name: data.items[0].title
        };
      }

      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  }

  // Route deviation detection
  static async detectRouteDeviation(routeId: string, currentLocation: GpsPoint, threshold: number = 100) {
    // Check if current location deviates from planned route by more than threshold (meters)
    const plannedRoute = await this.getStoredRoute(routeId);
    if (!plannedRoute) return false;

    const nearestPoint = this.findNearestPointOnRoute(plannedRoute, currentLocation);
    const deviation = this.calculateDistance(currentLocation, nearestPoint);

    return deviation > threshold;
  }

  private static getTransportMode(vehicleType?: string): string {
    const modes: { [key: string]: string } = {
      'car': 'car',
      'motorcycle': 'car', // HERE API uses car for motorcycles
      'walking': 'pedestrian'
    };
    return modes[vehicleType || 'car'] || 'car';
  }

  private static getAvoidFeatures(constraints: any): string {
    const features = [];
    if (constraints.avoidTolls) features.push('tollRoad');
    if (constraints.avoidHighways) features.push('controlledAccessHighway');
    
    return features.length > 0 ? `&avoid[features]=${features.join(',')}` : '';
  }

  private static generateRouteId(): string {
    return `route_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private static parseRouteSegments(section: any): RouteSegment[] {
    return section.actions?.map((action: any, index: number) => ({
      startPoint: { latitude: 0, longitude: 0 }, // Parse from polyline
      endPoint: { latitude: 0, longitude: 0 },   // Parse from polyline
      distance: action.length || 0,
      duration: action.duration || 0,
      instructions: action.instruction || '',
      polyline: section.polyline || ''
    })) || [];
  }

  private static async verifyOnRoute(routeId: string, gpsPoint: GpsPoint): Promise<boolean> {
    // Implementation to check if GPS point is within route corridor
    return true; // Simplified for now
  }

  private static async generateOffRouteAlert(userId: number, routeId: string, gpsPoint: GpsPoint) {
    // Generate alert when user deviates from planned route
    console.log(`User ${userId} is off route ${routeId} at ${gpsPoint.latitude}, ${gpsPoint.longitude}`);
  }

  private static createCircularGeofence(center: { lat: number; lng: number }, radius: number) {
    // Create circular geofence geometry
    return {
      type: 'circle',
      center,
      radius
    };
  }

  private static async getStoredRoute(routeId: string): Promise<OptimizedRoute | null> {
    // Retrieve stored route from database
    return null; // Simplified for now
  }

  private static findNearestPointOnRoute(route: OptimizedRoute, point: GpsPoint): Location {
    // Find nearest point on route polyline
    return { latitude: point.latitude, longitude: point.longitude }; // Simplified
  }

  private static calculateDistance(point1: GpsPoint, point2: Location): number {
    // Haversine formula for distance calculation
    const R = 6371e3; // Earth's radius in meters
    const φ1 = point1.latitude * Math.PI/180;
    const φ2 = point2.latitude * Math.PI/180;
    const Δφ = (point2.latitude - point1.latitude) * Math.PI/180;
    const Δλ = (point2.longitude - point1.longitude) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  }
}