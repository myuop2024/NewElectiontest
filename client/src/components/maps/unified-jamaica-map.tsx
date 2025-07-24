import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { 
  Layers, 
  RefreshCw, 
  AlertTriangle, 
  Cloud, 
  Car, 
  MessageSquare,
  MapPin
} from 'lucide-react';
// import { MultiSyncIndicator } from '@/components/ui/multi-sync-indicator';

interface UnifiedJamaicaMapProps {
  enabledOverlays?: string[];
  showControls?: boolean;
  onStationSelect?: (station: any) => void;
  selectedStation?: any;
  height?: string;
  showLegend?: boolean;
  className?: string;
}

export default function UnifiedJamaicaMap({
  enabledOverlays = ['traffic', 'weather', 'sentiment', 'incidents'],
  showControls = true,
  onStationSelect,
  selectedStation,
  height = '600px',
  showLegend = true,
  className = ''
}: UnifiedJamaicaMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [mapProvider, setMapProvider] = useState<'here' | 'google'>('here');
  const [activeOverlays, setActiveOverlays] = useState<Set<string>>(new Set(enabledOverlays));
  const overlayRefs = useRef<{ [key: string]: any[] }>({
    traffic: [],
    weather: [],
    sentiment: [],
    incidents: []
  });

  // Fetch HERE API settings
  const { data: hereSettings } = useQuery<{configured: boolean; hasKey: boolean; apiKey?: string}>({
    queryKey: ['/api/settings/here-api'],
    retry: 1
  });

  // Fetch all polling stations
  const { data: stations = [], refetch: refetchStations } = useQuery<any[]>({
    queryKey: ['/api/polling-stations']
  });

  // Fetch overlay data
  const { data: trafficData, isLoading: trafficLoading, refetch: refetchTraffic } = useQuery<{stations: any[]}>({
    queryKey: ['/api/traffic/all-stations'],
    enabled: activeOverlays.has('traffic'),
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const { data: weatherData, isLoading: weatherLoading, refetch: refetchWeather } = useQuery<{parishes: any[]}>({
    queryKey: ['/api/weather/all-parishes'],
    enabled: activeOverlays.has('weather'),
    refetchInterval: 60000 // Refresh every minute
  });

  const { data: sentimentData, isLoading: sentimentLoading, refetch: refetchSentiment } = useQuery<any[]>({
    queryKey: ['/api/x-sentiment/stations/all'],
    enabled: activeOverlays.has('sentiment'),
    refetchInterval: 30000
  });

  const { data: incidentsData, isLoading: incidentsLoading, refetch: refetchIncidents } = useQuery<{incidents: any[]}>({
    queryKey: ['/api/incidents/recent'],
    enabled: activeOverlays.has('incidents'),
    refetchInterval: 30000
  });

  // Load HERE Maps scripts
  const loadHereScripts = async () => {
    const scripts = [
      'https://js.api.here.com/v3/3.1/mapsjs-core.js',
      'https://js.api.here.com/v3/3.1/mapsjs-service.js',
      'https://js.api.here.com/v3/3.1/mapsjs-ui.js',
      'https://js.api.here.com/v3/3.1/mapsjs-mapevents.js'
    ];

    // Load CSS
    if (!document.querySelector('link[href*="mapsjs-ui.css"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://js.api.here.com/v3/3.1/mapsjs-ui.css';
      document.head.appendChild(link);
    }

    // Load scripts sequentially
    for (const src of scripts) {
      if (!document.querySelector(`script[src="${src}"]`)) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = src;
          script.onload = () => resolve(undefined);
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }
    }

    // Wait for H to be available
    await new Promise(resolve => {
      const checkH = () => {
        if ((window as any).H) {
          resolve(undefined);
        } else {
          setTimeout(checkH, 100);
        }
      };
      checkH();
    });
  };

  // Initialize map
  useEffect(() => {
    if (!mapRef.current) return;

    const initializeMap = async () => {
      console.log('Initializing map...', { hereSettings, hasWindow: !!window });
      
      // Always try to load Google Maps first for better reliability
      try {
        console.log('Attempting to load Google Maps...');
        await loadGoogleMaps();
        console.log('Google Maps loaded successfully');
        return;
      } catch (error) {
        console.error('Failed to load Google Maps:', error);
      }
      
      // Try HERE Maps if Google Maps fails and API key is available
      if (hereSettings?.hasKey) {
        try {
          console.log('Attempting to load HERE Maps...');
          await loadHereScripts();
          await loadHereMaps();
          console.log('HERE Maps loaded successfully');
          return;
        } catch (error) {
          console.error('Failed to load HERE Maps:', error);
        }
      }
      
      // If both fail, show error and try simple fallback
      console.warn('No map provider available. Attempting to create simple map fallback...');
      createFallbackMap();
    };

    initializeMap();

    return () => {
      if (map) {
        if (mapProvider === 'here' && map.dispose) {
          map.dispose();
        }
      }
    };
  }, [hereSettings]);

  // Create a simple fallback map when both providers fail
  const createFallbackMap = () => {
    if (!mapRef.current) return;
    
    // Create a simple placeholder map interface
    const fallbackElement = document.createElement('div');
    fallbackElement.className = 'w-full h-full bg-gray-100 flex items-center justify-center text-center p-4';
    fallbackElement.innerHTML = `
      <div>
        <div class="text-lg font-semibold mb-2">Jamaica Electoral Map</div>
        <div class="text-sm text-gray-600 mb-4">Loading map provider...</div>
        <button onclick="window.location.reload()" class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
          Reload Map
        </button>
      </div>
    `;
    
    // Clear existing content and add fallback
    mapRef.current.innerHTML = '';
    mapRef.current.appendChild(fallbackElement);
    
    // Try to reload after a delay
    setTimeout(() => {
      window.location.reload();
    }, 5000);
  };

  // Load HERE Maps
  const loadHereMaps = async () => {
    const H = (window as any).H;
    if (!H || !mapRef.current || !hereSettings?.apiKey) {
      throw new Error('HERE Maps requirements not met');
    }

    const platform = new H.service.Platform({
      apikey: hereSettings.apiKey
    });

    const defaultLayers = platform.createDefaultLayers();
    const hereMap = new H.Map(
      mapRef.current,
      defaultLayers.vector.normal.map,
      {
        zoom: 9,
        center: { lat: 18.1096, lng: -77.2975 } // Jamaica center
      }
    );

    const behavior = new H.mapevents.Behavior(new H.mapevents.MapEvents(hereMap));
    const ui = H.ui.UI.createDefault(hereMap, defaultLayers);

    // Add resize handling
    window.addEventListener('resize', () => {
      hereMap.getViewPort().resize();
    });

    setMap(hereMap);
    setMapProvider('here');
  };

  // Load Google Maps as fallback
  const loadGoogleMaps = async () => {
    if (!mapRef.current) return;

    try {
      // Check if Google Maps is already loaded
      if (!(window as any).google?.maps) {
        console.warn('Google Maps not available, attempting to load Google Maps script');
        
        // Try to load Google Maps dynamically
        await loadGoogleMapsScript();
        
        // Wait a moment for the script to initialize
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check again after loading
        if (!(window as any).google?.maps) {
          console.error('Google Maps failed to load after script injection');
          return;
        }
      }

      const googleMap = new (window as any).google.maps.Map(mapRef.current, {
        zoom: 9,
        center: { lat: 18.1096, lng: -77.2975 },
        mapTypeId: 'roadmap'
      });

      setMap(googleMap);
      setMapProvider('google');
    } catch (error) {
      console.error('Failed to initialize Google Maps:', error);
    }
  };

  // Load Google Maps script dynamically
  const loadGoogleMapsScript = async () => {
    return new Promise<void>((resolve, reject) => {
      // Check if script is already loaded
      if (document.querySelector('script[src*="maps.googleapis.com"]')) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      // Use import.meta.env for browser environment
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyBvOkBwgGlbUiuS-oSim-sm_fXzyHx65Y8'; // Fallback key
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        console.log('Google Maps script loaded successfully');
        resolve();
      };
      
      script.onerror = () => {
        console.error('Failed to load Google Maps script');
        reject(new Error('Failed to load Google Maps script'));
      };
      
      document.head.appendChild(script);
    });
  };

  // Update overlays when data changes
  useEffect(() => {
    if (!map || !stations.length) return;

    clearAllOverlays();
    renderStations();
    renderOverlays();
  }, [map, stations, trafficData, weatherData, sentimentData, incidentsData, activeOverlays]);

  // Clear all overlays
  const clearAllOverlays = () => {
    Object.keys(overlayRefs.current).forEach(type => {
      overlayRefs.current[type].forEach(overlay => {
        if (mapProvider === 'google' && overlay.setMap) {
          overlay.setMap(null);
        } else if (mapProvider === 'here' && map && overlay.dispose) {
          map.removeObject(overlay);
        }
      });
      overlayRefs.current[type] = [];
    });
  };

  // Render polling stations
  const renderStations = () => {
    if (!map) return;

    stations.forEach((station: any) => {
      // Validate coordinates before processing
      const lat = parseFloat(station.latitude);
      const lng = parseFloat(station.longitude);
      
      if (isNaN(lat) || isNaN(lng) || !station.latitude || !station.longitude) {
        console.warn('Invalid coordinates for station:', station.id, 'lat:', station.latitude, 'lng:', station.longitude);
        return;
      }

      const position = { lat, lng };

      if (mapProvider === 'google') {
        const marker = new (window as any).google.maps.Marker({
          position,
          map,
          title: station.name,
          icon: {
            path: (window as any).google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#3b82f6',
            fillOpacity: 0.9,
            strokeColor: '#ffffff',
            strokeWeight: 2
          }
        });

        marker.addListener('click', () => {
          if (onStationSelect) onStationSelect(station);
        });

        overlayRefs.current.incidents.push(marker);
      } else if (mapProvider === 'here') {
        const H = (window as any).H;
        const marker = new H.map.Marker(position);
        
        marker.addEventListener('tap', () => {
          if (onStationSelect) onStationSelect(station);
        });

        map.addObject(marker);
        overlayRefs.current.incidents.push(marker);
      }
    });
  };

  // Render overlays based on active selections
  const renderOverlays = () => {
    if (!map) return;

    // Traffic overlays
    if (activeOverlays.has('traffic') && trafficData?.stations) {
      trafficData.stations.forEach((stationTraffic: any) => {
        const station = stations.find((s: any) => s.id === stationTraffic.stationId);
        if (!station?.latitude || !station?.longitude) return;

        const lat = parseFloat(station.latitude);
        const lng = parseFloat(station.longitude);
        
        if (isNaN(lat) || isNaN(lng)) {
          console.warn('Invalid traffic overlay coordinates for station:', station.id);
          return;
        }

        const position = { lat, lng };

        const color = getTrafficColor(stationTraffic.analysis?.overallSeverity || 'light');
        const radius = getTrafficRadius(stationTraffic.analysis?.overallSeverity || 'light');

        if (mapProvider === 'google') {
          const circle = new (window as any).google.maps.Circle({
            strokeColor: color,
            strokeOpacity: 0.8,
            strokeWeight: 2,
            fillColor: color,
            fillOpacity: 0.7,
            map,
            center: position,
            radius
          });
          overlayRefs.current.traffic.push(circle);
        } else if (mapProvider === 'here') {
          const H = (window as any).H;
          const circle = new H.map.Circle(position, radius, {
            style: {
              strokeColor: color,
              lineWidth: 2,
              fillColor: color + 'B3'
            }
          });
          map.addObject(circle);
          overlayRefs.current.traffic.push(circle);
        }
      });
    }

    // Weather overlays
    if (activeOverlays.has('weather') && weatherData?.parishes) {
      // Parish coordinate mapping for Jamaica
      const parishCoordinates: { [key: string]: { lat: number; lng: number } } = {
        'Kingston': { lat: 17.9970, lng: -76.7936 },
        'St. Andrew': { lat: 18.0747, lng: -76.7936 },
        'St. Thomas': { lat: 17.9518, lng: -76.3421 },
        'Portland': { lat: 18.1745, lng: -76.4591 },
        'St. Mary': { lat: 18.3678, lng: -76.9602 },
        'St. Ann': { lat: 18.4647, lng: -77.1873 },
        'Trelawny': { lat: 18.3811, lng: -77.5747 },
        'St. James': { lat: 18.4762, lng: -77.9218 },
        'Hanover': { lat: 18.4212, lng: -78.1336 },
        'Westmoreland': { lat: 18.2433, lng: -78.1336 },
        'St. Elizabeth': { lat: 18.0292, lng: -77.7422 },
        'Manchester': { lat: 18.0542, lng: -77.5114 },
        'Clarendon': { lat: 17.9402, lng: -77.2419 },
        'St. Catherine': { lat: 17.9970, lng: -76.9602 }
      };

      weatherData.parishes.forEach((parish: any) => {
        const coords = parishCoordinates[parish.parish];
        if (!coords) {
          console.warn('No coordinates found for parish:', parish.parish);
          return;
        }
        
        const lat = coords.lat;
        const lng = coords.lng;

        const position = { lat, lng };
        const color = getWeatherColor(parish.weather?.electoralImpact || 'low');
        const radius = 20000; // 20km radius for weather

        if (mapProvider === 'google') {
          const circle = new (window as any).google.maps.Circle({
            strokeColor: color,
            strokeOpacity: 0.6,
            strokeWeight: 2,
            fillColor: color,
            fillOpacity: 0.08,
            map,
            center: position,
            radius
          });
          overlayRefs.current.weather.push(circle);
        } else if (mapProvider === 'here') {
          const H = (window as any).H;
          const circle = new H.map.Circle(position, radius, {
            style: {
              strokeColor: color,
              lineWidth: 2,
              fillColor: color + '14'
            }
          });
          map.addObject(circle);
          overlayRefs.current.weather.push(circle);
        }
      });
    }

    // Sentiment overlays
    if (activeOverlays.has('sentiment') && sentimentData) {
      stations.forEach((station: any) => {
        if (!station.latitude || !station.longitude) return;

        const stationSentiment = sentimentData?.find((s: any) => s.stationId === station.id);
        if (!stationSentiment?.sentimentAnalysis) return;

        const lat = parseFloat(station.latitude);
        const lng = parseFloat(station.longitude);
        
        if (isNaN(lat) || isNaN(lng)) {
          console.warn('Invalid sentiment overlay coordinates for station:', station.id);
          return;
        }

        const position = { lat, lng };

        const color = getSentimentColor(stationSentiment.sentimentAnalysis.riskLevel);
        const radius = getSentimentRadius(stationSentiment.sentimentAnalysis.riskLevel);

        if (mapProvider === 'google') {
          const circle = new (window as any).google.maps.Circle({
            strokeColor: color,
            strokeOpacity: 0.7,
            strokeWeight: 2,
            fillColor: color,
            fillOpacity: 0.1,
            map,
            center: position,
            radius
          });
          overlayRefs.current.sentiment.push(circle);
        } else if (mapProvider === 'here') {
          const H = (window as any).H;
          const circle = new H.map.Circle(position, radius, {
            style: {
              strokeColor: color,
              lineWidth: 2,
              fillColor: color + '1A'
            }
          });
          map.addObject(circle);
          overlayRefs.current.sentiment.push(circle);
        }
      });
    }

    // Incident markers
    if (activeOverlays.has('incidents') && incidentsData?.incidents) {
      incidentsData.incidents.forEach((incident: any) => {
        if (!incident.latitude || !incident.longitude) return;

        const position = { 
          lat: parseFloat(incident.latitude), 
          lng: parseFloat(incident.longitude) 
        };

        if (mapProvider === 'google') {
          const marker = new (window as any).google.maps.Marker({
            position,
            map,
            title: incident.title,
            icon: {
              path: 'M 0,-24 L -12,0 L 12,0 Z',
              fillColor: getIncidentColor(incident.severity),
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2,
              scale: 1
            }
          });
          overlayRefs.current.incidents.push(marker);
        } else if (mapProvider === 'here') {
          const H = (window as any).H;
          const svgMarkup = `
            <svg width="24" height="24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2 L22 20 L2 20 Z" fill="${getIncidentColor(incident.severity)}" stroke="#fff" stroke-width="2"/>
              <text x="12" y="16" text-anchor="middle" font-size="12" fill="white" font-weight="bold">!</text>
            </svg>
          `;
          const icon = new H.map.Icon(`data:image/svg+xml,${encodeURIComponent(svgMarkup)}`, 
            { size: { w: 24, h: 24 } }
          );
          const marker = new H.map.Marker(position, { icon });
          map.addObject(marker);
          overlayRefs.current.incidents.push(marker);
        }
      });
    }
  };

  // Helper functions for colors and sizes
  const getTrafficColor = (severity: string) => {
    switch (severity) {
      case 'severe': return '#dc2626';
      case 'heavy': return '#ef4444';
      case 'moderate': return '#f59e0b';
      default: return '#10b981';
    }
  };

  const getTrafficRadius = (severity: string) => {
    switch (severity) {
      case 'severe': return 8000;
      case 'heavy': return 6000;
      case 'moderate': return 4000;
      default: return 3000;
    }
  };

  const getWeatherColor = (impact: string) => {
    switch (impact) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      default: return '#10b981';
    }
  };

  const getSentimentColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical': return '#dc2626';
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      default: return '#10b981';
    }
  };

  const getSentimentRadius = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical': return 10000;
      case 'high': return 7000;
      case 'medium': return 5000;
      default: return 3000;
    }
  };

  const getIncidentColor = (severity: string) => {
    switch (severity) {
      case 'high': return '#dc2626';
      case 'medium': return '#f59e0b';
      default: return '#fbbf24';
    }
  };

  // Toggle overlay
  const toggleOverlay = (type: string) => {
    const newOverlays = new Set(activeOverlays);
    if (newOverlays.has(type)) {
      newOverlays.delete(type);
    } else {
      newOverlays.add(type);
    }
    setActiveOverlays(newOverlays);
  };

  // Refresh all data
  const refreshAllData = () => {
    refetchStations();
    if (activeOverlays.has('traffic')) refetchTraffic();
    if (activeOverlays.has('weather')) refetchWeather();
    if (activeOverlays.has('sentiment')) refetchSentiment();
    if (activeOverlays.has('incidents')) refetchIncidents();
    
    toast({
      title: "Data Refreshed",
      description: "All map data has been updated",
    });
  };

  const isLoading = trafficLoading || weatherLoading || sentimentLoading || incidentsLoading;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Controls */}
      {showControls && (
        <Card className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              <Button
                variant={activeOverlays.has('traffic') ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleOverlay('traffic')}
                className="flex items-center gap-2"
              >
                <Car className="h-4 w-4" />
                Traffic
              </Button>
              <Button
                variant={activeOverlays.has('weather') ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleOverlay('weather')}
                className="flex items-center gap-2"
              >
                <Cloud className="h-4 w-4" />
                Weather
              </Button>
              <Button
                variant={activeOverlays.has('sentiment') ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleOverlay('sentiment')}
                className="flex items-center gap-2"
              >
                <MessageSquare className="h-4 w-4" />
                X Sentiment
              </Button>
              <Button
                variant={activeOverlays.has('incidents') ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleOverlay('incidents')}
                className="flex items-center gap-2"
              >
                <AlertTriangle className="h-4 w-4" />
                Incidents
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              {isLoading && (
                <span className="text-sm text-muted-foreground">Loading data...</span>
              )}
              <Button 
                variant="outline" 
                size="sm"
                onClick={refreshAllData}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Map Container */}
      <Card className="overflow-hidden">
        <div 
          ref={mapRef} 
          style={{ height }}
          className="w-full"
        />
      </Card>

      {/* Legend */}
      {showLegend && (
        <Card className="p-4">
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Map Legend
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Traffic Legend */}
              {activeOverlays.has('traffic') && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Traffic Conditions</h4>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-600" />
                      <span className="text-xs">Severe (8km)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      <span className="text-xs">Heavy (6km)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-amber-500" />
                      <span className="text-xs">Moderate (4km)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-emerald-500" />
                      <span className="text-xs">Light (3km)</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Weather Legend */}
              {activeOverlays.has('weather') && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Weather Impact</h4>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      <span className="text-xs">High Impact</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-amber-500" />
                      <span className="text-xs">Medium Impact</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-emerald-500" />
                      <span className="text-xs">Low Impact</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Sentiment Legend */}
              {activeOverlays.has('sentiment') && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">X Sentiment Risk</h4>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-600" />
                      <span className="text-xs">Critical (10km)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      <span className="text-xs">High (7km)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-amber-500" />
                      <span className="text-xs">Medium (5km)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-emerald-500" />
                      <span className="text-xs">Low (3km)</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Incidents Legend */}
              {activeOverlays.has('incidents') && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Incidents</h4>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <AlertTriangle className="h-4 w-4 text-red-600 fill-red-600" />
                      </div>
                      <span className="text-xs">High Severity</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <AlertTriangle className="h-4 w-4 text-amber-500 fill-amber-500" />
                      </div>
                      <span className="text-xs">Medium Severity</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <AlertTriangle className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                      </div>
                      <span className="text-xs">Low Severity</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Station info */}
            <div className="pt-2 border-t">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-blue-600" />
                <span className="text-xs text-muted-foreground">
                  {stations.length} polling stations • {mapProvider === 'here' ? 'HERE Maps' : 'Google Maps'}
                </span>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}