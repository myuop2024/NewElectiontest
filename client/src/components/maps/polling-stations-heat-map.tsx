import React, { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  MapPin, 
  Thermometer, 
  Car, 
  MessageCircle, 
  AlertTriangle, 
  Layers,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface HeatMapProps {
  stations: any[];
  selectedStation?: any;
  onStationSelect?: (station: any) => void;
  heatMapData: any[];
  isLoading: boolean;
  onRefresh: () => void;
}

const OVERLAYS = [
  {
    id: 'sentiment',
    name: 'X Sentiment',
    color: '#3b82f6',
    icon: <MessageCircle className="h-4 w-4" />,
  },
  {
    id: 'traffic',
    name: 'Traffic',
    color: '#ef4444',
    icon: <Car className="h-4 w-4" />,
  },
  {
    id: 'weather',
    name: 'Weather',
    color: '#10b981',
    icon: <Thermometer className="h-4 w-4" />,
  },
  {
    id: 'incidents',
    name: 'Incidents',
    color: '#f59e0b',
    icon: <AlertTriangle className="h-4 w-4" />,
  },
];

export default function PollingStationsHeatMap({ stations, selectedStation, onStationSelect, heatMapData, isLoading, onRefresh }: HeatMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [activeOverlays, setActiveOverlays] = useState<Set<string>>(new Set(['sentiment']));
  const [mapProvider, setMapProvider] = useState<'here' | 'google'>('here');
  const [mapLoadError, setMapLoadError] = useState(false);
  const { toast } = useToast();
  const { data: hereSettings } = useQuery<{
    configured: boolean;
    hasKey: boolean;
    apiKey?: string;
  }>({
    queryKey: ['/api/settings/here-api'],
  });

  // Initialize HERE Maps
  useEffect(() => {
    if (!mapRef.current || !hereSettings?.apiKey) return;

    const initializeMap = () => {
      const H = (window as any).H;
      if (!H) {
        console.error('HERE Maps not loaded');
        return;
      }

      try {
        // Use the dynamically provided HERE API key instead of a hard-coded test key
        const platformInstance = new H.service.Platform({
          apikey: hereSettings.apiKey,
        });

        const defaultLayers = platformInstance.createDefaultLayers();
        const newMap = new H.Map(
          mapRef.current,
          defaultLayers.vector.normal.map,
          {
            zoom: 9,
            center: { lat: 18.1096, lng: -77.2975 } // Jamaica center
          }
        );

        const behavior = new H.mapevents.Behavior(new H.mapevents.MapEvents(newMap));
        const ui = H.ui.UI.createDefault(newMap, defaultLayers);

        // Add resize listener
        newMap.getViewPort().addResizeListener(() => newMap.getViewPort().update());

        setMap(newMap);
      } catch (error) {
        console.error('HERE Maps initialization error:', error);
        toast({
          title: "Map Error",
          description: "Failed to initialize HERE Maps. Please refresh the page.",
          variant: "destructive"
        });
      }
    };

    if (!document.querySelector('link[href*="mapsjs-ui.css"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://js.api.here.com/v3/3.1/mapsjs-ui.css';
      document.head.appendChild(link);
    }

    const loadScript = (src: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
          resolve();
          return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.async = false;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load ${src}`));
        document.head.appendChild(script);
      });
    };

    loadScript('https://js.api.here.com/v3/3.1/mapsjs-core.js')
      .then(() => loadScript('https://js.api.here.com/v3/3.1/mapsjs-service.js'))
      .then(() => loadScript('https://js.api.here.com/v3/3.1/mapsjs-ui.js'))
      .then(() => loadScript('https://js.api.here.com/v3/3.1/mapsjs-mapevents.js'))
      .then(initializeMap)
      .catch(err => {
        console.error('Failed to load HERE Maps API:', err);
        setMapLoadError(true);
        setMapProvider('google');
        loadGoogleMapsAsFallback();
      });

    return () => {
      if (map) {
        if (mapProvider === 'here' && map.dispose) {
          map.dispose();
        }
      }
    };
  }, [hereSettings?.apiKey]);

  // Google Maps fallback initialization
  const loadGoogleMapsAsFallback = () => {
    if (!mapRef.current) return;

    const loadGoogleScript = () => {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        const googleMap = new (window as any).google.maps.Map(mapRef.current, {
          center: { lat: 18.1096, lng: -77.2975 },
          zoom: 9,
          styles: [
            {
              featureType: "water",
              elementType: "geometry",
              stylers: [{ color: "#193341" }]
            },
            {
              featureType: "landscape",
              elementType: "geometry",
              stylers: [{ color: "#2c5a71" }]
            }
          ]
        });
        setMap(googleMap);
        toast({
          title: "Using Google Maps",
          description: "HERE Maps failed to load, using Google Maps instead."
        });
      };
      document.head.appendChild(script);
    };

    if ((window as any).google?.maps) {
      const googleMap = new (window as any).google.maps.Map(mapRef.current, {
        center: { lat: 18.1096, lng: -77.2975 },
        zoom: 9
      });
      setMap(googleMap);
    } else {
      loadGoogleScript();
    }
  };

  // Create heat map markers with overlay data
  useEffect(() => {
    if (!map || !heatMapData?.length) return;

    if (mapProvider === 'google') {
      // Google Maps implementation
      renderGoogleMapOverlays();
    } else {
      // HERE Maps implementation
      renderHereMapOverlays();
    }
  }, [map, heatMapData, activeOverlays, mapProvider]);

  const renderGoogleMapOverlays = () => {
    if (!map || !(window as any).google) return;

    // Clear existing overlays
    if ((map as any).overlays) {
      (map as any).overlays.forEach((overlay: any) => overlay.setMap(null));
    }
    (map as any).overlays = [];

    heatMapData.forEach((stationData) => {
      if (!stationData.latitude || !stationData.longitude) return;

      const position = { 
        lat: parseFloat(stationData.latitude), 
        lng: parseFloat(stationData.longitude) 
      };

      // Add station marker
      const marker = new (window as any).google.maps.Marker({
        position,
        map,
        title: stationData.name,
        icon: {
          path: (window as any).google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: getStationColor(stationData),
          fillOpacity: 0.8,
          strokeColor: '#ffffff',
          strokeWeight: 2
        }
      });
      (map as any).overlays.push(marker);

      // Add overlay visualizations
      if (activeOverlays.has('traffic') && stationData.traffic) {
        const trafficCircle = new (window as any).google.maps.Circle({
          strokeColor: getTrafficColor(stationData.traffic.severity),
          strokeOpacity: 0.8,
          strokeWeight: 3,
          fillColor: getTrafficColor(stationData.traffic.severity),
          fillOpacity: 0.25,
          map,
          center: position,
          radius: 5000
        });
        (map as any).overlays.push(trafficCircle);
      }

      if (activeOverlays.has('weather') && stationData.weather) {
        const weatherCircle = new (window as any).google.maps.Circle({
          strokeColor: getWeatherColor(stationData.weather.electoral_impact),
          strokeOpacity: 0.6,
          strokeWeight: 2,
          strokeDashArray: [5, 5],
          fillColor: getWeatherColor(stationData.weather.electoral_impact),
          fillOpacity: 0.12,
          map,
          center: position,
          radius: 8000
        });
        (map as any).overlays.push(weatherCircle);
      }

      if (activeOverlays.has('sentiment') && stationData.sentiment) {
        const sentimentRadius = getSentimentRadius(stationData.sentiment.sentiment_analysis?.risk_level);
        const sentimentCircle = new (window as any).google.maps.Circle({
          strokeColor: getSentimentColor(stationData.sentiment.sentiment_analysis?.risk_level),
          strokeOpacity: 0.7,
          strokeWeight: 2,
          fillColor: getSentimentColor(stationData.sentiment.sentiment_analysis?.risk_level),
          fillOpacity: 0.18,
          map,
          center: position,
          radius: sentimentRadius
        });
        (map as any).overlays.push(sentimentCircle);
      }
    });
  };

  const renderHereMapOverlays = () => {
    const H = (window as any).H;
    if (!H) return;
    
    const group = new H.map.Group();

    // Add polling station markers with overlay data
    heatMapData.forEach((stationData) => {
      if (!stationData.latitude || !stationData.longitude) return;

      const position = { lat: parseFloat(stationData.latitude), lng: parseFloat(stationData.longitude) };
      
      // Add the station marker
      const marker = createHeatMapMarker(H, position, stationData);
      group.addObject(marker);

      // Add overlay visualizations around each station
      if (activeOverlays.has('traffic') && stationData.traffic) {
        // Add traffic circle around station
        const trafficCircle = new H.map.Circle(
          position,
          5000, // 5km radius
          {
            style: {
              strokeColor: getTrafficColor(stationData.traffic.severity),
              lineWidth: 3,
              fillColor: getTrafficColor(stationData.traffic.severity) + '40' // 25% opacity
            }
          }
        );
        group.addObject(trafficCircle);
      }

      if (activeOverlays.has('weather') && stationData.weather) {
        // Add weather impact zone
        const weatherCircle = new H.map.Circle(
          position,
          8000, // 8km radius
          {
            style: {
              strokeColor: getWeatherColor(stationData.weather.electoral_impact),
              lineWidth: 2,
              lineDash: [5, 5],
              fillColor: getWeatherColor(stationData.weather.electoral_impact) + '20' // 12% opacity
            }
          }
        );
        group.addObject(weatherCircle);
      }

      if (activeOverlays.has('sentiment') && stationData.sentiment) {
        // Add sentiment indicator
        const sentimentRadius = getSentimentRadius(stationData.sentiment.sentiment_analysis?.risk_level);
        const sentimentCircle = new H.map.Circle(
          position,
          sentimentRadius,
          {
            style: {
              strokeColor: getSentimentColor(stationData.sentiment.sentiment_analysis?.risk_level),
              lineWidth: 2,
              fillColor: getSentimentColor(stationData.sentiment.sentiment_analysis?.risk_level) + '30' // 18% opacity
            }
          }
        );
        group.addObject(sentimentCircle);
      }

      if (activeOverlays.has('incidents') && stationData.incidents) {
        // Add incident markers around station
        if (stationData.incidents.recent && stationData.incidents.recent.length > 0) {
          stationData.incidents.recent.forEach((incident: any, index: number) => {
            const angle = (index * 360) / stationData.incidents.recent.length;
            const offsetLat = position.lat + (0.02 * Math.cos(angle * Math.PI / 180));
            const offsetLng = position.lng + (0.02 * Math.sin(angle * Math.PI / 180));
            
            const incidentMarker = new H.map.Marker(
              { lat: offsetLat, lng: offsetLng },
              {
                icon: createIncidentIcon(H, incident.severity)
              }
            );
            group.addObject(incidentMarker);
          });
        }
      }
    });

    map.removeObjects(map.getObjects());
    map.addObject(group);
  };

  const createHeatMapMarker = (H: any, position: any, stationData: any) => {
    let intensity = 0;
    let dominantColor = '#64748b'; // Default gray

    if (activeOverlays.has('sentiment') && stationData.sentiment) {
        const sentiment = stationData.sentiment.sentiment_analysis || {};
        if (sentiment.risk_level === 'critical') intensity = Math.max(intensity, 1.0);
        else if (sentiment.risk_level === 'high') intensity = Math.max(intensity, 0.8);
        else if (sentiment.risk_level === 'medium') intensity = Math.max(intensity, 0.6);
        else intensity = Math.max(intensity, 0.3);

        if (sentiment.risk_level === 'critical' || sentiment.risk_level === 'high') {
          dominantColor = '#ef4444';
        } else if (sentiment.overall_sentiment === 'positive') {
          dominantColor = '#10b981';
        } else if (sentiment.overall_sentiment === 'negative') {
          dominantColor = '#f59e0b';
        }
      }

      if (activeOverlays.has('traffic') && stationData.traffic) {
        const traffic = stationData.traffic;
        if (traffic.severity === 'severe') intensity = Math.max(intensity, 1.0);
        else if (traffic.severity === 'heavy') intensity = Math.max(intensity, 0.8);
        else if (traffic.severity === 'moderate') intensity = Math.max(intensity, 0.6);
        else intensity = Math.max(intensity, 0.3);

        if (traffic.severity === 'severe' || traffic.severity === 'heavy') {
          dominantColor = '#ef4444';
        }
      }

      if (activeOverlays.has('weather') && stationData.weather) {
        const weather = stationData.weather;
        if (weather.electoral_impact === 'high') intensity = Math.max(intensity, 0.8);
        else if (weather.electoral_impact === 'medium') intensity = Math.max(intensity, 0.6);
        else intensity = Math.max(intensity, 0.3);
      }

      if (activeOverlays.has('incidents') && stationData.incidents) {
        const incidents = stationData.incidents;
        if (incidents.severity === 'high') intensity = Math.max(intensity, 0.8);
        else if (incidents.severity === 'medium') intensity = Math.max(intensity, 0.6);
        else intensity = Math.max(intensity, 0.3);
      }

    const size = Math.max(10, intensity * 30);
    const opacity = Math.max(0.4, intensity);

    const svgMarkup = `
      <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" 
                fill="${dominantColor}" 
                opacity="${opacity}" 
                stroke="white" 
                stroke-width="2"/>
        <text x="${size/2}" y="${size/2 + 3}" text-anchor="middle" 
              font-family="Arial, sans-serif" 
              font-size="8" 
              fill="white" 
              font-weight="bold">
          ${stationData.stationCode.substring(0, 3)}
        </text>
      </svg>
    `;

    const icon = new H.map.Icon(
      `data:image/svg+xml,${encodeURIComponent(svgMarkup)}`,
      { size: { w: size, h: size } }
    );

    const marker = new H.map.Marker(position, { icon });
    
    marker.addEventListener('tap', () => {
      if (onStationSelect) {
        onStationSelect(stationData);
      }
    });

    return marker;
  };

  // Helper functions for overlay colors
  const getTrafficColor = (severity: string) => {
    switch (severity) {
      case 'severe': return '#dc2626';
      case 'heavy': return '#ef4444';
      case 'moderate': return '#f59e0b';
      default: return '#10b981';
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

  const createIncidentIcon = (H: any, severity: string) => {
    const color = severity === 'high' ? '#dc2626' : severity === 'medium' ? '#f59e0b' : '#fbbf24';
    const svgMarkup = `
      <svg width="20" height="20" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 2 L18 16 L2 16 Z" fill="${color}" stroke="#ffffff" stroke-width="2"/>
        <text x="10" y="13" text-anchor="middle" font-size="10" fill="white" font-weight="bold">!</text>
      </svg>
    `;
    return new H.map.Icon(`data:image/svg+xml,${encodeURIComponent(svgMarkup)}`, { size: { w: 20, h: 20 } });
  };

  const getStationColor = (stationData: any) => {
    let dominantColor = '#64748b';
    if (activeOverlays.has('sentiment') && stationData.sentiment?.sentiment_analysis?.risk_level === 'critical') {
      dominantColor = '#dc2626';
    } else if (activeOverlays.has('traffic') && stationData.traffic?.severity === 'severe') {
      dominantColor = '#ef4444';
    } else if (activeOverlays.has('weather') && stationData.weather?.electoral_impact === 'high') {
      dominantColor = '#f59e0b';
    }
    return dominantColor;
  };

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

  const refreshData = () => {
    onRefresh();
    toast({
      title: "Heat Map Updated",
      description: "Refreshed all overlay data"
    });
  };

  if (!hereSettings) {
    return (
      <Card className="government-card">
        <CardContent className="p-8">
          <div className="flex items-center justify-center space-x-2">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span>Loading heat map settings...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!hereSettings.configured || !hereSettings.apiKey) {
    return (
      <Card className="government-card">
        <CardContent className="p-6 text-center space-y-2">
          <p className="font-semibold">HERE Maps Not Configured</p>
          <p className="text-sm text-muted-foreground">
            Please configure the HERE Maps API key in Admin Settings to view this map.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Heat Map Controls */}
      <Card className="government-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Heat Map Overlays
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshData}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {OVERLAYS.map((overlay) => (
              <div key={overlay.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
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
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Heat Map */}
      <Card className="government-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Jamaica Polling Stations Heat Map
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div ref={mapRef} style={{ width: '100%', height: '600px' }}></div>
        </CardContent>
      </Card>

      {/* Heat Map Legend */}
      <Card className="government-card">
        <CardHeader>
          <CardTitle className="text-sm">Heat Map Legend</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded-full"></div>
              <span className="text-sm">Critical/High Risk</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
              <span className="text-sm">Medium Risk</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              <span className="text-sm">Low Risk/Positive</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-500 rounded-full"></div>
              <span className="text-sm">No Data</span>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            Circle size indicates intensity level. Larger circles represent higher activity or risk levels.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}