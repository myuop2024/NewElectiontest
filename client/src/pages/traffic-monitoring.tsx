import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { 
  Car, 
  MapPin, 
  Search, 
  Filter, 
  Download, 
  Map, 
  List,
  AlertTriangle,
  Clock,
  Route,
  RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import TrafficMonitor from "@/components/traffic/traffic-monitor";

interface PollingStation {
  id: number;
  stationCode: string;
  name: string;
  address: string;
  parish: string;
  latitude?: string;
  longitude?: string;
  capacity?: number;
  isActive: boolean;
}

export default function TrafficMonitoring() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStation, setSelectedStation] = useState<number | null>(null);
  const [selectedParish, setSelectedParish] = useState<string>("all");
  const { toast } = useToast();

  const { data: stations, isLoading } = useQuery<PollingStation[]>({
    queryKey: ["/api/polling-stations"],
  });

  // Filter stations with GPS coordinates only (for traffic monitoring)
  const trafficEnabledStations = (stations || []).filter(station => 
    station.latitude && station.longitude
  );

  // Filter by search and parish
  const filteredStations = trafficEnabledStations.filter((station) => {
    const matchesSearch = station.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         station.stationCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesParish = selectedParish === "all" || station.parish === selectedParish;
    return matchesSearch && matchesParish;
  });

  // Get unique parishes from stations
  const parishes = Array.from(new Set(trafficEnabledStations.map(s => s.parish))).sort();

  const handleExportTrafficData = () => {
    if (!trafficEnabledStations || trafficEnabledStations.length === 0) {
      toast({
        title: "No Data",
        description: "No traffic-enabled polling stations to export",
        variant: "destructive"
      });
      return;
    }

    const headers = ['Station Code', 'Name', 'Parish', 'GPS Enabled', 'Last Updated'];
    const csvContent = [
      headers.join(','),
      ...trafficEnabledStations.map((station) => [
        station.stationCode || '',
        `"${station.name || ''}"`,
        station.parish || '',
        station.latitude && station.longitude ? 'Yes' : 'No',
        new Date().toISOString()
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `traffic-monitoring-stations-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Export Successful",
      description: `Exported ${trafficEnabledStations.length} traffic-enabled stations`
    });
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 fade-in">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Traffic Monitoring</h2>
          <p className="text-muted-foreground">Real-time traffic conditions around polling stations</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={handleExportTrafficData} className="btn-caffe-primary">
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="government-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Stations</p>
                <p className="text-2xl font-bold">{stations?.length || 0}</p>
              </div>
              <MapPin className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="government-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Traffic Enabled</p>
                <p className="text-2xl font-bold">{trafficEnabledStations.length}</p>
              </div>
              <Car className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="government-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Parishes Covered</p>
                <p className="text-2xl font-bold">{parishes.length}</p>
              </div>
              <Map className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="government-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Coverage Rate</p>
                <p className="text-2xl font-bold">
                  {stations?.length ? Math.round((trafficEnabledStations.length / stations.length) * 100) : 0}%
                </p>
              </div>
              <Route className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="government-card">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search stations by name or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedParish} onValueChange={setSelectedParish}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by parish" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Parishes</SelectItem>
                {parishes.map((parish) => (
                  <SelectItem key={parish} value={parish}>
                    {parish}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="station" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Station Detail
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Traffic Alerts
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          {/* All Stations Traffic Overview */}
          <TrafficMonitor showAllStations={true} />
        </TabsContent>
        
        <TabsContent value="station" className="space-y-6">
          {/* Station Selection */}
          <Card className="government-card">
            <CardHeader>
              <CardTitle>Select Station for Detailed Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredStations.map((station) => (
                  <Card 
                    key={station.id} 
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedStation === station.id ? 'ring-2 ring-blue-500' : ''
                    }`}
                    onClick={() => setSelectedStation(station.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-sm">{station.stationCode}</h4>
                        <Badge variant={station.isActive ? "default" : "secondary"}>
                          {station.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{station.name}</p>
                      <p className="text-xs text-muted-foreground">{station.parish}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Selected Station Traffic Detail */}
          {selectedStation && (
            <TrafficMonitor stationId={selectedStation} />
          )}

          {!selectedStation && (
            <Card>
              <CardContent className="p-12 text-center">
                <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Select a Station</h3>
                <p className="text-muted-foreground">
                  Choose a polling station above to view detailed traffic analysis
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="alerts" className="space-y-6">
          {/* Traffic Alerts */}
          <Card className="government-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Traffic Alerts & Incidents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Sample alerts - would be populated from real traffic incident API */}
                <div className="border rounded-lg p-4 border-orange-200 bg-orange-50">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-orange-800">Heavy Traffic Alert</h4>
                      <p className="text-sm text-orange-700 mt-1">
                        Moderate congestion detected near CLA001 - May Pen Community Centre. 
                        Expected delays of 8-12 minutes.
                      </p>
                      <p className="text-xs text-orange-600 mt-2">
                        Active since: {new Date(Date.now() - 25 * 60 * 1000).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg p-4 border-blue-200 bg-blue-50">
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-blue-800">Route Optimization</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        Alternative routes available for KIN001 - Norman Manley High School. 
                        Consider Orange Street route to avoid main road congestion.
                      </p>
                      <p className="text-xs text-blue-600 mt-2">
                        Suggested: {new Date().toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg p-4 border-green-200 bg-green-50">
                  <div className="flex items-start gap-3">
                    <Route className="h-5 w-5 text-green-600 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-green-800">Clear Conditions</h4>
                      <p className="text-sm text-green-700 mt-1">
                        All major routes to St. Andrew polling stations are clear. 
                        Normal travel times expected.
                      </p>
                      <p className="text-xs text-green-600 mt-2">
                        Updated: {new Date().toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 text-center">
                <Button variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Alerts
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {trafficEnabledStations.length === 0 && (
        <Card className="government-card">
          <CardContent className="p-12 text-center">
            <Car className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Traffic Data Available</h3>
            <p className="text-muted-foreground">
              Traffic monitoring requires polling stations with GPS coordinates. 
              Please ensure station locations are properly configured.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}