import { useState } from "react";

// Jamaica parish coordinates and SVG paths (simplified outline)
const JAMAICA_PARISHES = {
  "Kingston": {
    path: "M380,160 L390,155 L395,165 L385,170 Z",
    center: { x: 387, y: 162 }
  },
  "St. Andrew": {
    path: "M370,150 L390,145 L400,160 L380,165 Z",
    center: { x: 385, y: 155 }
  },
  "St. Thomas": {
    path: "M410,155 L430,150 L435,165 L415,170 Z",
    center: { x: 425, y: 160 }
  },
  "Portland": {
    path: "M430,130 L450,125 L455,140 L435,145 Z",
    center: { x: 445, y: 135 }
  },
  "St. Mary": {
    path: "M400,125 L420,120 L425,135 L405,140 Z",
    center: { x: 415, y: 130 }
  },
  "St. Ann": {
    path: "M370,115 L390,110 L395,125 L375,130 Z",
    center: { x: 385, y: 120 }
  },
  "Trelawny": {
    path: "M340,120 L360,115 L365,130 L345,135 Z",
    center: { x: 355, y: 125 }
  },
  "St. James": {
    path: "M315,125 L335,120 L340,135 L320,140 Z",
    center: { x: 330, y: 130 }
  },
  "Hanover": {
    path: "M290,130 L310,125 L315,140 L295,145 Z",
    center: { x: 305, y: 135 }
  },
  "Westmoreland": {
    path: "M295,145 L315,140 L320,155 L300,160 Z",
    center: { x: 310, y: 150 }
  },
  "St. Elizabeth": {
    path: "M320,155 L340,150 L345,165 L325,170 Z",
    center: { x: 335, y: 160 }
  },
  "Manchester": {
    path: "M345,145 L365,140 L370,155 L350,160 Z",
    center: { x: 360, y: 150 }
  },
  "Clarendon": {
    path: "M350,160 L370,155 L375,170 L355,175 Z",
    center: { x: 365, y: 165 }
  },
  "St. Catherine": {
    path: "M375,155 L395,150 L400,165 L380,170 Z",
    center: { x: 390, y: 160 }
  }
};

interface ParishData {
  parishId: number;
  parishName: string;
  incidents: number;
  turnout: number;
  observers: number;
  critical: number;
}

interface JamaicaSvgMapProps {
  parishStats: ParishData[];
  selectedMetric: "incidents" | "turnout" | "observers" | "critical";
  onParishSelect: (parish: string) => void;
  selectedParish: string | null;
}

