import { useState, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";

// Jamaica parish center coordinates
const PARISH_COORDINATES = {
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

interface ParishStats {
  parishId: number;
  parishName: string;
  incidents: number;
  turnout: number;
  observers: number;
  critical: number;
}

interface GoogleMapsParishHeatMapProps {
  parishStats: ParishStats[];
  selectedMetric: "incidents" | "turnout" | "observers" | "critical";
  onParishSelect: (parish: string) => void;
  selectedParish: string | null;
}

// Global Google Maps loading state
let googleMapsLoading = false;
let googleMapsLoaded = false;
let googleMapsCallbacks: (() => void)[] = [];

export default function GoogleMapsParishHeatMapSimple({
  parishStats,
  selectedMetric,
  onParishSelect,
  selectedParish
}: GoogleMapsParishHeatMapProps) {
  console.log('[PARISH MAPS DEBUG] Component mounted with props:', { parishStats, selectedMetric, selectedParish });
  
  // Test mode indicator
  const isTestMode = import.meta.env.DEV && !import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [apiKeyLoading, setApiKeyLoading] = useState(true);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  // Get metric value for a parish
  const getMetricValue = (parishName: string): number => {
    const parish = parishStats.find(p => p.parishName === parishName);
    if (!parish) return 0;
    
    switch (selectedMetric) {
      case "incidents": return parish.incidents;
      case "turnout": return parish.turnout;
      case "observers": return parish.observers;
      case "critical": return parish.critical;
      default: return 0;
    }
  };

  // Get color based on metric value
  const getMarkerColor = (value: number): string => {
    const maxValue = Math.max(...parishStats.map(p => getMetricValue(p.parishName)));
    const ratio = maxValue > 0 ? value / maxValue : 0;
    
    if (selectedMetric === "incidents" || selectedMetric === "critical") {
      // Red scale for incidents/critical (more = worse)
      if (ratio > 0.7) return "#dc2626"; // Red
      if (ratio > 0.4) return "#f87171"; // Light red
      if (ratio > 0.1) return "#fecaca"; // Very light red
      return "#94a3b8"; // Gray
    } else {
      // Green scale for turnout/observers (more = better)
      if (ratio > 0.7) return "#16a34a"; // Green
      if (ratio > 0.4) return "#4ade80"; // Light green
      if (ratio > 0.1) return "#bbf7d0"; // Very light green
      return "#94a3b8"; // Gray
    }
  };

  // Initialize Google Maps
  const initializeMap = () => {
    console.log('[PARISH MAPS DEBUG] initializeMap called');
    
    if (!mapRef.current) {
      console.error('[PARISH MAPS DEBUG] mapRef.current is null');
      setMapError('Map container not available');
      return;
    }

    if (typeof google === 'undefined' || !google.maps) {
      console.error('[PARISH MAPS DEBUG] Google Maps API not available');
      setMapError('Google Maps API not loaded');
      return;
    }

    try {
      console.log('[PARISH MAPS DEBUG] Creating Google Maps instance...');
      const mapInstance = new google.maps.Map(mapRef.current, {
        zoom: 9,
        center: { lat: 18.1096, lng: -77.2975 }, // Jamaica center
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        styles: [
          {
            featureType: "water",
            elementType: "geometry",
            stylers: [{ color: "#4a90e2" }]
          },
          {
            featureType: "landscape",
            elementType: "geometry",
            stylers: [{ color: "#f5f5f5" }]
          },
          {
            featureType: "road",
            elementType: "geometry",
            stylers: [{ color: "#ffffff" }]
          }
        ],
        zoomControl: true,
        mapTypeControl: true,
        scaleControl: true,
        streetViewControl: false,
        rotateControl: false,
        fullscreenControl: true
      });

      console.log('[PARISH MAPS DEBUG] Google Maps instance created successfully:', mapInstance);
      setMap(mapInstance);
      setMapLoading(false);
      setMapError(null);
    } catch (error) {
      console.error('[PARISH MAPS DEBUG] Error creating Google Maps instance:', error);
      setMapError(`Failed to initialize map: ${error}`);
      setMapLoading(false);
    }
  };

  // Load Google Maps API
  const loadGoogleMapsAPI = (key: string) => {
    console.log('[PARISH MAPS DEBUG] loadGoogleMapsAPI called with key:', key ? 'Present' : 'Missing');
    
    if (googleMapsLoaded) {
      console.log('[PARISH MAPS DEBUG] Google Maps already loaded');
      initializeMap();
      return;
    }

    if (googleMapsLoading) {
      console.log('[PARISH MAPS DEBUG] Google Maps already loading, adding callback');
      googleMapsCallbacks.push(initializeMap);
      return;
    }

    googleMapsLoading = true;
    setMapLoading(true);

    // Check if script already exists
    const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
    if (existingScript) {
      console.log('[PARISH MAPS DEBUG] Script already exists, waiting for load');
      existingScript.addEventListener('load', () => {
        googleMapsLoaded = true;
        googleMapsLoading = false;
        initializeMap();
        googleMapsCallbacks.forEach(callback => callback());
        googleMapsCallbacks = [];
      });
      return;
    }

    // Create new script
    const script = document.createElement('script');
    const scriptUrl = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=geometry&callback=initGoogleMapsCallback`;
    console.log('[PARISH MAPS DEBUG] Creating script with URL:', scriptUrl);
    
    script.src = scriptUrl;
    script.async = true;
    script.defer = true;
    
    // Set up global callback
    (window as any).initGoogleMapsCallback = () => {
      console.log('[PARISH MAPS DEBUG] Google Maps API loaded via callback');
      googleMapsLoaded = true;
      googleMapsLoading = false;
      initializeMap();
      googleMapsCallbacks.forEach(callback => callback());
      googleMapsCallbacks = [];
    };

    script.onerror = (error) => {
      console.error('[PARISH MAPS DEBUG] Failed to load Google Maps API:', error);
      setMapError('Failed to load Google Maps API');
      setMapLoading(false);
      googleMapsLoading = false;
    };

    document.head.appendChild(script);
  };

  // 1) Fetch the API key once when the component mounts
  useEffect(() => {
    console.log('[PARISH MAPS DEBUG] Component mounted, starting API key fetch');
    
    const fetchApiKey = async () => {
      try {
        setApiKeyLoading(true);
        setApiKeyError(null);
        
        // Check environment variable first
        const envApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
        console.log('[PARISH MAPS DEBUG] Environment API key check:', envApiKey ? 'Found' : 'Not found');
        
        if (envApiKey) {
          console.log('[PARISH MAPS DEBUG] Using environment variable for Google Maps API key');
          setApiKey(envApiKey);
          setApiKeyLoading(false);
          return;
        }

        // Development fallback - only for testing
        if (import.meta.env.DEV) {
          console.log('[PARISH MAPS DEBUG] Development mode detected, using fallback API key for testing');
          setApiKey('AIzaSyB41DRuKWuJdqpD6Gxbe4VkH0qAEpjXhVc'); // Development test key
          setApiKeyLoading(false);
          return;
        }

        // Fallback to server API
        console.log('[PARISH MAPS DEBUG] Fetching API key from server...');
        const response = await fetch('/api/settings/google-maps-api');
        console.log('[PARISH MAPS DEBUG] Server response status:', response.status);
        
        if (!response.ok) throw new Error(`Server responded with ${response.status}`);
        
        const data = await response.json();
        console.log('[PARISH MAPS DEBUG] Server response data:', data);
        
        if (data.hasKey && data.apiKey) {
          console.log('[PARISH MAPS DEBUG] Using server-provided Google Maps API key');
          setApiKey(data.apiKey);
        } else {
          console.error('[PARISH MAPS DEBUG] No API key available from server');
          setApiKeyError('Google Maps API key is not configured. Please contact your administrator.');
        }
      } catch (error) {
        console.error('[PARISH MAPS DEBUG] Error fetching Google Maps API key:', error);
        setApiKeyError('Failed to load Google Maps API configuration.');
      } finally {
        setApiKeyLoading(false);
      }
    };

    fetchApiKey();
  }, []);

  // 2) Once we have a valid API key, load the Google Maps script
  useEffect(() => {
    console.log('[PARISH MAPS DEBUG] API key effect triggered');
    console.log('[PARISH MAPS DEBUG] API key exists:', !!apiKey);
    console.log('[PARISH MAPS DEBUG] mapRef.current exists:', !!mapRef.current);
    
    if (!apiKey) {
      console.log('[PARISH MAPS DEBUG] No API key available yet');
      return;
    }

    if (!mapRef.current) {
      console.log('[PARISH MAPS DEBUG] Map ref not ready, will retry');
      return;
    }

    console.log('[PARISH MAPS DEBUG] Starting Google Maps API load');
    loadGoogleMapsAPI(apiKey);
  }, [apiKey]);

  // Update parish markers when map or data changes
  useEffect(() => {
    if (!map || !google.maps) {
      console.log('[PARISH MAPS DEBUG] Map or Google Maps not ready for markers');
      return;
    }

    console.log('[PARISH MAPS DEBUG] Updating parish markers');
    console.log('[PARISH MAPS DEBUG] Parish stats:', parishStats);

    // Clear existing markers
    markers.forEach(marker => marker.setMap(null));
    const newMarkers: google.maps.Marker[] = [];

    // Create markers for each parish
    Object.entries(PARISH_COORDINATES).forEach(([parishName, coords]) => {
      const value = getMetricValue(parishName);
      const color = getMarkerColor(value);
      console.log('[PARISH MAPS DEBUG] Creating marker:', { parishName, coords, value, color });
      
      // Create custom icon
      const icon = {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: color,
        fillOpacity: 0.8,
        stroke: selectedParish === parishName ? '#000000' : '#ffffff',
        strokeWeight: selectedParish === parishName ? 3 : 2,
        scale: selectedParish === parishName ? 15 : 12
      };

      try {
        const marker = new google.maps.Marker({
          position: coords,
          map: map,
          title: parishName,
          icon: icon
        });

        // Info window content
        const parish = parishStats.find(p => p.parishName === parishName);
        const infoContent = parish ? `
          <div style="padding: 8px; min-width: 200px;">
            <h3 style="margin: 0 0 8px 0; color: #1f2937;">${parishName}</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 14px;">
              <div><strong>Incidents:</strong> ${parish.incidents}</div>
              <div><strong>Turnout:</strong> ${parish.turnout}%</div>
              <div><strong>Observers:</strong> ${parish.observers}</div>
              <div><strong>Critical:</strong> ${parish.critical}</div>
            </div>
          </div>
        ` : `<div style="padding: 8px;"><h3>${parishName}</h3><p>No data available</p></div>`;

        const infoWindow = new google.maps.InfoWindow({
          content: infoContent
        });

        marker.addListener('click', () => {
          onParishSelect(parishName);
          infoWindow.open(map, marker);
        });

        newMarkers.push(marker);
      } catch (markerError) {
        console.error('[PARISH MAPS DEBUG] Error creating marker for', parishName, markerError);
      }
    });

    setMarkers(newMarkers);
    console.log('[PARISH MAPS DEBUG] Markers updated:', newMarkers.length);
  }, [map, parishStats, selectedMetric, selectedParish, onParishSelect]);

  // Loading states
  if (apiKeyLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading Google Maps configuration...</p>
        </div>
      </div>
    );
  }

  if (apiKeyError || !apiKey) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
        <div className="text-center p-6">
          <div className="text-red-600 dark:text-red-400 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">Map Configuration Error</h3>
          <p className="text-red-600 dark:text-red-400 text-sm">{apiKeyError || 'Google Maps API key not available'}</p>
        </div>
      </div>
    );
  }

  if (mapLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading Jamaica Map...</p>
        </div>
      </div>
    );
  }

  if (mapError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
        <div className="text-center p-6">
          <div className="text-yellow-600 dark:text-yellow-400 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-2">Map Loading Error</h3>
          <p className="text-yellow-600 dark:text-yellow-400 text-sm">{mapError}</p>
        </div>
      </div>
    );
  }

  if (!map) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Initializing Jamaica Geography...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <div 
        ref={mapRef} 
        className="w-full h-full rounded-lg overflow-hidden"
        style={{ minHeight: '400px' }}
      />
      
      {/* Map UI Elements - Only show when map is loaded */}
      {map && (
        <>
          {/* Test Mode Success Indicator */}
          {isTestMode && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20">
              <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-300">
                ✅ Map Loaded Successfully (Test Mode)
              </Badge>
            </div>
          )}

          {/* Metric indicator */}
          <div className="absolute top-4 right-4 z-10">
            <Badge variant="secondary" className="bg-white/90 text-gray-800 shadow-lg">
              {selectedMetric === "incidents" && "Incident Count"}
              {selectedMetric === "turnout" && "Voter Turnout (%)"}
              {selectedMetric === "observers" && "Active Observers"}
              {selectedMetric === "critical" && "Critical Incidents"}
            </Badge>
          </div>

          {/* Instructions */}
          <div className="absolute bottom-4 left-4 z-10">
            <div className="bg-white/90 dark:bg-gray-800/90 p-3 rounded-lg shadow-lg max-w-xs">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Click on any parish marker to view detailed statistics and select it for analysis.
              </p>
            </div>
          </div>

          {/* Legend */}
          <div className="absolute top-4 left-4 z-10 bg-white/90 dark:bg-gray-800/90 p-3 rounded-lg shadow-lg">
            <h4 className="text-sm font-semibold mb-2">Heat Map Legend</h4>
            <div className="space-y-1">
              {[
                { label: "High", color: selectedMetric === "incidents" ? "#dc2626" : selectedMetric === "turnout" ? "#16a34a" : selectedMetric === "observers" ? "#2563eb" : "#ea580c" },
                { label: "Medium", color: selectedMetric === "incidents" ? "#f87171" : selectedMetric === "turnout" ? "#4ade80" : selectedMetric === "observers" ? "#60a5fa" : "#fb923c" },
                { label: "Low", color: selectedMetric === "incidents" ? "#fecaca" : selectedMetric === "turnout" ? "#bbf7d0" : selectedMetric === "observers" ? "#bfdbfe" : "#fed7aa" },
                { label: "None", color: "#94a3b8" }
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded-full border border-gray-300"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs text-gray-700 dark:text-gray-300">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}