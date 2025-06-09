import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useToast } from "@/hooks/use-toast";
import { 
  MapPin, 
  Navigation, 
  Clock, 
  Route, 
  Users, 
  Activity, 
  Zap,
  AlertTriangle,
  CheckCircle,
  Play,
  Pause,
  Square
} from "lucide-react";

interface LocationUpdate {
  id: string;
  userId: number;
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string;
  speed?: number;
  heading?: number;
  battery?: number;
  isActive: boolean;
}

interface RouteHistory {
  id: string;
  userId: number;
  startTime: string;
  endTime?: string;
  totalDistance: number;
  averageSpeed: number;
  locations: LocationUpdate[];
  stations: string[];
}

export default function LocationTracking() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { location, error: geoError, isLoading: geoLoading } = useGeolocation();
  
  const [isTracking, setIsTracking] = useState(false);
  const [trackingSession, setTrackingSession] = useState<string | null>(null);
  const [selectedObserver, setSelectedObserver] = useState<number | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastLocationRef = useRef<GeolocationPosition | null>(null);

  // Fetch active observers for map display
  const { data: activeObservers = [] } = useQuery<LocationUpdate[]>({
    queryKey: ["/api/location/active-observers"],
    refetchInterval: 5000, // Update every 5 seconds
    enabled: user?.role === 'admin' || user?.role === 'coordinator'
  });

  // Fetch route history
  const { data: routeHistory = [] } = useQuery<RouteHistory[]>({
    queryKey: ["/api/location/route-history", selectedObserver || user?.id],
    enabled: !!selectedObserver || !!user?.id
  });

  // Start location tracking mutation
  const startTrackingMutation = useMutation({
    mutationFn: async (locationData: {
      latitude: number;
      longitude: number;
      accuracy: number;
      speed?: number;
      heading?: number;
    }) => {
      const response = await apiRequest("/api/location/start-tracking", "POST", locationData);
      return response as unknown as { sessionId: string };
    },
    onSuccess: (data: { sessionId: string }) => {
      setTrackingSession(data.sessionId);
      setIsTracking(true);
      toast({
        title: "Location Tracking Started",
        description: "Your location is now being shared with coordinators",
      });
    },
    onError: () => {
      toast({
        title: "Tracking Failed",
        description: "Unable to start location tracking",
        variant: "destructive"
      });
    }
  });

  // Update location mutation
  const updateLocationMutation = useMutation({
    mutationFn: async (locationData: {
      sessionId: string;
      latitude: number;
      longitude: number;
      accuracy: number;
      speed?: number;
      heading?: number;
      battery?: number;
    }) => {
      return await apiRequest("/api/location/update", "POST", locationData);
    }
  });

  // Stop tracking mutation
  const stopTrackingMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/location/stop-tracking", "POST", { sessionId: trackingSession });
    },
    onSuccess: () => {
      setIsTracking(false);
      setTrackingSession(null);
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      toast({
        title: "Location Tracking Stopped",
        description: "Location sharing has been disabled",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/location/active-observers"] });
    }
  });

  // Start GPS tracking
  const startLocationTracking = () => {
    if (!location) {
      toast({
        title: "Location Required",
        description: "Please enable location access to start tracking",
        variant: "destructive"
      });
      return;
    }

    // Get battery level if available
    const getBatteryLevel = async () => {
      if ('getBattery' in navigator) {
        try {
          const battery = await (navigator as any).getBattery();
          return Math.round(battery.level * 100);
        } catch {
          return undefined;
        }
      }
      return undefined;
    };

    const startTracking = async () => {
      const battery = await getBatteryLevel();
      
      startTrackingMutation.mutate({
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        speed: location.speed || undefined,
        heading: location.heading || undefined,
      });

      // Set up continuous tracking
      watchIdRef.current = navigator.geolocation.watchPosition(
        async (position) => {
          if (trackingSession) {
            const battery = await getBatteryLevel();
            updateLocationMutation.mutate({
              sessionId: trackingSession,
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              speed: position.coords.speed || undefined,
              heading: position.coords.heading || undefined,
              battery
            });
          }
          lastLocationRef.current = position;
        },
        (error) => {
          console.error("Location tracking error:", error);
          toast({
            title: "Location Error",
            description: "GPS tracking encountered an issue",
            variant: "destructive"
          });
        },
        {
          enableHighAccuracy: true,
          timeout: 30000,
          maximumAge: 10000
        }
      );
    };

    startTracking();
  };

  // Stop GPS tracking
  const stopLocationTracking = () => {
    stopTrackingMutation.mutate();
  };

  // Calculate distance between two points
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Format time duration
  const formatDuration = (startTime: string, endTime?: string) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const duration = Math.floor((end.getTime() - start.getTime()) / 1000 / 60); // minutes
    
    if (duration < 60) return `${duration}m`;
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    return `${hours}h ${minutes}m`;
  };

  const canTrack = user?.role === 'roving_observer' || user?.role === 'observer';
  const canViewAll = user?.role === 'admin' || user?.role === 'coordinator';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary flex items-center space-x-2">
              <Navigation className="h-8 w-8 text-green-600" />
              <span>Location Tracking</span>
            </h1>
            <p className="text-muted-foreground">
              {canTrack ? "Share your location and view tracking history" : "Monitor observer locations and routes"}
            </p>
          </div>
          
          {canTrack && (
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Label htmlFor="tracking-toggle">Live Tracking</Label>
                <Switch
                  id="tracking-toggle"
                  checked={isTracking}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      startLocationTracking();
                    } else {
                      stopLocationTracking();
                    }
                  }}
                  disabled={startTrackingMutation.isPending || stopTrackingMutation.isPending}
                />
              </div>
              
              {isTracking && (
                <Badge variant="default" className="bg-green-100 text-green-800">
                  <Activity className="h-3 w-3 mr-1" />
                  Live
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Location Status */}
        {canTrack && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MapPin className="h-5 w-5" />
                <span>Location Status</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">GPS Status</Label>
                  <div className="flex items-center space-x-2">
                    {geoLoading ? (
                      <>
                        <div className="h-2 w-2 bg-yellow-500 rounded-full animate-pulse" />
                        <span className="text-sm">Acquiring GPS...</span>
                      </>
                    ) : location ? (
                      <>
                        <div className="h-2 w-2 bg-green-500 rounded-full" />
                        <span className="text-sm">GPS Connected</span>
                      </>
                    ) : (
                      <>
                        <div className="h-2 w-2 bg-red-500 rounded-full" />
                        <span className="text-sm">GPS Unavailable</span>
                      </>
                    )}
                  </div>
                </div>
                
                {location && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Accuracy</Label>
                      <p className="text-sm">{Math.round(location.accuracy)}m</p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Last Updated</Label>
                      <p className="text-sm">{new Date().toLocaleTimeString()}</p>
                    </div>
                  </>
                )}
              </div>
              
              {geoError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <span className="text-sm text-red-800">Location Error: {geoError}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue={canViewAll ? "live-map" : "my-tracking"}>
          <TabsList>
            {canViewAll && <TabsTrigger value="live-map">Live Observer Map</TabsTrigger>}
            <TabsTrigger value="my-tracking">
              {canTrack ? "My Tracking" : "Tracking History"}
            </TabsTrigger>
            <TabsTrigger value="route-history">Route History</TabsTrigger>
          </TabsList>

          {/* Live Observer Map */}
          {canViewAll && (
            <TabsContent value="live-map" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="h-5 w-5" />
                    <span>Active Observers ({activeObservers.length})</span>
                  </CardTitle>
                  <CardDescription>Real-time location of observers in the field</CardDescription>
                </CardHeader>
                <CardContent>
                  {activeObservers.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No active observers with location sharing enabled</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {activeObservers.map((observer) => (
                        <div key={observer.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <p className="font-medium">Observer #{observer.userId}</p>
                              <p className="text-sm text-muted-foreground">
                                {observer.latitude.toFixed(6)}, {observer.longitude.toFixed(6)}
                              </p>
                              <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                                <span>Accuracy: {Math.round(observer.accuracy)}m</span>
                                <span>Updated: {new Date(observer.timestamp).toLocaleTimeString()}</span>
                                {observer.speed && <span>Speed: {Math.round(observer.speed * 3.6)}km/h</span>}
                                {observer.battery && <span>Battery: {observer.battery}%</span>}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge variant={observer.isActive ? "default" : "secondary"}>
                                {observer.isActive ? "Active" : "Inactive"}
                              </Badge>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedObserver(observer.userId)}
                              >
                                View Route
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* My Tracking */}
          <TabsContent value="my-tracking" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Tracking Sessions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{routeHistory.length}</div>
                  <p className="text-xs text-muted-foreground">Total sessions</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Total Distance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {routeHistory.reduce((total, route) => total + route.totalDistance, 0).toFixed(1)}km
                  </div>
                  <p className="text-xs text-muted-foreground">All time</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Active Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {Math.round(routeHistory.reduce((total, route) => {
                      const start = new Date(route.startTime);
                      const end = route.endTime ? new Date(route.endTime) : new Date();
                      return total + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                    }, 0))}h
                  </div>
                  <p className="text-xs text-muted-foreground">Hours tracked</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Route History */}
          <TabsContent value="route-history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Route className="h-5 w-5" />
                  <span>Route History</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {routeHistory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Route className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No route history available</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {routeHistory.map((route) => (
                      <div key={route.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">
                                {new Date(route.startTime).toLocaleDateString()} at{" "}
                                {new Date(route.startTime).toLocaleTimeString()}
                              </span>
                            </div>
                            <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                              <span>Duration: {formatDuration(route.startTime, route.endTime)}</span>
                              <span>Distance: {route.totalDistance.toFixed(1)}km</span>
                              <span>Avg Speed: {route.averageSpeed.toFixed(1)}km/h</span>
                              <span>Stations: {route.stations.length}</span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant={route.endTime ? "secondary" : "default"}>
                              {route.endTime ? "Completed" : "Active"}
                            </Badge>
                            <Button variant="outline" size="sm">
                              View Details
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}