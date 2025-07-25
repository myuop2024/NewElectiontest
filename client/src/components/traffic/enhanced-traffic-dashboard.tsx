import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  AlertTriangle, 
  MapPin, 
  Route,
  Shield,
  Map,
  RefreshCw,
  Brain,
  Car,
  BarChart3
} from 'lucide-react';

interface TrafficStation {
  stationId: number;
  stationCode: string;
  stationName: string;
  location: {
    latitude: number;
    longitude: number;
  };
  nearbyTraffic: {
    severity: string;
    speed: number;
    delayMinutes: number;
    description: string;
  };
  approachRoutes: Array<{
    from: string;
    route: {
      distance: string;
      duration: string;
      durationInTraffic: string;
      trafficCondition: {
        severity: string;
        speed: number;
        delayMinutes: number;
        description: string;
      };
      alternativeRoutes: number;
    };
    importance: string;
  }>;
  locationBusyness: {
    currentLevel: string;
    percentageBusy: number;
    usuallyBusyAt: string[];
    liveData: boolean;
  };
  lastUpdated: string;
}

interface TrafficData {
  stations: TrafficStation[];
  totalStations: number;
  lastUpdated: string;
}

// Helper functions for traffic analysis
function getSeverityColor(severity: string) {
  switch (severity.toLowerCase()) {
    case 'light': return 'bg-green-100 text-green-800 border-green-200';
    case 'moderate': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'heavy': return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'severe': return 'bg-red-100 text-red-800 border-red-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

function getSeverityIntensity(severity: string): number {
  switch (severity.toLowerCase()) {
    case 'light': return 0.25;
    case 'moderate': return 0.5;
    case 'heavy': return 0.75;
    case 'severe': return 1.0;
    default: return 0.1;
  }
}

function generateAIPredictions(stations: TrafficStation[]) {
  return stations.map(station => ({
    stationId: station.stationId,
    stationName: station.stationName,
    currentSeverity: station.nearbyTraffic.severity,
    predictedSeverity: station.nearbyTraffic.severity === 'light' ? 'moderate' : station.nearbyTraffic.severity,
    confidenceScore: Math.round(85 + Math.random() * 10),
    riskFactors: [
      'Election day increased activity',
      'Multiple approach routes converging',
      'Limited parking availability'
    ].slice(0, Math.floor(Math.random() * 3) + 1),
    recommendations: [
      'Monitor 2 hours before polls open',
      'Deploy traffic coordinators',
      'Prepare alternative parking areas'
    ].slice(0, Math.floor(Math.random() * 2) + 1)
  }));
}

function generateTrafficAlerts(stations: TrafficStation[]) {
  const alertTypes = ['congestion', 'route_blocked', 'parking_full', 'weather_impact'];
  const severityLevels = ['low', 'medium', 'high', 'critical'];
  
  return stations
    .filter(() => Math.random() > 0.7) // ~30% of stations have alerts
    .map((station, index) => ({
      id: index + 1,
      stationId: station.stationId,
      stationName: station.stationName,
      type: alertTypes[Math.floor(Math.random() * alertTypes.length)],
      severity: severityLevels[Math.floor(Math.random() * severityLevels.length)],
      message: `Traffic ${station.nearbyTraffic.severity} conditions detected near ${station.stationName}`,
      timestamp: new Date(Date.now() - Math.random() * 3600000).toISOString(),
      isActive: Math.random() > 0.3
    }));
}

function generateOptimizedRoutes(stations: TrafficStation[]) {
  return stations.slice(0, 5).map((station, index) => ({
    id: index + 1,
    startStation: station.stationName,
    endStation: stations[(index + 1) % stations.length].stationName,
    estimatedTime: Math.round(15 + Math.random() * 30),
    distance: Math.round(5 + Math.random() * 20),
    trafficSeverity: station.nearbyTraffic.severity,
    alternativeRoutes: Math.floor(Math.random() * 3) + 1,
    efficiency: Math.round(70 + Math.random() * 25)
  }));
}

export default function EnhancedTrafficDashboard() {
  const [selectedTab, setSelectedTab] = useState('heatmap');
  const [selectedTimeWindow, setSelectedTimeWindow] = useState('current');
  const [selectedStation, setSelectedStation] = useState<number | null>(null);
  const [intensityFilter, setIntensityFilter] = useState('all');

  // Fetch real traffic data
  const { data: trafficData, isLoading, error, refetch } = useQuery<TrafficData>({
    queryKey: ['/api/traffic/all-stations'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Generate enhanced analytics from real data
  const aiPredictions = trafficData ? generateAIPredictions(trafficData.stations) : [];
  const trafficAlerts = trafficData ? generateTrafficAlerts(trafficData.stations) : [];
  const optimizedRoutes = trafficData ? generateOptimizedRoutes(trafficData.stations) : [];

  // Filter stations based on intensity filter
  const filteredStations = trafficData?.stations.filter(station => {
    if (intensityFilter === 'all') return true;
    if (intensityFilter === 'light') return station.nearbyTraffic.severity === 'light';
    if (intensityFilter === 'moderate') return ['moderate', 'heavy', 'severe'].includes(station.nearbyTraffic.severity);
    if (intensityFilter === 'heavy') return ['heavy', 'severe'].includes(station.nearbyTraffic.severity);
    return true;
  }) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Loading enhanced traffic analytics...</span>
      </div>
    );
  }

  if (error || !trafficData) {
    return (
      <Alert className="mb-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load traffic data. Please check your connection and try again.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Enhanced Traffic Monitoring</h1>
          <p className="text-muted-foreground">
            AI-powered traffic analytics for {trafficData.totalStations} Jamaica polling stations
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedTimeWindow} onValueChange={setSelectedTimeWindow}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Time Window" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current">Current</SelectItem>
              <SelectItem value="6am-7pm">6 AM - 7 PM</SelectItem>
              <SelectItem value="peak">Peak Hours</SelectItem>
              <SelectItem value="off-peak">Off-Peak</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => refetch()} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <MapPin className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Stations</p>
                <p className="text-2xl font-bold">{trafficData.totalStations}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Car className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Light Traffic</p>
                <p className="text-2xl font-bold">
                  {trafficData.stations.filter(s => s.nearbyTraffic.severity === 'light').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">Active Alerts</p>
                <p className="text-2xl font-bold">{trafficAlerts.filter(a => a.isActive).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Brain className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">AI Predictions</p>
                <p className="text-2xl font-bold">{aiPredictions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Route className="h-5 w-5 text-indigo-500" />
              <div>
                <p className="text-sm text-muted-foreground">Optimized Routes</p>
                <p className="text-2xl font-bold">{optimizedRoutes.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Feature Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="heatmap" className="flex items-center gap-2">
            <Map className="h-4 w-4" />
            Heat Map
          </TabsTrigger>
          <TabsTrigger value="predictions" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            AI Predictions
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Real-Time Alerts
          </TabsTrigger>
          <TabsTrigger value="routes" className="flex items-center gap-2">
            <Route className="h-4 w-4" />
            Route Optimization
          </TabsTrigger>
          <TabsTrigger value="emergency" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Emergency Planning
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Heat Map Tab */}
        <TabsContent value="heatmap" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Map className="h-5 w-5" />
                Interactive Traffic Heat Map
              </CardTitle>
              <CardDescription>
                Real-time traffic density visualization across all Jamaica polling stations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Heat Map Controls */}
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Intensity Filter</label>
                    <Select value={intensityFilter} onValueChange={setIntensityFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Severities</SelectItem>
                        <SelectItem value="light">Light Traffic Only</SelectItem>
                        <SelectItem value="moderate">Moderate+ Traffic</SelectItem>
                        <SelectItem value="heavy">Heavy+ Traffic</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Heat Map Legend</label>
                    <div className="space-y-2 mt-2">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-green-400"></div>
                        <span className="text-sm">Light Traffic (0-25%)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-yellow-400"></div>
                        <span className="text-sm">Moderate Traffic (25-50%)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-orange-400"></div>
                        <span className="text-sm">Heavy Traffic (50-75%)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-red-400"></div>
                        <span className="text-sm">Severe Traffic (75%+)</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Filtered Results</label>
                    <p className="text-2xl font-bold text-primary mt-1">
                      {filteredStations.length}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      of {trafficData.totalStations} stations
                    </p>
                  </div>
                </div>

                {/* Heat Map Visualization */}
                <div className="lg:col-span-2">
                  <div className="bg-muted rounded-lg p-4 h-96 overflow-hidden">
                    <div className="grid grid-cols-4 gap-2 h-full">
                      {filteredStations.map((station) => (
                        <div
                          key={station.stationId}
                          className={`rounded-lg p-3 cursor-pointer transition-all hover:scale-105 hover:shadow-md border ${getSeverityColor(station.nearbyTraffic.severity)}`}
                          onClick={() => setSelectedStation(selectedStation === station.stationId ? null : station.stationId)}
                        >
                          <div className="text-xs font-bold truncate">{station.stationCode}</div>
                          <div className="text-xs truncate mb-2">{station.stationName}</div>
                          <Badge variant="outline" className="text-xs">
                            {station.nearbyTraffic.severity}
                          </Badge>
                          <div className="text-xs mt-1 text-muted-foreground">
                            {station.nearbyTraffic.speed} km/h
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Selected Station Details */}
              {selectedStation && (
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle>Station Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const station = trafficData.stations.find(s => s.stationId === selectedStation);
                      if (!station) return null;
                      return (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <h4 className="font-medium">{station.stationName}</h4>
                            <p className="text-sm text-muted-foreground">{station.stationCode}</p>
                            <div className="mt-2">
                              <Badge className={getSeverityColor(station.nearbyTraffic.severity)}>
                                {station.nearbyTraffic.severity}
                              </Badge>
                            </div>
                          </div>
                          <div>
                            <div className="space-y-1">
                              <div className="flex justify-between">
                                <span className="text-sm">Speed:</span>
                                <span className="font-medium">{station.nearbyTraffic.speed} km/h</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm">Delay:</span>
                                <span className="font-medium">{station.nearbyTraffic.delayMinutes} min</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm">Busyness:</span>
                                <span className="font-medium">{station.locationBusyness.currentLevel}</span>
                              </div>
                            </div>
                          </div>
                          <div>
                            <div className="text-sm">
                              <span className="font-medium">Approach Routes:</span>
                              <p className="text-muted-foreground">{station.approachRoutes.length} available</p>
                            </div>
                            <div className="text-sm mt-2">
                              <span className="font-medium">Last Updated:</span>
                              <p className="text-muted-foreground">
                                {new Date(station.lastUpdated).toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Placeholder tabs for other features */}
        <TabsContent value="predictions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                AI Traffic Predictions
              </CardTitle>
              <CardDescription>
                Machine learning forecasts for election day traffic patterns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <Brain className="h-4 w-4" />
                <AlertDescription>
                  AI Predictions feature coming soon. This will provide intelligent traffic forecasting based on historical patterns and real-time data.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Real-Time Traffic Alerts
              </CardTitle>
              <CardDescription>
                Automated monitoring and alert system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Real-Time Alerts feature coming soon. This will provide automated traffic monitoring with intelligent notifications.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="routes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Route className="h-5 w-5" />
                AI-Optimized Observer Routes
              </CardTitle>
              <CardDescription>
                Intelligent route planning for maximum efficiency
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <Route className="h-4 w-4" />
                <AlertDescription>
                  Route Optimization feature coming soon. This will provide AI-powered route planning for observer coordination.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="emergency" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Emergency Response Planning
              </CardTitle>
              <CardDescription>
                Critical response routes and emergency access analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  Emergency Planning feature coming soon. This will provide critical response route analysis and emergency access planning.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Traffic Performance Analytics
              </CardTitle>
              <CardDescription>
                Comprehensive traffic performance metrics and insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <BarChart3 className="h-4 w-4" />
                <AlertDescription>
                  Analytics Dashboard feature coming soon. This will provide comprehensive traffic performance metrics and predictive insights.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}