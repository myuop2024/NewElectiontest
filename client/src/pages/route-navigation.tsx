import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Navigation, MapPin, Clock, Route, Car, Play, Square, ExternalLink, Smartphone } from "lucide-react";
import { useGeolocation } from "@/hooks/use-geolocation";
import { calculateDistance, formatCoordinates } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import EnhancedMap from "@/components/maps/enhanced-map";

export default function RouteNavigation() {
  const [isNavigating, setIsNavigating] = useState(false);
  const [currentRoute, setCurrentRoute] = useState<any>(null);
  const [routeHistory, setRouteHistory] = useState<any[]>([]);
  const [selectedDestination, setSelectedDestination] = useState<string>("");
  const { location, isLoading, error } = useGeolocation();

  const { data: pollingStations = [] } = useQuery({
    queryKey: ["/api/polling-stations"],
  });

  const stations = pollingStations as any[];

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
      priority: "medium"
    },
    {
      id: 3,
      stationCode: "ST-003",
      name: "Mandeville High School",
      address: "67 School Lane, Mandeville",
      latitude: 18.0333,
      longitude: -77.5000,
      status: "completed",
      estimatedTime: "45 min",
      priority: "low"
    }
  ];

  const startNavigation = (station: any) => {
    setCurrentRoute({
      destination: station,
      startTime: new Date().toISOString(),
      startPosition: location
    });
    setIsNavigating(true);
  };

  const stopNavigation = () => {
    if (currentRoute) {
      const completedRoute = {
        ...currentRoute,
        endTime: new Date().toISOString(),
        endPosition: location,
        distance: location && currentRoute.startPosition 
          ? calculateDistance(
              currentRoute.startPosition.latitude,
              currentRoute.startPosition.longitude,
              location.latitude,
              location.longitude
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
      case "high": return "destructive";
      case "medium": return "default"; 
      case "low": return "secondary";
      default: return "outline";
    }
  };

  const openExternalNavigation = (station: any) => {
    if (location) {
      const url = `https://www.google.com/maps/dir/${location.latitude},${location.longitude}/${station.latitude},${station.longitude}`;
      window.open(url, '_blank');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Field Navigation</h1>
          <p className="text-muted-foreground">Route planning and GPS navigation for polling station visits</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Current Location Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Navigation className="h-5 w-5" />
              <span>Current Location</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading && (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                <span className="text-sm">Getting your location...</span>
              </div>
            )}
            
            {error && (
              <div className="text-destructive text-sm">
                <p>Location Error: {error}</p>
              </div>
            )}
            
            {location && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span className="text-sm font-mono">
                    {formatCoordinates(location.latitude, location.longitude)}
                  </span>
                </div>
                {location.accuracy && (
                  <p className="text-xs text-muted-foreground">
                    Accuracy: ±{location.accuracy.toFixed(0)}m
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Navigation */}
        {isNavigating && currentRoute && (
          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Route className="h-5 w-5 text-primary" />
                <span>Active Navigation</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold">{currentRoute.destination.name}</h3>
                <p className="text-sm text-muted-foreground">{currentRoute.destination.address}</p>
              </div>
              
              {location && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Distance:</span>
                    <span className="font-mono text-sm">
                      {calculateDistance(
                        location.latitude,
                        location.longitude,
                        currentRoute.destination.latitude,
                        currentRoute.destination.longitude
                      ).toFixed(1)} km
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Started:</span>
                    <span className="text-sm">
                      {new Date(currentRoute.startTime).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              )}
              
              <div className="flex space-x-2">
                <Button 
                  onClick={() => openExternalNavigation(currentRoute.destination)}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Maps
                </Button>
                <Button 
                  onClick={stopNavigation}
                  variant="destructive"
                  size="sm"
                  className="flex-1"
                >
                  <Square className="h-4 w-4 mr-2" />
                  Stop
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        {!isNavigating && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Car className="h-5 w-5" />
                <span>Quick Actions</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select value={selectedDestination} onValueChange={setSelectedDestination}>
                <SelectTrigger>
                  <SelectValue placeholder="Select destination" />
                </SelectTrigger>
                <SelectContent>
                  {assignedStations.map((station) => (
                    <SelectItem key={station.id} value={station.id.toString()}>
                      {station.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {selectedDestination && (
                <Button 
                  onClick={() => {
                    const station = assignedStations.find(s => s.id === parseInt(selectedDestination));
                    if (station) startNavigation(station);
                  }}
                  className="w-full"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Start Navigation
                </Button>
              )}
              
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => window.open('https://www.google.com/maps', '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Google Maps
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Assigned Stations */}
      <Card>
        <CardHeader>
          <CardTitle>Assigned Polling Stations</CardTitle>
          <p className="text-sm text-muted-foreground">
            Your scheduled station visits with priorities and estimated travel times
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {assignedStations.map((station) => (
              <div 
                key={station.id}
                className="border rounded-lg p-4 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold">{station.name}</h3>
                      <Badge variant={getStatusColor(station.priority)}>
                        {station.priority}
                      </Badge>
                      <Badge variant={station.status === "completed" ? "default" : "outline"}>
                        {station.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{station.address}</p>
                    <p className="text-xs font-mono text-muted-foreground">
                      {station.stationCode} • {formatCoordinates(station.latitude, station.longitude)}
                    </p>
                  </div>
                  
                  <div className="text-right space-y-1">
                    <span className="text-sm text-muted-foreground flex items-center">
                      <Clock className="h-3 w-3 inline mr-1" />
                      {station.estimatedTime}
                    </span>
                    {location && (
                      <span className="text-muted-foreground">
                        {calculateDistance(
                          location.latitude,
                          location.longitude,
                          station.latitude,
                          station.longitude
                        ).toFixed(1)} km
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <Button 
                    onClick={() => startNavigation(station)}
                    disabled={isNavigating || station.status === "completed"}
                    size="sm"
                    variant="default"
                    className="flex-1"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Navigate
                  </Button>
                  <Button 
                    onClick={() => openExternalNavigation(station)}
                    size="sm"
                    variant="outline"
                    className="flex-1"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    External Map
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Route History */}
      {routeHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Routes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {routeHistory.map((route, index) => (
                <div key={index} className="border rounded-lg p-3 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">{route.destination.name}</h4>
                      <p className="text-xs text-muted-foreground">{route.destination.address}</p>
                    </div>
                    <Badge variant="outline">{route.distance} km</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(route.startTime).toLocaleString()} - {new Date(route.endTime).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Map View */}
      <Card>
        <CardHeader>
          <CardTitle>Map View</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 bg-muted rounded-lg flex items-center justify-center">
            <p className="text-muted-foreground">Interactive map would be displayed here</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}