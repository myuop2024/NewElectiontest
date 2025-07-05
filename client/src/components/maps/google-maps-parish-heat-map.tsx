import { useState, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";

// Jamaica parish boundaries and centers (simplified coordinates)
const PARISH_BOUNDARIES = {
  "Kingston": {
    center: { lat: 17.9712, lng: -76.7932 },
    bounds: [
      { lat: 17.9000, lng: -76.8200 },
      { lat: 18.0400, lng: -76.8200 },
      { lat: 18.0400, lng: -76.7400 },
      { lat: 17.9000, lng: -76.7400 }
    ]
  },
  "St. Andrew": {
    center: { lat: 18.0061, lng: -76.7466 },
    bounds: [
      { lat: 17.9000, lng: -76.8500 },
      { lat: 18.1000, lng: -76.8500 },
      { lat: 18.1000, lng: -76.6500 },
      { lat: 17.9000, lng: -76.6500 }
    ]
  },
  "St. Thomas": {
    center: { lat: 17.9000, lng: -76.2000 },
    bounds: [
      { lat: 17.8000, lng: -76.4000 },
      { lat: 18.0000, lng: -76.4000 },
      { lat: 18.0000, lng: -76.0000 },
      { lat: 17.8000, lng: -76.0000 }
    ]
  },
  "Portland": {
    center: { lat: 18.2000, lng: -76.4500 },
    bounds: [
      { lat: 18.0000, lng: -76.6000 },
      { lat: 18.4000, lng: -76.6000 },
      { lat: 18.4000, lng: -76.3000 },
      { lat: 18.0000, lng: -76.3000 }
    ]
  },
  "St. Mary": {
    center: { lat: 18.3000, lng: -76.9000 },
    bounds: [
      { lat: 18.1000, lng: -77.2000 },
      { lat: 18.5000, lng: -77.2000 },
      { lat: 18.5000, lng: -76.6000 },
      { lat: 18.1000, lng: -76.6000 }
    ]
  },
  "St. Ann": {
    center: { lat: 18.4500, lng: -77.2000 },
    bounds: [
      { lat: 18.3000, lng: -77.5000 },
      { lat: 18.6000, lng: -77.5000 },
      { lat: 18.6000, lng: -76.9000 },
      { lat: 18.3000, lng: -76.9000 }
    ]
  },
  "Trelawny": {
    center: { lat: 18.3500, lng: -77.6000 },
    bounds: [
      { lat: 18.2000, lng: -77.8000 },
      { lat: 18.5000, lng: -77.8000 },
      { lat: 18.5000, lng: -77.4000 },
      { lat: 18.2000, lng: -77.4000 }
    ]
  },
  "St. James": {
    center: { lat: 18.4700, lng: -77.9200 },
    bounds: [
      { lat: 18.3500, lng: -78.0500 },
      { lat: 18.6000, lng: -78.0500 },
      { lat: 18.6000, lng: -77.7500 },
      { lat: 18.3500, lng: -77.7500 }
    ]
  },
  "Hanover": {
    center: { lat: 18.4000, lng: -78.1300 },
    bounds: [
      { lat: 18.3000, lng: -78.3000 },
      { lat: 18.5000, lng: -78.3000 },
      { lat: 18.5000, lng: -78.0000 },
      { lat: 18.3000, lng: -78.0000 }
    ]
  },
  "Westmoreland": {
    center: { lat: 18.3000, lng: -78.1500 },
    bounds: [
      { lat: 18.1500, lng: -78.4000 },
      { lat: 18.4500, lng: -78.4000 },
      { lat: 18.4500, lng: -77.9000 },
      { lat: 18.1500, lng: -77.9000 }
    ]
  },
  "St. Elizabeth": {
    center: { lat: 18.0500, lng: -77.9000 },
    bounds: [
      { lat: 17.8500, lng: -78.2000 },
      { lat: 18.3000, lng: -78.2000 },
      { lat: 18.3000, lng: -77.6000 },
      { lat: 17.8500, lng: -77.6000 }
    ]
  },
  "Manchester": {
    center: { lat: 18.0500, lng: -77.5000 },
    bounds: [
      { lat: 17.8500, lng: -77.7000 },
      { lat: 18.3000, lng: -77.7000 },
      { lat: 18.3000, lng: -77.3000 },
      { lat: 17.8500, lng: -77.3000 }
    ]
  },
  "Clarendon": {
    center: { lat: 17.9500, lng: -77.2500 },
    bounds: [
      { lat: 17.7500, lng: -77.5000 },
      { lat: 18.1500, lng: -77.5000 },
      { lat: 18.1500, lng: -77.0000 },
      { lat: 17.7500, lng: -77.0000 }
    ]
  },
  "St. Catherine": {
    center: { lat: 17.9900, lng: -76.9500 },
    bounds: [
      { lat: 17.8000, lng: -77.2000 },
      { lat: 18.2000, lng: -77.2000 },
      { lat: 18.2000, lng: -76.7000 },
      { lat: 17.8000, lng: -76.7000 }
    ]
  }
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

interface GoogleMapsParishHeatMapProps {
  parishStats: ParishStats[];
  selectedMetric: string;
  onParishSelect: (parishName: string) => void;
  selectedParish: string | null;
}

export default function GoogleMapsParishHeatMap({
  parishStats,
  selectedMetric,
  onParishSelect,
  selectedParish
}: GoogleMapsParishHeatMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [polygons, setPolygons] = useState<google.maps.Polygon[]>([]);
  const [infoWindow, setInfoWindow] = useState<google.maps.InfoWindow | null>(null);

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
    
    switch (metric) {
      case "incidents":
        return Math.max(...data.map(p => p.totalIncidents), 1);
      case "turnout":
        return Math.max(...data.map(p => p.voterTurnout), 1);
      case "observers":
        return Math.max(...data.map(p => p.activeObservers), 1);
      case "critical":
        return Math.max(...data.map(p => p.criticalIncidents), 1);
      default:
        return 1;
    }
  };

  // Get heat map color based on metric value
  const getHeatMapColor = (value: number, maxValue: number, metric: string): string => {
    if (maxValue === 0) return "#f3f4f6"; // Gray for no data
    
    const intensity = Math.min(value / maxValue, 1);
    
    switch (metric) {
      case "incidents":
        // Red scale for incidents (more = more intense red)
        const redAlpha = 0.3 + intensity * 0.5;
        return `rgba(239, 68, 68, ${redAlpha})`;
      case "turnout":
        // Green scale for voter turnout (more = more intense green)
        const greenAlpha = 0.3 + intensity * 0.5;
        return `rgba(34, 197, 94, ${greenAlpha})`;
      case "observers":
        // Blue scale for active observers (more = more intense blue)
        const blueAlpha = 0.3 + intensity * 0.5;
        return `rgba(59, 130, 246, ${blueAlpha})`;
      case "critical":
        // Orange scale for critical incidents (more = more intense orange)
        const orangeAlpha = 0.3 + intensity * 0.5;
        return `rgba(249, 115, 22, ${orangeAlpha})`;
      default:
        return `rgba(107, 114, 128, 0.3)`;
    }
  };

  // Initialize Google Maps
  useEffect(() => {
    if (!mapRef.current) return;

    const initMap = () => {
      const jamaicaCenter = { lat: 18.1096, lng: -77.2975 };
      
      const mapInstance = new google.maps.Map(mapRef.current!, {
        zoom: 8,
        center: jamaicaCenter,
        mapTypeId: google.maps.MapTypeId.TERRAIN,
        styles: [
          {
            featureType: "administrative",
            elementType: "geometry.stroke",
            stylers: [{ color: "#c9b2a6" }]
          },
          {
            featureType: "administrative.land_parcel",
            elementType: "geometry.stroke",
            stylers: [{ color: "#dcd2be" }]
          },
          {
            featureType: "administrative.land_parcel",
            elementType: "labels.text.fill",
            stylers: [{ color: "#ae9e90" }]
          }
        ],
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: true,
        scaleControl: true,
        streetViewControl: false,
        rotateControl: false,
        fullscreenControl: true
      });

      setMap(mapInstance);

      const infoWindowInstance = new google.maps.InfoWindow();
      setInfoWindow(infoWindowInstance);
    };

    // Check if Google Maps API is loaded
    if (typeof google !== 'undefined' && google.maps) {
      initMap();
    } else {
      // Load Google Maps API if not already loaded
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=geometry`;
      script.async = true;
      script.defer = true;
      script.onload = initMap;
      document.head.appendChild(script);
    }
  }, []);

  // Update parish polygons with heat map colors
  useEffect(() => {
    if (!map || !parishStats.length) return;

    // Clear existing polygons
    polygons.forEach(polygon => polygon.setMap(null));

    const maxValue = getMaxValue(parishStats, selectedMetric);
    const newPolygons: google.maps.Polygon[] = [];

    Object.entries(PARISH_BOUNDARIES).forEach(([parishName, parishData]) => {
      const parishStat = parishStats.find(p => p.parishName === parishName);
      const value = parishStat ? getMetricValue(parishStat, selectedMetric) : 0;
      const fillColor = getHeatMapColor(value, maxValue, selectedMetric);

      const polygon = new google.maps.Polygon({
        paths: parishData.bounds,
        strokeColor: selectedParish === parishName ? "#2563eb" : "#374151",
        strokeOpacity: selectedParish === parishName ? 1.0 : 0.8,
        strokeWeight: selectedParish === parishName ? 3 : 2,
        fillColor: fillColor,
        fillOpacity: 0.6,
        clickable: true
      });

      polygon.setMap(map);

      // Add click listener
      polygon.addListener('click', () => {
        onParishSelect(parishName);
        
        if (infoWindow && parishStat) {
          const contentString = `
            <div style="padding: 10px; font-family: system-ui;">
              <h3 style="margin: 0 0 10px 0; color: #1f2937; font-size: 16px; font-weight: 600;">
                ${parishName} Parish
              </h3>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
                <div>
                  <div style="font-size: 14px; color: #6b7280;">Total Incidents</div>
                  <div style="font-size: 18px; font-weight: 600; color: #dc2626;">${parishStat.totalIncidents}</div>
                </div>
                <div>
                  <div style="font-size: 14px; color: #6b7280;">Critical</div>
                  <div style="font-size: 18px; font-weight: 600; color: #ea580c;">${parishStat.criticalIncidents}</div>
                </div>
                <div>
                  <div style="font-size: 14px; color: #6b7280;">Voter Turnout</div>
                  <div style="font-size: 18px; font-weight: 600; color: #059669;">${parishStat.voterTurnout}%</div>
                </div>
                <div>
                  <div style="font-size: 14px; color: #6b7280;">Active Observers</div>
                  <div style="font-size: 18px; font-weight: 600; color: #2563eb;">${parishStat.activeObservers}</div>
                </div>
              </div>
              <div style="font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 8px;">
                Weather: ${parishStat.weatherCondition} | Traffic: ${parishStat.trafficStatus}
              </div>
            </div>
          `;
          
          infoWindow.setContent(contentString);
          infoWindow.setPosition(parishData.center);
          infoWindow.open(map);
        }
      });

      // Add mouseover effect
      polygon.addListener('mouseover', () => {
        polygon.setOptions({
          strokeWeight: 3,
          fillOpacity: 0.8
        });
      });

      polygon.addListener('mouseout', () => {
        polygon.setOptions({
          strokeWeight: selectedParish === parishName ? 3 : 2,
          fillOpacity: 0.6
        });
      });

      newPolygons.push(polygon);
    });

    setPolygons(newPolygons);
  }, [map, parishStats, selectedMetric, selectedParish, onParishSelect, infoWindow]);

  // Close info window when selected parish changes
  useEffect(() => {
    if (infoWindow && !selectedParish) {
      infoWindow.close();
    }
  }, [selectedParish, infoWindow]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full rounded-lg overflow-hidden" />
      
      {/* Metric indicator */}
      <div className="absolute top-4 left-4 z-10">
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
            Click on any parish to view detailed statistics and select it for further analysis.
          </p>
        </div>
      </div>
    </div>
  );
}