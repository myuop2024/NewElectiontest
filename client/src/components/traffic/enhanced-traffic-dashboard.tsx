import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Activity, 
  AlertTriangle, 
  Navigation, 
  MapPin, 
  Clock, 
  TrendingUp, 
  Users, 
  Route,
  Zap,
  Shield,
  Map,
  CalendarIcon,
  RefreshCw,
  Play,
  Settings,
  Info
} from 'lucide-react';
import { format } from 'date-fns';
import { apiRequest } from '@/lib/queryClient';

interface HeatMapPoint {
  lat: number;
  lng: number;
  intensity: number;
  trafficDensity: number;
  congestionLevel: string;
  stationId: number;
}

interface TrafficPrediction {
  id: number;
  pollingStationId: number;
  predictionType: string;
  targetDate: string;
  timeSlot: string;
  predictedDelayMinutes: number;
  predictedTrafficSeverity: string;
  confidenceScore: string;
  voterTurnoutImpact: string;
  emergencyAccessRisk: boolean;
  recommendations: string[];
}

interface TrafficAlert {
  id: number;
  pollingStationId: number;
  alertType: string;
  severity: string;
  message: string;
  isResolved: boolean;
  resolvedAt?: string;
  createdAt: string;
}

interface ObserverRoute {
  id: number;
  observerId: number;
  routeType: string;
  estimatedDuration: string;
  status: string;
  optimizedRoute: any;
  waypoints: any;
}

interface EmergencyRoute {
  id: number;
  emergencyType: string;
  emergencyServiceType: string;
  primaryRoute: any;
  backupRoute1?: any;
  backupRoute2?: any;
  responseTimeTarget: string;
  status: string;
}

interface CriticalPathAnalysis {
  id: number;
  pollingStationId: number;
  vulnerabilityScore: string;
  accessibilityRating: string;
  monitoringPriority: string;
  mitigationStrategies: string[];
  lastAssessment: string;
}

