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

interface WorkingTrafficHeatMapProps {
  stations: any[];
  selectedStation?: any;
  onStationSelect?: (station: any) => void;
}

// Google Maps style traffic colors
const GOOGLE_TRAFFIC_COLORS = {
  'light': '#4CAF50',    // Green
  'moderate': '#FF9800', // Orange
  'heavy': '#F44336',    // Red  
  'severe': '#9C27B0'    // Purple
};

export default function WorkingTrafficHeatMap({ 
  stations, 
  selectedStation, 
  onStationSelect 
}: WorkingTrafficHeatMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [showTrafficShading, setShowTrafficShading] = useState(true);
  const [showWeatherSymbols, setShowWeatherSymbols] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Fetch HERE Maps API key
  const { data: hereSettings } = useQuery<{
    configured: boolean;
    hasKey: boolean;
    apiKey?: string;
  }>({
    queryKey: ['/api/settings/here-api'],
  });

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

  // Load HERE Maps scripts
  useEffect(() => {
    if (!hereSettings?.apiKey) return;

    const loadScript = (src: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
          resolve();
          return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => resolve();
        script.onerror = reject;
        document.head.appendChild(script);
      });
    };

    const initializeHereMap = async () => {
      try {
        setIsLoading(true);
        
        // Load HERE Maps scripts in sequence
        await loadScript('https://js.api.here.com/v3/3.1/mapsjs-core.js');
        await loadScript('https://js.api.here.com/v3/3.1/mapsjs-ui.js');
        await loadScript('https://js.api.here.com/v3/3.1/mapsjs-mapevents.js');
        
        setupHereMap();
      } catch (error) {
        console.error('Error loading HERE Maps:', error);
        setIsLoading(false);
        toast({
          title: "Map Loading Error",
          description: "Failed to load HERE Maps API",
          variant: "destructive"
        });
      }
    };

    const setupHereMap = () => {
      const H = (window as any).H;
      if (!H || !mapRef.current) {
        setIsLoading(false);
        return;
      }

      try {
        const platform = new H.service.Platform({
          'apikey': hereSettings.apiKey
        });

        const defaultMapTypes = platform.createDefaultMapTypes();
        const hereMap = new H.Map(
          mapRef.current,
          defaultMapTypes.vector.normal.map,
          {
            zoom: 9,
            center: { lat: 18.1096, lng: -77.2975 } // Jamaica center
          }
        );

        const behavior = new H.mapevents.Behavior(new H.mapevents.MapEvents(hereMap));
        const ui = H.ui.UI.createDefault(hereMap, defaultMapTypes);

        setMap(hereMap);
        setIsLoading(false);
        console.log('HERE Maps initialized successfully');
      } catch (error) {
        console.error('Error setting up HERE Maps:', error);
        setIsLoading(false);
      }
    };

    initializeHereMap();
  }, [hereSettings?.apiKey]);

  // Render overlays when data changes
  useEffect(() => {
    if (map && stations.length > 0) {
      renderTrafficOverlays();
    }
  }, [map, trafficData, weatherData, showTrafficShading, showWeatherSymbols, stations]);

  const renderTrafficOverlays = () => {
    if (!map) return;
    
    const H = (window as any).H;
    if (!H) return;

    // Clear existing overlays
    map.removeObjects(map.getObjects());

    const group = new H.map.Group();
    const bounds = new H.geo.Rect(90, -180, -90, 180);
    let hasValidStations = false;

    stations.forEach((station) => {
      if (!station.latitude || !station.longitude) return;

      const lat = parseFloat(station.latitude);
      const lng = parseFloat(station.longitude);
      
      if (isNaN(lat) || isNaN(lng)) return;

      hasValidStations = true;
      const position = new H.geo.Point(lat, lng);

      // Extend bounds
      if (bounds.getTop() === 90) {
        bounds.setTop(lat);
        bounds.setBottom(lat);
        bounds.setLeft(lng);
        bounds.setRight(lng);
      } else {
        if (lat > bounds.getTop()) bounds.setTop(lat);
        if (lat < bounds.getBottom()) bounds.setBottom(lat);
        if (lng < bounds.getLeft()) bounds.setLeft(lng);
        if (lng > bounds.getRight()) bounds.setRight(lng);
      }

      // Add station marker
      const isSelected = selectedStation?.id === station.id;
      const markerIcon = new H.map.Icon(
        createStationMarkerSVG(station, isSelected), 
        { size: { w: 32, h: 32 } }
      );
      
      const marker = new H.map.Marker(position, { icon: markerIcon });
      marker.addEventListener('tap', () => {
        onStationSelect?.(station);
      });
      group.addObject(marker);

      // Add Google Maps-style traffic road shading
      if (showTrafficShading) {
        addGoogleStyleTrafficRoads(group, station, position, H);
      }

      // Add weather symbol
      if (showWeatherSymbols) {
        addWeatherSymbol(group, station, position, H);
      }
    });

    map.addObject(group);

    // Fit map to show all stations
    if (hasValidStations && bounds.getTop() !== 90) {
      map.getViewPort().resize();
      map.setViewBounds(bounds, true);
    }
  };

  const addGoogleStyleTrafficRoads = (group: any, station: any, position: any, H: any) => {
    // Find traffic data for this station
    const stationTraffic = (trafficData as any)?.stations?.find((t: any) => 
      t.stationId === station.id || t.stationCode === station.stationCode
    );

    if (!stationTraffic?.nearbyTraffic) return;

    const trafficSeverity = stationTraffic.nearbyTraffic.severity || 'light';
    const color = GOOGLE_TRAFFIC_COLORS[trafficSeverity as keyof typeof GOOGLE_TRAFFIC_COLORS];

    // Create Google Maps-style thick road segments
    const roadSegments = generateGoogleStyleRoads(position, 0.004); // ~400m radius

    roadSegments.forEach((roadPoints) => {
      const polyline = new H.map.Polyline(
        new H.geo.LineString(H.geo.LineString.fromLatLngArray(roadPoints)),
        {
          style: {
            strokeColor: color,
            lineWidth: 8, // Thick like Google Maps
            lineCap: 'round',
            lineJoin: 'round'
          }
        }
      );
      group.addObject(polyline);
    });
  };

  const addWeatherSymbol = (group: any, station: any, position: any, H: any) => {
    // Get weather data for this station's parish
    const parishWeather = (weatherData as any)?.parishes?.find((p: any) => 
      p.parishName === station.parish
    );

    if (!parishWeather) return;

    const weatherCondition = parishWeather.currentWeather?.condition || 'sunny';
    
    // Create weather symbol marker offset from station
    const weatherPosition = new H.geo.Point(
      position.lat - 0.003, // Offset south
      position.lng + 0.003  // Offset east
    );

    const weatherIcon = new H.map.Icon(
      createWeatherSymbolSVG(weatherCondition), 
      { size: { w: 24, h: 24 } }
    );
    
    const weatherMarker = new H.map.Marker(weatherPosition, { icon: weatherIcon });
    group.addObject(weatherMarker);
  };

  const generateGoogleStyleRoads = (center: any, radius: number) => {
    // Generate realistic road network like Google Maps traffic visualization
    const roads = [];
    const numMainRoads = 6;
    
    for (let i = 0; i < numMainRoads; i++) {
      const angle = (i * Math.PI * 2) / numMainRoads;
      const road = [];
      
      // Create curved road segments (more realistic)
      for (let j = 0; j < 4; j++) {
        const distance = radius * (0.2 + j * 0.25);
        const curvature = (Math.random() - 0.5) * 0.001; // Add slight curve
        const lat = center.lat + Math.cos(angle + curvature) * distance;
        const lng = center.lng + Math.sin(angle + curvature) * distance;
        road.push(lat, lng, 0); // HERE Maps format: [lat, lng, altitude]
      }
      
      roads.push(road);
    }
    
    // Add cross-connecting roads
    for (let i = 0; i < 3; i++) {
      const crossRoad = [];
      const startAngle = (i * Math.PI * 2) / 3;
      const endAngle = startAngle + Math.PI;
      
      for (let j = 0; j < 3; j++) {
        const progress = j / 2;
        const angle = startAngle + (endAngle - startAngle) * progress;
        const distance = radius * 0.6;
        const lat = center.lat + Math.cos(angle) * distance;
        const lng = center.lng + Math.sin(angle) * distance;
        crossRoad.push(lat, lng, 0);
      }
      
      roads.push(crossRoad);
    }
    
    return roads;
  };

  const createStationMarkerSVG = (station: any, isSelected: boolean) => {
    const size = isSelected ? 36 : 32;
    const color = isSelected ? '#3b82f6' : '#ef4444';
    
    return `
      <svg width="${size}" height="${size}" viewBox="0 0 32 32">
        <circle cx="16" cy="16" r="14" fill="${color}" stroke="white" stroke-width="2"/>
        <text x="16" y="20" text-anchor="middle" fill="white" font-size="10" font-weight="bold">
          ${station.stationCode?.substring(0, 3) || 'STN'}
        </text>
      </svg>
    `;
  };

  const createWeatherSymbolSVG = (condition: string) => {
    const getWeatherColor = (condition: string) => {
      switch (condition) {
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

    const color = getWeatherColor(condition);
    
    return `
      <svg width="24" height="24" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="11" fill="white" stroke="${color}" stroke-width="2"/>
        <circle cx="12" cy="12" r="6" fill="${color}"/>
        <text x="12" y="16" text-anchor="middle" fill="white" font-size="8" font-weight="bold">
          ${condition.charAt(0).toUpperCase()}
        </text>
      </svg>
    `;
  };

  const handleRefresh = async () => {
    await Promise.all([refetchTraffic(), refetchWeather()]);
    if (map) {
      renderTrafficOverlays();
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
                  <div className="flex items-center gap-2">
                    <Sun className="h-4 w-4" style={{ color: '#FFA726' }} />
                    <span className="text-sm">Sunny/Clear</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CloudRain className="h-4 w-4" style={{ color: '#42A5F5' }} />
                    <span className="text-sm">Rainy</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Cloud className="h-4 w-4" style={{ color: '#90A4AE' }} />
                    <span className="text-sm">Cloudy</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4" style={{ color: '#AB47BC' }} />
                    <span className="text-sm">Thunderstorm</span>
                  </div>
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
                <p className="text-sm text-muted-foreground">Loading HERE Maps...</p>
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