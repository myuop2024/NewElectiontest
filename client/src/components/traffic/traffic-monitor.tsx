import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { 
  Car, 
  Clock, 
  MapPin, 
  AlertTriangle, 
  Route,
  RefreshCw,
  Navigation,
  Gauge
} from "lucide-react";

interface TrafficCondition {
  severity: 'light' | 'moderate' | 'heavy' | 'severe';
  speed: number;
  delayMinutes: number;
  description: string;
}

interface TrafficData {
  stationId: number;
  stationCode: string;
  stationName: string;
  location: {
    latitude: number;
    longitude: number;
  };
  nearbyTraffic: TrafficCondition;
  accessRoutes: any[];
  publicTransportAccess: {
    busStops: number;
    busRoutes: string[];
    accessibility: 'excellent' | 'good' | 'fair' | 'poor';
  };
  parkingAvailability: {
    spaces: number;
    occupancyRate: number;
    restrictions: string[];
  };
  lastUpdated: string;
}

interface TrafficMonitorProps {
  stationId?: number;
  showAllStations?: boolean;
}

export default function TrafficMonitor({ stationId, showAllStations = false }: TrafficMonitorProps) {
  const [refreshKey, setRefreshKey] = useState(0);

  // Get traffic data for single station
  const { data: stationTraffic, isLoading: stationLoading, error: stationError } = useQuery<TrafficData>({
    queryKey: [`/api/traffic/station/${stationId}`, refreshKey],
    enabled: !!stationId && !showAllStations,
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Get traffic data for all stations
  const { data: allTrafficData, isLoading: allLoading, error: allError } = useQuery<{
    stations: TrafficData[];
    totalStations: number;
    lastUpdated: string;
  }>({
    queryKey: ['/api/traffic/all-stations', refreshKey],
    enabled: showAllStations,
    refetchInterval: 60000 // Refresh every minute
  });

  const isLoading = stationLoading || allLoading;
  const error = stationError || allError;
  const trafficData = showAllStations ? allTrafficData?.stations : (stationTraffic ? [stationTraffic] : []);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'light': return 'bg-green-100 text-green-800 border-green-200';
      case 'moderate': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'heavy': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'severe': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'light': return <Gauge className="h-4 w-4 text-green-600" />;
      case 'moderate': return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'heavy': return <Car className="h-4 w-4 text-orange-600" />;
      case 'severe': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default: return <Gauge className="h-4 w-4 text-gray-600" />;
    }
  };

  const getAccessibilityColor = (accessibility: string) => {
    switch (accessibility) {
      case 'excellent': return 'bg-green-100 text-green-800';
      case 'good': return 'bg-blue-100 text-blue-800';
      case 'fair': return 'bg-yellow-100 text-yellow-800';
      case 'poor': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            Traffic Conditions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            Traffic Conditions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Traffic Data Unavailable</h3>
            <p className="text-muted-foreground mb-4">
              Unable to fetch real-time traffic conditions
            </p>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Car className="h-5 w-5" />
          <h3 className="text-lg font-semibold">
            {showAllStations ? 'All Stations Traffic' : 'Station Traffic'}
          </h3>
        </div>
        <Button onClick={handleRefresh} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Traffic Data Cards */}
      {trafficData?.map((station) => (
        <Card key={station.stationId} className="government-card">
          <CardHeader>
            <CardTitle className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                <span>{station.stationCode} - {station.stationName}</span>
              </div>
              <Badge className={getSeverityColor(station.nearbyTraffic.severity)}>
                {getSeverityIcon(station.nearbyTraffic.severity)}
                <span className="ml-1 capitalize">{station.nearbyTraffic.severity}</span>
              </Badge>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Traffic Conditions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <Gauge className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                <div className="text-2xl font-bold">{station.nearbyTraffic.speed} km/h</div>
                <div className="text-sm text-muted-foreground">Average Speed</div>
              </div>
              
              <div className="text-center p-4 border rounded-lg">
                <Clock className="h-8 w-8 mx-auto mb-2 text-orange-600" />
                <div className="text-2xl font-bold">+{station.nearbyTraffic.delayMinutes} min</div>
                <div className="text-sm text-muted-foreground">Estimated Delay</div>
              </div>
              
              <div className="text-center p-4 border rounded-lg">
                <Route className="h-8 w-8 mx-auto mb-2 text-green-600" />
                <div className="text-2xl font-bold">{station.accessRoutes.length}</div>
                <div className="text-sm text-muted-foreground">Access Routes</div>
              </div>
            </div>

            {/* Traffic Description */}
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-1">Current Conditions:</p>
              <p className="text-sm text-muted-foreground">{station.nearbyTraffic.description}</p>
            </div>

            {/* Public Transport & Parking */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Public Transport */}
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Car className="h-4 w-4" />
                  Public Transport
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Bus Stops:</span>
                    <Badge variant="outline">{station.publicTransportAccess.busStops}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Accessibility:</span>
                    <Badge className={getAccessibilityColor(station.publicTransportAccess.accessibility)}>
                      {station.publicTransportAccess.accessibility}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Routes: {station.publicTransportAccess.busRoutes.join(', ')}
                  </div>
                </div>
              </div>

              {/* Parking */}
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Parking
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Total Spaces:</span>
                    <Badge variant="outline">{station.parkingAvailability.spaces}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Occupancy:</span>
                    <Badge variant={station.parkingAvailability.occupancyRate > 70 ? "destructive" : "default"}>
                      {station.parkingAvailability.occupancyRate}%
                    </Badge>
                  </div>
                  {station.parkingAvailability.restrictions.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      Restrictions: {station.parkingAvailability.restrictions.join(', ')}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-3 pt-4 border-t">
              <Button 
                size="sm" 
                className="btn-caffe-primary"
                onClick={() => {
                  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${station.location.latitude},${station.location.longitude}&travelmode=driving`;
                  window.open(mapsUrl, '_blank');
                }}
              >
                <Navigation className="h-4 w-4 mr-2" />
                Get Directions
              </Button>
              <Button size="sm" variant="outline">
                <AlertTriangle className="h-4 w-4 mr-2" />
                View Alerts
              </Button>
            </div>

            {/* Last Updated */}
            <div className="text-xs text-muted-foreground text-center pt-2 border-t">
              Last updated: {new Date(station.lastUpdated).toLocaleTimeString()}
            </div>
          </CardContent>
        </Card>
      ))}

      {!trafficData || trafficData.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Car className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Traffic Data Available</h3>
            <p className="text-muted-foreground">
              Traffic monitoring requires polling stations with GPS coordinates
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}