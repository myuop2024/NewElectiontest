import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { 
  MapPin, 
  RefreshCw, 
  Car, 
  Sun, 
  Cloud, 
  CloudRain, 
  Zap,
  Thermometer
} from 'lucide-react';

interface GoogleStyleHeatMapProps {
  stations: any[];
  selectedStation?: any;
  onStationSelect?: (station: any) => void;
}

// Google Maps style traffic colors (thick road overlays)
const GOOGLE_TRAFFIC_COLORS = {
  'light': '#4CAF50',    // Green (Google's green)
  'moderate': '#FF9800', // Orange (Google's yellow-orange)  
  'heavy': '#F44336',    // Red (Google's red)
  'severe': '#9C27B0'    // Purple (Google's dark red/purple)
};

const WEATHER_SYMBOLS = {
  'sunny': { icon: <Sun className="h-5 w-5" />, color: '#FFA726' },
  'cloudy': { icon: <Cloud className="h-5 w-5" />, color: '#90A4AE' },
  'rainy': { icon: <CloudRain className="h-5 w-5" />, color: '#42A5F5' },
  'thunderstorm': { icon: <Zap className="h-5 w-5" />, color: '#AB47BC' },
  'clear': { icon: <Sun className="h-5 w-5" />, color: '#FFA726' }
};

