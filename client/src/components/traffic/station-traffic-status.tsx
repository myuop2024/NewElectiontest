import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Car, Clock, AlertTriangle, Route, RefreshCw } from "lucide-react";

interface TrafficData {
  stationId: number;
  stationCode: string;
  stationName: string;
  location: {
    latitude: number;
    longitude: number;
  };
  nearbyTraffic: {
    severity: 'light' | 'moderate' | 'heavy' | 'severe';
    speed: number;
    delayMinutes: number;
    description: string;
  };
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

interface StationTrafficStatusProps {
  stationId: number;
  compact?: boolean;
}

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
    case 'light': return <Car className="h-3 w-3" />;
    case 'moderate': return <Clock className="h-3 w-3" />;
    case 'heavy': return <AlertTriangle className="h-3 w-3" />;
    case 'severe': return <AlertTriangle className="h-3 w-3" />;
    default: return <Car className="h-3 w-3" />;
  }
};

export default function StationTrafficStatus({ stationId, compact = false }: StationTrafficStatusProps) {
  const { data: trafficData, isLoading, refetch } = useQuery<TrafficData>({
    queryKey: ["/api/traffic/station", stationId],
    refetchInterval: 60000, // Refresh every minute
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <RefreshCw className="h-3 w-3 animate-spin" />
        Loading traffic...
      </div>
    );
  }

  if (!trafficData || !trafficData.nearbyTraffic) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Car className="h-3 w-3" />
        No traffic data
      </div>
    );
  }

  const { nearbyTraffic, publicTransportAccess, parkingAvailability } = trafficData;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Badge 
          variant="outline" 
          className={`text-xs ${getSeverityColor(nearbyTraffic.severity)}`}
        >
          {getSeverityIcon(nearbyTraffic.severity)}
          <span className="ml-1 capitalize">{nearbyTraffic.severity}</span>
        </Badge>
        {nearbyTraffic.delayMinutes > 0 && (
          <span className="text-xs text-muted-foreground">
            +{nearbyTraffic.delayMinutes}min
          </span>
        )}
      </div>
    );
  }

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-sm flex items-center gap-2">
            <Car className="h-4 w-4" />
            Traffic Conditions
          </h4>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => refetch()}
            className="h-6 w-6 p-0"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>

        <div className="space-y-3">
          {/* Traffic Severity */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Current Conditions:</span>
            <Badge className={getSeverityColor(nearbyTraffic.severity)}>
              {getSeverityIcon(nearbyTraffic.severity)}
              <span className="ml-1 capitalize">{nearbyTraffic.severity}</span>
            </Badge>
          </div>

          {/* Speed & Delays */}
          {nearbyTraffic.speed > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Average Speed:</span>
              <span className="text-sm font-medium">{nearbyTraffic.speed} km/h</span>
            </div>
          )}

          {nearbyTraffic.delayMinutes > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Expected Delay:</span>
              <span className="text-sm font-medium text-orange-600">
                +{nearbyTraffic.delayMinutes} minutes
              </span>
            </div>
          )}

          {/* Public Transport */}
          {publicTransportAccess && (
            <div className="border-t pt-3 mt-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Bus Stops Nearby:</span>
                <span className="text-sm font-medium">{publicTransportAccess.busStops}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Transit Access:</span>
                <Badge variant="outline" className="text-xs capitalize">
                  {publicTransportAccess.accessibility}
                </Badge>
              </div>
            </div>
          )}

          {/* Parking */}
          {parkingAvailability && (
            <div className="border-t pt-3 mt-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Parking Spaces:</span>
                <span className="text-sm font-medium">{parkingAvailability.spaces}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Occupancy:</span>
                <span className="text-sm font-medium">
                  {Math.round(parkingAvailability.occupancyRate)}%
                </span>
              </div>
            </div>
          )}

          {/* Description */}
          {nearbyTraffic.description && (
            <div className="text-xs text-muted-foreground mt-2 p-2 bg-muted rounded">
              {nearbyTraffic.description}
            </div>
          )}
        </div>

        {trafficData.lastUpdated && (
          <div className="text-xs text-muted-foreground mt-3 text-center">
            Last updated: {new Date(trafficData.lastUpdated).toLocaleTimeString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}