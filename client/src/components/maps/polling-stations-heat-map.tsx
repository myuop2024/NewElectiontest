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

      setMap(newMap);
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
  }, [hereSettings, map]);

  // Create heat map markers with overlay data
  useEffect(() => {
    if (!map || !heatMapData?.length) return;

    const H = (window as any).H;
    const group = new H.map.Group();

    heatMapData.forEach((stationData) => {
      if (!stationData.latitude || !stationData.longitude) return;

      const position = { lat: parseFloat(stationData.latitude), lng: parseFloat(stationData.longitude) };
      const marker = createHeatMapMarker(H, position, stationData);
      group.addObject(marker);
    });

    map.removeObjects(map.getObjects());
    map.addObject(group);

  }, [map, heatMapData, activeOverlays]);

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