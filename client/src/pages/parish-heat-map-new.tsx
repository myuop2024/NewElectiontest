import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Activity, Users, AlertTriangle, TrendingUp, RefreshCw, BarChart3, Eye, Map } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import JamaicaSvgMap from "@/components/maps/jamaica-svg-map";

// Jamaica parish data with coordinates and boundaries
const JAMAICA_PARISHES = {
  "Kingston": { lat: 17.9712, lng: -76.7932, color: "#dc2626" },
  "St. Andrew": { lat: 18.0747, lng: -76.7951, color: "#ea580c" },
  "St. Thomas": { lat: 17.9889, lng: -76.3461, color: "#d97706" },
  "Portland": { lat: 18.1836, lng: -76.4598, color: "#65a30d" },
  "St. Mary": { lat: 18.3678, lng: -76.9597, color: "#16a34a" },
  "St. Ann": { lat: 18.4747, lng: -77.2020, color: "#059669" },
  "Trelawny": { lat: 18.4861, lng: -77.6139, color: "#0891b2" },
  "St. James": { lat: 18.4892, lng: -77.9203, color: "#0284c7" },
  "Hanover": { lat: 18.4208, lng: -78.1336, color: "#2563eb" },
  "Westmoreland": { lat: 18.3042, lng: -78.1336, color: "#4f46e5" },
  "St. Elizabeth": { lat: 18.0208, lng: -77.8000, color: "#7c3aed" },
  "Manchester": { lat: 18.0458, lng: -77.5317, color: "#a855f7" },
  "Clarendon": { lat: 17.9667, lng: -77.2833, color: "#c026d3" },
  "St. Catherine": { lat: 17.9889, lng: -76.8944, color: "#e11d48" }
};

interface ParishData {
  parishId: number;
  parishName: string;
  incidents: number;
  turnout: number;
  observers: number;
  critical: number;
}

interface ParishTotals {
  totalParishes: number;
  totalIncidents: number;
  totalCritical: number;
  totalObservers: number;
  averageTurnout: number;
}

interface ParishComparison {
  highestIncidents: string;
  highestTurnout: string;
  mostObservers: string;
  criticalAlerts: string[];
}

