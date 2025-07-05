import { useState, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";

// HERE Maps parish center coordinates for Jamaica
const PARISH_COORDINATES = {
  "Kingston": { lat: 17.9712, lng: -76.7932 },
  "St. Andrew": { lat: 18.0061, lng: -76.7466 },
  "St. Thomas": { lat: 17.9000, lng: -76.2000 },
  "Portland": { lat: 18.2000, lng: -76.4500 },
  "St. Mary": { lat: 18.3000, lng: -76.9000 },
  "St. Ann": { lat: 18.4500, lng: -77.2000 },
  "Trelawny": { lat: 18.3500, lng: -77.6000 },
  "St. James": { lat: 18.4700, lng: -77.9200 },
  "Hanover": { lat: 18.4000, lng: -78.1300 },
  "Westmoreland": { lat: 18.3000, lng: -78.1500 },
  "St. Elizabeth": { lat: 18.0500, lng: -77.9000 },
  "Manchester": { lat: 18.0500, lng: -77.5000 },
  "Clarendon": { lat: 17.9500, lng: -77.2500 },
  "St. Catherine": { lat: 17.9900, lng: -76.9500 }
};

interface ParishStats {
  parishId: number;
  parishName: string;
  totalIncidents: number;
  criticalIncidents: number;
  activeObservers: number;
  pollingStations: number;
  voterTurnout: number;
  weatherCondition: string;
  trafficStatus: string;
  lastUpdated: string;
  incidentTypes: { [key: string]: number };
  hourlyTrends: { hour: number; incidents: number; turnout: number }[];
}

interface HereMapsParishHeatMapProps {
  parishStats: ParishStats[];
  selectedMetric: string;
  onParishSelect: (parishName: string) => void;
  selectedParish: string | null;
}

declare global {
  interface Window {
    H: any;
  }
}

export default function HereMapsParishHeatMap({
  parishStats,
  selectedMetric,
  onParishSelect,
  selectedParish
}: HereMapsParishHeatMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [markers, setMarkers] = useState<any[]>([]);
  const [platform, setPlatform] = useState<any>(null);

  // Get HERE Maps API key from settings
  const { data: settings } = useQuery({
    queryKey: ["/api/settings/app"],
  });

  // Get metric value for a parish
  const getMetricValue = (parish: ParishStats, metric: string): number => {
    switch (metric) {
      case "incidents":
        return parish.totalIncidents;
      case "turnout":
        return parish.voterTurnout;
      case "observers":
        return parish.activeObservers;
      case "critical":
        return parish.criticalIncidents;
      default:
        return 0;
    }
  };

  // Get max value for normalization
  const getMaxValue = (data: ParishStats[], metric: string): number => {
    if (!data || data.length === 0) return 1;
    
    const values = data.map(parish => getMetricValue(parish, metric));
    return Math.max(...values, 1);
  };

  // Get heat map color based on metric value
  const getHeatMapColor = (value: number, maxValue: number, metric: string): string => {
    if (maxValue === 0) return "#94a3b8";
    
    const intensity = Math.min(value / maxValue, 1);
    
    switch (metric) {
      case "incidents":
        return intensity > 0.7 ? "#dc2626" : intensity > 0.4 ? "#ef4444" : intensity > 0.1 ? "#f87171" : "#fecaca";
      case "turnout":
        return intensity > 0.7 ? "#16a34a" : intensity > 0.4 ? "#22c55e" : intensity > 0.1 ? "#4ade80" : "#bbf7d0";
      case "observers":
        return intensity > 0.7 ? "#2563eb" : intensity > 0.4 ? "#3b82f6" : intensity > 0.1 ? "#60a5fa" : "#bfdbfe";
      case "critical":
        return intensity > 0.7 ? "#ea580c" : intensity > 0.4 ? "#f97316" : intensity > 0.1 ? "#fb923c" : "#fed7aa";
      default:
        return "#94a3b8";
    }
  };

  // Initialize HERE Maps
  useEffect(() => {
    if (!mapRef.current) return;

    const initializeMap = () => {
      // Get HERE API key from settings
      const hereApiKey = settings?.here_api_key;
      if (!hereApiKey) {
        console.warn('HERE API key not configured in settings');
        return;
      }

      // Initialize HERE Maps platform
      const platformInstance = new window.H.service.Platform({
        'apikey': hereApiKey
      });

      const defaultMapTypes = platformInstance.createDefaultMapTypes();

      // Initialize map
      const mapInstance = new window.H.Map(
        mapRef.current,
        defaultMapTypes.vector.normal.map,
        {
          zoom: 9,
          center: { lat: 18.1096, lng: -77.2975 } // Center of Jamaica
        }
      );

      // Make the map interactive
      const behavior = new window.H.mapevents.Behavior(new window.H.mapevents.MapEvents(mapInstance));
      const ui = new window.H.ui.UI.createDefault(mapInstance);

      setMap(mapInstance);
      setPlatform(platformInstance);
    };

    // Load HERE Maps API if not already loaded
    if (typeof window.H !== 'undefined') {
      initializeMap();
    } else {
      const script = document.createElement('script');
      script.src = 'https://js.api.here.com/v3/3.1/mapsjs-core.js';
      script.async = true;
      script.onload = () => {
        // Load additional HERE Maps modules
        const modules = [
          'https://js.api.here.com/v3/3.1/mapsjs-service.js',
          'https://js.api.here.com/v3/3.1/mapsjs-ui.js',
          'https://js.api.here.com/v3/3.1/mapsjs-mapevents.js'
        ];

        let loadedModules = 0;
        modules.forEach(src => {
          const moduleScript = document.createElement('script');
          moduleScript.src = src;
          moduleScript.async = true;
          moduleScript.onload = () => {
            loadedModules++;
            if (loadedModules === modules.length) {
              initializeMap();
            }
          };
          document.head.appendChild(moduleScript);
        });
      };
      document.head.appendChild(script);
    }
  }, [settings]);

  // Update parish markers with heat map data
  useEffect(() => {
    if (!map || !parishStats.length) return;

    // Clear existing markers
    markers.forEach(marker => map.getObjects().remove(marker));

    const maxValue = getMaxValue(parishStats, selectedMetric);
    const newMarkers: any[] = [];

    // Add parish markers with heat map colors
    Object.entries(PARISH_COORDINATES).forEach(([parishName, coords]) => {
      const parishData = parishStats.find(p => p.parishName === parishName);
      const value = parishData ? getMetricValue(parishData, selectedMetric) : 0;
      const color = getHeatMapColor(value, maxValue, selectedMetric);
      const isSelected = selectedParish === parishName;

      // Create marker with colored circle
      const markerSize = 20 + (value / maxValue) * 15; // Size based on value
      const svgMarkup = `
        <svg width="${markerSize * 2}" height="${markerSize * 2}" xmlns="http://www.w3.org/2000/svg">
          <circle cx="${markerSize}" cy="${markerSize}" r="${markerSize - 2}" 
                  fill="${color}" 
                  stroke="${isSelected ? '#2563eb' : '#374151'}" 
                  stroke-width="${isSelected ? '3' : '2'}" 
                  opacity="0.8"/>
          <text x="${markerSize}" y="${markerSize - 5}" text-anchor="middle" 
                font-family="Arial" font-size="8" font-weight="bold" fill="#000">
            ${parishName.split(' ').map(word => word.charAt(0)).join('')}
          </text>
          <text x="${markerSize}" y="${markerSize + 8}" text-anchor="middle" 
                font-family="Arial" font-size="10" font-weight="bold" fill="#000">
            ${value}
          </text>
        </svg>
      `;

      const icon = new window.H.map.Icon(svgMarkup, { size: { w: markerSize * 2, h: markerSize * 2 } });
      const marker = new window.H.map.Marker(coords, { icon });

      // Add click event
      marker.addEventListener('tap', () => {
        onParishSelect(parishName);
        
        // Show info bubble
        if (parishData) {
          const bubble = new window.H.ui.InfoBubble({
            content: `
              <div style="padding: 10px; font-family: system-ui;">
                <h3 style="margin: 0 0 10px 0; color: #1f2937; font-size: 16px; font-weight: 600;">
                  ${parishName} Parish
                </h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
                  <div>
                    <div style="font-size: 12px; color: #6b7280;">Total Incidents</div>
                    <div style="font-size: 16px; font-weight: 600; color: #dc2626;">${parishData.totalIncidents}</div>
                  </div>
                  <div>
                    <div style="font-size: 12px; color: #6b7280;">Critical</div>
                    <div style="font-size: 16px; font-weight: 600; color: #ea580c;">${parishData.criticalIncidents}</div>
                  </div>
                  <div>
                    <div style="font-size: 12px; color: #6b7280;">Voter Turnout</div>
                    <div style="font-size: 16px; font-weight: 600; color: #059669;">${parishData.voterTurnout}%</div>
                  </div>
                  <div>
                    <div style="font-size: 12px; color: #6b7280;">Active Observers</div>
                    <div style="font-size: 16px; font-weight: 600; color: #2563eb;">${parishData.activeObservers}</div>
                  </div>
                </div>
                <div style="font-size: 11px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 8px;">
                  Weather: ${parishData.weatherCondition} | Traffic: ${parishData.trafficStatus}
                </div>
              </div>
            `
          }, coords);
          
          map.getViewPort().addBubble(bubble);
        }
      });

      map.addObject(marker);
      newMarkers.push(marker);
    });

    setMarkers(newMarkers);
  }, [map, parishStats, selectedMetric, selectedParish, onParishSelect]);

  // Show configuration message if HERE Maps API is not available
  const hereApiKey = settings?.here_api_key;
  if (!settings) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
        <div className="text-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!hereApiKey || settings.here_maps_enabled !== 'true') {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
        <div className="text-center p-8">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v8a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 2v6h10V6H5z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            HERE Maps Not Configured
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Please configure HERE Maps API in Admin Settings to view the interactive parish map.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Go to Admin Settings → APIs & Integrations → HERE Maps to set up the API key.
          </p>
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
    </div>
  );
}