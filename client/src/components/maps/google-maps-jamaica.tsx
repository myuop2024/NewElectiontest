import React, { useState, useEffect, useRef } from 'react';
// Removed incorrect Loader import; using direct script loading instead

// Jamaica parish coordinates (real GPS coordinates)
const JAMAICA_PARISHES = {
  "Kingston": { lat: 17.9712, lng: -76.7932 },
  "St. Andrew": { lat: 18.0747, lng: -76.7951 },
  "St. Thomas": { lat: 17.9889, lng: -76.3461 },
  "Portland": { lat: 18.1836, lng: -76.4598 },
  "St. Mary": { lat: 18.3678, lng: -76.9597 },
  "St. Ann": { lat: 18.4747, lng: -77.2020 },
  "Trelawny": { lat: 18.4861, lng: -77.6139 },
  "St. James": { lat: 18.4892, lng: -77.9203 },
  "Hanover": { lat: 18.4208, lng: -78.1336 },
  "Westmoreland": { lat: 18.3042, lng: -78.1336 },
  "St. Elizabeth": { lat: 18.0208, lng: -77.8000 },
  "Manchester": { lat: 18.0458, lng: -77.5317 },
  "Clarendon": { lat: 17.9667, lng: -77.2833 },
  "St. Catherine": { lat: 17.9889, lng: -76.8944 }
};

interface ParishData {
  parishId: number;
  parishName: string;
  incidents: number;
  turnout: number;
  observers: number;
  critical: number;
}

interface GoogleMapsJamaicaProps {
  parishStats: ParishData[];
  selectedMetric: "incidents" | "turnout" | "observers" | "critical";
  onParishSelect: (parish: string) => void;
  selectedParish: string | null;
}

declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
}

const GoogleMapsJamaica: React.FC = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  // Fix initialization sequence
  useEffect(() => {
    const initializeMap = async () => {
      if (!mapRef.current || retryCount >= maxRetries) {
        return;
      }
      
      try {
        setIsLoading(true);
        setApiError(null);
        
        const apiKey = await fetchGoogleMapsApiKey();

        // Ensure Google Maps API is loaded
        if (!window.google || !window.google.maps) {
          await loadGoogleMapsScript(apiKey);
        }

        const newMap = new window.google.maps.Map(mapRef.current, {
          center: { lat: 18.0, lng: -77.5 },
          zoom: 8,
          mapTypeId: window.google.maps.MapTypeId.ROADMAP,
        });
        
        setMap(newMap);
        setIsLoading(false);
        setRetryCount(0);
      } catch (error) {
        console.error('[MAPS DEBUG] Error initializing Google Maps:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        setApiError(`Failed to initialize map: ${errorMessage}`);
        setRetryCount(prev => prev + 1);
        setTimeout(() => initializeMap(), 1000 * (retryCount + 1));
      };
    };
    
    initializeMap();
  }, [retryCount]);

  const loadGoogleMapsScript = (apiKey: string) => {
    return new Promise<void>((resolve, reject) => {
      // Avoid injecting multiple script tags
      if (document.querySelector('script[data-google-maps]')) {
        return resolve();
      }

      const script = document.createElement('script');
      script.setAttribute('data-google-maps', 'true');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&v=weekly`;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google Maps script'));
      document.head.appendChild(script);
    });
  };

  const fetchGoogleMapsApiKey = async () => {
    try {
      const response = await fetch('/api/settings/google-maps-api');
      const data = await response.json();
      if (!data.hasKey) {
        throw new Error('Google Maps API key not configured');
      }
      return data.apiKey;
    } catch (error) {
      console.error('[MAPS DEBUG] Failed to fetch Google Maps API key:', error);
      throw error;
    };
  };

  // Cleanup effect
  useEffect(() => {
    if (map) {
      const cleanup = () => {
        if (map && typeof map.dispose === 'function') {
          map.dispose();
        }
      };
      return cleanup;
    }
  }, [map]);

  return (
    <div className="w-full h-400 relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="spinner"></div>
            <p className="mt-2 text-sm text-gray-600">Loading map...</p>
          </div>
        </div>
      )}
      {apiError && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-50">
          <div className="text-center text-red-800">
            <p className="font-semibold">Map Error</p>
            <p className="text-sm">{apiError}</p>
            <button className="mt-2 px-4 py-2 bg-red-600 text-white rounded" onClick={() => setRetryCount(0)}>
              Retry
            </button>
          </div>
        </div>
      )}
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
};
export default GoogleMapsJamaica;