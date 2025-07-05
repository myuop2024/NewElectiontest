import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Activity, Users, AlertTriangle, TrendingUp, TrendingDown, Minus, RefreshCw, Layers, BarChart3, Zap, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import HereMapParishHeatMap from "./here-map-parish-heat-map";

// Jamaica parish coordinates and boundaries
const PARISH_COORDINATES = {
  "Kingston": { lat: 17.9712, lng: -76.7932, bounds: [[17.9200, -76.8400], [18.0200, -76.7400]] },
  "St. Andrew": { lat: 18.0061, lng: -76.7466, bounds: [[17.9000, -76.8500], [18.1000, -76.6500]] },
  "St. Thomas": { lat: 17.9000, lng: -76.2000, bounds: [[17.8000, -76.4000], [18.0000, -76.0000]] },
  "Portland": { lat: 18.2000, lng: -76.4500, bounds: [[18.0000, -76.6000], [18.4000, -76.3000]] },
  "St. Mary": { lat: 18.3000, lng: -76.9000, bounds: [[18.1000, -77.2000], [18.5000, -76.6000]] },
  "St. Ann": { lat: 18.4500, lng: -77.2000, bounds: [[18.3000, -77.5000], [18.6000, -76.9000]] },
  "Trelawny": { lat: 18.3500, lng: -77.6000, bounds: [[18.2000, -77.8000], [18.5000, -77.4000]] },
  "St. James": { lat: 18.4700, lng: -77.9200, bounds: [[18.3500, -78.0500], [18.6000, -77.7500]] },
  "Hanover": { lat: 18.4000, lng: -78.1300, bounds: [[18.3000, -78.3000], [18.5000, -78.0000]] },
  "Westmoreland": { lat: 18.3000, lng: -78.1500, bounds: [[18.1500, -78.4000], [18.4500, -77.9000]] },
  "St. Elizabeth": { lat: 18.0500, lng: -77.9000, bounds: [[17.8500, -78.2000], [18.3000, -77.6000]] },
  "Manchester": { lat: 18.0500, lng: -77.5000, bounds: [[17.8500, -77.7000], [18.3000, -77.3000]] },
  "Clarendon": { lat: 17.9500, lng: -77.2500, bounds: [[17.7500, -77.5000], [18.1500, -77.0000]] },
  "St. Catherine": { lat: 17.9900, lng: -76.9500, bounds: [[17.8000, -77.2000], [18.2000, -76.7000]] }
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

interface ParishHeatMapProps {
  height?: string;
  showLegend?: boolean;
  autoRefresh?: boolean;
  selectedMetric?: string;
}

export default function ParishHeatMap({ 
  height = "600px", 
  showLegend = true,
  autoRefresh = true,
  selectedMetric = "incidents"
}: ParishHeatMapProps) {
  const [selectedParish, setSelectedParish] = useState<string | null>(null);
  const [heatMapMetric, setHeatMapMetric] = useState(selectedMetric);
  const [showDetails, setShowDetails] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const { toast } = useToast();
  const mapRef = useRef<HTMLDivElement>(null);

  // Fetch parish statistics data
  const { data: parishStats, isLoading, refetch } = useQuery({
    queryKey: ["/api/analytics/parish-stats"],
    refetchInterval: autoRefresh ? 30000 : false, // Refresh every 30 seconds
  });

  // Type guard to ensure parishStats is an array
  const parishStatsArray: ParishStats[] = Array.isArray(parishStats) ? parishStats : [];

  // Fetch weather data for all parishes
  const { data: weatherData } = useQuery({
    queryKey: ["/api/weather/all-parishes"],
    refetchInterval: autoRefresh ? 300000 : false, // Refresh every 5 minutes
  });

  // Fetch traffic data overview
  const { data: trafficData } = useQuery({
    queryKey: ["/api/traffic/all-stations"],
    refetchInterval: autoRefresh ? 60000 : false, // Refresh every minute
  });

  // Manual refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setLastRefresh(new Date());
    setIsRefreshing(false);
    toast({
      title: "Data Refreshed",
      description: "Parish statistics updated successfully"
    });
  };

  // Get color intensity based on metric value
  const getHeatMapColor = (value: number, maxValue: number, metric: string): string => {
    if (maxValue === 0) return "#f3f4f6"; // Gray for no data
    
    const intensity = Math.min(value / maxValue, 1);
    
    switch (metric) {
      case "incidents":
        // Red scale for incidents (more = more intense red)
        return `rgba(239, 68, 68, ${0.2 + intensity * 0.8})`;
      case "turnout":
        // Green scale for voter turnout (more = more intense green)
        return `rgba(34, 197, 94, ${0.2 + intensity * 0.8})`;
      case "observers":
        // Blue scale for active observers (more = more intense blue)
        return `rgba(59, 130, 246, ${0.2 + intensity * 0.8})`;
      case "critical":
        // Orange scale for critical incidents (more = more intense orange)
        return `rgba(249, 115, 22, ${0.2 + intensity * 0.8})`;
      default:
        return `rgba(107, 114, 128, ${0.2 + intensity * 0.8})`;
    }
  };

  // Get max value for normalization
  const getMaxValue = (data: ParishStats[], metric: string): number => {
    if (!data || data.length === 0) return 1;
    
    switch (metric) {
      case "incidents":
        return Math.max(...data.map(p => p.totalIncidents));
      case "turnout":
        return Math.max(...data.map(p => p.voterTurnout));
      case "observers":
        return Math.max(...data.map(p => p.activeObservers));
      case "critical":
        return Math.max(...data.map(p => p.criticalIncidents));
      default:
        return 1;
    }
  };

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

  // Get status badge color
  const getStatusColor = (value: number, metric: string): string => {
    switch (metric) {
      case "incidents":
        if (value === 0) return "bg-green-100 text-green-800";
        if (value <= 2) return "bg-yellow-100 text-yellow-800";
        return "bg-red-100 text-red-800";
      case "turnout":
        if (value >= 70) return "bg-green-100 text-green-800";
        if (value >= 50) return "bg-yellow-100 text-yellow-800";
        return "bg-red-100 text-red-800";
      case "critical":
        if (value === 0) return "bg-green-100 text-green-800";
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const maxValue = getMaxValue(parishStatsArray, heatMapMetric);

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Parish Heat Map</h2>
          <p className="text-muted-foreground">Real-time election day statistics by parish</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={heatMapMetric} onValueChange={setHeatMapMetric}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select metric" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="incidents">Total Incidents</SelectItem>
              <SelectItem value="critical">Critical Incidents</SelectItem>
              <SelectItem value="turnout">Voter Turnout %</SelectItem>
              <SelectItem value="observers">Active Observers</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Heat Map Visualization */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Interactive Parish Map
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div 
                ref={mapRef}
                className="relative w-full bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden"
                style={{ height }}
              >
                {/* Interactive Parish Heat Map with Enhanced Map */}
                <HereMapParishHeatMap
                  parishStats={parishStatsArray}
                  selectedMetric={heatMapMetric}
                  onParishSelect={setSelectedParish}
                  selectedParish={selectedParish}
                />

                {/* Loading overlay */}
                {isLoading && (
                  <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 flex items-center justify-center z-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                )}
              </div>

              {/* Map Legend */}
              {showLegend && (
                <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">
                      {heatMapMetric === "incidents" && "Incident Count"}
                      {heatMapMetric === "turnout" && "Voter Turnout (%)"}
                      {heatMapMetric === "observers" && "Active Observers"}
                      {heatMapMetric === "critical" && "Critical Incidents"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Updated: {lastRefresh.toLocaleTimeString()}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-xs">Low</span>
                    <div className="flex-1 h-4 bg-gradient-to-r from-gray-200 to-red-500 rounded"></div>
                    <span className="text-xs">High</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Parish Details Panel */}
        {showDetails && (
          <div className="space-y-4">
            {/* Selected Parish Details */}
            {selectedParish && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    {selectedParish} Parish
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const parishData = parishStats?.find(p => p.parishName === selectedParish);
                    if (!parishData) return <p className="text-muted-foreground">No data available</p>;
                    
                    return (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-red-600">{parishData.totalIncidents}</div>
                            <div className="text-xs text-muted-foreground">Total Incidents</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-orange-600">{parishData.criticalIncidents}</div>
                            <div className="text-xs text-muted-foreground">Critical</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">{parishData.voterTurnout}%</div>
                            <div className="text-xs text-muted-foreground">Turnout</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">{parishData.activeObservers}</div>
                            <div className="text-xs text-muted-foreground">Observers</div>
                          </div>
                        </div>
                        
                        <div className="pt-4 border-t">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">Conditions</span>
                          </div>
                          <div className="space-y-2">
                            <Badge variant="secondary" className="text-xs">
                              Weather: {parishData.weatherCondition}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              Traffic: {parishData.trafficStatus}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            )}

            {/* Top Parishes by Metric */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Top Parishes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {parishStats?.sort((a, b) => getMetricValue(b, heatMapMetric) - getMetricValue(a, heatMapMetric))
                    .slice(0, 5)
                    .map((parish, index) => (
                      <div 
                        key={parish.parishId}
                        className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                        onClick={() => setSelectedParish(parish.parishName)}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">
                            {index + 1}
                          </div>
                          <span className="font-medium text-sm">{parish.parishName}</span>
                        </div>
                        <Badge className={getStatusColor(getMetricValue(parish, heatMapMetric), heatMapMetric)}>
                          {getMetricValue(parish, heatMapMetric)}
                          {heatMapMetric === "turnout" && "%"}
                        </Badge>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* Real-time Activity Feed */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Live Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-green-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>System monitoring 14 parishes</span>
                  </div>
                  <div className="flex items-center gap-2 text-blue-600">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span>Real-time data flowing</span>
                  </div>
                  <div className="flex items-center gap-2 text-yellow-600">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <span>Auto-refresh: {autoRefresh ? 'ON' : 'OFF'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}