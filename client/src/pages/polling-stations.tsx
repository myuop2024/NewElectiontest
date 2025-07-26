import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Search, Filter, Download, Map, List, Navigation, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import EnhancedMap from "@/components/maps/enhanced-map";
import UnifiedJamaicaMap from "@/components/maps/unified-jamaica-map";
import EnhancedPollingStationsHeatMap from "@/components/maps/enhanced-polling-stations-heat-map";
import GoogleStyleTrafficHeatMap from "@/components/maps/google-style-traffic-heat-map";
import WorkingTrafficHeatMap from "@/components/maps/working-traffic-heat-map";
import StationTrafficStatus from "@/components/traffic/station-traffic-status";
import StationWeatherStatus from "@/components/weather/station-weather-status";
import StationXSentiment from "@/components/x-sentiment/station-x-sentiment";

export default function PollingStations() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStation, setSelectedStation] = useState<any>(null);
  const [showFilters, setShowFilters] = useState(false);
  const { toast } = useToast();
  
  const { data: stations, isLoading } = useQuery({
    queryKey: ["/api/polling-stations"],
  });

  // Type guard to ensure stations is an array
  const stationsArray = Array.isArray(stations) ? stations : [];

  const filteredStations = stationsArray.filter((station: any) =>
    station.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    station.stationCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Export stations data as CSV
  const handleExportData = () => {
    if (!stationsArray || stationsArray.length === 0) {
      toast({
        title: "No Data",
        description: "No polling stations data to export",
        variant: "destructive"
      });
      return;
    }

    const headers = ['Station Code', 'Name', 'Address', 'Parish', 'Latitude', 'Longitude', 'Capacity', 'Status'];
    const csvContent = [
      headers.join(','),
      ...stationsArray.map((station: any) => [
        station.stationCode || '',
        `"${station.name || ''}"`,
        `"${station.address || ''}"`,
        station.parish || '',
        station.latitude || '',
        station.longitude || '',
        station.capacity || '',
        station.isActive ? 'Active' : 'Inactive'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `polling-stations-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Export Successful",
      description: `Exported ${stationsArray.length} polling stations to CSV`
    });
  };

  // Navigate to polling station using Google Maps
  const handleNavigate = (station: any) => {
    if (!station.latitude || !station.longitude) {
      toast({
        title: "Location Not Available",
        description: "GPS coordinates not set for this polling station",
        variant: "destructive"
      });
      return;
    }

    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${station.latitude},${station.longitude}&travelmode=driving`;
    window.open(mapsUrl, '_blank');
    
    toast({
      title: "Navigation Started",
      description: `Opening directions to ${station.name}`
    });
  };

  // View station details
  const handleViewDetails = (station: any) => {
    setSelectedStation(station);
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
          <h2 className="text-2xl font-bold text-foreground">Polling Stations</h2>
          <p className="text-muted-foreground">Monitor and manage polling station assignments</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={handleExportData} className="btn-caffe-primary">
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
        </div>
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
            <Button 
              variant="outline" 
              className="btn-caffe-outline"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Map and List Views */}
      <Tabs defaultValue="list" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="list" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            List View
          </TabsTrigger>
          <TabsTrigger value="map" className="flex items-center gap-2">
            <Map className="h-4 w-4" />
            Map View
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="list" className="space-y-6">
          {/* Stations Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStations.map((station: any) => (
              <Card key={station.id} className="government-card hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg font-semibold">{station.stationCode}</CardTitle>
                    <Badge className={`status-indicator ${station.isActive ? 'status-active' : 'status-neutral'}`}>
                      {station.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium text-foreground">{station.name}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{station.address}</p>
                  </div>

                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>
                      {station.latitude && station.longitude 
                        ? `${parseFloat(station.latitude).toFixed(4)}, ${parseFloat(station.longitude).toFixed(4)}`
                        : 'Location not set'
                      }
                    </span>
                  </div>

                  {station.capacity && (
                    <div className="text-sm">
                      <span className="font-medium">Capacity:</span> {station.capacity} voters
                    </div>
                  )}

                  {/* Traffic, Weather & X Sentiment Status - only show if station has GPS coordinates */}
                  {station.latitude && station.longitude && (
                    <div className="border-t pt-3 space-y-2">
                      <StationTrafficStatus stationId={station.id} compact={true} />
                      {station.parish && (
                        <StationWeatherStatus parish={station.parish} compact={true} />
                      )}
                      <StationXSentiment 
                        stationId={station.id} 
                        stationName={station.name}
                        parish={station.parish}
                        compact={true} 
                      />
                    </div>
                  )}

                  <div className="flex space-x-2 pt-4">
                    <Button 
                      size="sm" 
                      className="flex-1 btn-caffe-primary"
                      onClick={() => handleViewDetails(station)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View Details
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => handleNavigate(station)}
                    >
                      <Navigation className="h-4 w-4 mr-1" />
                      Navigate
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="map" className="space-y-6">
          {/* Enhanced Heat Map with Road Shading and Weather Symbols */}
          <div className="mb-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold">Enhanced Heat Map</h3>
              <p className="text-sm text-muted-foreground">
                Road shading for traffic conditions and weather symbols with parish fallback
              </p>
            </div>
            <WorkingTrafficHeatMap 
              stations={filteredStations} 
              selectedStation={selectedStation}
              onStationSelect={setSelectedStation}
            />
          </div>
          
          {/* Traditional Overlay Map for Comparison */}
          <div className="mt-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold">Traditional Overlay Map</h3>
              <p className="text-sm text-muted-foreground">
                Traditional circular overlays for comparison
              </p>
            </div>
            <UnifiedJamaicaMap
              enabledOverlays={['traffic', 'weather', 'sentiment', 'incidents']}
              showControls={true}
              onStationSelect={setSelectedStation}
              selectedStation={selectedStation}
              height="500px"
              showLegend={true}
            />
          </div>
        </TabsContent>
      </Tabs>

      {filteredStations.length === 0 && (
        <Card className="government-card">
          <CardContent className="p-12 text-center">
            <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No polling stations found</h3>
            <p className="text-muted-foreground">
              {searchTerm 
                ? "Try adjusting your search criteria" 
                : "No polling stations have been configured yet"
              }
            </p>
          </CardContent>
        </Card>
      )}

      {/* Station Details Dialog */}
      <Dialog open={!!selectedStation} onOpenChange={() => setSelectedStation(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              {selectedStation?.stationCode} - {selectedStation?.name}
            </DialogTitle>
            <DialogDescription>
              Detailed information for this polling station
            </DialogDescription>
          </DialogHeader>
          
          {selectedStation && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Basic Information</h4>
                  <div className="space-y-2 text-sm">
                    <div><strong>Station Code:</strong> {selectedStation.stationCode}</div>
                    <div><strong>Name:</strong> {selectedStation.name}</div>
                    <div><strong>Parish:</strong> {selectedStation.parish || 'Not specified'}</div>
                    <div><strong>Status:</strong> 
                      <Badge className={`ml-2 ${selectedStation.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {selectedStation.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Location Details</h4>
                  <div className="space-y-2 text-sm">
                    <div><strong>Address:</strong> {selectedStation.address}</div>
                    <div><strong>Coordinates:</strong> 
                      {selectedStation.latitude && selectedStation.longitude 
                        ? `${parseFloat(selectedStation.latitude).toFixed(6)}, ${parseFloat(selectedStation.longitude).toFixed(6)}`
                        : 'Not set'
                      }
                    </div>
                    <div><strong>Capacity:</strong> {selectedStation.capacity || 'Not specified'} voters</div>
                  </div>
                </div>
              </div>

              {/* Traffic & Weather Information - only show if station has GPS coordinates */}
              {selectedStation.latitude && selectedStation.longitude && (
                <div className="border-t pt-4 space-y-6">
                  <div>
                    <h4 className="font-semibold mb-3">Current Traffic Conditions</h4>
                    <StationTrafficStatus stationId={selectedStation.id} compact={false} />
                  </div>
                  {selectedStation.parish && (
                    <div>
                      <h4 className="font-semibold mb-3">Current Weather Conditions</h4>
                      <StationWeatherStatus parish={selectedStation.parish} compact={false} />
                    </div>
                  )}
                  <div>
                    <h4 className="font-semibold mb-3">X Social Media Sentiment</h4>
                    <StationXSentiment 
                      stationId={selectedStation.id} 
                      stationName={selectedStation.name}
                      parish={selectedStation.parish}
                      compact={false} 
                    />
                  </div>
                </div>
              )}

              <div className="flex space-x-3 pt-4 border-t">
                <Button 
                  onClick={() => handleNavigate(selectedStation)}
                  className="btn-caffe-primary"
                  disabled={!selectedStation.latitude || !selectedStation.longitude}
                >
                  <Navigation className="h-4 w-4 mr-2" />
                  Get Directions
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setSelectedStation(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
