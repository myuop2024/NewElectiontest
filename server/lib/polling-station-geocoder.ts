/**
 * Polling Station Geocoder
 * Fetches GPS coordinates for polling stations using Google Maps Geocoding API
 */

import axios from 'axios';

interface GeocodeResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
  accuracy: string;
}

class PollingStationGeocoder {
  private apiKey: string | null = null;

  constructor() {
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY || null;
  }

  /**
   * Geocode a polling station address to get GPS coordinates
   */
  async geocodeAddress(name: string, address: string, parish: string): Promise<GeocodeResult | null> {
    if (!this.apiKey) {
      console.warn('[GEOCODER] No Google Maps API key available, using fallback coordinates');
      return this.getFallbackCoordinates(parish);
    }

    const fullAddress = `${name}, ${address}, ${parish}, Jamaica`;
    
    try {
      console.log(`[GEOCODER] Geocoding: ${fullAddress}`);
      
      const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
        params: {
          address: fullAddress,
          key: this.apiKey,
          region: 'JM', // Jamaica
          components: 'country:JM'
        },
        timeout: 10000
      });

      if (response.data.status === 'OK' && response.data.results.length > 0) {
        const result = response.data.results[0];
        const location = result.geometry.location;
        
        return {
          latitude: location.lat,
          longitude: location.lng,
          formattedAddress: result.formatted_address,
          accuracy: result.geometry.location_type
        };
      } else {
        console.warn(`[GEOCODER] No results for: ${fullAddress}`);
        return this.getFallbackCoordinates(parish);
      }
      
    } catch (error) {
      console.error(`[GEOCODER] Error geocoding ${fullAddress}:`, error.message);
      return this.getFallbackCoordinates(parish);
    }
  }

  /**
   * Get fallback coordinates based on parish center
   */
  private getFallbackCoordinates(parish: string): GeocodeResult {
    const parishCoordinates: Record<string, { lat: number; lng: number }> = {
      'Kingston': { lat: 17.9712, lng: -76.7936 },
      'St. Andrew': { lat: 18.0061, lng: -76.7466 },
      'St. Catherine': { lat: 17.9909, lng: -77.0165 },
      'Clarendon': { lat: 17.8653, lng: -77.2365 },
      'St. James': { lat: 18.4762, lng: -77.8939 },
      'Manchester': { lat: 18.0456, lng: -77.5113 },
      'St. Ann': { lat: 18.4708, lng: -77.1946 },
      'Portland': { lat: 18.1745, lng: -76.4498 },
      'St. Mary': { lat: 18.3674, lng: -76.9574 },
      'St. Thomas': { lat: 17.8653, lng: -76.3593 },
      'Westmoreland': { lat: 18.2937, lng: -78.1332 },
      'Hanover': { lat: 18.4139, lng: -78.1345 },
      'Trelawny': { lat: 18.4953, lng: -77.6564 },
      'St. Elizabeth': { lat: 18.0456, lng: -77.8939 }
    };

    const coords = parishCoordinates[parish] || parishCoordinates['Kingston'];
    
    // Add small random offset to avoid exact duplicates
    const latOffset = (Math.random() - 0.5) * 0.01; // ~1km variation
    const lngOffset = (Math.random() - 0.5) * 0.01;
    
    return {
      latitude: coords.lat + latOffset,
      longitude: coords.lng + lngOffset,
      formattedAddress: `${parish}, Jamaica`,
      accuracy: 'APPROXIMATE'
    };
  }

  /**
   * Batch geocode multiple polling stations
   */
  async batchGeocode(stations: Array<{ name: string; address: string; parish: string }>): Promise<GeocodeResult[]> {
    console.log(`[GEOCODER] Batch geocoding ${stations.length} polling stations...`);
    
    const results: GeocodeResult[] = [];
    
    for (let i = 0; i < stations.length; i++) {
      const station = stations[i];
      console.log(`[GEOCODER] Progress: ${i + 1}/${stations.length} - ${station.name}`);
      
      const result = await this.geocodeAddress(station.name, station.address, station.parish);
      if (result) {
        results.push(result);
      }
      
      // Rate limiting: wait 100ms between requests
      if (this.apiKey && i < stations.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log(`[GEOCODER] Batch geocoding complete: ${results.length} results`);
    return results;
  }
}

export const pollingStationGeocoder = new PollingStationGeocoder();