export default function JamaicaSvgMap({
  parishStats,
  selectedMetric,
  onParishSelect,
  selectedParish
}: JamaicaSvgMapProps) {
  const [hoveredParish, setHoveredParish] = useState<string | null>(null);

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
  const getParishColor = (parishName: string): string => {
    const value = getMetricValue(parishName);
    const maxValue = Math.max(...parishStats.map(p => getMetricValue(p.parishName)), 1);
    const ratio = value / maxValue;
    
    if (selectedMetric === "incidents" || selectedMetric === "critical") {
      // Red scale for incidents/critical
      if (ratio > 0.7) return "#dc2626";
      if (ratio > 0.4) return "#f87171";
      if (ratio > 0.1) return "#fecaca";
      return "#e5e7eb";
    } else {
      // Green scale for turnout/observers
      if (ratio > 0.7) return "#16a34a";
      if (ratio > 0.4) return "#4ade80";
      if (ratio > 0.1) return "#bbf7d0";
      return "#e5e7eb";
    }
  };

  return (
    <div className="relative w-full h-96 bg-blue-50 dark:bg-blue-900/20 rounded-lg overflow-hidden">
      <svg
        viewBox="0 0 500 200"
        className="w-full h-full"
        style={{ background: "linear-gradient(to bottom, #87ceeb 0%, #4682b4 100%)" }}
      >
        {/* Jamaica outline background */}
        <rect x="0" y="0" width="500" height="200" fill="url(#oceanGradient)" />
        
        {/* Gradient definitions */}
        <defs>
          <linearGradient id="oceanGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{ stopColor: "#87ceeb", stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: "#4682b4", stopOpacity: 1 }} />
          </linearGradient>
        </defs>

        {/* Parish regions */}
        {Object.entries(JAMAICA_PARISHES).map(([parishName, parishData]) => {
          const isSelected = selectedParish === parishName;
          const isHovered = hoveredParish === parishName;
          const fillColor = getParishColor(parishName);
          const strokeColor = isSelected ? "#2563eb" : isHovered ? "#4f46e5" : "#374151";
          const strokeWidth = isSelected ? 3 : isHovered ? 2.5 : 1.5;
          const value = getMetricValue(parishName);

          return (
            <g key={parishName}>
              {/* Parish area */}
              <path
                d={parishData.path}
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                className="cursor-pointer transition-all duration-200 hover:brightness-110"
                onClick={() => onParishSelect(parishName)}
                onMouseEnter={() => setHoveredParish(parishName)}
                onMouseLeave={() => setHoveredParish(null)}
              />
              
              {/* Parish label */}
              <text
                x={parishData.center.x}
                y={parishData.center.y}
                textAnchor="middle"
                className="text-xs font-medium fill-gray-800 pointer-events-none"
                style={{ fontSize: "8px" }}
              >
                {parishName.length > 10 ? parishName.substring(0, 8) + "..." : parishName}
              </text>
              
              {/* Metric value */}
              <text
                x={parishData.center.x}
                y={parishData.center.y + 8}
                textAnchor="middle"
                className="text-xs font-bold fill-gray-900 pointer-events-none"
                style={{ fontSize: "6px" }}
              >
                {value}
              </text>
            </g>
          );
        })}

        {/* Hover tooltip */}
        {hoveredParish && (
          <g>
            <rect
              x="10"
              y="10"
              width="150"
              height="60"
              fill="white"
              stroke="#374151"
              strokeWidth="1"
              rx="4"
              className="drop-shadow-lg"
            />
            <text x="20" y="25" className="text-sm font-semibold fill-gray-900">
              {hoveredParish}
            </text>
            {(() => {
              const parish = parishStats.find(p => p.parishName === hoveredParish);
              if (!parish) return null;
              
              return (
                <g>
                  <text x="20" y="38" className="text-xs fill-gray-700">
                    Incidents: {parish.incidents}
                  </text>
                  <text x="20" y="48" className="text-xs fill-gray-700">
                    Turnout: {parish.turnout}%
                  </text>
                  <text x="20" y="58" className="text-xs fill-gray-700">
                    Observers: {parish.observers}
                  </text>
                </g>
              );
            })()}
          </g>
        )}
      </svg>

      {/* Map Legend */}
      <div className="absolute bottom-4 left-4 bg-white/90 dark:bg-gray-800/90 p-3 rounded-lg shadow-lg">
        <h4 className="text-sm font-semibold mb-2">
          {selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)} Levels
        </h4>
        <div className="space-y-1">
          {[
            { label: "High", color: selectedMetric === "incidents" || selectedMetric === "critical" ? "#dc2626" : "#16a34a" },
            { label: "Medium", color: selectedMetric === "incidents" || selectedMetric === "critical" ? "#f87171" : "#4ade80" },
            { label: "Low", color: selectedMetric === "incidents" || selectedMetric === "critical" ? "#fecaca" : "#bbf7d0" },
            { label: "None", color: "#e5e7eb" }
          ].map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded border border-gray-300"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs text-gray-700 dark:text-gray-300">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div className="absolute top-4 right-4 bg-white/90 dark:bg-gray-800/90 p-2 rounded-lg shadow-lg max-w-xs">
        <p className="text-xs text-gray-700 dark:text-gray-300">
          Click on any parish to select it. Hover for quick stats.
        </p>
      </div>
    </div>
  );
}