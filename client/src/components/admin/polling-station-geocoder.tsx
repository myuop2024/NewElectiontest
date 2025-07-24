import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { 
  MapPin, 
  Navigation, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Plus,
  Loader2
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface PollingStation {
  id: number;
  stationCode: string;
  name: string;
  address: string;
  parishId: number;
  latitude?: string;
  longitude?: string;
  capacity?: number;
  isActive: boolean;
  geocoded?: boolean;
  geocodeMessage?: string;
}

interface Parish {
  id: number;
  name: string;
  code: string;
}

export default function PollingStationGeocoder() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newStation, setNewStation] = useState({
    stationCode: '',
    name: '',
    address: '',
    parishId: '',
    capacity: ''
  });

  const queryClient = useQueryClient();

  // Fetch parishes for the dropdown
  const { data: parishes = [] } = useQuery<Parish[]>({
    queryKey: ['/api/parishes']
  });

  // Fetch polling stations
  const { data: stations = [], isLoading } = useQuery<PollingStation[]>({
    queryKey: ['/api/polling-stations'],
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Create new polling station with automatic geocoding
  const createStationMutation = useMutation({
    mutationFn: async (data: typeof newStation) => {
      return await apiRequest('/api/polling-stations', 'POST', data);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/polling-stations'] });
      
      if (data?.geocoded) {
        toast({
          title: "Station Created Successfully",
          description: data?.geocodeMessage || "Location automatically determined from address",
        });
      } else {
        toast({
          title: "Station Created",
          description: data?.geocodeMessage || "Station created but coordinates need to be set manually",
          variant: "default",
        });
      }
      
      setNewStation({
        stationCode: '',
        name: '',
        address: '',
        parishId: '',
        capacity: ''
      });
      setShowCreateForm(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error Creating Station",
        description: error.message || "Failed to create polling station",
        variant: "destructive",
      });
    }
  });

  // Geocode individual station
  const geocodeStationMutation = useMutation({
    mutationFn: async (stationId: number) => {
      return await apiRequest(`/api/polling-stations/${stationId}/geocode`, 'POST');
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/polling-stations'] });
      toast({
        title: "Geocoding Successful",
        description: data?.message || "Station coordinates updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Geocoding Failed",
        description: error.message || "Failed to determine coordinates from address",
        variant: "destructive",
      });
    }
  });

  // Batch geocode all stations
  const batchGeocodeMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/polling-stations/batch-geocode', 'POST');
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/polling-stations'] });
      
      const { successful, failed, errors } = data?.results || { successful: 0, failed: 0, errors: [] };
      
      toast({
        title: "Batch Geocoding Complete",
        description: `${successful} stations updated successfully${failed > 0 ? `, ${failed} failed` : ''}`,
        variant: failed > 0 ? "default" : "default",
      });
      
      // Show detailed errors if any
      if (errors && errors.length > 0 && errors.length <= 3) {
        errors.slice(0, 3).forEach((error: string, index: number) => {
          setTimeout(() => {
            toast({
              title: "Geocoding Error",
              description: error,
              variant: "destructive",
            });
          }, (index + 1) * 1000);
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Batch Geocoding Failed",
        description: error.message || "Failed to batch geocode stations",
        variant: "destructive",
      });
    }
  });

  const getCoordinateStatus = (station: PollingStation) => {
    if (station.latitude && station.longitude && 
        station.latitude !== '0' && station.longitude !== '0') {
      return { status: 'success', text: 'Has Coordinates', color: 'bg-green-100 text-green-800' };
    }
    return { status: 'missing', text: 'No Coordinates', color: 'bg-red-100 text-red-800' };
  };

  const stationsNeedingGeocode = stations.filter(station => {
    const status = getCoordinateStatus(station);
    return status.status === 'missing';
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Automatic Polling Station Geocoding
          </CardTitle>
          <CardDescription>
            Automatically fetch GPS coordinates from Google Maps when adding polling stations to the system.
            This ensures accurate location data for all electoral mapping and analytics.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Stations</p>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{stations.length}</p>
                </div>
                <Navigation className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600 dark:text-green-400">With Coordinates</p>
                  <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                    {stations.length - stationsNeedingGeocode.length}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
            </div>

            <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Need Geocoding</p>
                  <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                    {stationsNeedingGeocode.length}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <Button 
              onClick={() => setShowCreateForm(!showCreateForm)}
              variant="default"
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add New Station (Auto-Geocode)
            </Button>

            {stationsNeedingGeocode.length > 0 && (
              <Button 
                onClick={() => batchGeocodeMutation.mutate()}
                disabled={batchGeocodeMutation.isPending}
                variant="outline"
                className="flex items-center gap-2"
              >
                {batchGeocodeMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Batch Geocode All ({stationsNeedingGeocode.length})
              </Button>
            )}
          </div>

          {/* Create Station Form */}
          {showCreateForm && (
            <Card className="border-2 border-dashed border-blue-200 dark:border-blue-800">
              <CardHeader>
                <CardTitle className="text-lg">Create New Polling Station</CardTitle>
                <CardDescription>
                  Enter the station details. Coordinates will be automatically fetched from Google Maps based on the address.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="stationCode">Station Code</Label>
                    <Input
                      id="stationCode"
                      placeholder="e.g., KIN001"
                      value={newStation.stationCode}
                      onChange={(e) => setNewStation(prev => ({ ...prev, stationCode: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="name">Station Name</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Kingston Primary School"
                      value={newStation.name}
                      onChange={(e) => setNewStation(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="address">Full Address</Label>
                  <Input
                    id="address"
                    placeholder="e.g., 123 Main Street, Kingston, Jamaica"
                    value={newStation.address}
                    onChange={(e) => setNewStation(prev => ({ ...prev, address: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="parish">Parish</Label>
                    <Select value={newStation.parishId} onValueChange={(value) => 
                      setNewStation(prev => ({ ...prev, parishId: value }))
                    }>
                      <SelectTrigger>
                        <SelectValue placeholder="Select parish" />
                      </SelectTrigger>
                      <SelectContent>
                        {parishes.map((parish) => (
                          <SelectItem key={parish.id} value={parish.id.toString()}>
                            {parish.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="capacity">Capacity (Optional)</Label>
                    <Input
                      id="capacity"
                      type="number"
                      placeholder="e.g., 500"
                      value={newStation.capacity}
                      onChange={(e) => setNewStation(prev => ({ ...prev, capacity: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button 
                    onClick={() => createStationMutation.mutate(newStation)}
                    disabled={createStationMutation.isPending || !newStation.stationCode || !newStation.name || !newStation.address || !newStation.parishId}
                    className="flex items-center gap-2"
                  >
                    {createStationMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <MapPin className="h-4 w-4" />
                    )}
                    Create & Auto-Geocode
                  </Button>

                  <Button 
                    variant="outline" 
                    onClick={() => setShowCreateForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Stations List */}
      <Card>
        <CardHeader>
          <CardTitle>Polling Stations</CardTitle>
          <CardDescription>
            All polling stations with their geocoding status. Click "Geocode" to automatically fetch coordinates for stations missing location data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading stations...</span>
            </div>
          ) : (
            <div className="space-y-3">
              {stations.map((station) => {
                const coordinateStatus = getCoordinateStatus(station);
                return (
                  <div key={station.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-medium">{station.name}</h3>
                        <Badge variant="outline">{station.stationCode}</Badge>
                        <Badge className={coordinateStatus.color}>
                          {coordinateStatus.status === 'success' ? (
                            <CheckCircle className="h-3 w-3 mr-1" />
                          ) : (
                            <XCircle className="h-3 w-3 mr-1" />
                          )}
                          {coordinateStatus.text}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {station.address}
                      </p>
                      {station.latitude && station.longitude && (
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                          📍 {parseFloat(station.latitude).toFixed(6)}, {parseFloat(station.longitude).toFixed(6)}
                        </p>
                      )}
                    </div>

                    {coordinateStatus.status === 'missing' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => geocodeStationMutation.mutate(station.id)}
                        disabled={geocodeStationMutation.isPending}
                        className="flex items-center gap-2"
                      >
                        {geocodeStationMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Navigation className="h-4 w-4" />
                        )}
                        Geocode
                      </Button>
                    )}
                  </div>
                );
              })}

              {stations.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No polling stations found. Create your first station above.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}