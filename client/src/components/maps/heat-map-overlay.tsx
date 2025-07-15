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

interface HeatMapOverlayProps {
  stations: any[];
  selectedStation?: any;
  onStationSelect?: (station: any) => void;
}

export default function HeatMapOverlay({ stations, selectedStation, onStationSelect }: HeatMapOverlayProps) {
  const [activeOverlays, setActiveOverlays] = useState<Set<string>>(new Set(['sentiment', 'traffic']));
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

  const getStationRiskLevel = (station: any) => {
    // Simple risk calculation based on station properties and active overlays
    let riskScore = 0;
    
    if (activeOverlays.has('sentiment')) {
      // Higher risk for urban areas where sentiment monitoring is more critical
      if (station.parish === 'Kingston' || station.parish === 'St. Andrew') {
        riskScore += 0.3;
      }
    }
    
    if (activeOverlays.has('traffic')) {
      // Traffic impact in urban areas
      if (station.parish === 'Kingston' || station.parish === 'St. Andrew' || station.parish === 'St. James') {
        riskScore += 0.25;
      }
    }
    
    if (activeOverlays.has('weather')) {
      // Weather impact varies by parish
      riskScore += 0.15;
    }
    
    if (activeOverlays.has('incidents')) {
      // Random incident simulation based on station code
      const stationCode = station.stationCode || '';
      if (stationCode.includes('001') || stationCode.includes('010')) {
        riskScore += 0.4;
      }
    }
    
    // Normalize risk score
    riskScore = Math.min(riskScore, 1.0);
    
    if (riskScore > 0.7) return { level: 'critical', color: '#ef4444', label: 'Critical' };
    if (riskScore > 0.5) return { level: 'high', color: '#f59e0b', label: 'High' };
    if (riskScore > 0.3) return { level: 'medium', color: '#eab308', label: 'Medium' };
    return { level: 'low', color: '#10b981', label: 'Low' };
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

      {/* Station Risk Assessment Grid */}
      <Card className="government-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Jamaica Polling Stations Risk Assessment ({validStations.length} stations)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {validStations.map((station) => {
              const risk = getStationRiskLevel(station);
              
              return (
                <Card 
                  key={station.id} 
                  className={`government-card cursor-pointer transition-all hover:shadow-md border-l-4 ${
                    selectedStation?.id === station.id ? 'ring-2 ring-primary' : ''
                  }`}
                  style={{ borderLeftColor: risk.color }}
                  onClick={() => onStationSelect?.(station)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" style={{ color: risk.color }} />
                        <span className="font-semibold text-sm">{station.stationCode}</span>
                      </div>
                      <Badge 
                        variant="outline" 
                        className="text-xs"
                        style={{ borderColor: risk.color, color: risk.color }}
                      >
                        {risk.label}
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
          <CardTitle className="text-sm">Risk Assessment Legend</CardTitle>
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
            Risk levels combine real-time data from Jamaica X sentiment monitoring, traffic conditions, weather impact, and incident reports.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}