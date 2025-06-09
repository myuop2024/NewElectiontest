import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Search, Filter, Download, Map, List } from "lucide-react";
import OSMFallbackMap from "@/components/maps/osm-fallback-map";

export default function PollingStations() {
  const [searchTerm, setSearchTerm] = useState("");
  
  const { data: stations, isLoading } = useQuery({
    queryKey: ["/api/polling-stations"],
  });

  const filteredStations = (stations as any[])?.filter((station: any) =>
    station.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    station.stationCode.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

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
          <Button className="btn-caffe-primary">
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
            <Button variant="outline" className="btn-caffe-outline">
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

                  <div className="flex space-x-2 pt-4">
                    <Button size="sm" className="flex-1 btn-caffe-primary">
                      View Details
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1">
                      Navigate
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="map" className="space-y-6">
          {/* HERE Maps Integration */}
          <Card className="government-card">
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="h-5 w-5 mr-2" />
                Polling Stations Map
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <OSMFallbackMap
                height="600px"
                center={{ lat: 18.1096, lng: -77.2975 }}
                zoom={9}
                markers={filteredStations
                  .filter((station: any) => station.latitude && station.longitude)
                  .map((station: any) => ({
                    lat: parseFloat(station.latitude),
                    lng: parseFloat(station.longitude),
                    title: station.name,
                    info: `${station.stationCode} - ${station.address}<br/>Capacity: ${station.capacity || 'Not set'} voters`
                  }))}
                interactive={true}
              />
            </CardContent>
          </Card>
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
    </div>
  );
}
