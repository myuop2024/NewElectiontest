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
}

interface HeatMapOverlay {
  id: string;
  name: string;
  enabled: boolean;
  color: string;
  icon: React.ReactNode;
  getData: (stationId: number) => Promise<any>;
}

export default function PollingStationsHeatMap({ stations, selectedStation, onStationSelect }: HeatMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [platform, setPlatform] = useState<any>(null);
  const [overlays, setOverlays] = useState<HeatMapOverlay[]>([]);
  const [activeOverlays, setActiveOverlays] = useState<Set<string>>(new Set(['sentiment']));
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const { toast } = useToast();
  const { data: hereSettings } = useQuery({
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

      const platformInstance = new H.service.Platform({
        apikey: hereSettings.apiKey
      });

      const defaultLayers = platformInstance.createDefaultLayers();
      const map = new H.Map(
        mapRef.current,
        defaultLayers.vector.normal.map,
        {
          zoom: 9,
          center: { lat: 18.1096, lng: -77.2975 } // Jamaica center
        }
      );

      const behavior = new H.mapevents.Behavior(new H.mapevents.MapEvents(map));
      const ui = new H.ui.UI.createDefault(map);

      setMap(map);
      setPlatform(platformInstance);
      setIsLoading(false);

      // Initialize overlays
      const heatMapOverlays: HeatMapOverlay[] = [
        {
          id: 'sentiment',
          name: 'X Sentiment',
          enabled: true,
          color: '#3b82f6',
          icon: <MessageCircle className="h-4 w-4" />,
          getData: async (stationId) => {
            const response = await fetch(`/api/x-sentiment/station/${stationId}`, {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              }
            });
            return response.json();
          }
        },
        {
          id: 'traffic',
          name: 'Traffic',
          enabled: false,
          color: '#ef4444',
          icon: <Car className="h-4 w-4" />,
          getData: async (stationId) => {
            const response = await fetch(`/api/traffic/station/${stationId}`, {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              }
            });
            return response.json();
          }
        },
        {
          id: 'weather',
          name: 'Weather',
          enabled: false,
          color: '#10b981',
          icon: <Thermometer className="h-4 w-4" />,
          getData: async (stationId) => {
            const response = await fetch(`/api/weather/station/${stationId}`, {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              }
            });
            return response.json();
          }
        },
        {
          id: 'incidents',
          name: 'Incidents',
          enabled: false,
          color: '#f59e0b',
          icon: <AlertTriangle className="h-4 w-4" />,
          getData: async (stationId) => {
            const response = await fetch(`/api/incidents/station/${stationId}`, {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              }
            });
            return response.json();
          }
        }
      ];

      setOverlays(heatMapOverlays);
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
      .catch(err => console.error('Failed to load HERE Maps API:', err));

    return () => {
      if (map) {
        map.dispose();
      }
    };
  }, [hereSettings]);

  // Create heat map markers with overlay data
  const createHeatMapMarkers = async () => {
    if (!map || !stations.length) return;

    setIsLoading(true);
    const H = (window as any).H;
    const group = new H.map.Group();

    // Process stations in batches to avoid overwhelming the API
    const batchSize = 5;
    for (let i = 0; i < stations.length; i += batchSize) {
      const batch = stations.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (station) => {
        if (!station.latitude || !station.longitude) return;

        const position = { lat: parseFloat(station.latitude), lng: parseFloat(station.longitude) };
        
        // Collect data for all active overlays with timeout
        const overlayData: any = {};
        
        for (const overlay of overlays) {
          if (activeOverlays.has(overlay.id)) {
            try {
              const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout')), 5000)
              );
              overlayData[overlay.id] = await Promise.race([
                overlay.getData(station.id),
                timeoutPromise
              ]);
            } catch (error) {
              console.error(`Error loading ${overlay.name} data for station ${station.id}:`, error);
              // Provide fallback data
              overlayData[overlay.id] = { severity: 'unknown', error: true };
            }
          }
        }

        // Create marker with heat map styling
        const marker = createHeatMapMarker(H, position, station, overlayData);
        group.addObject(marker);
      }));
      
      // Small delay between batches
      if (i + batchSize < stations.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    map.removeObjects(map.getObjects());
    map.addObject(group);
    setIsLoading(false);
  };

  const createHeatMapMarker = (H: any, position: any, station: any, overlayData: any) => {
    // Calculate overall intensity based on active overlays
    let intensity = 0;
    let dominantColor = '#64748b'; // Default gray
    
    if (activeOverlays.has('sentiment') && overlayData.sentiment) {
      const sentiment = overlayData.sentiment;
      if (sentiment.risk_level === 'critical') intensity = Math.max(intensity, 1.0);
      else if (sentiment.risk_level === 'high') intensity = Math.max(intensity, 0.8);
      else if (sentiment.risk_level === 'medium') intensity = Math.max(intensity, 0.6);
      else intensity = Math.max(intensity, 0.3);
      
      if (sentiment.risk_level === 'critical' || sentiment.risk_level === 'high') {
        dominantColor = '#ef4444'; // Red for high risk
      } else if (sentiment.overall_sentiment === 'positive') {
        dominantColor = '#10b981'; // Green for positive
      } else if (sentiment.overall_sentiment === 'negative') {
        dominantColor = '#f59e0b'; // Orange for negative
      }
    }

    if (activeOverlays.has('traffic') && overlayData.traffic) {
      const traffic = overlayData.traffic;
      if (traffic.severity === 'severe') intensity = Math.max(intensity, 1.0);
      else if (traffic.severity === 'heavy') intensity = Math.max(intensity, 0.8);
      else if (traffic.severity === 'moderate') intensity = Math.max(intensity, 0.6);
      else intensity = Math.max(intensity, 0.3);
      
      if (traffic.severity === 'severe' || traffic.severity === 'heavy') {
        dominantColor = '#ef4444'; // Red for heavy traffic
      }
    }

    if (activeOverlays.has('weather') && overlayData.weather) {
      const weather = overlayData.weather;
      if (weather.electoral_impact === 'high') intensity = Math.max(intensity, 0.8);
      else if (weather.electoral_impact === 'medium') intensity = Math.max(intensity, 0.6);
      else intensity = Math.max(intensity, 0.3);
    }

    // Create circular marker with heat map styling
    const size = Math.max(10, intensity * 30); // Scale size based on intensity
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
          ${station.stationCode.substring(0, 3)}
        </text>
      </svg>
    `;

    const icon = new H.map.Icon(
      `data:image/svg+xml,${encodeURIComponent(svgMarkup)}`,
      { size: { w: size, h: size } }
    );

    const marker = new H.map.Marker(position, { icon });
    
    // Add click event for station selection
    marker.addEventListener('tap', () => {
      if (onStationSelect) {
        onStationSelect(station);
      }
    });

    return marker;
  };

  // Refresh heat map when overlays change
  useEffect(() => {
    if (map && stations.length > 0) {
      createHeatMapMarkers();
    }
  }, [map, stations, activeOverlays, lastRefresh]);

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
    setLastRefresh(Date.now());
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
            <span>Loading heat map...</span>
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

  if (isLoading) {
    return (
      <Card className="government-card">
        <CardContent className="p-8">
          <div className="flex items-center justify-center space-x-2">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span>Loading heat map...</span>
          </div>
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
            {overlays.map((overlay) => (
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