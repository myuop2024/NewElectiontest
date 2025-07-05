import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Users, Plus, Edit, Eye, Building, Activity } from "lucide-react";
import { useGeolocation } from "@/hooks/use-geolocation";

export default function PollingStationManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { location } = useGeolocation({ enableHighAccuracy: true });
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedStation, setSelectedStation] = useState<any>(null);
  
  const [stationForm, setStationForm] = useState({
    name: "",
    code: "",
    address: "",
    parishId: "",
    capacity: "",
    accessibility: "yes",
    contactPerson: "",
    contactPhone: "",
    latitude: "",
    longitude: "",
    notes: ""
  });

  const { data: pollingStations = [] } = useQuery<any[]>({
    queryKey: ["/api/polling-stations"],
  });

  const { data: parishes = [] } = useQuery<any[]>({
    queryKey: ["/api/parishes"],
  });

  const createStationMutation = useMutation({
    mutationFn: async (station: any) => {
      const response = await apiRequest("POST", "/api/polling-stations", {
        ...station,
        capacity: parseInt(station.capacity) || 0,
        latitude: parseFloat(station.latitude) || null,
        longitude: parseFloat(station.longitude) || null,
        createdBy: user?.id
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/polling-stations"] });
      toast({
        title: "Polling Station Created",
        description: "New polling station has been added successfully.",
      });
      setIsCreateDialogOpen(false);
      resetForm();
    }
  });

  const updateStationMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: any }) => {
      const response = await apiRequest("PATCH", `/api/polling-stations/${id}`, {
        ...updates,
        capacity: parseInt(updates.capacity) || 0,
        latitude: parseFloat(updates.latitude) || null,
        longitude: parseFloat(updates.longitude) || null
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/polling-stations"] });
      toast({
        title: "Polling Station Updated",
        description: "Polling station information has been updated.",
      });
      setIsEditDialogOpen(false);
      setSelectedStation(null);
    }
  });

  const resetForm = () => {
    setStationForm({
      name: "",
      code: "",
      address: "",
      parishId: "",
      capacity: "",
      accessibility: "yes",
      contactPerson: "",
      contactPhone: "",
      latitude: "",
      longitude: "",
      notes: ""
    });
  };

  const handleCreateStation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stationForm.name || !stationForm.code || !stationForm.parishId) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }
    createStationMutation.mutate(stationForm);
  };

  const handleEditStation = (station: any) => {
    setSelectedStation(station);
    setStationForm({
      name: station.name || "",
      code: station.code || "",
      address: station.address || "",
      parishId: station.parishId?.toString() || "",
      capacity: station.capacity?.toString() || "",
      accessibility: station.accessibility || "yes",
      contactPerson: station.contactPerson || "",
      contactPhone: station.contactPhone || "",
      latitude: station.latitude?.toString() || "",
      longitude: station.longitude?.toString() || "",
      notes: station.notes || ""
    });
    setIsEditDialogOpen(true);
  };

  const handleViewStation = (station: any) => {
    setSelectedStation(station);
    // Create a view-only dialog or redirect to detailed view
    toast({
      title: "Station Details",
      description: `Viewing details for ${station.name} (${station.code})`
    });
  };

  const handleUpdateStation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStation) return;
    updateStationMutation.mutate({ id: selectedStation.id, updates: stationForm });
  };

  const useCurrentLocation = () => {
    if (location) {
      setStationForm(prev => ({
        ...prev,
        latitude: location.latitude.toString(),
        longitude: location.longitude.toString()
      }));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800";
      case "inactive": return "bg-gray-100 text-gray-800";
      case "maintenance": return "bg-yellow-100 text-yellow-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const isAdmin = user?.role === 'admin';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary">Polling Station Management</h1>
            <p className="text-muted-foreground">
              Manage polling stations across all parishes in Jamaica
            </p>
          </div>
          
          {isAdmin && (
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Polling Station
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Polling Station</DialogTitle>
                  <DialogDescription>
                    Add a new polling station to the electoral observation system
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateStation} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Station Name *</Label>
                      <Input
                        id="name"
                        value={stationForm.name}
                        onChange={(e) => setStationForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g., Kingston High School"
                      />
                    </div>
                    <div>
                      <Label htmlFor="code">Station Code *</Label>
                      <Input
                        id="code"
                        value={stationForm.code}
                        onChange={(e) => setStationForm(prev => ({ ...prev, code: e.target.value }))}
                        placeholder="e.g., KGN001"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={stationForm.address}
                      onChange={(e) => setStationForm(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="Full address of the polling station"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="parishId">Parish *</Label>
                      <Select 
                        value={stationForm.parishId} 
                        onValueChange={(value) => setStationForm(prev => ({ ...prev, parishId: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select parish" />
                        </SelectTrigger>
                        <SelectContent>
                          {parishes.map((parish: any) => (
                            <SelectItem key={parish.id} value={parish.id.toString()}>
                              {parish.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="capacity">Voter Capacity</Label>
                      <Input
                        id="capacity"
                        type="number"
                        value={stationForm.capacity}
                        onChange={(e) => setStationForm(prev => ({ ...prev, capacity: e.target.value }))}
                        placeholder="Maximum voters"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="contactPerson">Contact Person</Label>
                      <Input
                        id="contactPerson"
                        value={stationForm.contactPerson}
                        onChange={(e) => setStationForm(prev => ({ ...prev, contactPerson: e.target.value }))}
                        placeholder="Station coordinator name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="contactPhone">Contact Phone</Label>
                      <Input
                        id="contactPhone"
                        value={stationForm.contactPhone}
                        onChange={(e) => setStationForm(prev => ({ ...prev, contactPhone: e.target.value }))}
                        placeholder="Phone number"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="accessibility">Accessibility</Label>
                    <Select 
                      value={stationForm.accessibility} 
                      onValueChange={(value) => setStationForm(prev => ({ ...prev, accessibility: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">Fully Accessible</SelectItem>
                        <SelectItem value="partial">Partially Accessible</SelectItem>
                        <SelectItem value="no">Not Accessible</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>GPS Coordinates</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="Latitude"
                        value={stationForm.latitude}
                        onChange={(e) => setStationForm(prev => ({ ...prev, latitude: e.target.value }))}
                      />
                      <Input
                        placeholder="Longitude"
                        value={stationForm.longitude}
                        onChange={(e) => setStationForm(prev => ({ ...prev, longitude: e.target.value }))}
                      />
                    </div>
                    {location && (
                      <Button type="button" variant="outline" size="sm" onClick={useCurrentLocation}>
                        <MapPin className="h-3 w-3 mr-1" />
                        Use Current Location
                      </Button>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="notes">Additional Notes</Label>
                    <Input
                      id="notes"
                      value={stationForm.notes}
                      onChange={(e) => setStationForm(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Special instructions or notes"
                    />
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createStationMutation.isPending}>
                      {createStationMutation.isPending ? "Creating..." : "Create Station"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="government-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Stations</p>
                  <p className="text-2xl font-bold text-primary">{pollingStations.length}</p>
                </div>
                <Building className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="government-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Stations</p>
                  <p className="text-2xl font-bold text-green-600">
                    {pollingStations.filter(s => s.status === 'active').length}
                  </p>
                </div>
                <Activity className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="government-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Capacity</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {pollingStations.reduce((sum, s) => sum + (s.capacity || 0), 0).toLocaleString()}
                  </p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="government-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Parishes Covered</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {new Set(pollingStations.map(s => s.parishId)).size}
                  </p>
                </div>
                <MapPin className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Polling Stations List */}
        <Card className="government-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building className="h-5 w-5" />
              <span>Polling Stations</span>
            </CardTitle>
            <CardDescription>
              Comprehensive list of all polling stations across Jamaica
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pollingStations.length === 0 ? (
                <div className="text-center py-8">
                  <Building className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium text-muted-foreground mb-2">No Polling Stations</h3>
                  <p className="text-muted-foreground">
                    {isAdmin ? "Create your first polling station" : "No polling stations have been added yet"}
                  </p>
                </div>
              ) : (
                pollingStations.map((station: any) => (
                  <div key={station.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div>
                          <h4 className="font-medium">{station.name}</h4>
                          <p className="text-sm text-muted-foreground">{station.code}</p>
                        </div>
                        <Badge className={getStatusColor(station.status || 'active')}>
                          {station.status || 'active'}
                        </Badge>
                      </div>
                      {isAdmin && (
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditStation(station)}
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewStation(station)}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                        </div>
                      )}
                    </div>

                    {station.address && (
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>{station.address}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>Capacity: {station.capacity || 'Not specified'}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        <span>Parish: {station.parish?.name || 'Unknown'}</span>
                      </div>
                      {station.contactPerson && (
                        <div className="flex items-center space-x-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>Contact: {station.contactPerson}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Polling Station</DialogTitle>
              <DialogDescription>
                Update polling station information
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdateStation} className="space-y-4">
              {/* Same form fields as create dialog */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-name">Station Name *</Label>
                  <Input
                    id="edit-name"
                    value={stationForm.name}
                    onChange={(e) => setStationForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Kingston High School"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-code">Station Code *</Label>
                  <Input
                    id="edit-code"
                    value={stationForm.code}
                    onChange={(e) => setStationForm(prev => ({ ...prev, code: e.target.value }))}
                    placeholder="e.g., KGN001"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateStationMutation.isPending}>
                  {updateStationMutation.isPending ? "Updating..." : "Update Station"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}