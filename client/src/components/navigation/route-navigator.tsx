import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Navigation, MapPin, ExternalLink, Route, Clock, Car, Smartphone } from "lucide-react";
import EnhancedMap from "@/components/maps/enhanced-map";

interface RouteNavigatorProps {
  fromLocation: { lat: number; lng: number; name: string };
  toLocation: { lat: number; lng: number; name: string };
  onRouteCalculated?: (route: any) => void;
}

export default function RouteNavigator({ fromLocation, toLocation, onRouteCalculated }: RouteNavigatorProps) {
  const [routeData, setRouteData] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [hasCheckedApi, setHasCheckedApi] = useState(false);

  useEffect(() => {
    // Reset API check when locations change
    setHasCheckedApi(false);
    setRouteData(null);
  }, [fromLocation, toLocation]);

  useEffect(() => {
    if (!hasCheckedApi && fromLocation && toLocation) {
      calculateRoute();
    }
  }, [fromLocation, toLocation, hasCheckedApi]);

  const calculateRoute = async () => {
    if (hasCheckedApi) return; // Prevent multiple API calls
    
    setIsCalculating(true);
    setHasCheckedApi(true);
    
    try {
      const response = await fetch('/api/settings/here-api');
      const config = await response.json();
      
      if (!config.hasKey) {
        // Create fallback route data using straight-line distance
        const distance = calculateStraightLineDistance(fromLocation, toLocation);
        const fallbackRoute = {
          summary: {
            duration: Math.round(distance * 60), // Estimate 1 minute per km
            length: Math.round(distance * 1000) // Convert to meters
          }
        };
        setRouteData(fallbackRoute);
        onRouteCalculated?.(fallbackRoute);
        return;
      }

      const routeResponse = await fetch(
        `https://router.hereapi.com/v8/routes?` +
        `transportMode=car&` +
        `origin=${fromLocation.lat},${fromLocation.lng}&` +
        `destination=${toLocation.lat},${toLocation.lng}&` +
        `return=summary&` +
        `apikey=${config.apiKey}`
      );

      if (!routeResponse.ok) {
        console.error('Route API error:', routeResponse.status);
        // Use fallback calculation
        const distance = calculateStraightLineDistance(fromLocation, toLocation);
        const fallbackRoute = {
          summary: {
            duration: Math.round(distance * 60),
            length: Math.round(distance * 1000)
          }
        };
        setRouteData(fallbackRoute);
        onRouteCalculated?.(fallbackRoute);
        return;
      }

      const data = await routeResponse.json();
      
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        setRouteData(route);
        onRouteCalculated?.(route);
      } else {
        // Create fallback route data using straight-line distance
        const distance = calculateStraightLineDistance(fromLocation, toLocation);
        const fallbackRoute = {
          summary: {
            duration: Math.round(distance * 60),
            length: Math.round(distance * 1000)
          }
        };
        setRouteData(fallbackRoute);
        onRouteCalculated?.(fallbackRoute);
      }
    } catch (error) {
      console.error('Route calculation failed:', error);
      // Create basic fallback route
      const distance = calculateStraightLineDistance(fromLocation, toLocation);
      const fallbackRoute = {
        summary: {
          duration: Math.round(distance * 60),
          length: Math.round(distance * 1000)
        }
      };
      setRouteData(fallbackRoute);
      onRouteCalculated?.(fallbackRoute);
    } finally {
      setIsCalculating(false);
    }
  };

  const calculateStraightLineDistance = (from: any, to: any) => {
    const R = 6371; // Earth's radius in km
    const dLat = (to.lat - from.lat) * Math.PI / 180;
    const dLon = (to.lng - from.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(from.lat * Math.PI / 180) * Math.cos(to.lat * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatDistance = (meters: number) => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`;
    }
    return `${meters} m`;
  };

  const openExternalMap = (service: string) => {
    const from = `${fromLocation.lat},${fromLocation.lng}`;
    const to = `${toLocation.lat},${toLocation.lng}`;
    
    let url = '';
    
    switch (service) {
      case 'google':
        url = `https://www.google.com/maps/dir/${from}/${to}`;
        break;
      case 'apple':
        url = `http://maps.apple.com/?saddr=${from}&daddr=${to}&dirflg=d`;
        break;
      case 'waze':
        url = `https://waze.com/ul?ll=${to}&navigate=yes&from=${from}`;
        break;
      default:
        return;
    }
    
    window.open(url, '_blank');
  };

  const routeMarkers = [
    {
      lat: fromLocation.lat,
      lng: fromLocation.lng,
      title: fromLocation.name,
      info: "Starting point"
    },
    {
      lat: toLocation.lat,
      lng: toLocation.lng,
      title: toLocation.name,
      info: "Destination"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Route Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Route className="h-5 w-5" />
            Route Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isCalculating ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
              Calculating optimal route...
            </div>
          ) : routeData ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <div>
                    <div className="font-medium">{formatDuration(routeData.summary?.duration || 0)}</div>
                    <div className="text-xs text-muted-foreground">Travel time</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Navigation className="h-4 w-4 text-green-600" />
                  <div>
                    <div className="font-medium">{formatDistance(routeData.summary?.length || 0)}</div>
                    <div className="text-xs text-muted-foreground">Distance</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Car className="h-4 w-4 text-orange-600" />
                  <div>
                    <div className="font-medium">Car</div>
                    <div className="text-xs text-muted-foreground">Transport mode</div>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">From:</span>
                  <span className="text-sm">{fromLocation.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium">To:</span>
                  <span className="text-sm">{toLocation.name}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              Unable to calculate route. Please check the locations.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Interactive Route Map */}
      <Card>
        <CardHeader>
          <CardTitle>Route Navigation Map</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <EnhancedMap
            height="500px"
            center={{ 
              lat: (fromLocation.lat + toLocation.lat) / 2, 
              lng: (fromLocation.lng + toLocation.lng) / 2 
            }}
            zoom={12}
            markers={routeMarkers}
            interactive={true}
          />
        </CardContent>
      </Card>

      {/* External Navigation Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            Open in External Maps
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button
              variant="outline"
              onClick={() => openExternalMap('google')}
              className="flex items-center gap-2 h-auto p-4"
            >
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Navigation className="h-4 w-4 text-white" />
              </div>
              <div className="text-left">
                <div className="font-medium">Google Maps</div>
                <div className="text-xs text-muted-foreground">Turn-by-turn navigation</div>
              </div>
            </Button>

            <Button
              variant="outline"
              onClick={() => openExternalMap('apple')}
              className="flex items-center gap-2 h-auto p-4"
            >
              <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center">
                <Smartphone className="h-4 w-4 text-white" />
              </div>
              <div className="text-left">
                <div className="font-medium">Apple Maps</div>
                <div className="text-xs text-muted-foreground">iOS/macOS navigation</div>
              </div>
            </Button>

            <Button
              variant="outline"
              onClick={() => openExternalMap('waze')}
              className="flex items-center gap-2 h-auto p-4"
            >
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <Car className="h-4 w-4 text-white" />
              </div>
              <div className="text-left">
                <div className="font-medium">Waze</div>
                <div className="text-xs text-muted-foreground">Real-time traffic updates</div>
              </div>
            </Button>
          </div>

          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-start gap-2">
              <Navigation className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <div className="font-medium">Navigation Tip</div>
                <div>Use the in-app map for overview, then switch to your preferred navigation app for turn-by-turn directions to polling stations across Jamaica.</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}