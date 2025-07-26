import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { 
  MapPin, 
  RefreshCw, 
  Car, 
  Cloud, 
  Sun, 
  CloudRain, 
  CloudSnow,
  Thermometer,
  Wind,
  Zap
} from 'lucide-react';

interface EnhancedHeatMapProps {
  stations: any[];
  selectedStation?: any;
  onStationSelect?: (station: any) => void;
}

interface WeatherIcon {
  condition: string;
  icon: React.ReactNode;
  color: string;
}

const WEATHER_ICONS: { [key: string]: WeatherIcon } = {
  'sunny': { condition: 'Sunny', icon: <Sun className="h-4 w-4" />, color: '#fbbf24' },
  'cloudy': { condition: 'Cloudy', icon: <Cloud className="h-4 w-4" />, color: '#6b7280' },
  'rainy': { condition: 'Rainy', icon: <CloudRain className="h-4 w-4" />, color: '#3b82f6' },
  'thunderstorm': { condition: 'Storm', icon: <Zap className="h-4 w-4" />, color: '#7c3aed' },
  'partly_cloudy': { condition: 'Partly Cloudy', icon: <Cloud className="h-4 w-4" />, color: '#9ca3af' },
  'clear': { condition: 'Clear', icon: <Sun className="h-4 w-4" />, color: '#fbbf24' }
};

const TRAFFIC_COLORS = {
  'light': '#10b981',    // Green
  'moderate': '#f59e0b', // Yellow  
  'heavy': '#ef4444',    // Red
  'severe': '#7c2d12'    // Dark red
};

