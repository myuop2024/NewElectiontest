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

export default function GoogleMapsParishHeatMapSimple({
  parishStats,
  selectedMetric,
  onParishSelect,
  selectedParish
}: GoogleMapsParishHeatMapProps) {
  console.log('[DEBUG] GoogleMapsParishHeatMapSimple props:', { parishStats, selectedMetric, selectedParish });
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [apiKeyLoading, setApiKeyLoading] = useState(true);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);

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
  // 1) Fetch the API key once when the component mounts
  useEffect(() => {
    console.log('[PARISH MAPS DEBUG] Component mounted, starting API key fetch');
    
    const fetchApiKey = async () => {
      // Check environment variable first
      const envApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      console.log('[PARISH MAPS DEBUG] Environment API key check:', envApiKey ? 'Found' : 'Not found');
      
      if (envApiKey) {
        console.log('[PARISH MAPS DEBUG] Using environment variable for Google Maps API key');
        setApiKey(envApiKey);
        return;
      }

      try {
        console.log('[PARISH MAPS DEBUG] Fetching API key from server...');
        setApiKeyLoading(true);
        const response = await fetch('/api/settings/google-maps-api');
        console.log('[PARISH MAPS DEBUG] Server response status:', response.status);
        
        if (!response.ok) throw new Error('Failed to fetch API key');
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

  // 2) Once we have a valid API key, load the Google Maps script *once*
  useEffect(() => {
    console.log('[PARISH MAPS DEBUG] API key effect triggered');
    console.log('[PARISH MAPS DEBUG] API key exists:', !!apiKey);
    console.log('[PARISH MAPS DEBUG] mapRef.current exists:', !!mapRef.current);
    
    if (!apiKey || !mapRef.current) {
      console.log('[PARISH MAPS DEBUG] Missing requirements - apiKey:', !!apiKey, 'mapRef:', !!mapRef.current);
      return;
    }

    const initMap = () => {
      console.log('[PARISH MAPS DEBUG] initMap called');
      console.log('[PARISH MAPS DEBUG] google object available:', typeof google !== 'undefined');
      console.log('[PARISH MAPS DEBUG] google.maps available:', typeof google !== 'undefined' && !!google.maps);
      
      try {
        console.log('[PARISH MAPS DEBUG] Creating Google Maps instance...');
        const mapInstance = new google.maps.Map(mapRef.current!, {
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
            }
          ]
        });

        console.log('[PARISH MAPS DEBUG] Google Maps instance created successfully:', mapInstance);
        setMap(mapInstance);
        console.log('[PARISH MAPS DEBUG] Map state set, initialization complete');
      } catch (error) {
        console.error('[PARISH MAPS DEBUG] Error initializing Google Maps:', error);
      }
    };

    // If Maps already loaded, initialise immediately
    if (typeof google !== 'undefined' && google.maps) {
      console.log('[PARISH MAPS DEBUG] Google Maps already loaded, initializing immediately');
      initMap();
      return;
    }

    console.log('[PARISH MAPS DEBUG] Google Maps not loaded, creating script');

    // Otherwise, inject the script (prevent duplicates)
    const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
    if (existingScript) {
      console.log('[PARISH MAPS DEBUG] Script already exists, adding load listener');
      existingScript.addEventListener('load', initMap);
      return;
    }

    console.log('[PARISH MAPS DEBUG] Creating new script tag');
    const script = document.createElement('script');
    const scriptUrl = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry`;
    console.log('[PARISH MAPS DEBUG] Script URL:', scriptUrl);
    
    script.src = scriptUrl;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      console.log('[PARISH MAPS DEBUG] Google Maps script loaded successfully');
      initMap();
    };
    script.onerror = (error) => {
      console.error('[PARISH MAPS DEBUG] Failed to load Google Maps API:', error);
    };
    
    console.log('[PARISH MAPS DEBUG] Adding script to document head');
    document.head.appendChild(script);

    // Cleanup: remove listener if component unmounts before load
    return () => {
      script.removeEventListener('load', initMap);
    };
  }, [apiKey]);
  
  // Update parish markers
  useEffect(() => {
    if (!map) return;

    // Clear existing markers
    markers.forEach(marker => marker.setMap(null));
    const newMarkers: google.maps.Marker[] = [];

    // Create markers for each parish
    Object.entries(PARISH_COORDINATES).forEach(([parishName, coords]) => {
      const value = getMetricValue(parishName);
      const color = getMarkerColor(value);
      console.log('[DEBUG] Creating marker:', { parishName, coords, value, color });
      
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
        console.error('[DEBUG] Error creating marker for', parishName, markerError);
      }
    });

    setMarkers(newMarkers);
  }, [map, parishStats, selectedMetric, selectedParish, onParishSelect]);

  if (apiKeyLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading Google Maps...</p>
        </div>
      </div>
    );
  }

  if (apiKeyError || !apiKey) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
        <div className="text-center p-4">
          <p className="text-red-600 dark:text-red-400">{apiKeyError || 'Google Maps API key not available'}</p>
        </div>
      </div>
    );
  }

  if (!map) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading Jamaica Geography...</p>
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