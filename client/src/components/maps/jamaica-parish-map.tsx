import { useState } from "react";
import { Badge } from "@/components/ui/badge";

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

interface JamaicaParishMapProps {
  parishStats: ParishStats[];
  selectedMetric: string;
  onParishSelect: (parishName: string) => void;
  selectedParish: string | null;
}

export default function JamaicaParishMap({
  parishStats,
  selectedMetric,
  onParishSelect,
  selectedParish
}: JamaicaParishMapProps) {
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
    
    const values = data.map(parish => getMetricValue(parish, metric));
    return Math.max(...values, 1);
  };

  // Get heat map color based on metric value
  const getHeatMapColor = (value: number, maxValue: number, metric: string): string => {
    if (maxValue === 0) return "#e5e7eb";
    
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
        return "#e5e7eb";
    }
  };

  const maxValue = getMaxValue(parishStats, selectedMetric);

  return (
    <div className="relative w-full h-full bg-slate-50 dark:bg-slate-900 rounded-lg overflow-hidden">
      <svg width="100%" height="100%" viewBox="0 0 1000 700" className="w-full h-full">
        {/* Background */}
        <rect width="1000" height="700" fill="url(#oceanGradient)" />
        
        {/* Gradient definitions */}
        <defs>
          <linearGradient id="oceanGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e0f2fe" />
            <stop offset="100%" stopColor="#bae6fd" />
          </linearGradient>
          
          <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="2" dy="2" stdDeviation="3" floodOpacity="0.2"/>
          </filter>
        </defs>

        {/* Jamaica Island Outline */}
        <path
          d="M 200 350 Q 250 300 350 320 Q 450 340 550 350 Q 650 360 750 380 Q 800 400 750 450 Q 700 500 600 480 Q 500 470 400 450 Q 300 430 200 350 Z"
          fill="#f8fafc"
          stroke="#64748b"
          strokeWidth="2"
          filter="url(#dropShadow)"
        />

        {/* Parish boundaries and data */}
        {[
          { name: "Kingston", path: "M 580 420 L 620 410 L 640 450 L 600 470 L 580 420 Z", x: 600, y: 440 },
          { name: "St. Andrew", path: "M 540 400 L 580 420 L 600 470 L 560 480 L 540 400 Z", x: 560, y: 435 },
          { name: "St. Thomas", path: "M 680 380 L 720 370 L 740 420 L 700 430 L 680 380 Z", x: 710, y: 400 },
          { name: "Portland", path: "M 640 340 L 680 330 L 700 380 L 660 390 L 640 340 Z", x: 670, y: 360 },
          { name: "St. Mary", path: "M 580 350 L 620 340 L 640 380 L 600 390 L 580 350 Z", x: 610, y: 370 },
          { name: "St. Ann", path: "M 520 340 L 560 330 L 580 380 L 540 390 L 520 340 Z", x: 550, y: 360 },
          { name: "Trelawny", path: "M 460 350 L 500 340 L 520 390 L 480 400 L 460 350 Z", x: 490, y: 370 },
          { name: "St. James", path: "M 400 360 L 440 350 L 460 400 L 420 410 L 400 360 Z", x: 430, y: 380 },
          { name: "Hanover", path: "M 340 370 L 380 360 L 400 410 L 360 420 L 340 370 Z", x: 370, y: 390 },
          { name: "Westmoreland", path: "M 320 420 L 360 410 L 380 460 L 340 470 L 320 420 Z", x: 350, y: 440 },
          { name: "St. Elizabeth", path: "M 380 440 L 420 430 L 440 480 L 400 490 L 380 440 Z", x: 410, y: 460 },
          { name: "Manchester", path: "M 440 420 L 480 410 L 500 460 L 460 470 L 440 420 Z", x: 470, y: 440 },
          { name: "Clarendon", path: "M 500 400 L 540 390 L 560 440 L 520 450 L 500 400 Z", x: 530, y: 420 },
          { name: "St. Catherine", path: "M 520 440 L 560 430 L 580 480 L 540 490 L 520 440 Z", x: 550, y: 460 }
        ].map((parish) => {
          const parishData = parishStats.find(p => p.parishName === parish.name);
          const value = parishData ? getMetricValue(parishData, selectedMetric) : 0;
          const fillColor = getHeatMapColor(value, maxValue, selectedMetric);
          const isSelected = selectedParish === parish.name;
          const isHovered = hoveredParish === parish.name;
          
          return (
            <g key={parish.name}>
              {/* Parish area */}
              <path
                d={parish.path}
                fill={fillColor}
                stroke={isSelected ? "#2563eb" : isHovered ? "#4f46e5" : "#64748b"}
                strokeWidth={isSelected ? "3" : isHovered ? "2.5" : "2"}
                className="cursor-pointer transition-all duration-200"
                filter={isHovered || isSelected ? "url(#dropShadow)" : "none"}
                onClick={() => onParishSelect(parish.name)}
                onMouseEnter={() => setHoveredParish(parish.name)}
                onMouseLeave={() => setHoveredParish(null)}
              />
              
              {/* Parish label */}
              <text
                x={parish.x}
                y={parish.y - 5}
                textAnchor="middle"
                className="text-xs font-semibold fill-gray-800 dark:fill-gray-200 pointer-events-none"
                style={{ fontSize: '11px' }}
              >
                {parish.name.split(' ').map(word => word.charAt(0)).join('')}
              </text>
              
              {/* Value display */}
              <text
                x={parish.x}
                y={parish.y + 10}
                textAnchor="middle"
                className="text-sm font-bold fill-gray-900 dark:fill-gray-100 pointer-events-none"
                style={{ fontSize: '12px' }}
              >
                {value}
              </text>
            </g>
          );
        })}
        
        {/* Map title */}
        <text x="50" y="50" className="text-xl font-bold fill-gray-800 dark:fill-gray-200" style={{ fontSize: '24px' }}>
          Jamaica Parish Heat Map
        </text>
        
        <text x="50" y="75" className="text-sm fill-gray-600 dark:fill-gray-400" style={{ fontSize: '14px' }}>
          {selectedMetric === "incidents" && "Total Incidents by Parish"}
          {selectedMetric === "turnout" && "Voter Turnout (%) by Parish"}
          {selectedMetric === "observers" && "Active Observers by Parish"}
          {selectedMetric === "critical" && "Critical Incidents by Parish"}
        </text>

        {/* Legend */}
        <g transform="translate(800, 100)">
          <rect x="0" y="0" width="150" height="120" fill="white" stroke="#64748b" strokeWidth="1" rx="5" />
          <text x="75" y="20" textAnchor="middle" className="text-sm font-semibold fill-gray-800" style={{ fontSize: '12px' }}>
            Intensity Scale
          </text>
          
          {[
            { label: "High", color: selectedMetric === "incidents" ? "#dc2626" : selectedMetric === "turnout" ? "#16a34a" : selectedMetric === "observers" ? "#2563eb" : "#ea580c", y: 40 },
            { label: "Medium", color: selectedMetric === "incidents" ? "#f87171" : selectedMetric === "turnout" ? "#4ade80" : selectedMetric === "observers" ? "#60a5fa" : "#fb923c", y: 60 },
            { label: "Low", color: selectedMetric === "incidents" ? "#fecaca" : selectedMetric === "turnout" ? "#bbf7d0" : selectedMetric === "observers" ? "#bfdbfe" : "#fed7aa", y: 80 },
            { label: "None", color: "#e5e7eb", y: 100 }
          ].map((item, index) => (
            <g key={index}>
              <rect x="10" y={item.y} width="15" height="12" fill={item.color} stroke="#64748b" strokeWidth="0.5" />
              <text x="30" y={item.y + 9} className="text-xs fill-gray-700" style={{ fontSize: '10px' }}>
                {item.label}
              </text>
            </g>
          ))}
        </g>
      </svg>
      
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
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}