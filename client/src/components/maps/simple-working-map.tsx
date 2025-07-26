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
  Thermometer
} from 'lucide-react';

interface SimpleWorkingMapProps {
  stations: any[];
  selectedStation?: any;
  onStationSelect?: (station: any) => void;
}

// Google Maps style traffic colors
const TRAFFIC_COLORS = {
  'light': '#4CAF50',    // Green
  'moderate': '#FF9800', // Orange
  'heavy': '#F44336',    // Red  
  'severe': '#9C27B0'    // Purple
};

export default function SimpleWorkingMap({ 
  stations, 
  selectedStation, 
  onStationSelect 
}: SimpleWorkingMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [showTrafficShading, setShowTrafficShading] = useState(true);
  const [showWeatherSymbols, setShowWeatherSymbols] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);
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

  // Initialize map with better error handling
  useEffect(() => {
    if (!hereSettings?.apiKey || !mapRef.current) {
      console.log('Waiting for HERE API key or map ref...');
      return;
    }

    console.log('Starting map initialization with API key:', hereSettings.apiKey.substring(0, 20) + '...');
    
    const initializeMap = async () => {
      try {
        setIsLoading(true);
        
        // Check if HERE Maps is already loaded
        if ((window as any).H) {
          console.log('HERE Maps already loaded, setting up map...');
          setupMap();
          return;
        }

        // Load HERE Maps scripts
        console.log('Loading HERE Maps scripts...');
        
        // Load core script first
        await loadScript('https://js.api.here.com/v3/3.1/mapsjs-core.js');
        console.log('Core script loaded');
        
        // Then load UI script
        await loadScript('https://js.api.here.com/v3/3.1/mapsjs-ui.js');
        console.log('UI script loaded');
        
        // Finally load map events script
        await loadScript('https://js.api.here.com/v3/3.1/mapsjs-mapevents.js');
        console.log('Map events script loaded');
        
        setupMap();
      } catch (error) {
        console.error('Error initializing map:', error);
        setIsLoading(false);
        toast({
          title: "Map Error",
          description: "Could not load HERE Maps. Check console for details.",
          variant: "destructive"
        });
      }
    };

    const loadScript = (src: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[src="${src}"]`);
        if (existing) {
          console.log('Script already exists:', src);
          resolve();
          return;
        }
        
        const script = document.createElement('script');
        script.src = src;
        script.async = false; // Load in order
        script.onload = () => {
          console.log('Script loaded successfully:', src);
          resolve();
        };
        script.onerror = (error) => {
          console.error('Script failed to load:', src, error);
          reject(error);
        };
        document.head.appendChild(script);
      });
    };

    const setupMap = () => {
      const H = (window as any).H;
      if (!H) {
        console.error('HERE Maps H object not available');
        setIsLoading(false);
        return;
      }

      if (!mapRef.current) {
        console.error('Map container not available');
        setIsLoading(false);
        return;
      }

      try {
        console.log('Creating HERE Maps platform...');
        const platform = new H.service.Platform({
          'apikey': hereSettings.apiKey
        });

        const defaultMapTypes = platform.createDefaultMapTypes();
        
        console.log('Creating map instance...');
        const hereMap = new H.Map(
          mapRef.current,
          defaultMapTypes.vector.normal.map,
          {
            zoom: 9,
            center: { lat: 18.1096, lng: -77.2975 } // Jamaica center
          }
        );

        // Add behavior and UI
        const behavior = new H.mapevents.Behavior(new H.mapevents.MapEvents(hereMap));
        const ui = H.ui.UI.createDefault(hereMap, defaultMapTypes);

        setMap(hereMap);
        setMapLoaded(true);
        setIsLoading(false);
        
        console.log('HERE Maps initialized successfully!');
        
        toast({
          title: "Map Loaded",
          description: "HERE Maps is now ready",
        });
      } catch (error) {
        console.error('Error creating map:', error);
        setIsLoading(false);
        toast({
          title: "Map Setup Error",
          description: String(error),
          variant: "destructive"
        });
      }
    };

    initializeMap();
  }, [hereSettings?.apiKey, toast]);

  // Add stations to map when ready
  useEffect(() => {
    if (map && mapLoaded && stations.length > 0) {
      console.log('Adding stations to map:', stations.length);
      renderStationsAndOverlays();
    }
  }, [map, mapLoaded, stations, trafficData, weatherData, showTrafficShading, showWeatherSymbols]);

  const renderStationsAndOverlays = () => {
    if (!map) return;
    
    const H = (window as any).H;
    if (!H) return;

    console.log('Rendering stations and overlays...');

    // Clear existing markers
    map.removeObjects(map.getObjects());

    const group = new H.map.Group();
    let validStations = 0;

    stations.forEach((station) => {
      if (!station.latitude || !station.longitude) return;

      const lat = parseFloat(station.latitude);
      const lng = parseFloat(station.longitude);
      
      if (isNaN(lat) || isNaN(lng)) return;

      validStations++;
      const position = new H.geo.Point(lat, lng);

      // Create station marker
      const isSelected = selectedStation?.id === station.id;
      const markerIcon = new H.map.Icon(
        createMarkerSVG(station, isSelected), 
        { size: { w: 32, h: 32 } }
      );
      
      const marker = new H.map.Marker(position, { icon: markerIcon });
      
      // Add click handler
      marker.addEventListener('tap', () => {
        console.log('Station clicked:', station.name);
        onStationSelect?.(station);
      });
      
      group.addObject(marker);

      // Add traffic road shading if enabled
      if (showTrafficShading) {
        addTrafficRoads(group, station, position, H);
      }

      // Add weather symbol if enabled
      if (showWeatherSymbols) {
        addWeatherSymbol(group, station, position, H);
      }
    });

    map.addObject(group);
    console.log(`Added ${validStations} stations to map`);

    // Fit map to show all stations
    if (validStations > 0) {
      const bbox = group.getBoundingBox();
      if (bbox) {
        map.getViewPort().resize();
        map.setViewBounds(bbox, true);
      }
    }
  };

  const addTrafficRoads = (group: any, station: any, position: any, H: any) => {
    // Find traffic data for this station
    const stationTraffic = (trafficData as any)?.stations?.find((t: any) => 
      t.stationId === station.id || t.stationCode === station.stationCode
    );

    const trafficSeverity = stationTraffic?.nearbyTraffic?.severity || 'light';
    const color = TRAFFIC_COLORS[trafficSeverity as keyof typeof TRAFFIC_COLORS];

    // Create simple road segments around station
    const roadRadius = 0.003; // ~300m
    const numRoads = 4;

    for (let i = 0; i < numRoads; i++) {
      const angle = (i * Math.PI * 2) / numRoads;
      const roadPoints = [];
      
      // Create road segment
      for (let j = 0; j < 3; j++) {
        const distance = roadRadius * (0.3 + j * 0.3);
        const lat = position.lat + Math.cos(angle) * distance;
        const lng = position.lng + Math.sin(angle) * distance;
        roadPoints.push(lat, lng, 0);
      }

      const polyline = new H.map.Polyline(
        new H.geo.LineString(H.geo.LineString.fromLatLngArray(roadPoints)),
        {
          style: {
            strokeColor: color,
            lineWidth: 6, // Thick like Google Maps
            lineCap: 'round'
          }
        }
      );
      
      group.addObject(polyline);
    }
  };

  const addWeatherSymbol = (group: any, station: any, position: any, H: any) => {
    // Get weather for parish
    const parishWeather = (weatherData as any)?.parishes?.find((p: any) => 
      p.parishName === station.parish
    );

    if (!parishWeather) return;

    const weatherCondition = parishWeather.currentWeather?.condition || 'sunny';
    
    // Create weather marker offset from station
    const weatherPosition = new H.geo.Point(
      position.lat - 0.002,
      position.lng + 0.002
    );

    const weatherIcon = new H.map.Icon(
      createWeatherSVG(weatherCondition), 
      { size: { w: 20, h: 20 } }
    );
    
    const weatherMarker = new H.map.Marker(weatherPosition, { icon: weatherIcon });
    group.addObject(weatherMarker);
  };

  const createMarkerSVG = (station: any, isSelected: boolean) => {
    const size = isSelected ? 36 : 32;
    const color = isSelected ? '#3b82f6' : '#ef4444';
    
    return `
      <svg width="${size}" height="${size}" viewBox="0 0 32 32">
        <circle cx="16" cy="16" r="14" fill="${color}" stroke="white" stroke-width="2"/>
        <text x="16" y="20" text-anchor="middle" fill="white" font-size="9" font-weight="bold">
          ${station.stationCode?.substring(0, 3) || 'STN'}
        </text>
      </svg>
    `;
  };

  const createWeatherSVG = (condition: string) => {
    const colors = {
      'sunny': '#FFA726',
      'clear': '#FFA726',
      'rainy': '#42A5F5',
      'cloudy': '#90A4AE',
      'thunderstorm': '#AB47BC'
    };
    
    const color = colors[condition as keyof typeof colors] || '#FFA726';
    
    return `
      <svg width="20" height="20" viewBox="0 0 20 20">
        <circle cx="10" cy="10" r="9" fill="white" stroke="${color}" stroke-width="2"/>
        <circle cx="10" cy="10" r="5" fill="${color}"/>
        <text x="10" y="13" text-anchor="middle" fill="white" font-size="7" font-weight="bold">
          ${condition.charAt(0).toUpperCase()}
        </text>
      </svg>
    `;
  };

  const handleRefresh = async () => {
    await Promise.all([refetchTraffic(), refetchWeather()]);
    if (map && mapLoaded) {
      renderStationsAndOverlays();
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
              Jamaica Electoral Heat Map
              {mapLoaded && <span className="text-sm text-green-600">(Map Ready)</span>}
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

          {/* Traffic Legend */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Traffic Legend</h4>
              <div className="space-y-2">
                {Object.entries(TRAFFIC_COLORS).map(([severity, color]) => (
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
            
            <div>
              <h4 className="font-medium mb-2">Status</h4>
              <div className="space-y-1 text-sm">
                <p>HERE API: {hereSettings?.hasKey ? '✅ Connected' : '❌ Not Connected'}</p>
                <p>Stations: {stations.length} loaded</p>
                <p>Map: {mapLoaded ? '✅ Ready' : isLoading ? '⏳ Loading...' : '❌ Error'}</p>
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
                <p className="text-sm text-muted-foreground">Loading HERE Maps...</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {hereSettings?.apiKey ? 'API key loaded' : 'Waiting for API key...'}
                </p>
              </div>
            </div>
          )}
          <div 
            ref={mapRef} 
            style={{ 
              width: '100%', 
              height: '600px',
              display: isLoading ? 'none' : 'block',
              backgroundColor: '#f5f5f5'
            }}
          />
          {!isLoading && !mapLoaded && (
            <div className="flex items-center justify-center h-[600px] bg-red-50">
              <div className="text-center">
                <p className="text-red-600 font-medium">Map failed to load</p>
                <p className="text-sm text-red-500">Check console for error details</p>
              </div>
            </div>
          )}
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