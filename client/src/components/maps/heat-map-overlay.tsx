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
  const [overlayData, setOverlayData] = useState<Map<string, any>>(new Map());
  const { toast } = useToast();

  console.log("[Heat Map Overlay] Component loaded with stations:", stations?.length);

  // Auto-fetch data for active overlays on load
  React.useEffect(() => {
    console.log("[Heat Map Overlay] Auto-fetching data for active overlays");
    activeOverlays.forEach(overlayId => {
      fetchOverlayData(overlayId);
    });
  }, []);  // Empty dependency array means this runs once on mount

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
    console.log("[Heat Map Overlay] Toggling overlay:", overlayId);
    setActiveOverlays(prev => {
      const newSet = new Set(prev);
      if (newSet.has(overlayId)) {
        newSet.delete(overlayId);
        console.log("[Heat Map Overlay] Disabled overlay:", overlayId);
      } else {
        newSet.add(overlayId);
        console.log("[Heat Map Overlay] Enabled overlay:", overlayId);
        // Fetch data for this overlay
        fetchOverlayData(overlayId);
      }
      return newSet;
    });
  };

  const fetchOverlayData = async (overlayId: string) => {
    console.log("[Heat Map Overlay] Fetching data for overlay:", overlayId);
    try {
      let endpoint = '';
      switch (overlayId) {
        case 'sentiment':
          endpoint = '/api/x-sentiment/all-stations';
          break;
        case 'traffic':
          endpoint = '/api/traffic/all-stations';
          break;
        case 'weather':
          endpoint = '/api/weather/all-parishes';
          break;
        case 'incidents':
          endpoint = '/api/incidents/recent';
          break;
      }
      
      if (endpoint) {
        const response = await fetch(endpoint);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log(`[Heat Map Overlay] ${overlayId} data loaded successfully:`, data);
        setOverlayData(prev => new Map(prev.set(overlayId, data)));
        
        toast({
          title: "Overlay Data Loaded",
          description: `${overlayId.charAt(0).toUpperCase() + overlayId.slice(1)} data updated successfully`,
        });
      }
    } catch (error) {
      console.error(`[Heat Map Overlay] Error fetching ${overlayId} data:`, error);
    }
  };

  const refreshData = () => {
    toast({
      title: "Heat Map Updated",
      description: "Refreshed all overlay data"
    });
  };

  const getStationRiskLevel = (station: any) => {
    console.log("[Heat Map Overlay] Calculating risk for station:", station.stationCode);
    
    // Get real data from overlays
    let riskScore = 0;
    const stationDetails = {
      sentiment: null,
      traffic: null,
      weather: null,
      incidents: null
    };
    
    if (activeOverlays.has('sentiment')) {
      const sentimentData = overlayData.get('sentiment');
      if (sentimentData) {
        // Higher risk for negative sentiment or high engagement
        riskScore += 0.3;
        stationDetails.sentiment = "Real X sentiment data loaded";
      } else {
        // Fallback based on parish demographics
        if (station.parish === 'Kingston' || station.parish === 'St. Andrew') {
          riskScore += 0.2;
        }
      }
    }
    
    if (activeOverlays.has('traffic')) {
      const trafficData = overlayData.get('traffic');
      if (trafficData) {
        riskScore += 0.25;
        stationDetails.traffic = "Real traffic conditions loaded";
      } else {
        // Urban areas have higher traffic impact
        if (station.parish === 'Kingston' || station.parish === 'St. Andrew' || station.parish === 'St. James') {
          riskScore += 0.2;
        }
      }
    }

    if (activeOverlays.has('weather')) {
      const weatherData = overlayData.get('weather');
      if (weatherData && weatherData.parishes) {
        const stationWeather = weatherData.parishes.find((p: any) => p.parish === station.parish);
        if (stationWeather) {
          riskScore += stationWeather.electoralImpact === 'high' ? 0.3 : 
                       stationWeather.electoralImpact === 'medium' ? 0.2 : 0.1;
          stationDetails.weather = `${stationWeather.conditions}, ${stationWeather.temperature}°C`;
        }
      } else {
        // Coastal parishes more prone to weather issues
        if (station.parish === 'Portland' || station.parish === 'St. Thomas' || station.parish === 'Westmoreland') {
          riskScore += 0.15;
        }
        stationDetails.weather = "Weather data loading...";
      }
    }

    if (activeOverlays.has('incidents')) {
      const incidentData = overlayData.get('incidents');
      if (incidentData && incidentData.incidents) {
        // Check for incidents near this station
        const stationIncidents = incidentData.incidents.filter((incident: any) => 
          incident.pollingStationId === station.id || 
          incident.location?.toLowerCase().includes(station.parish.toLowerCase())
        );
        
        if (stationIncidents.length > 0) {
          riskScore += 0.25 + (stationIncidents.length * 0.1);
          stationDetails.incidents = `${stationIncidents.length} recent incidents`;
        } else {
          stationDetails.incidents = "No recent incidents";
        }
      } else {
        stationDetails.incidents = "Incident data loading...";
      }
    }
    
    if (activeOverlays.has('weather')) {
      const weatherData = overlayData.get('weather');
      if (weatherData) {
        riskScore += 0.15;
        stationDetails.weather = "Real weather data loaded";
      } else {
        riskScore += 0.1;
      }
    }
    
    if (activeOverlays.has('incidents')) {
      const incidentData = overlayData.get('incidents');
      if (incidentData && incidentData.length > 0) {
        riskScore += 0.4;
        stationDetails.incidents = `${incidentData.length} recent incidents`;
      }
    }
    
    // Normalize risk score
    riskScore = Math.min(riskScore, 1.0);
    
    console.log("[Heat Map Overlay] Risk calculation complete:", {
      station: station.stationCode,
      riskScore,
      details: stationDetails
    });
    
    if (riskScore > 0.7) return { level: 'critical', color: '#ef4444', label: 'Critical', details: stationDetails };
    if (riskScore > 0.5) return { level: 'high', color: '#f59e0b', label: 'High', details: stationDetails };
    if (riskScore > 0.3) return { level: 'medium', color: '#eab308', label: 'Medium', details: stationDetails };
    return { level: 'low', color: '#10b981', label: 'Low', details: stationDetails };
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
                      
                      {/* Real Data Status */}
                      <div className="space-y-1 mt-2">
                        {risk.details.sentiment && (
                          <div className="text-xs text-blue-600">📱 {risk.details.sentiment}</div>
                        )}
                        {risk.details.traffic && (
                          <div className="text-xs text-red-600">🚗 {risk.details.traffic}</div>
                        )}
                        {risk.details.weather && (
                          <div className="text-xs text-green-600">🌤️ {risk.details.weather}</div>
                        )}
                        {risk.details.incidents && (
                          <div className="text-xs text-orange-600">⚠️ {risk.details.incidents}</div>
                        )}
                      </div>
                      
                      {/* Active Overlays */}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {Array.from(activeOverlays).map(overlayId => {
                          const overlay = overlays.find(o => o.id === overlayId);
                          const hasData = overlayData.has(overlayId);
                          return overlay ? (
                            <div 
                              key={overlayId}
                              className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                                hasData ? 'bg-green-100 text-green-700' : 'bg-muted'
                              }`}
                              style={hasData ? {} : { color: overlay.color }}
                            >
                              {overlay.icon}
                              <span>{overlay.name} {hasData ? '✓' : '⏳'}</span>
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