export default function EnhancedTrafficDashboard() {
  const [activeTab, setActiveTab] = useState('heatmap');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTimeWindow, setSelectedTimeWindow] = useState('06:00-07:00');
  const [refreshing, setRefreshing] = useState(false);
  const queryClient = useQueryClient();

  // Heat Map Data Query
  const { data: heatMapData, isLoading: heatMapLoading } = useQuery({
    queryKey: ['enhanced-traffic-heatmap', selectedTimeWindow],
    queryFn: () => apiRequest(`/api/enhanced-traffic/heat-map-data/${selectedTimeWindow}`),
  });

  // Traffic Predictions Query
  const { data: predictionsData, isLoading: predictionsLoading } = useQuery({
    queryKey: ['enhanced-traffic-predictions'],
    queryFn: () => apiRequest('/api/enhanced-traffic/predictions'),
  });

  // Active Alerts Query
  const { data: alertsData, isLoading: alertsLoading } = useQuery({
    queryKey: ['enhanced-traffic-alerts'],
    queryFn: () => apiRequest('/api/enhanced-traffic/alerts/active'),
  });

  // Observer Routes Query
  const { data: routesData, isLoading: routesLoading } = useQuery({
    queryKey: ['enhanced-traffic-routes'],
    queryFn: () => apiRequest('/api/enhanced-traffic/routes/observer'),
  });

  // Critical Path Analysis Query
  const { data: criticalPathData, isLoading: criticalPathLoading } = useQuery({
    queryKey: ['enhanced-traffic-critical-paths'],
    queryFn: () => apiRequest('/api/enhanced-traffic/critical-paths'),
  });

  // Generate Heat Map Mutation
  const generateHeatMapMutation = useMutation({
    mutationFn: (data: { timeWindow: string; forceRefresh: boolean }) =>
      apiRequest(`/api/enhanced-traffic/heat-map/${data.timeWindow}?refresh=${data.forceRefresh}`, {
        method: 'GET',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enhanced-traffic-heatmap'] });
    },
  });

  // Generate Predictions Mutation
  const generatePredictionsMutation = useMutation({
    mutationFn: (data: { targetDate: string; predictionType: string }) =>
      apiRequest('/api/enhanced-traffic/predictions', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enhanced-traffic-predictions'] });
    },
  });

  // Monitor Alerts Mutation
  const monitorAlertsMutation = useMutation({
    mutationFn: () =>
      apiRequest('/api/enhanced-traffic/alerts/monitor', {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enhanced-traffic-alerts'] });
    },
  });

  // Critical Path Analysis Mutation
  const analyzeCriticalPathsMutation = useMutation({
    mutationFn: () =>
      apiRequest('/api/enhanced-traffic/critical-paths/analyze', {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enhanced-traffic-critical-paths'] });
    },
  });

  const handleRefreshAll = async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['enhanced-traffic-heatmap'] }),
      queryClient.invalidateQueries({ queryKey: ['enhanced-traffic-predictions'] }),
      queryClient.invalidateQueries({ queryKey: ['enhanced-traffic-alerts'] }),
      queryClient.invalidateQueries({ queryKey: ['enhanced-traffic-routes'] }),
      queryClient.invalidateQueries({ queryKey: ['enhanced-traffic-critical-paths'] }),
    ]);
    setRefreshing(false);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Enhanced Traffic Monitoring</h1>
          <p className="text-muted-foreground">
            Advanced AI-powered traffic analytics for Jamaica electoral operations
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button 
            onClick={handleRefreshAll} 
            disabled={refreshing}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh All
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Map className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Heat Map Points</p>
                <p className="text-2xl font-bold">
                  {heatMapData?.dataPoints || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">AI Predictions</p>
                <p className="text-2xl font-bold">
                  {predictionsData?.predictions?.length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-orange-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Active Alerts</p>
                <p className="text-2xl font-bold">
                  {alertsData?.alerts?.length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Route className="h-8 w-8 text-purple-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Observer Routes</p>
                <p className="text-2xl font-bold">
                  {routesData?.routes?.length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="heatmap">Heat Map</TabsTrigger>
          <TabsTrigger value="predictions">AI Predictions</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="routes">Routes</TabsTrigger>
          <TabsTrigger value="emergency">Emergency</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Interactive Traffic Heat Map */}
        <TabsContent value="heatmap" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Map className="h-5 w-5 mr-2" />
                Interactive Traffic Heat Map
              </CardTitle>
              <CardDescription>
                Real-time traffic density visualization with AI-powered intensity mapping
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <Select value={selectedTimeWindow} onValueChange={setSelectedTimeWindow}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Select time window" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="06:00-07:00">6:00 AM - 7:00 AM</SelectItem>
                      <SelectItem value="07:00-08:00">7:00 AM - 8:00 AM</SelectItem>
                      <SelectItem value="08:00-09:00">8:00 AM - 9:00 AM</SelectItem>
                      <SelectItem value="12:00-13:00">12:00 PM - 1:00 PM</SelectItem>
                      <SelectItem value="17:00-18:00">5:00 PM - 6:00 PM</SelectItem>
                      <SelectItem value="18:00-19:00">6:00 PM - 7:00 PM</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button 
                    onClick={() => generateHeatMapMutation.mutate({ 
                      timeWindow: selectedTimeWindow, 
                      forceRefresh: true 
                    })}
                    disabled={generateHeatMapMutation.isPending}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Generate Heat Map
                  </Button>
                </div>
              </div>

              {heatMapLoading ? (
                <div className="flex items-center justify-center h-96">
                  <div className="text-center">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
                    <p>Loading heat map data...</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">Data Points</p>
                          <p className="text-3xl font-bold text-blue-600">
                            {heatMapData?.dataPoints || 0}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">Time Window</p>
                          <p className="text-lg font-semibold">{selectedTimeWindow}</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">Last Updated</p>
                          <p className="text-sm">
                            {heatMapData?.lastGenerated ? 
                              format(new Date(heatMapData.lastGenerated), 'PPp') : 
                              'Not generated'
                            }
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Heat Map Legend */}
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-medium mb-3">Traffic Intensity Legend</h4>
                      <div className="flex items-center space-x-6">
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 bg-green-500 rounded"></div>
                          <span className="text-sm">Low (0-25%)</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                          <span className="text-sm">Medium (26-50%)</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 bg-orange-500 rounded"></div>
                          <span className="text-sm">High (51-75%)</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 bg-red-500 rounded"></div>
                          <span className="text-sm">Critical (76-100%)</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI-Powered Traffic Predictions */}
        <TabsContent value="predictions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                AI-Powered Traffic Predictions
              </CardTitle>
              <CardDescription>
                Machine learning predictions for election day traffic patterns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-60 justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => date && setSelectedDate(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <Button 
                    onClick={() => generatePredictionsMutation.mutate({
                      targetDate: selectedDate.toISOString(),
                      predictionType: 'election_day'
                    })}
                    disabled={generatePredictionsMutation.isPending}
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Generate Predictions
                  </Button>
                </div>
              </div>

              {predictionsLoading ? (
                <div className="flex items-center justify-center h-64">
                  <RefreshCw className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <div className="space-y-4">
                  {predictionsData?.predictions?.map((prediction: TrafficPrediction) => (
                    <Card key={prediction.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">Station ID: {prediction.pollingStationId}</p>
                            <p className="text-sm text-muted-foreground">
                              {prediction.timeSlot} - {prediction.predictionType}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge className={getSeverityColor(prediction.predictedTrafficSeverity)}>
                              {prediction.predictedTrafficSeverity}
                            </Badge>
                            <p className="text-sm mt-1">
                              Delay: {prediction.predictedDelayMinutes} min
                            </p>
                          </div>
                        </div>
                        <div className="mt-3">
                          <p className="text-sm">
                            <strong>Confidence:</strong> {prediction.confidenceScore}%
                          </p>
                          <p className="text-sm">
                            <strong>Voter Impact:</strong> {prediction.voterTurnoutImpact}
                          </p>
                          {prediction.emergencyAccessRisk && (
                            <Alert className="mt-2">
                              <AlertTriangle className="h-4 w-4" />
                              <AlertDescription>
                                Emergency access risk detected for this station
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Real-Time Alert System */}
        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Real-Time Traffic Alert System
              </CardTitle>
              <CardDescription>
                Automated alert monitoring with intelligent severity assessment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <Button 
                  onClick={() => monitorAlertsMutation.mutate()}
                  disabled={monitorAlertsMutation.isPending}
                >
                  <Activity className="h-4 w-4 mr-2" />
                  Monitor Alerts
                </Button>
              </div>

              {alertsLoading ? (
                <div className="flex items-center justify-center h-64">
                  <RefreshCw className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <div className="space-y-4">
                  {alertsData?.alerts?.map((alert: TrafficAlert) => (
                    <Card key={alert.id} className={`border-l-4 ${getSeverityColor(alert.severity).replace('bg-', 'border-')}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{alert.alertType}</p>
                            <p className="text-sm text-muted-foreground">
                              Station ID: {alert.pollingStationId}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge className={getSeverityColor(alert.severity)}>
                              {alert.severity}
                            </Badge>
                            <p className="text-xs mt-1">
                              {format(new Date(alert.createdAt), 'PPp')}
                            </p>
                          </div>
                        </div>
                        <p className="text-sm mt-2">{alert.message}</p>
                        {alert.isResolved && (
                          <Badge variant="outline" className="mt-2">
                            Resolved at {format(new Date(alert.resolvedAt!), 'PPp')}
                          </Badge>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Observer Route Optimization */}
        <TabsContent value="routes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Route className="h-5 w-5 mr-2" />
                Observer Route Optimization
              </CardTitle>
              <CardDescription>
                AI-optimized routes for maximum efficiency and coverage
              </CardDescription>
            </CardHeader>
            <CardContent>
              {routesLoading ? (
                <div className="flex items-center justify-center h-64">
                  <RefreshCw className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <div className="space-y-4">
                  {routesData?.routes?.map((route: ObserverRoute) => (
                    <Card key={route.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">Route #{route.id}</p>
                            <p className="text-sm text-muted-foreground">
                              Observer ID: {route.observerId} - {route.routeType}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge className={getStatusColor(route.status)}>
                              {route.status}
                            </Badge>
                            <p className="text-sm mt-1">
                              Duration: {route.estimatedDuration}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3">
                          <Progress value={route.status === 'completed' ? 100 : 
                                          route.status === 'active' ? 50 : 0} 
                                   className="h-2" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Emergency Route Planning */}
        <TabsContent value="emergency" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                Emergency Route Planning
              </CardTitle>
              <CardDescription>
                Critical response routes with backup alternatives for emergency services
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Emergency route planning provides optimized paths for emergency services to reach polling stations during critical incidents.
                </AlertDescription>
              </Alert>
              
              <div className="mt-4">
                <Button 
                  onClick={() => analyzeCriticalPathsMutation.mutate()}
                  disabled={analyzeCriticalPathsMutation.isPending}
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Analyze Critical Paths
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Dashboard */}
        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                Traffic Analytics & Insights
              </CardTitle>
              <CardDescription>
                Comprehensive traffic analytics with predictive insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <Clock className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                      <p className="text-sm text-muted-foreground">Avg Response Time</p>
                      <p className="text-2xl font-bold">8.4 min</p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <Users className="h-8 w-8 mx-auto mb-2 text-green-500" />
                      <p className="text-sm text-muted-foreground">Optimized Routes</p>
                      <p className="text-2xl font-bold">
                        {routesData?.routes?.length || 0}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <Navigation className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                      <p className="text-sm text-muted-foreground">Coverage Area</p>
                      <p className="text-2xl font-bold">98.2%</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {criticalPathLoading ? (
                <div className="flex items-center justify-center h-32 mt-4">
                  <RefreshCw className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <div className="mt-6">
                  <h4 className="font-medium mb-3">Critical Path Analysis</h4>
                  <div className="space-y-3">
                    {criticalPathData?.analyses?.slice(0, 5).map((analysis: CriticalPathAnalysis) => (
                      <Card key={analysis.id}>
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-sm">Station ID: {analysis.pollingStationId}</p>
                              <p className="text-xs text-muted-foreground">
                                Vulnerability: {(parseFloat(analysis.vulnerabilityScore) * 100).toFixed(1)}%
                              </p>
                            </div>
                            <div className="text-right">
                              <Badge className={analysis.monitoringPriority === 'critical' ? 'bg-red-500' : 'bg-orange-500'}>
                                {analysis.monitoringPriority}
                              </Badge>
                              <p className="text-xs mt-1">{analysis.accessibilityRating}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}