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
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
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

  // Cloud-optimized Google Maps initialization
  useEffect(() => {
    console.log('[PARISH MAPS] Starting cloud-optimized Google Maps initialization');
    
    let retryCount = 0;
    const maxRetries = 30;
    let timeoutId: NodeJS.Timeout;
    
    const initializeGoogleMaps = async () => {
      try {
        console.log('[PARISH MAPS] Fetching API key from server...');
        
        // Get API key from server
        const response = await fetch('/api/settings/google-maps-api');
        if (!response.ok) {
          throw new Error(`API key fetch failed: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('[PARISH MAPS] API key response:', data);
        
        if (!data.configured || !data.apiKey) {
          throw new Error('Google Maps API key not configured');
        }
        
        const apiKey = data.apiKey;
        console.log('[PARISH MAPS] API key obtained successfully');
        
        // Load Google Maps script if not already loaded
        const loadMapsScript = () => {
          return new Promise<void>((resolve, reject) => {
            // Check if already loaded
            if (typeof google !== 'undefined' && google.maps) {
              console.log('[PARISH MAPS] Google Maps already loaded');
              resolve();
              return;
            }
            
            // Check for existing script
            const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
            if (existingScript) {
              console.log('[PARISH MAPS] Script exists, waiting for load...');
              existingScript.addEventListener('load', () => resolve());
              existingScript.addEventListener('error', () => reject(new Error('Script load failed')));
              return;
            }
            
            // Create new script
            console.log('[PARISH MAPS] Creating Google Maps script');
            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry`;
            script.async = true;
            script.defer = true;
            
            script.onload = () => {
              console.log('[PARISH MAPS] Google Maps script loaded successfully');
              resolve();
            };
            
            script.onerror = () => {
              console.error('[PARISH MAPS] Failed to load Google Maps script');
              reject(new Error('Google Maps script failed to load'));
            };
            
            document.head.appendChild(script);
          });
        };
        
        // Load the script
        await loadMapsScript();
        console.log('[PARISH MAPS] Script loading complete, attempting map initialization');
        
        // Initialize map with retry logic
        const initializeMap = () => {
          console.log(`[PARISH MAPS] Map initialization attempt ${retryCount + 1}/${maxRetries}`);
          
          if (!mapRef.current) {
            retryCount++;
            if (retryCount < maxRetries) {
              console.log('[PARISH MAPS] DOM not ready, retrying in 200ms...');
              timeoutId = setTimeout(initializeMap, 200);
              return;
            } else {
              throw new Error('Map container never became available');
            }
          }
          
          if (typeof google === 'undefined' || !google.maps) {
            throw new Error('Google Maps API not available after script load');
          }
          
          console.log('[PARISH MAPS] Creating map instance...');
          
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
            ]
          });
          
          console.log('[PARISH MAPS] ✅ Map created successfully!');
          setMap(mapInstance);
          setIsLoading(false);
          setApiError(null);
        };
        
        // Start map initialization
        initializeMap();
        
      } catch (error) {
        console.error('[PARISH MAPS] ❌ Initialization failed:', error);
        setApiError(error instanceof Error ? error.message : 'Failed to initialize Google Maps');
        setIsLoading(false);
      }
    };
    
    // Start the initialization process
    initializeGoogleMaps();
    
    // Cleanup function
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  // Update parish markers when map or data changes
  useEffect(() => {
    if (!map || typeof google === 'undefined') return;
    
    console.log('[PARISH MAPS] Updating parish markers');
    
    // Clear existing markers
    markers.forEach(marker => marker.setMap(null));
    const newMarkers: google.maps.Marker[] = [];
    
    // Create markers for each parish
    Object.entries(PARISH_COORDINATES).forEach(([parishName, coords]) => {
      const value = getMetricValue(parishName);
      const color = getMarkerColor(value);
      
      // Create custom marker icon
      const icon = {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: color,
        fillOpacity: 0.8,
        stroke: selectedParish === parishName ? '#000000' : '#ffffff',
        strokeWeight: selectedParish === parishName ? 3 : 2,
        scale: selectedParish === parishName ? 16 : 12
      };
      
      const marker = new google.maps.Marker({
        position: coords,
        map: map,
        icon: icon,
        title: `${parishName}: ${value} ${selectedMetric}`
      });
      
      // Add click listener
      marker.addListener('click', () => {
        onParishSelect(parishName);
      });
      
      newMarkers.push(marker);
    });
    
    setMarkers(newMarkers);
    console.log('[PARISH MAPS] Parish markers updated');
  }, [map, parishStats, selectedMetric, selectedParish, onParishSelect]);

  if (apiError) {
    return (
      <div className="flex items-center justify-center h-[400px] border rounded-lg bg-red-50 dark:bg-red-950/20">
        <div className="text-center p-6">
          <div className="text-red-600 dark:text-red-400 mb-2">
            ❌ Google Maps Error
          </div>
          <div className="text-sm text-red-500 dark:text-red-400">
            {apiError}
          </div>
          <div className="text-xs text-gray-500 mt-2">
            Please check your Google Maps API configuration
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[400px] border rounded-lg bg-blue-50 dark:bg-blue-950/20">
        <div className="text-center p-6">
          <div className="animate-spin text-2xl mb-2">🗺️</div>
          <div className="text-blue-600 dark:text-blue-400 mb-2">
            Loading Jamaica Parish Map
          </div>
          <div className="text-sm text-blue-500 dark:text-blue-400">
            Initializing Google Maps...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Map Container */}
      <div 
        ref={mapRef} 
        className="w-full h-[400px] border rounded-lg shadow-sm"
        style={{ minHeight: '400px' }}
      />
      
      {/* Legend */}
      <div className="flex flex-wrap gap-2 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-4">
          {selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)} Level:
        </div>
        <Badge variant="outline" className="text-xs">
          <div className="w-3 h-3 rounded-full bg-gray-400 mr-2"></div>
          No Data
        </Badge>
        {selectedMetric === "incidents" || selectedMetric === "critical" ? (
          <>
            <Badge variant="outline" className="text-xs">
              <div className="w-3 h-3 rounded-full bg-red-100 mr-2"></div>
              Low
            </Badge>
            <Badge variant="outline" className="text-xs">
              <div className="w-3 h-3 rounded-full bg-red-300 mr-2"></div>
              Medium
            </Badge>
            <Badge variant="outline" className="text-xs">
              <div className="w-3 h-3 rounded-full bg-red-600 mr-2"></div>
              High
            </Badge>
          </>
        ) : (
          <>
            <Badge variant="outline" className="text-xs">
              <div className="w-3 h-3 rounded-full bg-green-100 mr-2"></div>
              Low
            </Badge>
            <Badge variant="outline" className="text-xs">
              <div className="w-3 h-3 rounded-full bg-green-300 mr-2"></div>
              Medium
            </Badge>
            <Badge variant="outline" className="text-xs">
              <div className="w-3 h-3 rounded-full bg-green-600 mr-2"></div>
              High
            </Badge>
          </>
        )}
      </div>
    </div>
  );
}