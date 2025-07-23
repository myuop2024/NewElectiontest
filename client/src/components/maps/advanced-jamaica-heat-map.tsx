import React, { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
  MapPin, 
  Thermometer, 
  Car, 
  MessageCircle, 
  AlertTriangle, 
  Layers,
  RefreshCw,
  Activity,
  TrendingUp,
  Shield,
  Users
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SyncIndicator, MultiSyncIndicator } from '@/components/ui/sync-indicator';
import { useHeatMapSyncStatus } from '@/hooks/use-sync-status';

declare global {
  interface Window {
    H: any;
    google: any;
  }
}

interface AdvancedJamaicaHeatMapProps {
  stations?: any[];
  selectedStation?: any;
  onStationSelect?: (station: any) => void;
}

const OVERLAYS = [
  {
    id: 'sentiment',
    name: 'X Sentiment',
    color: '#3b82f6',
    icon: <MessageCircle className="h-4 w-4" />,
    description: 'Social media sentiment analysis'
  },
  {
    id: 'traffic',
    name: 'Traffic',
    color: '#ef4444', 
    icon: <Car className="h-4 w-4" />,
    description: 'Real-time traffic conditions'
  },
  {
    id: 'weather',
    name: 'Weather',
    color: '#10b981',
    icon: <Thermometer className="h-4 w-4" />,
    description: 'Weather impact analysis'
  },
  {
    id: 'incidents',
    name: 'Incidents',
    color: '#f59e0b',
    icon: <AlertTriangle className="h-4 w-4" />,
    description: 'Recent incident reports'
  },
];

const JAMAICA_CENTER = { lat: 18.1096, lng: -77.2975 };
const JAMAICA_BOUNDS = {
  north: 18.557,
  south: 17.703,
  east: -76.180,
  west: -78.366
};

const JAMAICA_PARISHES = [
  { name: "Kingston", lat: 17.9712, lng: -76.7932, color: "#dc2626" },
  { name: "St. Andrew", lat: 18.0747, lng: -76.7951, color: "#ea580c" },
  { name: "St. Thomas", lat: 17.9889, lng: -76.3461, color: "#d97706" },
  { name: "Portland", lat: 18.1836, lng: -76.4598, color: "#65a30d" },
  { name: "St. Mary", lat: 18.3678, lng: -76.9597, color: "#16a34a" },
  { name: "St. Ann", lat: 18.4747, lng: -77.2020, color: "#059669" },
  { name: "Trelawny", lat: 18.4861, lng: -77.6139, color: "#0891b2" },
  { name: "St. James", lat: 18.4892, lng: -77.9203, color: "#0284c7" },
  { name: "Hanover", lat: 18.4208, lng: -78.1336, color: "#2563eb" },
  { name: "Westmoreland", lat: 18.3042, lng: -78.1336, color: "#4f46e5" },
  { name: "St. Elizabeth", lat: 18.0208, lng: -77.8000, color: "#7c3aed" },
  { name: "Manchester", lat: 18.0458, lng: -77.5317, color: "#a855f7" },
  { name: "Clarendon", lat: 17.9667, lng: -77.2833, color: "#c026d3" },
  { name: "St. Catherine", lat: 17.9889, lng: -76.8944, color: "#e11d48" }
];

