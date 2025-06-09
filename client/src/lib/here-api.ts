interface HereApiConfig {
  apiKey: string;
}

export interface AddressSuggestion {
  id: string;
  label: string;
  address: {
    houseNumber?: string;
    street: string;
    district?: string;
    city: string;
    state: string;
    countryCode: string;
    postalCode?: string;
  };
  position: {
    lat: number;
    lng: number;
  };
}

export interface GeocodeResult {
  position: {
    lat: number;
    lng: number;
  };
  address: {
    label: string;
    houseNumber?: string;
    street?: string;
    district?: string;
    city?: string;
    state?: string;
    countryCode?: string;
    postalCode?: string;
  };
}

export interface RouteResult {
  distance: number;
  duration: number;
  polyline: string;
  instructions: Array<{
    instruction: string;
    distance: number;
    duration: number;
  }>;
}

class HereApiService {
  private apiKey: string | null = null;

  setApiKey(apiKey: string) {
    this.apiKey = apiKey;
  }

  private getApiKey(): string {
    if (!this.apiKey) {
      throw new Error("HERE API key not configured. Please set it in admin settings.");
    }
    return this.apiKey;
  }

  async autocompleteAddress(query: string, parish?: string): Promise<AddressSuggestion[]> {
    if (!query || query.length < 3) return [];

    try {
      const apiKey = this.getApiKey();
      let searchQuery = query;
      
      // Add parish context for Jamaican addresses
      if (parish) {
        searchQuery += `, ${parish}, Jamaica`;
      } else {
        searchQuery += `, Jamaica`;
      }

      const response = await fetch(
        `https://autocomplete.search.hereapi.com/v1/autocomplete?` +
        `q=${encodeURIComponent(searchQuery)}&` +
        `limit=10&` +
        `countryCode=JM&` +
        `apiKey=${apiKey}`
      );

      if (!response.ok) {
        throw new Error(`HERE API error: ${response.status}`);
      }

      const data = await response.json();
      
      return data.items?.map((item: any) => ({
        id: item.id,
        label: item.title || item.address?.label || '',
        address: {
          houseNumber: item.address?.houseNumber,
          street: item.address?.street || '',
          district: item.address?.district,
          city: item.address?.city || '',
          state: item.address?.state || '',
          countryCode: item.address?.countryCode || 'JM',
          postalCode: item.address?.postalCode,
        },
        position: {
          lat: item.position?.lat || 0,
          lng: item.position?.lng || 0,
        }
      })) || [];
    } catch (error) {
      console.error('HERE API autocomplete error:', error);
      return [];
    }
  }

  async geocodeAddress(address: string): Promise<GeocodeResult | null> {
    try {
      const apiKey = this.getApiKey();
      const response = await fetch(
        `https://geocode.search.hereapi.com/v1/geocode?` +
        `q=${encodeURIComponent(address + ', Jamaica')}&` +
        `countryCode=JM&` +
        `apiKey=${apiKey}`
      );

      if (!response.ok) {
        throw new Error(`HERE API geocoding error: ${response.status}`);
      }

      const data = await response.json();
      const firstResult = data.items?.[0];

      if (!firstResult) return null;

      return {
        position: {
          lat: firstResult.position.lat,
          lng: firstResult.position.lng,
        },
        address: {
          label: firstResult.address.label,
          houseNumber: firstResult.address.houseNumber,
          street: firstResult.address.street,
          district: firstResult.address.district,
          city: firstResult.address.city,
          state: firstResult.address.state,
          countryCode: firstResult.address.countryCode,
          postalCode: firstResult.address.postalCode,
        }
      };
    } catch (error) {
      console.error('HERE API geocoding error:', error);
      return null;
    }
  }

  async calculateRoute(origin: {lat: number, lng: number}, destination: {lat: number, lng: number}): Promise<RouteResult | null> {
    try {
      const apiKey = this.getApiKey();
      const response = await fetch(
        `https://router.hereapi.com/v8/routes?` +
        `transportMode=car&` +
        `origin=${origin.lat},${origin.lng}&` +
        `destination=${destination.lat},${destination.lng}&` +
        `return=summary,polyline,instructions&` +
        `apiKey=${apiKey}`
      );

      if (!response.ok) {
        throw new Error(`HERE Routing API error: ${response.status}`);
      }

      const data = await response.json();
      const route = data.routes?.[0];

      if (!route) return null;

      return {
        distance: route.sections[0].summary.length,
        duration: route.sections[0].summary.duration,
        polyline: route.sections[0].polyline,
        instructions: route.sections[0].actions?.map((action: any) => ({
          instruction: action.instruction,
          distance: action.length,
          duration: action.duration
        })) || []
      };
    } catch (error) {
      console.error('HERE Routing API error:', error);
      return null;
    }
  }

  async reverseGeocode(lat: number, lng: number): Promise<GeocodeResult | null> {
    try {
      const apiKey = this.getApiKey();
      const response = await fetch(
        `https://revgeocode.search.hereapi.com/v1/revgeocode?` +
        `at=${lat},${lng}&` +
        `apiKey=${apiKey}`
      );

      if (!response.ok) {
        throw new Error(`HERE API reverse geocoding error: ${response.status}`);
      }

      const data = await response.json();
      const firstResult = data.items?.[0];

      if (!firstResult) return null;

      return {
        position: {
          lat: firstResult.position.lat,
          lng: firstResult.position.lng,
        },
        address: {
          label: firstResult.address.label,
          houseNumber: firstResult.address.houseNumber,
          street: firstResult.address.street,
          district: firstResult.address.district,
          city: firstResult.address.city,
          state: firstResult.address.state,
          countryCode: firstResult.address.countryCode,
          postalCode: firstResult.address.postalCode,
        }
      };
    } catch (error) {
      console.error('HERE API reverse geocoding error:', error);
      return null;
    }
  }
}

export const hereApiService = new HereApiService();