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

interface HereMapParishHeatMapProps {
  parishStats: ParishStats[];
  selectedMetric: string;
  onParishSelect: (parishName: string) => void;
  selectedParish: string | null;
}

export default function HereMapParishHeatMap({
  parishStats,
  selectedMetric,
  onParishSelect,
  selectedParish
}: HereMapParishHeatMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [hoveredParish, setHoveredParish] = useState<string | null>(null);

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

  // Convert coordinates to SVG position
  const coordsToSVG = (lat: number, lng: number) => {
    // Jamaica bounds approximately: lat 17.7-18.6, lng -78.4--76.0
    const latRange = 18.6 - 17.7;
    const lngRange = -76.0 - (-78.4);
    
    const x = ((lng - (-78.4)) / lngRange) * 800;
    const y = ((18.6 - lat) / latRange) * 600;
    
    return { x, y };
  };

  const maxValue = getMaxValue(parishStats, selectedMetric);

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full rounded-lg overflow-hidden bg-blue-50 dark:bg-gray-800">
        <svg width="100%" height="100%" viewBox="0 0 800 600" className="w-full h-full">
          {/* Background map styling */}
          <rect width="800" height="600" fill="url(#jamaicaGradient)" />
          
          {/* Gradient definitions */}
          <defs>
            <linearGradient id="jamaicaGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#bfdbfe" />
              <stop offset="100%" stopColor="#dbeafe" />
            </linearGradient>
            
            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="2" dy="2" stdDeviation="3" floodOpacity="0.3"/>
            </filter>
          </defs>

          {/* Parish polygons with heat map coloring */}
          {Object.entries(PARISH_BOUNDARIES).map(([parishName, parishData]) => {
            const parishStat = parishStats.find(p => p.parishName === parishName);
            const value = parishStat ? getMetricValue(parishStat, selectedMetric) : 0;
            const fillColor = getHeatMapColor(value, maxValue, selectedMetric);
            
            // Convert bounds to SVG coordinates
            const svgBounds = parishData.bounds.map(coord => coordsToSVG(coord.lat, coord.lng));
            const pathData = `M ${svgBounds.map(p => `${p.x},${p.y}`).join(' L ')} Z`;
            
            const isSelected = selectedParish === parishName;
            const isHovered = hoveredParish === parishName;
            
            return (
              <g key={parishName}>
                {/* Parish boundary polygon */}
                <path
                  d={pathData}
                  fill={fillColor}
                  stroke={isSelected ? "#2563eb" : isHovered ? "#4f46e5" : "#374151"}
                  strokeWidth={isSelected ? "3" : isHovered ? "2.5" : "2"}
                  strokeOpacity="0.8"
                  className="cursor-pointer transition-all duration-200"
                  filter={isHovered || isSelected ? "url(#shadow)" : "none"}
                  onClick={() => onParishSelect(parishName)}
                  onMouseEnter={() => setHoveredParish(parishName)}
                  onMouseLeave={() => setHoveredParish(null)}
                />
                
                {/* Parish center point and label */}
                {(() => {
                  const centerSVG = coordsToSVG(parishData.center.lat, parishData.center.lng);
                  return (
                    <>
                      <circle
                        cx={centerSVG.x}
                        cy={centerSVG.y}
                        r="6"
                        fill="#ffffff"
                        stroke="#374151"
                        strokeWidth="2"
                        className="pointer-events-none"
                      />
                      
                      <text
                        x={centerSVG.x}
                        y={centerSVG.y - 15}
                        textAnchor="middle"
                        className="text-xs font-semibold fill-gray-800 dark:fill-gray-200 pointer-events-none"
                        style={{ fontSize: '12px' }}
                      >
                        {parishName.split(' ')[0]}
                      </text>
                      
                      <text
                        x={centerSVG.x}
                        y={centerSVG.y + 25}
                        textAnchor="middle"
                        className="text-sm font-bold fill-gray-900 dark:fill-gray-100 pointer-events-none"
                        style={{ fontSize: '14px' }}
                      >
                        {value}
                      </text>
                    </>
                  );
                })()}
              </g>
            );
          })}
          
          {/* Map title and legend */}
          <text x="20" y="30" className="text-lg font-bold fill-gray-800 dark:fill-gray-200" style={{ fontSize: '18px' }}>
            Jamaica Electoral Heat Map
          </text>
          
          <text x="20" y="50" className="text-sm fill-gray-600 dark:fill-gray-400" style={{ fontSize: '12px' }}>
            {selectedMetric === "incidents" && "Total Incidents by Parish"}
            {selectedMetric === "turnout" && "Voter Turnout (%) by Parish"}
            {selectedMetric === "observers" && "Active Observers by Parish"}
            {selectedMetric === "critical" && "Critical Incidents by Parish"}
          </text>
        </svg>
      </div>
      
      {/* Metric indicator */}
      <div className="absolute top-4 right-4 z-10">
        <Badge variant="secondary" className="bg-white/90 text-gray-800 shadow-lg">
          {selectedMetric === "incidents" && "Incident Count"}
          {selectedMetric === "turnout" && "Voter Turnout (%)"}
          {selectedMetric === "observers" && "Active Observers"}
          {selectedMetric === "critical" && "Critical Incidents"}
        </Badge>
      </div>

      {/* Hover info panel */}
      {hoveredParish && (
        <div className="absolute bottom-4 left-4 z-10 bg-white/95 dark:bg-gray-800/95 p-4 rounded-lg shadow-lg max-w-sm">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {hoveredParish} Parish
          </h3>
          {(() => {
            const parishStat = parishStats.find(p => p.parishName === hoveredParish);
            if (!parishStat) return <p className="text-sm text-gray-500">No data available</p>;
            
            return (
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Incidents:</span>
                  <span className="font-medium text-red-600 ml-1">{parishStat.totalIncidents}</span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Critical:</span>
                  <span className="font-medium text-orange-600 ml-1">{parishStat.criticalIncidents}</span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Turnout:</span>
                  <span className="font-medium text-green-600 ml-1">{parishStat.voterTurnout}%</span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Observers:</span>
                  <span className="font-medium text-blue-600 ml-1">{parishStat.activeObservers}</span>
                </div>
                <div className="col-span-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                  <span className="text-gray-600 dark:text-gray-400">Weather: </span>
                  <span className="text-gray-800 dark:text-gray-200">{parishStat.weatherCondition}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-600 dark:text-gray-400">Traffic: </span>
                  <span className="text-gray-800 dark:text-gray-200">{parishStat.trafficStatus}</span>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Instructions */}
      <div className="absolute bottom-4 right-4 z-10">
        <div className="bg-white/90 dark:bg-gray-800/90 p-3 rounded-lg shadow-lg max-w-xs">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Click parishes to select, hover for details. Colors show intensity of selected metric.
          </p>
        </div>
      </div>
    </div>
  );
}