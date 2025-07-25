import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Navigation, 
  MapPin, 
  Clock, 
  RefreshCw,
  Car,
  TrendingUp,
  AlertTriangle
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

function getSeverityColor(severity: string) {
  switch (severity.toLowerCase()) {
    case 'light': return 'bg-green-100 text-green-800';
    case 'moderate': return 'bg-yellow-100 text-yellow-800';
    case 'heavy': return 'bg-orange-100 text-orange-800';
    case 'severe': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

function getBusynessColor(level: string) {
  switch (level.toLowerCase()) {
    case 'quiet': return 'bg-green-100 text-green-800';
    case 'moderate': return 'bg-yellow-100 text-yellow-800';
    case 'busy': return 'bg-orange-100 text-orange-800';
    case 'very busy': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

export default function SimpleTrafficDashboard() {
  const [selectedStation, setSelectedStation] = useState<number | null>(null);

  const { data: trafficData, isLoading, error, refetch } = useQuery<TrafficData>({
    queryKey: ['/api/traffic/all-stations'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Loading traffic data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="mb-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load traffic data. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  if (!trafficData || !trafficData.stations) {
    return (
      <Alert className="mb-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          No traffic data available.
        </AlertDescription>
      </Alert>
    );
  }

  const selectedStationData = selectedStation 
    ? trafficData.stations.find(s => s.stationId === selectedStation)
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Traffic Monitoring</h1>
          <p className="text-muted-foreground">
            Real-time traffic conditions for all {trafficData.totalStations} polling stations
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <TrendingUp className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">Moderate+</p>
                <p className="text-2xl font-bold">
                  {trafficData.stations.filter(s => ['moderate', 'heavy', 'severe'].includes(s.nearbyTraffic.severity)).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Last Updated</p>
                <p className="text-sm">
                  {new Date(trafficData.lastUpdated).toLocaleTimeString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Station List */}
        <Card>
          <CardHeader>
            <CardTitle>Polling Stations</CardTitle>
            <CardDescription>Click a station to view detailed traffic information</CardDescription>
          </CardHeader>
          <CardContent className="max-h-96 overflow-y-auto">
            <div className="space-y-2">
              {trafficData.stations.map((station) => (
                <div
                  key={station.stationId}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedStation === station.stationId 
                      ? 'bg-primary/10 border-primary' 
                      : 'hover:bg-muted'
                  }`}
                  onClick={() => setSelectedStation(station.stationId)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium">{station.stationName}</h4>
                      <p className="text-sm text-muted-foreground">{station.stationCode}</p>
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      <Badge className={getSeverityColor(station.nearbyTraffic.severity)}>
                        {station.nearbyTraffic.severity}
                      </Badge>
                      <Badge className={getBusynessColor(station.locationBusyness.currentLevel)}>
                        {station.locationBusyness.currentLevel}
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center space-x-4 text-sm text-muted-foreground">
                    <span>Speed: {station.nearbyTraffic.speed} km/h</span>
                    <span>Delay: {station.nearbyTraffic.delayMinutes} min</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Station Details */}
        <Card>
          <CardHeader>
            <CardTitle>Station Details</CardTitle>
            <CardDescription>
              {selectedStationData ? `Traffic information for ${selectedStationData.stationName}` : 'Select a station to view details'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedStationData ? (
              <div className="space-y-4">
                {/* Current Traffic */}
                <div>
                  <h4 className="font-medium mb-2">Current Traffic Conditions</h4>
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span>Traffic Severity</span>
                      <Badge className={getSeverityColor(selectedStationData.nearbyTraffic.severity)}>
                        {selectedStationData.nearbyTraffic.severity}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span>Average Speed</span>
                      <span>{selectedStationData.nearbyTraffic.speed} km/h</span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span>Delay</span>
                      <span>{selectedStationData.nearbyTraffic.delayMinutes} minutes</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {selectedStationData.nearbyTraffic.description}
                    </p>
                  </div>
                </div>

                {/* Location Busyness */}
                <div>
                  <h4 className="font-medium mb-2">Location Busyness</h4>
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span>Current Level</span>
                      <Badge className={getBusynessColor(selectedStationData.locationBusyness.currentLevel)}>
                        {selectedStationData.locationBusyness.currentLevel}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span>Busy Percentage</span>
                      <span>{selectedStationData.locationBusyness.percentageBusy}%</span>
                    </div>
                    {selectedStationData.locationBusyness.usuallyBusyAt.length > 0 && (
                      <div>
                        <span className="text-sm font-medium">Usually busy at:</span>
                        <ul className="text-sm text-muted-foreground">
                          {selectedStationData.locationBusyness.usuallyBusyAt.map((time, index) => (
                            <li key={index}>• {time}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                {/* Approach Routes */}
                {selectedStationData.approachRoutes.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Approach Routes</h4>
                    <div className="space-y-2">
                      {selectedStationData.approachRoutes.map((approach, index) => (
                        <div key={index} className="p-3 bg-muted rounded-lg">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium">From {approach.from}</span>
                            <Badge className={getSeverityColor(approach.route.trafficCondition.severity)}>
                              {approach.route.trafficCondition.severity}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>Distance: {approach.route.distance}</div>
                            <div>Duration: {approach.route.duration}</div>
                            <div>In Traffic: {approach.route.durationInTraffic}</div>
                            <div>Speed: {approach.route.trafficCondition.speed} km/h</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-sm text-muted-foreground">
                  Last updated: {new Date(selectedStationData.lastUpdated).toLocaleString()}
                </p>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <Navigation className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a polling station from the list to view detailed traffic information</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}