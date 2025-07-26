import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Route, 
  MapPin, 
  Clock, 
  Navigation,
  Target,
  Zap,
  Car,
  Users,
  Settings,
  Save,
  Play,
  AlertTriangle,
  Activity
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface OptimizedRoute {
  id: string;
  observerId: number;
  routeType: string;
  estimatedDuration: string;
  estimatedDistance: string;
  waypoints: any[];
  optimizedRoute: any;
  trafficAwareness: boolean;
  priorityLevel: string;
  assignmentDate: string;
  scheduledStartTime: string;
  actualStartTime?: string;
}

interface RouteOptimization {
  totalDistance: string;
  totalDuration: string;
  efficiency: number;
  trafficImpact: string;
  recommendedStartTime: string;
  waypoints: Array<{
    stationId: number;
    stationName: string;
    arrivalTime: string;
    departureTime: string;
    duration: string;
  }>;
  alternativeRoutes: any[];
}

export default function ObserverRoutePlanner() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedObserver, setSelectedObserver] = useState<string>('');
  const [routeType, setRouteType] = useState<string>('daily_patrol');
  const [selectedStations, setSelectedStations] = useState<number[]>([]);
  const [startLat, setStartLat] = useState<string>('');
  const [startLng, setStartLng] = useState<string>('');
  const [avoidTolls, setAvoidTolls] = useState<boolean>(true);
  const [avoidHighways, setAvoidHighways] = useState<boolean>(false);
  const [trafficAwareness, setTrafficAwareness] = useState<boolean>(true);
  const [priorityLevel, setPriorityLevel] = useState<string>('normal');

  // Fetch observers
  const { data: observers = [] } = useQuery<any[]>({
    queryKey: ['/api/observers/active'],
  });

  // Fetch polling stations
  const { data: stations = [] } = useQuery<any[]>({
    queryKey: ['/api/polling-stations'],
  });

  // Fetch existing routes
  const { data: routes = [] } = useQuery<OptimizedRoute[]>({
    queryKey: ['/api/routes/observer'],
    enabled: !!selectedObserver,
  });

  // Optimize route mutation
  const optimizeRouteMutation = useMutation({
    mutationFn: async (data: {
      observerId: number;
      startLat: number;
      startLng: number;
      waypointStationIds: number[];
      routeType: string;
      trafficAwareness: boolean;
      avoidTolls: boolean;
      avoidHighways: boolean;
      priorityLevel: string;
    }) => {
      return apiRequest('/api/enhanced-traffic/routes/optimize', 'POST', data);
    },
    onSuccess: (data) => {
      toast({ title: "Route Optimized", description: "Observer route has been optimized successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/routes/observer'] });
    },
    onError: () => {
      toast({ title: "Optimization Failed", description: "Could not optimize route", variant: "destructive" });
    },
  });

  // Save route mutation
  const saveRouteMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/routes/save', 'POST', data);
    },
    onSuccess: () => {
      toast({ title: "Route Saved", description: "Route has been saved successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/routes/observer'] });
    },
  });

  const handleOptimizeRoute = () => {
    if (!selectedObserver || selectedStations.length === 0 || !startLat || !startLng) {
      toast({ title: "Invalid Input", description: "Please fill all required fields", variant: "destructive" });
      return;
    }

    optimizeRouteMutation.mutate({
      observerId: parseInt(selectedObserver),
      startLat: parseFloat(startLat),
      startLng: parseFloat(startLng),
      waypointStationIds: selectedStations,
      routeType,
      trafficAwareness,
      avoidTolls,
      avoidHighways,
      priorityLevel,
    });
  };

  const handleStationToggle = (stationId: number) => {
    setSelectedStations(prev => 
      prev.includes(stationId) 
        ? prev.filter(id => id !== stationId)
        : [...prev, stationId]
    );
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setStartLat(position.coords.latitude.toString());
          setStartLng(position.coords.longitude.toString());
          toast({ title: "Location Set", description: "Current location has been set as starting point" });
        },
        (error) => {
          toast({ title: "Location Error", description: "Could not get current location", variant: "destructive" });
        }
      );
    }
  };

  const optimizationResult = optimizeRouteMutation.data as RouteOptimization;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Observer Route Planner</h1>
          <p className="text-muted-foreground">AI-powered route optimization for field observers</p>
        </div>
        <Button
          onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/routes/observer'] })}
          variant="outline"
          size="sm"
        >
          <Activity className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Route Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>Route Configuration</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="observer">Observer</Label>
                <Select value={selectedObserver} onValueChange={setSelectedObserver}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select observer" />
                  </SelectTrigger>
                  <SelectContent>
                    {observers.map(observer => (
                      <SelectItem key={observer.id} value={observer.id.toString()}>
                        Observer #{observer.observerId} - {observer.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="route-type">Route Type</Label>
                <Select value={routeType} onValueChange={setRouteType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily_patrol">Daily Patrol</SelectItem>
                    <SelectItem value="station_to_station">Station to Station</SelectItem>
                    <SelectItem value="emergency_response">Emergency Response</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start-lat">Start Latitude</Label>
                <Input
                  id="start-lat"
                  placeholder="18.0179"
                  value={startLat}
                  onChange={(e) => setStartLat(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="start-lng">Start Longitude</Label>
                <Input
                  id="start-lng"
                  placeholder="-76.8099"
                  value={startLng}
                  onChange={(e) => setStartLng(e.target.value)}
                />
              </div>
            </div>

            <Button 
              variant="outline" 
              onClick={getCurrentLocation}
              className="w-full"
            >
              <Navigation className="h-4 w-4 mr-2" />
              Use Current Location
            </Button>

            <div>
              <Label htmlFor="priority">Priority Level</Label>
              <Select value={priorityLevel} onValueChange={setPriorityLevel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low Priority</SelectItem>
                  <SelectItem value="normal">Normal Priority</SelectItem>
                  <SelectItem value="high">High Priority</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label>Route Preferences</Label>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="traffic-awareness"
                  checked={trafficAwareness}
                  onCheckedChange={(checked) => setTrafficAwareness(checked as boolean)}
                />
                <Label htmlFor="traffic-awareness">Real-time traffic awareness</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="avoid-tolls"
                  checked={avoidTolls}
                  onCheckedChange={(checked) => setAvoidTolls(checked as boolean)}
                />
                <Label htmlFor="avoid-tolls">Avoid toll roads</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="avoid-highways"
                  checked={avoidHighways}
                  onCheckedChange={(checked) => setAvoidHighways(checked as boolean)}
                />
                <Label htmlFor="avoid-highways">Avoid highways</Label>
              </div>
            </div>

            <Button 
              onClick={handleOptimizeRoute}
              disabled={optimizeRouteMutation.isPending}
              className="w-full"
            >
              <Zap className="h-4 w-4 mr-2" />
              {optimizeRouteMutation.isPending ? 'Optimizing...' : 'Optimize Route'}
            </Button>
          </CardContent>
        </Card>

        {/* Station Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5" />
              <span>Select Stations ({selectedStations.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-y-auto space-y-2">
              {stations.map((station) => (
                <div 
                  key={station.id} 
                  className={`p-3 border rounded cursor-pointer transition-colors ${
                    selectedStations.includes(station.id) ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => handleStationToggle(station.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{station.name}</p>
                      <p className="text-sm text-muted-foreground">{station.parish}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {station.latitude && station.longitude && (
                        <Badge variant="outline">GPS</Badge>
                      )}
                      <Checkbox 
                        checked={selectedStations.includes(station.id)}
                        onChange={() => handleStationToggle(station.id)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Optimization Results */}
      {optimizationResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Route className="h-5 w-5" />
              <span>Optimized Route</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Route Summary */}
            <div className="grid grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Car className="h-6 w-6 text-blue-500" />
                    <div>
                      <p className="text-lg font-bold">{optimizationResult.totalDistance}</p>
                      <p className="text-sm text-muted-foreground">Total Distance</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-6 w-6 text-green-500" />
                    <div>
                      <p className="text-lg font-bold">{optimizationResult.totalDuration}</p>
                      <p className="text-sm text-muted-foreground">Total Duration</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Zap className="h-6 w-6 text-purple-500" />
                    <div>
                      <p className="text-lg font-bold">{optimizationResult.efficiency}%</p>
                      <p className="text-sm text-muted-foreground">Efficiency</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-6 w-6 text-orange-500" />
                    <div>
                      <p className="text-lg font-bold">{optimizationResult.trafficImpact}</p>
                      <p className="text-sm text-muted-foreground">Traffic Impact</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Waypoints */}
            <div>
              <h4 className="font-medium mb-4">Route Waypoints</h4>
              <div className="space-y-3">
                {optimizationResult.waypoints.map((waypoint, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div className="flex items-center space-x-3">
                      <Badge variant="outline">{index + 1}</Badge>
                      <div>
                        <p className="font-medium">{waypoint.stationName}</p>
                        <p className="text-sm text-muted-foreground">
                          Arrival: {waypoint.arrivalTime} • Duration: {waypoint.duration}
                        </p>
                      </div>
                    </div>
                    <Badge variant="default">{waypoint.departureTime}</Badge>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex space-x-2">
              <Button 
                onClick={() => saveRouteMutation.mutate(optimizationResult)}
                disabled={saveRouteMutation.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                Save Route
              </Button>
              <Button variant="outline">
                <Play className="h-4 w-4 mr-2" />
                Start Navigation
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing Routes */}
      {routes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Saved Routes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {routes.map((route) => (
                <div key={route.id} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <p className="font-medium">{route.routeType.replace('_', ' ')}</p>
                    <p className="text-sm text-muted-foreground">
                      {route.estimatedDistance} • {route.estimatedDuration} • {route.priorityLevel} priority
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">
                      {new Date(route.scheduledStartTime).toLocaleDateString()}
                    </Badge>
                    <Button variant="outline" size="sm">
                      <Play className="h-4 w-4 mr-1" />
                      Use
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}