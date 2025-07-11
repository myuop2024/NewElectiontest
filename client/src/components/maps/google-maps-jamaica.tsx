import { useState, useEffect, useRef } from "react";

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

export default function GoogleMapsJamaica({
  parishStats,
  selectedMetric,
  onParishSelect,
  selectedParish
}: GoogleMapsJamaicaProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [markers, setMarkers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

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
    const maxValue = Math.max(...parishStats.map(p => getMetricValue(p.parishName)), 1);
    const ratio = value / maxValue;
    
    if (selectedMetric === "incidents" || selectedMetric === "critical") {
      // Red scale for incidents/critical
      if (ratio > 0.7) return "#dc2626";
      if (ratio > 0.4) return "#f87171";
      if (ratio > 0.1) return "#fecaca";
      return "#94a3b8";
    } else {
      // Green/Blue scale for turnout/observers
      if (ratio > 0.7) return "#16a34a";
      if (ratio > 0.4) return "#4ade80";
      if (ratio > 0.1) return "#bbf7d0";
      return "#94a3b8";
    }
  };

  // Initialize Google Maps
  useEffect(() => {
    console.log('[MAPS DEBUG] Component mounted - starting Google Maps initialization');
    console.log('[MAPS DEBUG] mapRef.current exists:', !!mapRef.current);
    console.log('[MAPS DEBUG] window.google exists:', typeof window.google !== 'undefined');
    console.log('[MAPS DEBUG] window.google.maps exists:', typeof window.google !== 'undefined' && !!window.google.maps);
    
    let retryCount = 0;
    const maxRetries = 50; // Maximum 5 seconds of retries
    
    const initializeMap = () => {
      console.log('[MAPS DEBUG] Starting map initialization process');
      
      // Robust initialization with retry logic
      const attemptInitialization = () => {
        console.log(`[MAPS DEBUG] Initialization attempt #${retryCount + 1}`);
        console.log('[MAPS DEBUG] mapRef.current:', !!mapRef.current);
        console.log('[MAPS DEBUG] window.google:', typeof window.google !== 'undefined');
        
        if (!mapRef.current) {
          retryCount++;
          if (retryCount < maxRetries) {
            console.log(`[MAPS DEBUG] DOM not ready, retrying in 100ms (attempt ${retryCount}/${maxRetries})`);
            setTimeout(attemptInitialization, 100);
            return;
          } else {
            console.error('[MAPS DEBUG] Max retries reached - DOM element never became available');
            setApiError('Map container failed to initialize');
            setIsLoading(false);
            return;
          }
        }
        
        if (!window.google || !window.google.maps) {
          console.error('[MAPS DEBUG] Google Maps API not available - cannot initialize map');
          setApiError('Google Maps API not loaded');
          setIsLoading(false);
          return;
        }

        try {
          console.log('[MAPS DEBUG] Creating Google Maps instance...');
          
          const mapInstance = new window.google.maps.Map(mapRef.current, {
            zoom: 9,
            center: { lat: 18.1096, lng: -77.2975 }, // Center of Jamaica
            mapTypeId: window.google.maps.MapTypeId.ROADMAP,
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
            ]
          });

          console.log('[MAPS DEBUG] ✅ Google Maps instance created successfully!');
          setMap(mapInstance);
          setIsLoading(false);
          setApiError(null);
          console.log('[MAPS DEBUG] ✅ Map initialization completed successfully');
        } catch (error) {
          console.error('[MAPS DEBUG] ❌ Error creating Google Maps instance:', error);
          setApiError('Failed to initialize map: ' + (error instanceof Error ? error.message : 'Unknown error'));
          setIsLoading(false);
        }
      };
      
      // Start initialization attempt
      attemptInitialization();
    };

    // Load Google Maps API if not already loaded
    if (typeof window.google !== 'undefined' && window.google.maps) {
      console.log('[MAPS DEBUG] Google Maps API already loaded, initializing map immediately');
      initializeMap();
    } else {
      console.log('[MAPS DEBUG] Google Maps API not loaded, fetching API key and loading script');
      
      // Create async function to handle API key fetching
      const loadGoogleMaps = async () => {
        console.log('[MAPS DEBUG] Starting API key fetching process');
        const script = document.createElement('script');
        let apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
        
        console.log('[MAPS DEBUG] Environment API key:', apiKey ? 'Found' : 'Not found');
        
        // Fallback to fetch from server if not in environment
        if (!apiKey) {
          console.log('[MAPS DEBUG] Fetching API key from server...');
          try {
            const response = await fetch('/api/settings/google-maps-api');
            console.log('[MAPS DEBUG] Server response status:', response.status);
            const data = await response.json();
            console.log('[MAPS DEBUG] Server response data:', data);
            if (data.configured && data.apiKey) {
              apiKey = data.apiKey;
              console.log('[MAPS DEBUG] API key retrieved from server successfully');
            }
          } catch (error) {
            console.error('[MAPS DEBUG] Failed to fetch Google Maps API key from server:', error);
          }
        }
        
        if (!apiKey) {
          console.error('[MAPS DEBUG] No API key available - cannot load Google Maps');
          setIsLoading(false);
          setApiError('Google Maps API key is not configured. Please contact your administrator.');
          return;
        }
        
        const scriptUrl = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry&loading=async`;
        console.log('[MAPS DEBUG] Loading Google Maps script from:', scriptUrl);
        
        script.src = scriptUrl;
        script.async = true;
        script.defer = true;
        script.onload = () => {
          console.log('[MAPS DEBUG] Google Maps script loaded successfully');
          initializeMap();
        };
        script.onerror = (error) => {
          console.error('[MAPS DEBUG] Failed to load Google Maps API script:', error);
          setIsLoading(false);
          setApiError('Failed to load Google Maps API');
        };
        
        // Avoid duplicate script loading
        const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
        if (!existingScript) {
          console.log('[MAPS DEBUG] Adding script to document head');
          document.head.appendChild(script);
        } else {
          console.log('[MAPS DEBUG] Script already exists, attempting to initialize');
          initializeMap();
        }
      };
      
      loadGoogleMaps();
    }
  }, []);

  // Update parish markers
  useEffect(() => {
    if (!map || !window.google) return;

    // Clear existing markers
    markers.forEach(marker => marker.setMap(null));
    const newMarkers: any[] = [];

    // Create markers for each parish
    Object.entries(JAMAICA_PARISHES).forEach(([parishName, coords]) => {
      const value = getMetricValue(parishName);
      const color = getMarkerColor(value);
      
      // Create custom marker icon
      const icon = {
        path: window.google.maps.SymbolPath.CIRCLE,
        fillColor: color,
        fillOpacity: 0.8,
        stroke: selectedParish === parishName ? '#000000' : '#ffffff',
        strokeWeight: selectedParish === parishName ? 3 : 2,
        scale: selectedParish === parishName ? 16 : 12
      };

      const marker = new window.google.maps.Marker({
        position: coords,
        map: map,
        title: parishName,
        icon: icon
      });

      // Create info window with parish details
      const parish = parishStats.find(p => p.parishName === parishName);
      const infoContent = parish ? `
        <div style="padding: 8px; min-width: 200px;">
          <h3 style="margin: 0 0 8px 0; color: #1f2937; font-weight: bold;">${parishName}</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 14px;">
            <div><strong>Incidents:</strong> ${parish.incidents}</div>
            <div><strong>Turnout:</strong> ${parish.turnout}%</div>
            <div><strong>Observers:</strong> ${parish.observers}</div>
            <div><strong>Critical:</strong> ${parish.critical}</div>
          </div>
          <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
            <small style="color: #6b7280;">Coordinates: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}</small>
          </div>
        </div>
      ` : `
        <div style="padding: 8px;">
          <h3 style="margin: 0 0 8px 0; color: #1f2937;">${parishName}</h3>
          <p style="margin: 0; color: #6b7280;">No data available</p>
        </div>
      `;

      const infoWindow = new window.google.maps.InfoWindow({
        content: infoContent
      });

      marker.addListener('click', () => {
        onParishSelect(parishName);
        infoWindow.open(map, marker);
      });

      newMarkers.push(marker);
    });

    setMarkers(newMarkers);
  }, [map, parishStats, selectedMetric, selectedParish, onParishSelect]);

  if (isLoading && !apiError) {
    return (
      <div className="w-full h-96 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading Jamaica Map...</p>
        </div>
      </div>
    );
  }

  if (apiError) {
    return (
      <div className="w-full h-96 flex items-center justify-center bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
        <div className="text-center p-6">
          <div className="text-red-600 dark:text-red-400 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">Map Configuration Error</h3>
          <p className="text-red-600 dark:text-red-400 text-sm">{apiError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-96 rounded-lg overflow-hidden">
      <div 
        ref={mapRef} 
        className="w-full h-full"
      />
      
      {/* Map controls overlay */}
      {map && (
        <>
          {/* Legend */}
          <div className="absolute top-4 left-4 bg-white/95 dark:bg-gray-800/95 p-3 rounded-lg shadow-lg backdrop-blur-sm">
            <h4 className="text-sm font-semibold mb-2">
              {selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)} Heat Map
            </h4>
            <div className="space-y-1">
              {[
                { label: "High", color: selectedMetric === "incidents" || selectedMetric === "critical" ? "#dc2626" : "#16a34a" },
                { label: "Medium", color: selectedMetric === "incidents" || selectedMetric === "critical" ? "#f87171" : "#4ade80" },
                { label: "Low", color: selectedMetric === "incidents" || selectedMetric === "critical" ? "#fecaca" : "#bbf7d0" },
                { label: "None", color: "#94a3b8" }
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full border border-gray-300"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs text-gray-700 dark:text-gray-300">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Instructions */}
          <div className="absolute bottom-4 left-4 bg-white/95 dark:bg-gray-800/95 p-3 rounded-lg shadow-lg backdrop-blur-sm max-w-xs">
            <p className="text-xs text-gray-700 dark:text-gray-300">
              Click on parish markers to view detailed statistics. Use map controls to zoom and navigate around Jamaica.
            </p>
          </div>

          {/* Selected parish indicator */}
          {selectedParish && (
            <div className="absolute top-4 right-4 bg-blue-600 text-white p-2 rounded-lg shadow-lg">
              <p className="text-sm font-medium">Selected: {selectedParish}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}