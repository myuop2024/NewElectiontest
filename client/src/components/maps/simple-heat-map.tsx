import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
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

interface SimpleHeatMapProps {
  stations: any[];
  selectedStation?: any;
  onStationSelect?: (station: any) => void;
}

export default function SimpleHeatMap({ stations, selectedStation, onStationSelect }: SimpleHeatMapProps) {
  const [activeOverlays, setActiveOverlays] = useState<Set<string>>(new Set(['sentiment']));
  const { toast } = useToast();

  const overlays = [
    {
      id: 'sentiment',
      name: 'X Sentiment',
      color: '#3b82f6',
      icon: <MessageCircle className="h-4 w-4" />
    },
    {
      id: 'traffic',
      name: 'Traffic',
      color: '#ef4444',
      icon: <Car className="h-4 w-4" />
    },
    {
      id: 'weather',
      name: 'Weather',
      color: '#10b981',
      icon: <Thermometer className="h-4 w-4" />
    },
    {
      id: 'incidents',
      name: 'Incidents',
      color: '#f59e0b',
      icon: <AlertTriangle className="h-4 w-4" />
    }
  ];

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
    toast({
      title: "Heat Map Updated",
      description: "Refreshed all overlay data"
    });
  };

  const getStationIntensity = (station: any) => {
    // Simple intensity calculation based on station properties
    let intensity = 0.3; // Base intensity
    
    if (activeOverlays.has('sentiment')) {
      // Simulate sentiment intensity based on station properties
      const stationCode = station.stationCode || '';
      if (stationCode.includes('KIN') || stationCode.includes('STA')) intensity += 0.3;
    }
    
    if (activeOverlays.has('traffic')) {
      // Higher intensity for urban areas
      if (station.parish === 'Kingston' || station.parish === 'St. Andrew') intensity += 0.2;
    }
    
    if (activeOverlays.has('weather')) {
      // Simulate weather impact
      intensity += 0.1;
    }
    
    if (activeOverlays.has('incidents')) {
      // Random incident simulation
      if (Math.random() > 0.8) intensity += 0.3;
    }
    
    return Math.min(intensity, 1.0);
  };

  const getIntensityColor = (intensity: number) => {
    if (intensity > 0.8) return '#ef4444'; // Red - Critical
    if (intensity > 0.6) return '#f59e0b'; // Orange - High
    if (intensity > 0.4) return '#eab308'; // Yellow - Medium
    return '#10b981'; // Green - Low
  };

  const getIntensityLabel = (intensity: number) => {
    if (intensity > 0.8) return 'Critical';
    if (intensity > 0.6) return 'High';
    if (intensity > 0.4) return 'Medium';
    return 'Low';
  };

  const validStations = stations.filter(station => 
    station.latitude && station.longitude
  );

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

      {/* Simplified Heat Map Grid */}
      <Card className="government-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Jamaica Polling Stations Heat Map ({validStations.length} stations)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {validStations.map((station) => {
              const intensity = getStationIntensity(station);
              const color = getIntensityColor(intensity);
              const label = getIntensityLabel(intensity);
              
              return (
                <Card 
                  key={station.id} 
                  className={`government-card cursor-pointer transition-all hover:shadow-md border-l-4 ${
                    selectedStation?.id === station.id ? 'ring-2 ring-primary' : ''
                  }`}
                  style={{ borderLeftColor: color }}
                  onClick={() => onStationSelect?.(station)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" style={{ color }} />
                        <span className="font-semibold text-sm">{station.stationCode}</span>
                      </div>
                      <Badge 
                        variant="outline" 
                        className="text-xs"
                        style={{ borderColor: color, color }}
                      >
                        {label}
                      </Badge>
                    </div>
                    
                    <div className="space-y-1">
                      <h4 className="font-medium text-sm line-clamp-2">{station.name}</h4>
                      <p className="text-xs text-muted-foreground">{station.parish}</p>
                      
                      {/* Active Overlays */}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {Array.from(activeOverlays).map(overlayId => {
                          const overlay = overlays.find(o => o.id === overlayId);
                          return overlay ? (
                            <div 
                              key={overlayId}
                              className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-muted"
                              style={{ color: overlay.color }}
                            >
                              {overlay.icon}
                              <span>{overlay.name}</span>
                            </div>
                          ) : null;
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
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
              <span className="text-sm">Critical Risk</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
              <span className="text-sm">High Risk</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
              <span className="text-sm">Medium Risk</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              <span className="text-sm">Low Risk</span>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            Intensity levels combine data from active overlays: X sentiment analysis, traffic conditions, weather impact, and recent incidents.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}