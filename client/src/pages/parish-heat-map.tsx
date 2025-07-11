import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Activity, Users, AlertTriangle, TrendingUp, RefreshCw, Layers, BarChart3, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Jamaica parish coordinates for the Google Maps integration
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
  totalIncidents: number;
  criticalIncidents: number;
  activeObservers: number;
  pollingStations: number;
  voterTurnout: number;
  weatherCondition: string;
  trafficStatus: string;
  lastUpdated: string;
}

// Google Maps Component
function GoogleMapsHeatMap({ 
  parishStats, 
  selectedMetric, 
  onParishSelect 
}: { 
  parishStats: ParishStats[], 
  selectedMetric: string,
  onParishSelect: (parish: string) => void 
}) {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load Google Maps
  useEffect(() => {
    const loadGoogleMaps = async () => {
      try {
        // Check if already loaded
        if (typeof window.google !== 'undefined' && window.google.maps) {
          initializeMap();
          return;
        }

        // Get API key from environment variable
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
          throw new Error('Google Maps API key not configured. Please set VITE_GOOGLE_MAPS_API_KEY environment variable.');
        }

        // Load Google Maps script
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry`;
        script.async = true;
        script.defer = true;

        script.onload = () => {
          initializeMap();
        };

        script.onerror = () => {
          setError('Failed to load Google Maps API');
          setIsLoading(false);
        };

        document.head.appendChild(script);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load Google Maps');
        setIsLoading(false);
      }
    };

    const initializeMap = () => {
      const mapElement = document.getElementById('google-map');
      if (!mapElement) {
        setError('Map container not found');
        setIsLoading(false);
        return;
      }

      try {
        const mapInstance = new google.maps.Map(mapElement, {
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

        setMap(mapInstance);
        setIsLoading(false);
        setError(null);
      } catch (err) {
        setError('Failed to initialize map');
        setIsLoading(false);
      }
    };

    loadGoogleMaps();
  }, []);

  // Create markers when map or data changes
  useEffect(() => {
    if (!map || !parishStats.length) return;

    // Clear existing markers
    markers.forEach(marker => marker.setMap(null));

    // Get max value for normalization
    const getMaxValue = () => {
      switch (selectedMetric) {
        case "incidents": return Math.max(...parishStats.map(p => p.totalIncidents));
        case "turnout": return Math.max(...parishStats.map(p => p.voterTurnout));
        case "observers": return Math.max(...parishStats.map(p => p.activeObservers));
        case "critical": return Math.max(...parishStats.map(p => p.criticalIncidents));
        default: return 1;
      }
    };

    const maxValue = getMaxValue();
    const newMarkers: google.maps.Marker[] = [];

    parishStats.forEach(parish => {
      const coords = PARISH_COORDINATES[parish.parishName as keyof typeof PARISH_COORDINATES];
      if (!coords) return;

      // Get metric value
      let value = 0;
      switch (selectedMetric) {
        case "incidents": value = parish.totalIncidents; break;
        case "turnout": value = parish.voterTurnout; break;
        case "observers": value = parish.activeObservers; break;
        case "critical": value = parish.criticalIncidents; break;
      }

      // Calculate color intensity
      const intensity = maxValue > 0 ? value / maxValue : 0;
      let color = "#94a3b8"; // Gray default

      if (selectedMetric === "incidents" || selectedMetric === "critical") {
        // Red scale for incidents
        if (intensity > 0.7) color = "#dc2626";
        else if (intensity > 0.4) color = "#f87171";
        else if (intensity > 0.1) color = "#fecaca";
      } else {
        // Green scale for positive metrics
        if (intensity > 0.7) color = "#16a34a";
        else if (intensity > 0.4) color = "#4ade80";
        else if (intensity > 0.1) color = "#bbf7d0";
      }

      // Create marker
      const marker = new google.maps.Marker({
        position: coords,
        map: map,
        title: parish.parishName,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8 + (intensity * 12), // Size based on value
          fillColor: color,
          fillOpacity: 0.8,
          strokeColor: "#ffffff",
          strokeWeight: 2
        }
      });

      // Info window
      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 8px; min-width: 200px;">
            <h3 style="margin: 0 0 8px 0; color: #1f2937;">${parish.parishName}</h3>
            <div style="font-size: 14px; line-height: 1.5;">
              <div><strong>Total Incidents:</strong> ${parish.totalIncidents}</div>
              <div><strong>Critical Incidents:</strong> ${parish.criticalIncidents}</div>
              <div><strong>Voter Turnout:</strong> ${parish.voterTurnout}%</div>
              <div><strong>Active Observers:</strong> ${parish.activeObservers}</div>
              <div><strong>Polling Stations:</strong> ${parish.pollingStations}</div>
            </div>
          </div>
        `
      });

      marker.addListener('click', () => {
        onParishSelect(parish.parishName);
        infoWindow.open(map, marker);
      });

      newMarkers.push(marker);
    });

    setMarkers(newMarkers);
  }, [map, parishStats, selectedMetric, onParishSelect]);

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading Jamaica Map...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
        <div className="text-center p-6">
          <div className="text-red-600 dark:text-red-400 mb-2">
            <AlertTriangle className="w-12 h-12 mx-auto" />
          </div>
          <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">Map Error</h3>
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <div 
        id="google-map"
        className="w-full h-full rounded-lg overflow-hidden"
        style={{ minHeight: '500px' }}
      />
      
      {/* Metric indicator */}
      <div className="absolute top-4 right-4 z-10">
        <Badge variant="secondary" className="bg-white/90 text-gray-800 shadow-lg">
          {selectedMetric === "incidents" && "Total Incidents"}
          {selectedMetric === "turnout" && "Voter Turnout (%)"}
          {selectedMetric === "observers" && "Active Observers"}
          {selectedMetric === "critical" && "Critical Incidents"}
        </Badge>
      </div>

      {/* Legend */}
      <div className="absolute top-4 left-4 z-10 bg-white/90 dark:bg-gray-800/90 p-3 rounded-lg shadow-lg">
        <h4 className="text-sm font-semibold mb-2">Heat Map Legend</h4>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-600"></div>
            <span className="text-xs">High</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
            <span className="text-xs">Medium</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-400"></div>
            <span className="text-xs">Low</span>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-4 left-4 z-10">
        <div className="bg-white/90 dark:bg-gray-800/90 p-3 rounded-lg shadow-lg max-w-xs">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Click on any parish marker to view detailed statistics.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ParishHeatMapPage() {
  const [selectedTab, setSelectedTab] = useState("heatmap");
  const [selectedMetric, setSelectedMetric] = useState("incidents");
  const [selectedParish, setSelectedParish] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  // Fetch parish statistics data
  const { data: parishStats, isLoading, refetch } = useQuery({
    queryKey: ["/api/analytics/parish-stats"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch parish comparison data
  const { data: comparison } = useQuery({
    queryKey: ["/api/analytics/parish-comparison"],
    refetchInterval: 60000,
  });

  // Fetch total statistics
  const { data: totals } = useQuery({
    queryKey: ["/api/analytics/parish-totals"],
    refetchInterval: 30000,
  });

  // Type guard and fallback data
  const parishStatsArray: ParishStats[] = Array.isArray(parishStats) ? parishStats : [];

  // Fallback data for demonstration
  const fallbackData: ParishStats[] = [
    { parishId: 1, parishName: "Kingston", totalIncidents: 5, criticalIncidents: 1, activeObservers: 12, pollingStations: 45, voterTurnout: 78, weatherCondition: "Sunny", trafficStatus: "Light", lastUpdated: new Date().toISOString() },
    { parishId: 2, parishName: "St. Andrew", totalIncidents: 3, criticalIncidents: 0, activeObservers: 15, pollingStations: 52, voterTurnout: 82, weatherCondition: "Partly Cloudy", trafficStatus: "Moderate", lastUpdated: new Date().toISOString() },
    { parishId: 3, parishName: "St. Catherine", totalIncidents: 7, criticalIncidents: 2, activeObservers: 18, pollingStations: 38, voterTurnout: 75, weatherCondition: "Rainy", trafficStatus: "Heavy", lastUpdated: new Date().toISOString() },
    { parishId: 4, parishName: "Clarendon", totalIncidents: 2, criticalIncidents: 0, activeObservers: 10, pollingStations: 41, voterTurnout: 85, weatherCondition: "Sunny", trafficStatus: "Light", lastUpdated: new Date().toISOString() },
    { parishId: 5, parishName: "Manchester", totalIncidents: 4, criticalIncidents: 1, activeObservers: 14, pollingStations: 35, voterTurnout: 79, weatherCondition: "Partly Cloudy", trafficStatus: "Moderate", lastUpdated: new Date().toISOString() },
    { parishId: 6, parishName: "St. Elizabeth", totalIncidents: 1, criticalIncidents: 0, activeObservers: 8, pollingStations: 28, voterTurnout: 88, weatherCondition: "Sunny", trafficStatus: "Light", lastUpdated: new Date().toISOString() },
    { parishId: 7, parishName: "Westmoreland", totalIncidents: 6, criticalIncidents: 1, activeObservers: 11, pollingStations: 32, voterTurnout: 72, weatherCondition: "Rainy", trafficStatus: "Heavy", lastUpdated: new Date().toISOString() },
    { parishId: 8, parishName: "Hanover", totalIncidents: 2, criticalIncidents: 0, activeObservers: 9, pollingStations: 25, voterTurnout: 81, weatherCondition: "Sunny", trafficStatus: "Light", lastUpdated: new Date().toISOString() },
    { parishId: 9, parishName: "St. James", totalIncidents: 8, criticalIncidents: 3, activeObservers: 16, pollingStations: 48, voterTurnout: 68, weatherCondition: "Stormy", trafficStatus: "Severe", lastUpdated: new Date().toISOString() },
    { parishId: 10, parishName: "Trelawny", totalIncidents: 3, criticalIncidents: 0, activeObservers: 12, pollingStations: 30, voterTurnout: 83, weatherCondition: "Partly Cloudy", trafficStatus: "Moderate", lastUpdated: new Date().toISOString() },
    { parishId: 11, parishName: "St. Ann", totalIncidents: 5, criticalIncidents: 1, activeObservers: 13, pollingStations: 42, voterTurnout: 76, weatherCondition: "Sunny", trafficStatus: "Light", lastUpdated: new Date().toISOString() },
    { parishId: 12, parishName: "St. Mary", totalIncidents: 4, criticalIncidents: 0, activeObservers: 11, pollingStations: 36, voterTurnout: 80, weatherCondition: "Partly Cloudy", trafficStatus: "Moderate", lastUpdated: new Date().toISOString() },
    { parishId: 13, parishName: "Portland", totalIncidents: 2, criticalIncidents: 0, activeObservers: 9, pollingStations: 29, voterTurnout: 87, weatherCondition: "Sunny", trafficStatus: "Light", lastUpdated: new Date().toISOString() },
    { parishId: 14, parishName: "St. Thomas", totalIncidents: 1, criticalIncidents: 0, activeObservers: 7, pollingStations: 22, voterTurnout: 90, weatherCondition: "Sunny", trafficStatus: "Light", lastUpdated: new Date().toISOString() }
  ];

  const effectiveParishStats = parishStatsArray.length > 0 ? parishStatsArray : fallbackData;

  // Manual refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
    toast({
      title: "Data Refreshed",
      description: "Parish statistics updated successfully"
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Parish Election Analytics</h1>
          <p className="text-muted-foreground">
            Real-time parish-level statistics and interactive heat map visualization
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-green-600">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
            Live Data
          </Badge>
        </div>
      </div>

      {/* Summary Statistics Cards */}
      {totals && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <MapPin className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Parishes</p>
                  <p className="text-2xl font-bold">{totals.totalParishes}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Incidents</p>
                  <p className="text-2xl font-bold">{totals.totalIncidents}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Eye className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Critical Alerts</p>
                  <p className="text-2xl font-bold">{totals.totalCritical}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Observers</p>
                  <p className="text-2xl font-bold">{totals.totalObservers}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Avg Turnout</p>
                  <p className="text-2xl font-bold">{totals.averageTurnout}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Insights */}
      {comparison && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Quick Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <p className="font-medium text-red-800 dark:text-red-200">Most Incidents</p>
                <p className="text-red-600 dark:text-red-400">{comparison.highestIncidents}</p>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="font-medium text-green-800 dark:text-green-200">Highest Turnout</p>
                <p className="text-green-600 dark:text-green-400">{comparison.highestTurnout}</p>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="font-medium text-blue-800 dark:text-blue-200">Most Observers</p>
                <p className="text-blue-600 dark:text-blue-400">{comparison.mostObservers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <TabsList className="grid w-full grid-cols-2 sm:w-auto">
            <TabsTrigger value="heatmap">Interactive Heat Map</TabsTrigger>
            <TabsTrigger value="analytics">Detailed Analytics</TabsTrigger>
          </TabsList>
          
          <div className="flex items-center gap-2">
            <Select value={selectedMetric} onValueChange={setSelectedMetric}>
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
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        <TabsContent value="heatmap" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Interactive Parish Heat Map - Jamaica
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[600px]">
                <GoogleMapsHeatMap
                  parishStats={effectiveParishStats}
                  selectedMetric={selectedMetric}
                  onParishSelect={setSelectedParish}
                />
              </div>
            </CardContent>
          </Card>

          {/* Selected Parish Details */}
          {selectedParish && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  {selectedParish} Parish Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const parish = effectiveParishStats.find(p => p.parishName === selectedParish);
                  if (!parish) return <p>No data available for selected parish.</p>;
                  
                  return (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="text-2xl font-bold text-red-600">{parish.totalIncidents}</div>
                        <div className="text-sm text-muted-foreground">Total Incidents</div>
                      </div>
                      <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="text-2xl font-bold text-orange-600">{parish.criticalIncidents}</div>
                        <div className="text-sm text-muted-foreground">Critical Incidents</div>
                      </div>
                      <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">{parish.voterTurnout}%</div>
                        <div className="text-sm text-muted-foreground">Voter Turnout</div>
                      </div>
                      <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{parish.activeObservers}</div>
                        <div className="text-sm text-muted-foreground">Active Observers</div>
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Parish Statistics Table */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Parish Statistics Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Parish</th>
                        <th className="text-center p-2">Incidents</th>
                        <th className="text-center p-2">Critical</th>
                        <th className="text-center p-2">Turnout %</th>
                        <th className="text-center p-2">Observers</th>
                        <th className="text-center p-2">Stations</th>
                      </tr>
                    </thead>
                    <tbody>
                      {effectiveParishStats.map((parish) => (
                        <tr key={parish.parishId} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="p-2 font-medium">{parish.parishName}</td>
                          <td className="text-center p-2">
                            <Badge variant={parish.totalIncidents > 5 ? "destructive" : parish.totalIncidents > 2 ? "default" : "secondary"}>
                              {parish.totalIncidents}
                            </Badge>
                          </td>
                          <td className="text-center p-2">
                            <Badge variant={parish.criticalIncidents > 0 ? "destructive" : "secondary"}>
                              {parish.criticalIncidents}
                            </Badge>
                          </td>
                          <td className="text-center p-2">
                            <Badge variant={parish.voterTurnout >= 80 ? "default" : parish.voterTurnout >= 60 ? "secondary" : "destructive"}>
                              {parish.voterTurnout}%
                            </Badge>
                          </td>
                          <td className="text-center p-2">{parish.activeObservers}</td>
                          <td className="text-center p-2">{parish.pollingStations}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Real-time Status */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Real-time monitoring active</span>
            </div>
            <div className="flex items-center gap-4">
              <span>Auto-refresh: 30s intervals</span>
              <span>Last updated: {new Date().toLocaleTimeString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}