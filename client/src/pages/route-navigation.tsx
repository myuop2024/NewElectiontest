import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Navigation, MapPin, Clock, Route, Car, Play, Square } from "lucide-react";
import { useGeolocation } from "@/hooks/use-geolocation";
import { calculateDistance, formatCoordinates } from "@/lib/utils";

export default function RouteNavigation() {
  const [isNavigating, setIsNavigating] = useState(false);
  const [currentRoute, setCurrentRoute] = useState<any>(null);
  const [routeHistory, setRouteHistory] = useState<any[]>([]);
  const { position, getCurrentPosition, isLoading, error } = useGeolocation({ watch: true });

  // Mock assigned stations for roving observer
  const assignedStations = [
    {
      id: 1,
      stationCode: "ST-001",
      name: "Kingston Primary School",
      address: "123 Main Street, Kingston",
      latitude: 17.9712,
      longitude: -76.7936,
      status: "pending",
      estimatedTime: "15 min",
      priority: "high"
    },
    {
      id: 2,
      stationCode: "ST-002", 
      name: "Spanish Town Community Center",
      address: "45 Market Square, Spanish Town",
      latitude: 17.9909,
      longitude: -76.9569,
      status: "pending",
      estimatedTime: "25 min",
      priority: "normal"
    },
    {
      id: 3,
      stationCode: "ST-003",
      name: "Portmore High School",
      address: "78 Ocean Drive, Portmore",
      latitude: 17.9442,
      longitude: -76.8827,
      status: "completed",
      estimatedTime: "35 min",
      priority: "low"
    }
  ];

  useEffect(() => {
    getCurrentPosition();
  }, []);

  const startNavigation = (station: any) => {
    setCurrentRoute({
      destination: station,
      startTime: new Date().toISOString(),
      startPosition: position
    });
    setIsNavigating(true);
  };

  const stopNavigation = () => {
    if (currentRoute) {
      const completedRoute = {
        ...currentRoute,
        endTime: new Date().toISOString(),
        endPosition: position,
        distance: position && currentRoute.startPosition 
          ? calculateDistance(
              currentRoute.startPosition.latitude,
              currentRoute.startPosition.longitude,
              position.latitude,
              position.longitude
            ).toFixed(2)
          : 0
      };
      
      setRouteHistory(prev => [completedRoute, ...prev]);
    }
    
    setCurrentRoute(null);
    setIsNavigating(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'status-active';
      case 'in_progress': return 'status-warning';
      case 'pending': return 'status-neutral';
      default: return 'status-neutral';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'normal': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 space-y-6 fade-in">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Route Navigation</h2>
        <p className="text-muted-foreground">GPS navigation for roving observers</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current Location & Navigation */}
        <div className="lg:col-span-2 space-y-6">
          {/* Current Location */}
          <Card className="government-card">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Navigation className="h-5 w-5 mr-2" />
                Current Location
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading && (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  <span className="text-sm">Getting location...</span>
                </div>
              )}
              
              {error && (
                <div className="text-destructive text-sm">
                  <p>Location Error: {error}</p>
                </div>
              )}
              
              {position && (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span className="text-sm font-mono">
                      {formatCoordinates(position.latitude, position.longitude)}
                    </span>
                  </div>
                  {position.accuracy && (
                    <p className="text-xs text-muted-foreground">
                      Accuracy: ±{position.accuracy.toFixed(0)}m
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Last updated: {new Date(position.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Active Navigation */}
          {isNavigating && currentRoute && (
            <Card className="government-card border-primary">
              <CardHeader className="border-b">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <Route className="h-5 w-5 mr-2 text-primary" />
                    Active Navigation
                  </span>
                  <Badge className="status-indicator status-warning">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full mr-1 pulse-slow"></div>
                    In Progress
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold">{currentRoute.destination.name}</h4>
                  <p className="text-sm text-muted-foreground">{currentRoute.destination.address}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <Clock className="h-6 w-6 text-blue-600 mx-auto mb-1" />
                    <p className="text-sm font-medium">Est. Time</p>
                    <p className="text-lg font-bold text-blue-600">
                      {currentRoute.destination.estimatedTime}
                    </p>
                  </div>
                  
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <Car className="h-6 w-6 text-green-600 mx-auto mb-1" />
                    <p className="text-sm font-medium">Distance</p>
                    <p className="text-lg font-bold text-green-600">
                      {position ? calculateDistance(
                        position.latitude,
                        position.longitude,
                        currentRoute.destination.latitude,
                        currentRoute.destination.longitude
                      ).toFixed(1) : '--'} km
                    </p>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button className="flex-1 btn-caffe-primary">
                    Open in Google Maps
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={stopNavigation}
                  >
                    <Square className="h-4 w-4 mr-2" />
                    Stop Navigation
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Map Placeholder */}
          <Card className="government-card">
            <CardContent className="p-0">
              <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Interactive map would be displayed here</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Integration with Google Maps API for real-time navigation
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Station List & Route History */}
        <div className="space-y-6">
          {/* Assigned Stations */}
          <Card className="government-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Assigned Stations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {assignedStations.map((station) => (
                <div key={station.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{station.stationCode}</h4>
                      <p className="text-xs text-muted-foreground">{station.name}</p>
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      <Badge className={`status-indicator ${getStatusColor(station.status)}`}>
                        {station.status}
                      </Badge>
                      <Badge className={`text-xs ${getPriorityColor(station.priority)}`}>
                        {station.priority}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">
                      <Clock className="h-3 w-3 inline mr-1" />
                      {station.estimatedTime}
                    </span>
                    {position && (
                      <span className="text-muted-foreground">
                        {calculateDistance(
                          position.latitude,
                          position.longitude,
                          station.latitude,
                          station.longitude
                        ).toFixed(1)} km
                      </span>
                    )}
                  </div>

                  {station.status !== 'completed' && !isNavigating && (
                    <Button 
                      size="sm" 
                      className="w-full btn-caffe-primary"
                      onClick={() => startNavigation(station)}
                    >
                      <Play className="h-3 w-3 mr-1" />
                      Start Navigation
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Route History */}
          <Card className="government-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Route History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {routeHistory.length === 0 ? (
                <div className="text-center py-4">
                  <Route className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No routes completed yet</p>
                </div>
              ) : (
                routeHistory.map((route, index) => (
                  <div key={index} className="border rounded-lg p-3 space-y-2">
                    <h4 className="font-medium text-sm">{route.destination.name}</h4>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>Distance: {route.distance} km</p>
                      <p>Started: {new Date(route.startTime).toLocaleTimeString()}</p>
                      <p>Completed: {new Date(route.endTime).toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