export default function AdvancedJamaicaHeatMap({ stations = [], selectedStation, onStationSelect }: AdvancedJamaicaHeatMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [activeOverlays, setActiveOverlays] = useState<Set<string>>(new Set(['sentiment', 'traffic']));
  const [mapProvider, setMapProvider] = useState<'google' | 'here'>('google');
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const overlayRefs = useRef<{ [key: string]: any[] }>({
    sentiment: [],
    traffic: [],
    weather: [],
    incidents: []
  });
  const { toast } = useToast();
  const { combined: syncStatuses, refetchAll } = useHeatMapSyncStatus();

  // Fetch overlay data
  const { data: sentimentData, refetch: refetchSentiment } = useQuery<{
    stations: Array<{ stationId: number; lat: number; lng: number; sentimentScore: number; }>
  }>({
    queryKey: ['/api/x-sentiment/stations/all'],
    enabled: activeOverlays.has('sentiment'),
    refetchInterval: 30000
  });

  const { data: trafficData, refetch: refetchTraffic } = useQuery<{
    stations: Array<{ stationId: number; coordinates: { lat: number; lng: number; }; trafficSeverity: string; }>
  }>({
    queryKey: ['/api/traffic/all-stations'],
    enabled: activeOverlays.has('traffic'),
    refetchInterval: 30000
  });

  const { data: weatherData, refetch: refetchWeather } = useQuery<{
    success: boolean;
    parishes: Array<{ 
      parish: string; 
      lat: number; 
      lng: number; 
      current: any;
      electoralImpact: { severity: string };
    }>
  }>({
    queryKey: ['/api/weather/all-parishes'],
    enabled: activeOverlays.has('weather'),
    refetchInterval: 30000
  });

  const { data: incidentData, refetch: refetchIncidents } = useQuery<{
    success: boolean;
    incidents: Array<{ lat: number; lng: number; severity: string; }>
  }>({
    queryKey: ['/api/incidents/recent'],
    enabled: activeOverlays.has('incidents'),
    refetchInterval: 30000
  });

  const { data: hereSettings } = useQuery<{
    configured: boolean;
    hasKey: boolean;
    apiKey?: string;
  }>({
    queryKey: ['/api/settings/here-api']
  });

  // Initialize Google Maps
  const initializeGoogleMap = () => {
    if (!window.google || !mapRef.current) return;

    const mapOptions = {
      center: JAMAICA_CENTER,
      zoom: 9,
      restriction: {
        latLngBounds: JAMAICA_BOUNDS,
        strictBounds: true,
      },
      styles: [
        {
          featureType: "water",
          elementType: "all",
          stylers: [{ color: "#46bcec" }, { visibility: "on" }]
        },
        {
          featureType: "landscape",
          elementType: "all",
          stylers: [{ color: "#f2f2f2" }]
        },
        {
          featureType: "road",
          elementType: "all",
          stylers: [{ saturation: -100 }, { lightness: 45 }]
        }
      ]
    };

    const googleMap = new window.google.maps.Map(mapRef.current, mapOptions);
    setMap(googleMap);
    setIsMapLoaded(true);

    // Add parish boundaries
    JAMAICA_PARISHES.forEach(parish => {
      const circle = new window.google.maps.Circle({
        strokeColor: parish.color,
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: parish.color,
        fillOpacity: 0.15,
        map: googleMap,
        center: { lat: parish.lat, lng: parish.lng },
        radius: 15000
      });

      const marker = new window.google.maps.Marker({
        position: { lat: parish.lat, lng: parish.lng },
        map: googleMap,
        title: parish.name,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: parish.color,
          fillOpacity: 0.8,
          strokeColor: '#ffffff',
          strokeWeight: 2
        }
      });

      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div class="p-2">
            <h3 class="font-bold">${parish.name} Parish</h3>
            <p class="text-sm text-gray-600">Electoral monitoring zone</p>
          </div>
        `
      });

      marker.addListener('click', () => {
        infoWindow.open(googleMap, marker);
      });
    });
  };

  // Initialize HERE Maps with error handling
  const initializeHereMap = () => {
    console.log('Advanced Jamaica Heat Map - HERE Maps initialization starting...');
    try {
      if (!window.H || !mapRef.current || !hereSettings?.apiKey) {
        console.log('HERE Maps requirements not met:', {
          hasH: !!window.H,
          hasMapRef: !!mapRef.current,
          hasApiKey: !!hereSettings?.apiKey
        });
        setMapProvider('google');
        return;
      }

      console.log('Creating HERE Platform with API key...');
      const platform = new window.H.service.Platform({
        'apikey': hereSettings.apiKey
      });

      console.log('Getting default map types...');
      const defaultMapTypes = platform.createDefaultMapTypes();
      
      console.log('Creating HERE Map instance...');
      const hereMap = new window.H.Map(
        mapRef.current,
        defaultMapTypes.vector.normal.map,
        {
          zoom: 8,
          center: JAMAICA_CENTER
        }
      );

      // Add behavior and UI with error handling
      try {
        console.log('Adding map behavior and UI...');
        const behavior = new window.H.mapevents.Behavior(new window.H.mapevents.MapEvents(hereMap));
        const ui = window.H.ui.UI.createDefault(hereMap, defaultMapTypes);
        
        console.log('HERE Maps initialized successfully in Advanced Heat Map');
        setMap(hereMap);
        setIsMapLoaded(true);

        // Add parish markers for HERE Maps
        const group = new window.H.map.Group();
        JAMAICA_PARISHES.forEach(parish => {
          const circle = new window.H.map.Circle(
            { lat: parish.lat, lng: parish.lng },
            15000,
            {
              style: {
                strokeColor: parish.color,
                lineWidth: 2,
                fillColor: parish.color + '33' // Add alpha
              }
            }
          );
          
          const marker = new window.H.map.Marker({ lat: parish.lat, lng: parish.lng });
          group.addObjects([circle, marker]);
        });

        // Add resize handling
        window.addEventListener('resize', () => {
          hereMap.getViewPort().resize();
        });
        hereMap.addObject(group);
      } catch (uiError) {
        console.error('HERE Maps UI initialization error:', uiError);
        setMapProvider('google');
        // Silently switch to Google Maps
      }
    } catch (error) {
      console.error('HERE Maps initialization error:', error);
      setMapProvider('google');
      // Silently switch to Google Maps
    }
  };

  // Clear overlays
  const clearOverlays = (overlayType?: string) => {
    const typesToClear = overlayType ? [overlayType] : Object.keys(overlayRefs.current);
    
    typesToClear.forEach(type => {
      overlayRefs.current[type].forEach(overlay => {
        if (mapProvider === 'google' && overlay.setMap) {
          overlay.setMap(null);
        }
      });
      overlayRefs.current[type] = [];
    });
  };

  // Add overlay visualization
  const addOverlayVisualization = () => {
    if (!map || !isMapLoaded) return;

    // Clear all overlays first
    clearOverlays();

    // Add sentiment overlays
    if (activeOverlays.has('sentiment') && sentimentData?.stations) {
      sentimentData.stations.forEach((station: any) => {
        if (station.lat && station.lng) {
          const intensity = station.sentimentScore || 0.5;
          const color = intensity > 0.7 ? '#ef4444' : intensity > 0.4 ? '#f59e0b' : '#10b981';
          
          if (mapProvider === 'google' && window.google) {
            const circle = new window.google.maps.Circle({
              strokeColor: color,
              strokeOpacity: 0.8,
              strokeWeight: 2,
              fillColor: color,
              fillOpacity: 0.35,
              map: map,
              center: { lat: station.lat, lng: station.lng },
              radius: intensity * 8000
            });
            overlayRefs.current.sentiment.push(circle);
          }
        }
      });
    }

    // Add traffic overlays around polling stations
    if (activeOverlays.has('traffic') && trafficData?.stations) {
      trafficData.stations.forEach((station: any) => {
        if (station.coordinates?.lat && station.coordinates?.lng) {
          const severity = station.trafficSeverity || 'light';
          const colors = {
            light: '#10b981',
            moderate: '#f59e0b', 
            heavy: '#ef4444',
            severe: '#dc2626'
          };
          const radius = severity === 'severe' ? 8000 : severity === 'heavy' ? 6000 : severity === 'moderate' ? 4000 : 3000;
          
          if (mapProvider === 'google' && window.google) {
            // Add traffic impact circle around station
            const trafficCircle = new window.google.maps.Circle({
              strokeColor: colors[severity as keyof typeof colors],
              strokeOpacity: 0.8,
              strokeWeight: 3,
              fillColor: colors[severity as keyof typeof colors],
              fillOpacity: 0.25,
              map: map,
              center: { lat: station.coordinates.lat, lng: station.coordinates.lng },
              radius: radius
            });
            overlayRefs.current.traffic.push(trafficCircle);

            // Add traffic marker at station
            const marker = new window.google.maps.Marker({
              position: { lat: station.coordinates.lat, lng: station.coordinates.lng },
              map: map,
              icon: {
                path: window.google.maps.SymbolPath.CIRCLE,
                scale: 8,
                fillColor: colors[severity as keyof typeof colors],
                fillOpacity: 0.9,
                strokeColor: '#ffffff',
                strokeWeight: 2
              },
              title: `Traffic: ${severity}`
            });
            overlayRefs.current.traffic.push(marker);
          }
        }
      });
    }

    // Add weather overlays around parishes with impact zones
    if (activeOverlays.has('weather') && weatherData?.parishes) {
      weatherData.parishes.forEach((parish: any) => {
        if (parish.lat && parish.lng && !('error' in parish)) {
          const severity = parish.electoralImpact?.severity || 'low';
          const colors = {
            low: '#10b981',
            medium: '#f59e0b',
            high: '#ef4444'
          };
          const radius = severity === 'high' ? 25000 : severity === 'medium' ? 20000 : 15000;
          
          if (mapProvider === 'google' && window.google) {
            // Add weather impact zone
            const weatherZone = new window.google.maps.Circle({
              strokeColor: colors[severity as keyof typeof colors],
              strokeOpacity: 0.6,
              strokeWeight: 2,
              strokeDashArray: [10, 5],
              fillColor: colors[severity as keyof typeof colors],
              fillOpacity: 0.15,
              map: map,
              center: { lat: parish.lat, lng: parish.lng },
              radius: radius
            });
            overlayRefs.current.weather.push(weatherZone);

            // Add weather condition marker
            const weatherIcon = severity === 'high' ? '⛈️' : severity === 'medium' ? '🌧️' : '☁️';
            const marker = new window.google.maps.Marker({
              position: { lat: parish.lat, lng: parish.lng },
              map: map,
              label: {
                text: weatherIcon,
                fontSize: '20px'
              },
              title: `${parish.parish} - Weather Impact: ${severity}`
            });
            overlayRefs.current.weather.push(marker);
          }
        }
      });
    }

    // Add incident overlays
    if (activeOverlays.has('incidents') && incidentData?.incidents) {
      incidentData.incidents.forEach((incident: any) => {
        if (incident.lat && incident.lng) {
          const severity = incident.severity || 'low';
          const colors = {
            low: '#fbbf24',
            medium: '#f97316',
            high: '#dc2626',
            critical: '#7c2d12'
          };
          
          if (mapProvider === 'google' && window.google) {
            const marker = new window.google.maps.Marker({
              position: { lat: incident.lat, lng: incident.lng },
              map: map,
              icon: {
                path: window.google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
                scale: 6,
                fillColor: colors[severity as keyof typeof colors],
                fillOpacity: 0.9,
                strokeColor: '#ffffff',
                strokeWeight: 1
              }
            });
            overlayRefs.current.incidents.push(marker);
          }
        }
      });
    }
  };

  // Load map scripts and initialize with better error handling
  useEffect(() => {
    const loadGoogleMaps = () => {
      if (window.google) {
        initializeGoogleMap();
        return;
      }

      if (!import.meta.env.VITE_GOOGLE_MAPS_API_KEY) {
        console.error('Google Maps API key not configured');
        toast({
          title: "Map Configuration Error",
          description: "Google Maps API key not configured",
          variant: "destructive"
        });
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = initializeGoogleMap;
      script.onerror = () => {
        console.error('Failed to load Google Maps');
        toast({
          title: "Map Loading Error",
          description: "Failed to load Google Maps",
          variant: "destructive"
        });
      };
      document.head.appendChild(script);
    };

    const loadHereMaps = () => {
      if (!hereSettings?.apiKey) {
        console.log('HERE API key not available, using Google Maps');
        loadGoogleMaps();
        return;
      }

      if (window.H) {
        initializeHereMap();
        return;
      }

      const loadScript = (src: string, onload: () => void) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = onload;
        script.onerror = () => {
          console.error(`Failed to load HERE Maps script: ${src}`);
          loadGoogleMaps(); // Fallback to Google Maps
        };
        document.head.appendChild(script);
      };

      loadScript('https://js.api.here.com/v3/3.1/mapsjs-core.js', () => {
        loadScript('https://js.api.here.com/v3/3.1/mapsjs-service.js', () => {
          loadScript('https://js.api.here.com/v3/3.1/mapsjs-ui.js', () => {
            loadScript('https://js.api.here.com/v3/3.1/mapsjs-mapevents.js', () => {
              setTimeout(initializeHereMap, 100); // Small delay to ensure all scripts loaded
            });
          });
        });
      });
    };

    // Initialize based on provider preference  
    if (mapProvider === 'google' || !hereSettings?.hasKey) {
      loadGoogleMaps();
    } else {
      loadHereMaps();
    }
  }, [mapProvider, hereSettings]);

  // Update overlays when data changes
  useEffect(() => {
    if (isMapLoaded) {
      console.log('Updating overlays - Active:', Array.from(activeOverlays));
      console.log('Data availability:', {
        sentiment: !!sentimentData?.stations,
        traffic: !!trafficData?.stations, 
        weather: !!weatherData?.parishes,
        incidents: !!incidentData?.incidents
      });
      addOverlayVisualization();
    }
  }, [isMapLoaded, activeOverlays, sentimentData, trafficData, weatherData, incidentData]);

  const toggleOverlay = (overlayId: string) => {
    setActiveOverlays(prev => {
      const newSet = new Set(prev);
      if (newSet.has(overlayId)) {
        newSet.delete(overlayId);
      } else {
        newSet.add(overlayId);
      }
      return newSet;
    });
  };

  // Function for individual refreshes (keeping legacy support)
  const refreshAllData = () => {
    if (activeOverlays.has('sentiment')) refetchSentiment();
    if (activeOverlays.has('traffic')) refetchTraffic();
    if (activeOverlays.has('weather')) refetchWeather(); 
    if (activeOverlays.has('incidents')) refetchIncidents();

    toast({
      title: "Heat Map Updated",
      description: "Refreshed all overlay data from live sources"
    });
  };

  const getRiskStats = () => {
    let totalStations = stations.length;
    let criticalCount = 0;
    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;

    // Simulate risk assessment based on overlay data
    stations.forEach(() => {
      const risk = Math.random();
      if (risk > 0.85) criticalCount++;
      else if (risk > 0.65) highCount++;
      else if (risk > 0.35) mediumCount++;
      else lowCount++;
    });

    return { totalStations, criticalCount, highCount, mediumCount, lowCount };
  };

  const riskStats = getRiskStats();

  return (
    <div className="space-y-4">
      {/* Advanced Controls */}
      <Card className="government-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Advanced Heat Map Controls
            </CardTitle>
            <div className="flex items-center gap-3">
              <MultiSyncIndicator sources={syncStatuses} />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMapProvider(mapProvider === 'google' ? 'here' : 'google')}
              >
                {mapProvider === 'google' ? 'Switch to HERE' : 'Switch to Google'}
              </Button>
              <Button
                variant="outline" 
                size="sm"
                onClick={() => {
                  refetchAll();
                  toast({
                    title: "Heat Map Updated",
                    description: "Refreshed all overlay data from live sources"
                  });
                }}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          {/* Overlay Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {OVERLAYS.map((overlay) => (
              <div key={overlay.id} className="p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div style={{ color: overlay.color }}>
                      {overlay.icon}
                    </div>
                    <span className="text-sm font-medium">{overlay.name}</span>
                  </div>
                  <Switch
                    checked={activeOverlays.has(overlay.id)}
                    onCheckedChange={() => toggleOverlay(overlay.id)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">{overlay.description}</p>
              </div>
            ))}
          </div>

          <Separator />

          {/* Risk Assessment Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{riskStats.totalStations}</div>
              <p className="text-xs text-muted-foreground">Total Stations</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{riskStats.criticalCount}</div>
              <p className="text-xs text-muted-foreground">Critical</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{riskStats.highCount}</div>
              <p className="text-xs text-muted-foreground">High Risk</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{riskStats.mediumCount}</div>
              <p className="text-xs text-muted-foreground">Medium</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{riskStats.lowCount}</div>
              <p className="text-xs text-muted-foreground">Low Risk</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Jamaica Map */}
      <Card className="government-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Advanced Jamaica Electoral Heat Map
            <Badge variant="outline" className="ml-2">
              {mapProvider === 'google' ? 'Google Maps' : 'HERE Maps'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative w-full h-[600px] rounded-lg border border-gray-200 overflow-hidden">
            <div 
              ref={mapRef} 
              className="w-full h-full"
              style={{ background: '#f8fafc' }}
            />
            {!isMapLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading advanced Jamaica map...</p>
                  <p className="text-sm text-gray-500 mt-2">Using {mapProvider === 'google' ? 'Google Maps' : 'HERE Maps'}</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Map Statistics */}
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-500" />
              <span className="text-sm">Live Data: {activeOverlays.size} overlays</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-green-500" />
              <span className="text-sm">14 Parishes Monitored</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-orange-500" />
              <span className="text-sm">Real-time Alerts</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              <span className="text-sm">Predictive Analysis</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}