import { Client } from '@googlemaps/google-maps-services-js';

interface GeocodeResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
  placeId?: string;
  addressComponents?: any[];
}

interface GeocodeError {
  success: false;
  error: string;
  originalAddress: string;
}

interface GeocodeSuccess {
  success: true;
  data: GeocodeResult;
}

type GeocodeResponse = GeocodeSuccess | GeocodeError;

class GeocodingService {
  private client: Client;
  private apiKey: string | null = null;

  constructor() {
    this.client = new Client();
  }

  /**
   * Get Google Maps API key from environment or database settings
   */
  private async getApiKey(): Promise<string> {
    if (this.apiKey) {
      return this.apiKey;
    }

    // First try environment variable
    if (process.env.GOOGLE_MAPS_API_KEY) {
      this.apiKey = process.env.GOOGLE_MAPS_API_KEY;
      return this.apiKey;
    }

    // Fallback to database settings
    try {
      const { storage } = await import('../storage');
      const setting = await storage.getSettingByKey('GOOGLE_MAPS_API_KEY');
      if (setting?.value) {
        this.apiKey = setting.value;
        return this.apiKey;
      }
    } catch (error) {
      console.error('[GEOCODING] Failed to get API key from database:', error);
    }

    throw new Error('Google Maps API key not configured. Please set GOOGLE_MAPS_API_KEY in environment variables or admin settings.');
  }

  /**
   * Geocode an address to get latitude and longitude coordinates
   */
  async geocodeAddress(address: string, parish?: string): Promise<GeocodeResponse> {
    try {
      const apiKey = await this.getApiKey();
      
      // Enhance address with Jamaica context for better results
      let fullAddress = address;
      if (parish) {
        fullAddress = `${address}, ${parish}, Jamaica`;
      } else if (!address.toLowerCase().includes('jamaica')) {
        fullAddress = `${address}, Jamaica`;
      }

      console.log(`[GEOCODING] Geocoding address: "${fullAddress}"`);

      const response = await this.client.geocode({
        params: {
          address: fullAddress,
          key: apiKey,
          region: 'JM', // Bias results to Jamaica
          components: {
            country: 'JM'
          }
        },
      });

      if (response.data.status !== 'OK') {
        console.error(`[GEOCODING] Geocoding failed:`, response.data.status, response.data.error_message);
        return {
          success: false,
          error: `Geocoding failed: ${response.data.status} - ${response.data.error_message || 'Unknown error'}`,
          originalAddress: address
        };
      }

      if (!response.data.results || response.data.results.length === 0) {
        return {
          success: false,
          error: 'No results found for the provided address',
          originalAddress: address
        };
      }

      const result = response.data.results[0];
      const location = result.geometry.location;

      // Validate that we got Jamaica coordinates (rough bounds check)
      if (location.lat < 17.5 || location.lat > 18.7 || location.lng < -78.5 || location.lng > -76.0) {
        console.warn(`[GEOCODING] Coordinates outside Jamaica bounds:`, location);
        return {
          success: false,
          error: 'Address resolved to location outside Jamaica. Please provide a more specific Jamaican address.',
          originalAddress: address
        };
      }

      console.log(`[GEOCODING] Successfully geocoded to:`, location);

      return {
        success: true,
        data: {
          latitude: location.lat,
          longitude: location.lng,
          formattedAddress: result.formatted_address,
          placeId: result.place_id,
          addressComponents: result.address_components
        }
      };

    } catch (error) {
      console.error('[GEOCODING] Error during geocoding:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown geocoding error occurred',
        originalAddress: address
      };
    }
  }

  /**
   * Reverse geocode coordinates to get address information
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<GeocodeResponse> {
    try {
      const apiKey = await this.getApiKey();

      console.log(`[GEOCODING] Reverse geocoding coordinates: ${latitude}, ${longitude}`);

      const response = await this.client.reverseGeocode({
        params: {
          latlng: { lat: latitude, lng: longitude },
          key: apiKey
        },
      });

      if (response.data.status !== 'OK') {
        return {
          success: false,
          error: `Reverse geocoding failed: ${response.data.status}`,
          originalAddress: `${latitude}, ${longitude}`
        };
      }

      if (!response.data.results || response.data.results.length === 0) {
        return {
          success: false,
          error: 'No address found for the provided coordinates',
          originalAddress: `${latitude}, ${longitude}`
        };
      }

      const result = response.data.results[0];

      return {
        success: true,
        data: {
          latitude,
          longitude,
          formattedAddress: result.formatted_address,
          placeId: result.place_id,
          addressComponents: result.address_components
        }
      };

    } catch (error) {
      console.error('[GEOCODING] Error during reverse geocoding:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown reverse geocoding error occurred',
        originalAddress: `${latitude}, ${longitude}`
      };
    }
  }

  /**
   * Batch geocode multiple addresses
   */
  async batchGeocode(addresses: Array<{ address: string; parish?: string; id?: number }>): Promise<Array<{ id?: number; result: GeocodeResponse }>> {
    const results = [];
    
    // Process in batches to avoid rate limiting
    const batchSize = 5;
    for (let i = 0; i < addresses.length; i += batchSize) {
      const batch = addresses.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (item) => ({
        id: item.id,
        result: await this.geocodeAddress(item.address, item.parish)
      }));

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Add delay between batches to respect rate limits
      if (i + batchSize < addresses.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    return results;
  }

  /**
   * Validate coordinates are within Jamaica bounds
   */
  validateJamaicanCoordinates(latitude: number, longitude: number): boolean {
    // Jamaica rough bounding box
    const bounds = {
      north: 18.7,
      south: 17.5,
      east: -76.0,
      west: -78.5
    };

    return latitude >= bounds.south && 
           latitude <= bounds.north && 
           longitude >= bounds.west && 
           longitude <= bounds.east;
  }

  /**
   * Get parish name from geocoding result
   */
  extractParishFromResult(addressComponents: any[]): string | null {
    if (!addressComponents) return null;

    // Look for administrative_area_level_1 which usually contains the parish
    const parishComponent = addressComponents.find(component => 
      component.types.includes('administrative_area_level_1')
    );

    return parishComponent?.long_name || null;
  }
}

// Singleton instance
let geocodingService: GeocodingService | null = null;

export function getGeocodingService(): GeocodingService {
  if (!geocodingService) {
    geocodingService = new GeocodingService();
  }
  return geocodingService;
}

export { GeocodingService, type GeocodeResult, type GeocodeResponse };