export default function ParishHeatMapNew() {
  const [selectedMetric, setSelectedMetric] = useState<"incidents" | "turnout" | "observers" | "critical">("incidents");
  const [selectedParish, setSelectedParish] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"heatmap" | "analytics" | "comparison">("heatmap");
  const { toast } = useToast();

  // Fetch parish statistics
  const { data: parishStats = [], isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ["/api/analytics/parish-stats"],
    refetchInterval: 30000
  });

  // Fetch parish totals
  const { data: parishTotals, isLoading: totalsLoading } = useQuery({
    queryKey: ["/api/analytics/parish-totals"],
    refetchInterval: 30000
  });

  // Fetch parish comparison
  const { data: parishComparison, isLoading: comparisonLoading } = useQuery({
    queryKey: ["/api/analytics/parish-comparison"],
    refetchInterval: 30000
  });

  // Get metric value for a parish
  const getMetricValue = (parishName: string): number => {
    const parish = parishStats.find((p: ParishData) => p.parishName === parishName);
    if (!parish) return 0;
    
    switch (selectedMetric) {
      case "incidents": return parish.incidents;
      case "turnout": return parish.turnout;
      case "observers": return parish.observers;
      case "critical": return parish.critical;
      default: return 0;
    }
  };

  // Get intensity level based on metric value
  const getIntensityLevel = (value: number): "low" | "medium" | "high" | "critical" => {
    const maxValue = Math.max(...parishStats.map((p: ParishData) => getMetricValue(p.parishName)));
    const ratio = maxValue > 0 ? value / maxValue : 0;
    
    if (ratio > 0.8) return "critical";
    if (ratio > 0.6) return "high";
    if (ratio > 0.3) return "medium";
    return "low";
  };

  // Get color based on intensity
  const getIntensityColor = (level: "low" | "medium" | "high" | "critical"): string => {
    switch (level) {
      case "critical": return "bg-red-600 text-white";
      case "high": return "bg-red-400 text-white";
      case "medium": return "bg-yellow-400 text-black";
      case "low": return "bg-green-400 text-black";
      default: return "bg-gray-400 text-white";
    }
  };

  // Refresh all data
  const refreshData = () => {
    refetchStats();
    toast({
      title: "Data Refreshed",
      description: "Parish statistics have been updated",
    });
  };

  const isLoading = statsLoading || totalsLoading || comparisonLoading;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Jamaica Parish Heat Map</h1>
          <p className="text-muted-foreground">
            Interactive visualization of electoral statistics across Jamaica's 14 parishes
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={refreshData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Statistics */}
      {parishTotals && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="flex items-center p-4">
              <MapPin className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Parishes</p>
                <p className="text-2xl font-bold">{parishTotals.totalParishes}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="flex items-center p-4">
              <Activity className="h-8 w-8 text-red-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Incidents</p>
                <p className="text-2xl font-bold">{parishTotals.totalIncidents}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="flex items-center p-4">
              <AlertTriangle className="h-8 w-8 text-orange-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Critical Alerts</p>
                <p className="text-2xl font-bold">{parishTotals.totalCritical}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="flex items-center p-4">
              <Users className="h-8 w-8 text-green-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Observers</p>
                <p className="text-2xl font-bold">{parishTotals.totalObservers}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="flex items-center p-4">
              <TrendingUp className="h-8 w-8 text-purple-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Turnout</p>
                <p className="text-2xl font-bold">{parishTotals.averageTurnout}%</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as any)} className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="heatmap">Heat Map</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="comparison">Comparison</TabsTrigger>
          </TabsList>
          
          {viewMode === "heatmap" && (
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium">Metric:</label>
              <Select value={selectedMetric} onValueChange={(value) => setSelectedMetric(value as any)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="incidents">Incidents</SelectItem>
                  <SelectItem value="turnout">Voter Turnout</SelectItem>
                  <SelectItem value="observers">Observers</SelectItem>
                  <SelectItem value="critical">Critical Alerts</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <TabsContent value="heatmap" className="space-y-4">
          {/* Map Visualization */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Map className="h-5 w-5 mr-2" />
                Interactive Jamaica Map - {selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-96">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading map data...</p>
                  </div>
                </div>
              ) : (
                <JamaicaSvgMap
                  parishStats={parishStats}
                  selectedMetric={selectedMetric}
                  onParishSelect={setSelectedParish}
                  selectedParish={selectedParish}
                />
              )}
            </CardContent>
          </Card>

          {/* Parish Cards Grid */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                Parish Statistics Grid
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-96">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading parish data...</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Legend */}
                  <div className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <span className="text-sm font-medium">Intensity Levels:</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 bg-green-400 rounded-full"></div>
                      <span className="text-xs">Low</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 bg-yellow-400 rounded-full"></div>
                      <span className="text-xs">Medium</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 bg-red-400 rounded-full"></div>
                      <span className="text-xs">High</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 bg-red-600 rounded-full"></div>
                      <span className="text-xs">Critical</span>
                    </div>
                  </div>

                  {/* Parish Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {Object.entries(JAMAICA_PARISHES).map(([parishName, coords]) => {
                      const parish = parishStats.find((p: ParishData) => p.parishName === parishName);
                      const value = getMetricValue(parishName);
                      const intensity = getIntensityLevel(value);
                      const isSelected = selectedParish === parishName;

                      return (
                        <Card 
                          key={parishName}
                          className={`cursor-pointer transition-all hover:shadow-lg ${
                            isSelected ? 'ring-2 ring-blue-500 shadow-lg' : ''
                          }`}
                          onClick={() => setSelectedParish(isSelected ? null : parishName)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="font-semibold text-sm">{parishName}</h3>
                              <Badge className={getIntensityColor(intensity)}>
                                {intensity}
                              </Badge>
                            </div>
                            
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Incidents:</span>
                                <span className="font-medium">{parish?.incidents || 0}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Turnout:</span>
                                <span className="font-medium">{parish?.turnout || 0}%</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Observers:</span>
                                <span className="font-medium">{parish?.observers || 0}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Critical:</span>
                                <span className="font-medium">{parish?.critical || 0}</span>
                              </div>
                            </div>

                            <div className="mt-3 pt-2 border-t">
                              <div className="flex items-center text-xs text-muted-foreground">
                                <MapPin className="h-3 w-3 mr-1" />
                                {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Parishes</CardTitle>
              </CardHeader>
              <CardContent>
                {parishComparison && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Highest Incidents:</span>
                      <Badge variant="destructive">{parishComparison.highestIncidents}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Highest Turnout:</span>
                      <Badge variant="default">{parishComparison.highestTurnout}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Most Observers:</span>
                      <Badge variant="secondary">{parishComparison.mostObservers}</Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Critical Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                {parishComparison?.criticalAlerts?.length ? (
                  <div className="space-y-2">
                    {parishComparison.criticalAlerts.map((alert, index) => (
                      <div key={index} className="flex items-center">
                        <AlertTriangle className="h-4 w-4 text-red-500 mr-2" />
                        <span className="text-sm">{alert}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No critical alerts at this time</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="comparison" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Parish Comparison Table</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Parish</th>
                      <th className="text-left p-2">Incidents</th>
                      <th className="text-left p-2">Turnout (%)</th>
                      <th className="text-left p-2">Observers</th>
                      <th className="text-left p-2">Critical</th>
                      <th className="text-left p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parishStats.map((parish: ParishData) => {
                      const intensity = getIntensityLevel(getMetricValue(parish.parishName));
                      return (
                        <tr key={parish.parishId} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="p-2 font-medium">{parish.parishName}</td>
                          <td className="p-2">{parish.incidents}</td>
                          <td className="p-2">{parish.turnout}%</td>
                          <td className="p-2">{parish.observers}</td>
                          <td className="p-2">{parish.critical}</td>
                          <td className="p-2">
                            <Badge className={getIntensityColor(intensity)}>
                              {intensity}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Selected Parish Details */}
      {selectedParish && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Eye className="h-5 w-5 mr-2" />
              {selectedParish} - Detailed Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const parish = parishStats.find((p: ParishData) => p.parishName === selectedParish);
              const coords = JAMAICA_PARISHES[selectedParish as keyof typeof JAMAICA_PARISHES];
              
              if (!parish) return <p>No data available for {selectedParish}</p>;

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <Activity className="h-8 w-8 text-red-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold">{parish.incidents}</p>
                    <p className="text-sm text-muted-foreground">Incidents Reported</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold">{parish.turnout}%</p>
                    <p className="text-sm text-muted-foreground">Voter Turnout</p>
                  </div>
                  <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold">{parish.observers}</p>
                    <p className="text-sm text-muted-foreground">Active Observers</p>
                  </div>
                  <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <AlertTriangle className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold">{parish.critical}</p>
                    <p className="text-sm text-muted-foreground">Critical Alerts</p>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}
    </div>
  );
}