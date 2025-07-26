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
  Thermometer,
  AlertCircle
} from 'lucide-react';

interface ReliableGoogleMapsProps {
  stations: any[];
  selectedStation?: any;
  onStationSelect?: (station: any) => void;
}

// Google Maps style traffic colors (matching their exact colors)
const GOOGLE_TRAFFIC_COLORS = {
  'light': '#34A853',    // Google's green
  'moderate': '#FBBC04', // Google's yellow
  'heavy': '#EA4335',    // Google's red  
  'severe': '#9C27B0'    // Google's purple
};

declare global {
  interface Window {
    google: any;
    initGoogleMap: () => void;
  }
}

export default function ReliableGoogleMaps({ 
  stations, 
  selectedStation, 
  onStationSelect 
}: ReliableGoogleMapsProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [showTrafficShading, setShowTrafficShading] = useState(true);
  const [showWeatherSymbols, setShowWeatherSymbols] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);
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
    const initializeGoogleMaps = () => {
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      
      if (!apiKey) {
        setMapError('Google Maps API key not configured');
        setIsLoading(false);
        return;
      }

      // Check if Google Maps is already loaded
      if (window.google && window.google.maps) {
        console.log('Google Maps already loaded');
        createMap();
        return;
      }

      // Create global callback
      window.initGoogleMap = () => {
        console.log('Google Maps callback triggered');
        createMap();
      };

      // Load Google Maps script
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry&callback=initGoogleMap`;
      script.async = true;
      script.defer = true;
      script.onerror = () => {
        setMapError('Failed to load Google Maps API');
        setIsLoading(false);
      };

      // Check if script already exists
      const existingScript = document.querySelector(`script[src*="maps.googleapis.com"]`);
      if (!existingScript) {
        document.head.appendChild(script);
        console.log('Google Maps script added');
      } else {
        console.log('Google Maps script already exists, waiting for load...');
        // Wait a bit and try to create map
        setTimeout(() => {
          if (window.google && window.google.maps) {
            createMap();
          }
        }, 1000);
      }
    };

    const createMap = () => {
      if (!mapRef.current) {
        setMapError('Map container not found');
        setIsLoading(false);
        return;
      }

      if (!window.google || !window.google.maps) {
        setMapError('Google Maps API not loaded');
        setIsLoading(false);
        return;
      }

      try {
        console.log('Creating Google Maps instance...');
        
        const googleMap = new window.google.maps.Map(mapRef.current, {
          zoom: 9,
          center: { lat: 18.1096, lng: -77.2975 }, // Jamaica center
          mapTypeId: window.google.maps.MapTypeId.ROADMAP,
          styles: [
            // Custom style to make roads more visible for traffic overlay
            {
              featureType: "road",
              elementType: "geometry",
              stylers: [{ color: "#f0f0f0" }]
            },
            {
              featureType: "road.highway",
              elementType: "geometry",
              stylers: [{ color: "#e0e0e0" }]
            }
          ]
        });

        setMap(googleMap);
        setIsLoading(false);
        setMapError(null);
        
        console.log('Google Maps created successfully!');
        
        toast({
          title: "Map Ready",
          description: "Google Maps loaded successfully",
        });
      } catch (error) {
        console.error('Error creating Google Maps:', error);
        setMapError(`Map creation failed: ${error}`);
        setIsLoading(false);
      }
    };

    initializeGoogleMaps();
  }, [toast]);

  // Render stations and overlays when map and data are ready
  useEffect(() => {
    if (map && stations.length > 0) {
      console.log('Rendering stations and traffic overlays...');
      renderStationsAndTrafficOverlays();
    }
  }, [map, stations, trafficData, weatherData, showTrafficShading, showWeatherSymbols]);

  const renderStationsAndTrafficOverlays = () => {
    if (!map || !window.google) return;

    // Clear existing overlays
    if (map.overlays) {
      map.overlays.forEach((overlay: any) => overlay.setMap(null));
    }
    map.overlays = [];

    const bounds = new window.google.maps.LatLngBounds();
    let validStations = 0;

    stations.forEach((station) => {
      if (!station.latitude || !station.longitude) return;

      const lat = parseFloat(station.latitude);
      const lng = parseFloat(station.longitude);
      
      if (isNaN(lat) || isNaN(lng)) return;

      validStations++;
      const position = new window.google.maps.LatLng(lat, lng);
      bounds.extend(position);

      // Create station marker
      const isSelected = selectedStation?.id === station.id;
      const marker = new window.google.maps.Marker({
        position: position,
        map: map,
        title: `${station.stationCode} - ${station.name}`,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: isSelected ? 12 : 10,
          fillColor: isSelected ? '#3b82f6' : '#ef4444',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2
        }
      });

      // Add click handler
      marker.addListener('click', () => {
        onStationSelect?.(station);
      });

      map.overlays.push(marker);

      // Add Google Maps-style traffic road shading
      if (showTrafficShading) {
        addGoogleStyleTrafficRoads(station, position);
      }

      // Add weather symbol
      if (showWeatherSymbols) {
        addWeatherSymbol(station, position);
      }
    });

    console.log(`Rendered ${validStations} stations with overlays`);

    // Fit map to show all stations
    if (validStations > 0 && !bounds.isEmpty()) {
      map.fitBounds(bounds);
      
      // Ensure reasonable zoom level
      const listener = window.google.maps.event.addListener(map, 'bounds_changed', () => {
        if (map.getZoom() > 12) {
          map.setZoom(12);
        }
        window.google.maps.event.removeListener(listener);
      });
    }
  };

  const addGoogleStyleTrafficRoads = (station: any, position: any) => {
    // Find traffic data for this station
    const stationTraffic = (trafficData as any)?.stations?.find((t: any) => 
      t.stationId === station.id || t.stationCode === station.stationCode
    );

    const trafficSeverity = stationTraffic?.nearbyTraffic?.severity || 'light';
    const color = GOOGLE_TRAFFIC_COLORS[trafficSeverity as keyof typeof GOOGLE_TRAFFIC_COLORS];

    // Create Google Maps-style road network around the station
    const roadSegments = generateRealisticRoadNetwork(position);

    roadSegments.forEach((segmentPath) => {
      const polyline = new window.google.maps.Polyline({
        path: segmentPath,
        geodesic: false,
        strokeColor: color,
        strokeOpacity: 0.8,
        strokeWeight: 8, // Thick like Google Maps traffic
        map: map
      });

      // Add info window for traffic details
      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 8px; font-family: Arial;">
            <strong>${station.name}</strong><br/>
            <span style="color: ${color}; font-weight: bold;">${trafficSeverity.toUpperCase()} TRAFFIC</span><br/>
            Speed: ${stationTraffic?.nearbyTraffic?.speed || 'N/A'} km/h<br/>
            Delay: ${stationTraffic?.nearbyTraffic?.delayMinutes || 0} min
          </div>
        `
      });

      polyline.addListener('click', (event: any) => {
        infoWindow.setPosition(event.latLng);
        infoWindow.open(map);
      });

      map.overlays.push(polyline);
    });
  };

  const addWeatherSymbol = (station: any, position: any) => {
    // Get weather data for this station's parish
    const parishWeather = (weatherData as any)?.parishes?.find((p: any) => 
      p.parishName === station.parish
    );

    if (!parishWeather) return;

    const weatherCondition = parishWeather.currentWeather?.condition || 'sunny';
    const weatherColor = getWeatherColor(weatherCondition);
    
    // Create weather marker offset from station
    const weatherPosition = new window.google.maps.LatLng(
      position.lat() - 0.003, // Offset south
      position.lng() + 0.003  // Offset east
    );

    const weatherMarker = new window.google.maps.Marker({
      position: weatherPosition,
      map: map,
      title: `Weather: ${weatherCondition}`,
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: weatherColor,
        fillOpacity: 0.9,
        strokeColor: '#ffffff',
        strokeWeight: 2
      }
    });

    // Add weather info window
    const weatherInfo = new window.google.maps.InfoWindow({
      content: `
        <div style="padding: 8px; font-family: Arial;">
          <strong>Weather: ${station.name}</strong><br/>
          Condition: ${weatherCondition}<br/>
          Temperature: ${parishWeather.currentWeather?.temperature || 'N/A'}°C<br/>
          Parish: ${station.parish}
        </div>
      `
    });

    weatherMarker.addListener('click', () => {
      weatherInfo.open(map, weatherMarker);
    });

    map.overlays.push(weatherMarker);
  };

  const generateRealisticRoadNetwork = (center: any) => {
    // Generate realistic road segments like Google Maps traffic visualization
    const roads = [];
    const centerLat = center.lat();
    const centerLng = center.lng();
    const radius = 0.004; // ~400m radius

    // Main arterial roads (6 directions)
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI * 2) / 6;
      const road = [];
      
      // Create curved road segments for realism
      for (let j = 0; j < 4; j++) {
        const distance = radius * (0.2 + j * 0.25);
        const curvature = (Math.random() - 0.5) * 0.0008; // Slight curve
        const lat = centerLat + Math.cos(angle + curvature) * distance;
        const lng = centerLng + Math.sin(angle + curvature) * distance;
        road.push(new window.google.maps.LatLng(lat, lng));
      }
      
      roads.push(road);
    }

    // Secondary connecting roads
    for (let i = 0; i < 4; i++) {
      const connectingRoad = [];
      const startAngle = (i * Math.PI * 2) / 4;
      const endAngle = startAngle + Math.PI / 2;
      
      for (let j = 0; j < 3; j++) {
        const progress = j / 2;
        const angle = startAngle + (endAngle - startAngle) * progress;
        const distance = radius * 0.7;
        const lat = centerLat + Math.cos(angle) * distance;
        const lng = centerLng + Math.sin(angle) * distance;
        connectingRoad.push(new window.google.maps.LatLng(lat, lng));
      }
      
      roads.push(connectingRoad);
    }

    return roads;
  };

  const getWeatherColor = (condition: string) => {
    switch (condition.toLowerCase()) {
      case 'sunny':
      case 'clear':
        return '#FFA726';
      case 'rainy':
        return '#42A5F5';
      case 'cloudy':
      case 'partly_cloudy':
        return '#90A4AE';
      case 'thunderstorm':
        return '#AB47BC';
      default:
        return '#FFA726';
    }
  };

  const handleRefresh = async () => {
    await Promise.all([refetchTraffic(), refetchWeather()]);
    if (map) {
      renderStationsAndTrafficOverlays();
    }
    toast({
      title: "Data Refreshed",
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
              Google Maps Traffic Visualization
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
                Traffic Road Shading
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

          {/* Google Traffic Legend */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Google Maps Traffic Colors</h4>
              <div className="space-y-2">
                {Object.entries(GOOGLE_TRAFFIC_COLORS).map(([severity, color]) => (
                  <div key={severity} className="flex items-center gap-2">
                    <div 
                      className="w-8 h-3 rounded"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-sm capitalize font-medium">{severity} Traffic</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Status</h4>
              <div className="space-y-1 text-sm">
                <p>Stations: {stations.length} loaded</p>
                <p>Traffic Data: {(trafficData as any)?.stations?.length || 0} stations</p>
                <p>Weather Data: {(weatherData as any)?.parishes?.length || 0} parishes</p>
                <p className={`font-medium ${mapError ? 'text-red-600' : 'text-green-600'}`}>
                  Map: {mapError ? 'Error' : isLoading ? 'Loading...' : 'Ready'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Map */}
      <Card className="government-card">
        <CardContent className="p-0">
          {isLoading && (
            <div className="flex items-center justify-center h-[600px] bg-gray-50">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Loading Google Maps...</p>
              </div>
            </div>
          )}
          
          {mapError && (
            <div className="flex items-center justify-center h-[600px] bg-red-50">
              <div className="text-center">
                <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                <p className="text-red-600 font-medium">Map Error</p>
                <p className="text-sm text-red-500">{mapError}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Check if VITE_GOOGLE_MAPS_API_KEY is configured
                </p>
              </div>
            </div>
          )}
          
          <div 
            ref={mapRef} 
            style={{ 
              width: '100%', 
              height: '600px',
              display: (isLoading || mapError) ? 'none' : 'block',
              backgroundColor: '#f5f5f5'
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