export default function EnhancedPollingStationsHeatMap({ 
  stations, 
  selectedStation, 
  onStationSelect 
}: EnhancedHeatMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [showTrafficShading, setShowTrafficShading] = useState(true);
  const [showWeatherSymbols, setShowWeatherSymbols] = useState(true);
  const [mapProvider, setMapProvider] = useState<'here' | 'google'>('here');
  const [mapLoadError, setMapLoadError] = useState(false);
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
    staleTime: 300000, // 5 minutes
  });

  // Initialize HERE Maps
  useEffect(() => {
    if (!mapRef.current || !hereSettings?.apiKey) return;

    const initializeHereMap = async () => {
      try {
        // Load HERE Maps API
        const script = document.createElement('script');
        script.src = 'https://js.api.here.com/v3/3.1/mapsjs-core.js';
        script.onload = () => {
          const uiScript = document.createElement('script');
          uiScript.src = 'https://js.api.here.com/v3/3.1/mapsjs-ui.js';
          uiScript.onload = () => {
            const mapTypesScript = document.createElement('script');
            mapTypesScript.src = 'https://js.api.here.com/v3/3.1/mapsjs-mapevents.js';
            mapTypesScript.onload = () => {
              setupHereMap();
            };
            document.head.appendChild(mapTypesScript);
          };
          document.head.appendChild(uiScript);
        };
        document.head.appendChild(script);
      } catch (error) {
        console.error('Error loading HERE Maps:', error);
        setMapLoadError(true);
      }
    };

    const setupHereMap = () => {
      const H = (window as any).H;
      if (!H) return;

      const platform = new H.service.Platform({
        'apikey': hereSettings.apiKey
      });

      const defaultMapTypes = platform.createDefaultMapTypes();
      const hereMap = new H.Map(
        mapRef.current,
        defaultMapTypes.vector.normal.map,
        {
          zoom: 8,
          center: { lat: 18.1096, lng: -77.2975 } // Jamaica center
        }
      );

      const behavior = new H.mapevents.Behavior();
      const ui = H.ui.UI.createDefault(hereMap);

      setMap(hereMap);
      renderEnhancedOverlays(hereMap);
    };

    if (hereSettings?.apiKey) {
      initializeHereMap();
    }
  }, [hereSettings]);

  // Re-render overlays when data changes
  useEffect(() => {
    if (map && (showTrafficShading || showWeatherSymbols)) {
      renderEnhancedOverlays(map);
    }
  }, [map, trafficData, weatherData, showTrafficShading, showWeatherSymbols, stations]);

  const renderEnhancedOverlays = (hereMap: any) => {
    const H = (window as any).H;
    if (!H) return;

    // Clear existing overlays
    hereMap.removeObjects(hereMap.getObjects());

    const group = new H.map.Group();

    stations.forEach((station) => {
      if (!station.latitude || !station.longitude) return;

      const lat = parseFloat(station.latitude);
      const lng = parseFloat(station.longitude);
      
      if (isNaN(lat) || isNaN(lng)) {
        console.warn('Invalid coordinates for station:', station.name, 'lat:', station.latitude, 'lng:', station.longitude);
        return;
      }

      const position = new H.geo.Point(lat, lng);

      // Add enhanced station marker
      const stationIcon = new H.map.Icon(createStationMarkerSVG(station), { size: { w: 32, h: 32 } });
      const marker = new H.map.Marker(position, { icon: stationIcon });
      
      // Add station click handler
      marker.addEventListener('tap', () => {
        onStationSelect?.(station);
      });

      group.addObject(marker);

      // Add traffic road shading
      if (showTrafficShading) {
        addTrafficRoadShading(group, station, position, H);
      }

      // Add weather symbol
      if (showWeatherSymbols) {
        addWeatherSymbol(group, station, position, H);
      }
    });

    hereMap.addObject(group);
    
    // Fit map to show all stations
    if (stations.length > 0) {
      const bbox = group.getBoundingBox();
      if (bbox) {
        hereMap.getViewPort().resize();
        hereMap.setViewBounds(bbox, true);
      }
    }
  };

  const addTrafficRoadShading = (group: any, station: any, position: any, H: any) => {
    // Find traffic data for this station
    const stationTraffic = (trafficData as any)?.stations?.find((t: any) => 
      t.stationId === station.id || t.stationCode === station.stationCode
    );

    if (!stationTraffic?.nearbyTraffic) return;

    const trafficSeverity = stationTraffic.nearbyTraffic.severity || 'light';
    const color = TRAFFIC_COLORS[trafficSeverity as keyof typeof TRAFFIC_COLORS] || TRAFFIC_COLORS.light;

    // Create road shading around the station (simulated road network)
    const roadPoints = generateRoadPoints(position, 0.003); // ~300m radius
    
    roadPoints.forEach((roadStrip) => {
      const polyline = new H.map.Polyline(
        new H.geo.LineString(roadStrip),
        {
          style: {
            strokeColor: color,
            lineWidth: 6,
            lineCap: 'round',
            lineJoin: 'round'
          }
        }
      );
      group.addObject(polyline);
    });

    // Add traffic info bubble
    const trafficInfo = new H.ui.InfoBubble({
      lat: position.lat + 0.001,
      lng: position.lng + 0.001
    }, {
      content: `
        <div style="padding: 8px; min-width: 150px;">
          <strong>${station.name}</strong><br/>
          <span style="color: ${color};">●</span> Traffic: ${trafficSeverity.toUpperCase()}<br/>
          Speed: ${stationTraffic.nearbyTraffic.speed || 'N/A'} km/h<br/>
          Delay: ${stationTraffic.nearbyTraffic.delayMinutes || 0} min
        </div>
      `
    });
  };

  const addWeatherSymbol = (group: any, station: any, position: any, H: any) => {
    // Get weather data for this station's parish
    const parishWeather = (weatherData as any)?.parishes?.find((p: any) => 
      p.parishName === station.parish
    );

    if (!parishWeather) return;

    const weatherCondition = parishWeather.currentWeather?.condition || 'sunny';
    const weatherIcon = WEATHER_ICONS[weatherCondition] || WEATHER_ICONS.sunny;

    // Create weather symbol marker
    const weatherMarkerSVG = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="11" fill="white" stroke="${weatherIcon.color}" stroke-width="2"/>
        <g transform="translate(4, 4)">
          ${getWeatherIconSVG(weatherCondition)}
        </g>
      </svg>
    `;

    const weatherIconMarker = new H.map.Icon(weatherMarkerSVG, { size: { w: 24, h: 24 } });
    const weatherMarker = new H.map.Marker(
      new H.geo.Point(position.lat - 0.002, position.lng + 0.002), // Offset from station
      { icon: weatherIconMarker }
    );

    // Add weather info
    weatherMarker.addEventListener('tap', () => {
      toast({
        title: `Weather at ${station.name}`,
        description: `${weatherIcon.condition} - ${parishWeather.currentWeather?.temperature || 'N/A'}°C`,
      });
    });

    group.addObject(weatherMarker);
  };

  const generateRoadPoints = (center: any, radius: number) => {
    // Generate simulated road network points around the station
    const roads = [];
    const numRoads = 4; // Four main roads
    
    for (let i = 0; i < numRoads; i++) {
      const angle = (i * Math.PI * 2) / numRoads;
      const road = [];
      
      // Create road segments
      for (let j = 0; j < 3; j++) {
        const distance = radius * (0.3 + j * 0.3);
        const lat = center.lat + Math.cos(angle) * distance;
        const lng = center.lng + Math.sin(angle) * distance;
        road.push(lat, lng, 0);
      }
      
      roads.push(road);
    }
    
    return roads;
  };

  const createStationMarkerSVG = (station: any) => {
    const isSelected = selectedStation?.id === station.id;
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

  const getWeatherIconSVG = (condition: string) => {
    switch (condition) {
      case 'sunny':
      case 'clear':
        return `<circle cx="8" cy="8" r="3" fill="#fbbf24"/>
                <line x1="8" y1="1" x2="8" y2="3" stroke="#fbbf24" stroke-width="1"/>
                <line x1="8" y1="13" x2="8" y2="15" stroke="#fbbf24" stroke-width="1"/>
                <line x1="1" y1="8" x2="3" y2="8" stroke="#fbbf24" stroke-width="1"/>
                <line x1="13" y1="8" x2="15" y2="8" stroke="#fbbf24" stroke-width="1"/>`;
      case 'rainy':
        return `<path d="M2 8c0-2.5 2-4.5 4.5-4.5S11 5.5 11 8c1.5 0 3 1.5 3 3s-1.5 3-3 3H4.5C2 14 2 11 2 8z" fill="#3b82f6"/>
                <line x1="4" y1="12" x2="4" y2="14" stroke="#3b82f6" stroke-width="1"/>
                <line x1="8" y1="12" x2="8" y2="14" stroke="#3b82f6" stroke-width="1"/>`;
      case 'cloudy':
      case 'partly_cloudy':
        return `<path d="M2 8c0-2.5 2-4.5 4.5-4.5S11 5.5 11 8c1.5 0 3 1.5 3 3s-1.5 3-3 3H4.5C2 14 2 11 2 8z" fill="#6b7280"/>`;
      case 'thunderstorm':
        return `<path d="M2 8c0-2.5 2-4.5 4.5-4.5S11 5.5 11 8c1.5 0 3 1.5 3 3s-1.5 3-3 3H4.5C2 14 2 11 2 8z" fill="#7c3aed"/>
                <path d="M6 10l2 3h-1l2 3-2-3h1l-2-3z" fill="#fbbf24"/>`;
      default:
        return `<circle cx="8" cy="8" r="3" fill="#9ca3af"/>`;
    }
  };

  const handleRefresh = async () => {
    await Promise.all([refetchTraffic(), refetchWeather()]);
    if (map) {
      renderEnhancedOverlays(map);
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
              Enhanced Jamaica Polling Stations Heat Map
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

          {/* Legend */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {showTrafficShading && (
              <div>
                <h4 className="font-medium mb-2">Traffic Legend</h4>
                <div className="space-y-1">
                  {Object.entries(TRAFFIC_COLORS).map(([severity, color]) => (
                    <div key={severity} className="flex items-center gap-2">
                      <div 
                        className="w-4 h-2 rounded"
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
                <h4 className="font-medium mb-2">Weather Legend</h4>
                <div className="space-y-1">
                  {Object.entries(WEATHER_ICONS).slice(0, 4).map(([condition, icon]) => (
                    <div key={condition} className="flex items-center gap-2">
                      <div style={{ color: icon.color }}>
                        {icon.icon}
                      </div>
                      <span className="text-sm">{icon.condition}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Heat Map */}
      <Card className="government-card">
        <CardContent className="p-0">
          <div ref={mapRef} style={{ width: '100%', height: '600px' }}></div>
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