export default function GoogleStyleTrafficHeatMap({ 
  stations, 
  selectedStation, 
  onStationSelect 
}: GoogleStyleHeatMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [showTrafficShading, setShowTrafficShading] = useState(true);
  const [showWeatherSymbols, setShowWeatherSymbols] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Fetch traffic data for all stations
  const { data: trafficData, refetch: refetchTraffic } = useQuery({
    queryKey: ['/api/traffic/all-stations'],
    staleTime: 30000,
  });

  // Fetch weather data for all parishes
  const { data: weatherData, refetch: refetchWeather } = useQuery({
    queryKey: ['/api/weather/all-parishes'],
    staleTime: 300000,
  });

  // Initialize Google Maps
  useEffect(() => {
    if (!mapRef.current) return;

    const initializeGoogleMap = () => {
      if (typeof (window as any).google !== 'undefined' && (window as any).google.maps) {
        setupGoogleMap();
      } else {
        // Load Google Maps if not already loaded
        loadGoogleMaps();
      }
    };

    const loadGoogleMaps = () => {
      const script = document.createElement('script');
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'demo_key';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry`;
      script.async = true;
      script.defer = true;
      script.onload = setupGoogleMap;
      script.onerror = () => {
        console.error('Failed to load Google Maps');
        setIsLoading(false);
        toast({
          title: "Map Error",
          description: "Failed to load Google Maps. Please check your API key.",
          variant: "destructive"
        });
      };
      document.head.appendChild(script);
    };

    const setupGoogleMap = () => {
      if (!mapRef.current) return;

      try {
        const google = (window as any).google;
        const googleMap = new google.maps.Map(mapRef.current, {
          zoom: 9,
          center: { lat: 18.1096, lng: -77.2975 }, // Jamaica center
          mapTypeId: google.maps.MapTypeId.ROADMAP,
          styles: [
            // Slightly muted default style to make traffic overlays stand out
            {
              featureType: "road",
              elementType: "geometry",
              stylers: [{ color: "#f5f5f5" }]
            }
          ]
        });

        setMap(googleMap);
        setIsLoading(false);
        renderGoogleTrafficOverlays(googleMap);
      } catch (error) {
        console.error('Error setting up Google Maps:', error);
        setIsLoading(false);
      }
    };

    initializeGoogleMap();
  }, []);

  // Re-render overlays when data changes
  useEffect(() => {
    if (map) {
      renderGoogleTrafficOverlays(map);
    }
  }, [map, trafficData, weatherData, showTrafficShading, showWeatherSymbols, stations]);

  const renderGoogleTrafficOverlays = (googleMap: any) => {
    const google = (window as any).google;
    if (!google?.maps) return;

    // Clear existing overlays
    if (googleMap.overlays) {
      googleMap.overlays.forEach((overlay: any) => overlay.setMap(null));
    }
    googleMap.overlays = [];

    const bounds = new google.maps.LatLngBounds();

    stations.forEach((station) => {
      if (!station.latitude || !station.longitude) return;

      const lat = parseFloat(station.latitude);
      const lng = parseFloat(station.longitude);
      
      if (isNaN(lat) || isNaN(lng)) return;

      const position = new google.maps.LatLng(lat, lng);
      bounds.extend(position);

      // Add station marker
      const marker = new google.maps.Marker({
        position: position,
        map: googleMap,
        title: `${station.stationCode} - ${station.name}`,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: selectedStation?.id === station.id ? '#3b82f6' : '#ef4444',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2
        }
      });

      // Add click handler
      marker.addListener('click', () => {
        onStationSelect?.(station);
      });

      // Add Google Maps-style traffic road shading
      if (showTrafficShading) {
        addGoogleStyleTrafficRoads(googleMap, station, position);
      }

      // Add weather symbol
      if (showWeatherSymbols) {
        addWeatherSymbol(googleMap, station, position);
      }
    });

    // Fit map to show all stations
    if (stations.length > 0 && !bounds.isEmpty()) {
      googleMap.fitBounds(bounds);
      // Ensure minimum zoom level
      const listener = google.maps.event.addListener(googleMap, 'bounds_changed', () => {
        if (googleMap.getZoom() > 12) {
          googleMap.setZoom(12);
        }
        google.maps.event.removeListener(listener);
      });
    }
  };

  const addGoogleStyleTrafficRoads = (googleMap: any, station: any, position: any) => {
    // Find traffic data for this station
    const stationTraffic = (trafficData as any)?.stations?.find((t: any) => 
      t.stationId === station.id || t.stationCode === station.stationCode
    );

    if (!stationTraffic?.nearbyTraffic) return;

    const trafficSeverity = stationTraffic.nearbyTraffic.severity || 'light';
    const color = GOOGLE_TRAFFIC_COLORS[trafficSeverity as keyof typeof GOOGLE_TRAFFIC_COLORS];

    // Create Google Maps-style road segments around station
    const roadSegments = generateGoogleStyleRoadNetwork(position, 0.004); // ~400m radius

    roadSegments.forEach((segment) => {
      const polyline = new google.maps.Polyline({
        path: segment,
        geodesic: true,
        strokeColor: color,
        strokeOpacity: 0.8,
        strokeWeight: 8, // Thick like Google Maps traffic
        map: googleMap
      });

      // Add traffic info window
      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 8px;">
            <strong>${station.name}</strong><br/>
            Traffic: <span style="color: ${color}; font-weight: bold;">${trafficSeverity.toUpperCase()}</span><br/>
            Speed: ${stationTraffic.nearbyTraffic.speed || 'N/A'} km/h<br/>
            Delay: ${stationTraffic.nearbyTraffic.delayMinutes || 0} min
          </div>
        `
      });

      polyline.addListener('click', () => {
        infoWindow.setPosition(position);
        infoWindow.open(googleMap);
      });

      googleMap.overlays.push(polyline);
    });
  };

  const addWeatherSymbol = (googleMap: any, station: any, position: any) => {
    // Get weather data for this station's parish
    const parishWeather = (weatherData as any)?.parishes?.find((p: any) => 
      p.parishName === station.parish
    );

    if (!parishWeather) return;

    const weatherCondition = parishWeather.currentWeather?.condition || 'sunny';
    const weatherSymbol = WEATHER_SYMBOLS[weatherCondition as keyof typeof WEATHER_SYMBOLS] || WEATHER_SYMBOLS.sunny;

    // Create weather marker offset from station
    const weatherPosition = new google.maps.LatLng(
      position.lat() - 0.003, // Offset south
      position.lng() + 0.003  // Offset east
    );

    const weatherMarker = new google.maps.Marker({
      position: weatherPosition,
      map: googleMap,
      title: `Weather: ${weatherCondition}`,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 12,
        fillColor: weatherSymbol.color,
        fillOpacity: 0.9,
        strokeColor: '#ffffff',
        strokeWeight: 2
      }
    });

    // Add weather info
    const weatherInfo = new google.maps.InfoWindow({
      content: `
        <div style="padding: 8px;">
          <strong>Weather at ${station.name}</strong><br/>
          Condition: ${weatherCondition}<br/>
          Temperature: ${parishWeather.currentWeather?.temperature || 'N/A'}°C<br/>
          Parish: ${station.parish}
        </div>
      `
    });

    weatherMarker.addListener('click', () => {
      weatherInfo.open(googleMap, weatherMarker);
    });

    googleMap.overlays.push(weatherMarker);
  };

  const generateGoogleStyleRoadNetwork = (center: any, radius: number) => {
    // Generate realistic road network segments like Google Maps traffic visualization
    const roads = [];
    const numMainRoads = 6; // More roads for realistic network
    
    for (let i = 0; i < numMainRoads; i++) {
      const angle = (i * Math.PI * 2) / numMainRoads;
      const road = [];
      
      // Create curved road segments (more Google-like)
      for (let j = 0; j < 4; j++) {
        const distance = radius * (0.2 + j * 0.25);
        const curvature = (Math.random() - 0.5) * 0.001; // Add slight curve
        const lat = center.lat() + Math.cos(angle + curvature) * distance;
        const lng = center.lng() + Math.sin(angle + curvature) * distance;
        road.push(new google.maps.LatLng(lat, lng));
      }
      
      roads.push(road);
    }
    
    // Add some cross-connecting roads
    for (let i = 0; i < 3; i++) {
      const crossRoad = [];
      const startAngle = (i * Math.PI * 2) / 3;
      const endAngle = startAngle + Math.PI;
      
      for (let j = 0; j < 3; j++) {
        const progress = j / 2;
        const angle = startAngle + (endAngle - startAngle) * progress;
        const distance = radius * 0.6;
        const lat = center.lat() + Math.cos(angle) * distance;
        const lng = center.lng() + Math.sin(angle) * distance;
        crossRoad.push(new google.maps.LatLng(lat, lng));
      }
      
      roads.push(crossRoad);
    }
    
    return roads;
  };

  const handleRefresh = async () => {
    await Promise.all([refetchTraffic(), refetchWeather()]);
    if (map) {
      renderGoogleTrafficOverlays(map);
    }
    toast({
      title: "Heat Map Refreshed",
      description: "Traffic and weather data updated",
    });
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card className="government-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Google Maps Style Traffic Heat Map
            </div>
            <Button onClick={handleRefresh} size="sm" variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center space-x-2">
              <Switch 
                id="traffic-shading" 
                checked={showTrafficShading}
                onCheckedChange={setShowTrafficShading}
              />
              <label htmlFor="traffic-shading" className="flex items-center gap-2">
                <Car className="h-4 w-4" />
                Google-Style Traffic Roads
              </label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch 
                id="weather-symbols" 
                checked={showWeatherSymbols}
                onCheckedChange={setShowWeatherSymbols}
              />
              <label htmlFor="weather-symbols" className="flex items-center gap-2">
                <Thermometer className="h-4 w-4" />
                Weather Symbols
              </label>
            </div>
          </div>

          {/* Google Maps Traffic Legend */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {showTrafficShading && (
              <div>
                <h4 className="font-medium mb-2">Google Maps Traffic Legend</h4>
                <div className="space-y-2">
                  {Object.entries(GOOGLE_TRAFFIC_COLORS).map(([severity, color]) => (
                    <div key={severity} className="flex items-center gap-2">
                      <div 
                        className="w-6 h-2 rounded"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-sm capitalize">{severity} Traffic</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {showWeatherSymbols && (
              <div>
                <h4 className="font-medium mb-2">Weather Symbols</h4>
                <div className="space-y-1">
                  {Object.entries(WEATHER_SYMBOLS).slice(0, 4).map(([condition, symbol]) => (
                    <div key={condition} className="flex items-center gap-2">
                      <div style={{ color: symbol.color }}>
                        {symbol.icon}
                      </div>
                      <span className="text-sm capitalize">{condition}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Map */}
      <Card className="government-card">
        <CardContent className="p-0">
          {isLoading && (
            <div className="flex items-center justify-center h-[600px]">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Loading Google Maps...</p>
              </div>
            </div>
          )}
          <div 
            ref={mapRef} 
            style={{ 
              width: '100%', 
              height: '600px',
              display: isLoading ? 'none' : 'block'
            }}
          />
        </CardContent>
      </Card>

      {/* Station Info */}
      {selectedStation && (
        <Card className="government-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              {selectedStation.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Station Code</p>
                <p className="font-medium">{selectedStation.stationCode}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Parish</p>
                <p className="font-medium">{selectedStation.parish}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm text-muted-foreground">Address</p>
                <p className="font-medium">{selectedStation.address}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}