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
import { MapPin, Users, Calendar, Clock, CheckCircle, AlertCircle, Plus } from "lucide-react";
import StationTrafficStatus from "@/components/traffic/station-traffic-status";
import StationWeatherStatus from "@/components/weather/station-weather-status";

const ASSIGNMENT_STATUS = [
  { value: "pending", label: "Pending", color: "bg-yellow-100 text-yellow-800" },
  { value: "confirmed", label: "Confirmed", color: "bg-green-100 text-green-800" },
  { value: "in_progress", label: "In Progress", color: "bg-blue-100 text-blue-800" },
  { value: "completed", label: "Completed", color: "bg-gray-100 text-gray-800" },
  { value: "cancelled", label: "Cancelled", color: "bg-red-100 text-red-800" }
];

export default function ObserverAssignments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  const [assignmentForm, setAssignmentForm] = useState({
    observerId: "",
    pollingStationId: "",
    assignmentDate: "",
    shiftStart: "",
    shiftEnd: "",
    role: "",
    notes: ""
  });

  const { data: assignments = [] } = useQuery<any[]>({
    queryKey: ["/api/assignments"],
  });

  const { data: observers = [] } = useQuery<any[]>({
    queryKey: ["/api/users", "observers"],
  });

  const { data: pollingStations = [] } = useQuery<any[]>({
    queryKey: ["/api/polling-stations"],
  });

  const { data: userAssignments = [] } = useQuery<any[]>({
    queryKey: ["/api/assignments", "user", user?.id],
    enabled: !!user?.id && user?.role !== 'admin'
  });

  const createAssignmentMutation = useMutation({
    mutationFn: async (assignment: any) => {
      const response = await apiRequest("POST", "/api/assignments", {
        ...assignment,
        assignedBy: user?.id,
        status: "pending"
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assignments"] });
      toast({
        title: "Assignment Created",
        description: "Observer assignment has been created successfully.",
      });
      setIsCreateDialogOpen(false);
      setAssignmentForm({
        observerId: "",
        pollingStationId: "",
        assignmentDate: "",
        shiftStart: "",
        shiftEnd: "",
        role: "",
        notes: ""
      });
    }
  });

  const updateAssignmentMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await apiRequest("PATCH", `/api/assignments/${id}`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assignments"] });
      toast({
        title: "Assignment Updated",
        description: "Assignment status has been updated.",
      });
    }
  });

  const handleCreateAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignmentForm.observerId || !assignmentForm.pollingStationId || !assignmentForm.assignmentDate) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }
    createAssignmentMutation.mutate(assignmentForm);
  };

  const getStatusColor = (status: string) => {
    const statusInfo = ASSIGNMENT_STATUS.find(s => s.value === status);
    return statusInfo?.color || "bg-gray-100 text-gray-800";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "confirmed":
      case "completed":
        return <CheckCircle className="h-4 w-4" />;
      case "pending":
        return <Clock className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const isAdmin = user?.role === 'admin';
  const displayAssignments = isAdmin ? assignments : userAssignments;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary">Observer Assignments</h1>
            <p className="text-muted-foreground">
              {isAdmin ? "Manage observer assignments across all polling stations" : "View your assigned polling stations and schedules"}
            </p>
          </div>
          
          {isAdmin && (
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Assignment
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Create New Assignment</DialogTitle>
                  <DialogDescription>
                    Assign an observer to a polling station for election monitoring
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateAssignment} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="observerId">Observer *</Label>
                      <Select 
                        value={assignmentForm.observerId} 
                        onValueChange={(value) => setAssignmentForm(prev => ({ ...prev, observerId: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select observer" />
                        </SelectTrigger>
                        <SelectContent>
                          {observers.map((observer: any) => (
                            <SelectItem key={observer.id} value={observer.id.toString()}>
                              {observer.firstName} {observer.lastName} ({observer.role})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="pollingStationId">Polling Station *</Label>
                      <Select 
                        value={assignmentForm.pollingStationId} 
                        onValueChange={(value) => setAssignmentForm(prev => ({ ...prev, pollingStationId: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select polling station" />
                        </SelectTrigger>
                        <SelectContent>
                          {pollingStations.map((station: any) => (
                            <SelectItem key={station.id} value={station.id.toString()}>
                              {station.name} - {station.parish}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="assignmentDate">Assignment Date *</Label>
                    <Input
                      id="assignmentDate"
                      type="date"
                      value={assignmentForm.assignmentDate}
                      onChange={(e) => setAssignmentForm(prev => ({ ...prev, assignmentDate: e.target.value }))}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="shiftStart">Shift Start</Label>
                      <Input
                        id="shiftStart"
                        type="time"
                        value={assignmentForm.shiftStart}
                        onChange={(e) => setAssignmentForm(prev => ({ ...prev, shiftStart: e.target.value }))}
                      />
                    </div>

                    <div>
                      <Label htmlFor="shiftEnd">Shift End</Label>
                      <Input
                        id="shiftEnd"
                        type="time"
                        value={assignmentForm.shiftEnd}
                        onChange={(e) => setAssignmentForm(prev => ({ ...prev, shiftEnd: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="role">Assignment Role</Label>
                    <Select 
                      value={assignmentForm.role} 
                      onValueChange={(value) => setAssignmentForm(prev => ({ ...prev, role: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="primary">Primary Observer</SelectItem>
                        <SelectItem value="backup">Backup Observer</SelectItem>
                        <SelectItem value="supervisor">Supervisor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="notes">Assignment Notes</Label>
                    <Input
                      id="notes"
                      value={assignmentForm.notes}
                      onChange={(e) => setAssignmentForm(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Special instructions or notes"
                    />
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createAssignmentMutation.isPending}>
                      {createAssignmentMutation.isPending ? "Creating..." : "Create Assignment"}
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
                  <p className="text-sm font-medium text-muted-foreground">Total Assignments</p>
                  <p className="text-2xl font-bold text-primary">{displayAssignments.length}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="government-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Confirmed</p>
                  <p className="text-2xl font-bold text-green-600">
                    {displayAssignments.filter(a => a.status === 'confirmed').length}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="government-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {displayAssignments.filter(a => a.status === 'pending').length}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="government-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">In Progress</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {displayAssignments.filter(a => a.status === 'in_progress').length}
                  </p>
                </div>
                <AlertCircle className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Assignments List */}
        <Card className="government-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>{isAdmin ? "All Assignments" : "Your Assignments"}</span>
            </CardTitle>
            <CardDescription>
              {isAdmin ? "Manage and monitor all observer assignments" : "View your assigned polling stations and schedules"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {displayAssignments.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium text-muted-foreground mb-2">No Assignments</h3>
                  <p className="text-muted-foreground">
                    {isAdmin ? "Create your first observer assignment" : "No assignments have been made yet"}
                  </p>
                </div>
              ) : (
                displayAssignments.map((assignment: any) => (
                  <div key={assignment.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(assignment.status)}
                          <Badge className={getStatusColor(assignment.status)}>
                            {assignment.status}
                          </Badge>
                        </div>
                        <div>
                          <h4 className="font-medium">{assignment.pollingStation?.name}</h4>
                          <p className="text-sm text-muted-foreground">{assignment.pollingStation?.parish}</p>
                        </div>
                      </div>
                      {isAdmin && (
                        <div className="flex space-x-2">
                          {assignment.status === 'pending' && (
                            <Button
                              size="sm"
                              onClick={() => updateAssignmentMutation.mutate({ id: assignment.id, status: 'confirmed' })}
                            >
                              Confirm
                            </Button>
                          )}
                          {assignment.status === 'confirmed' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateAssignmentMutation.mutate({ id: assignment.id, status: 'in_progress' })}
                            >
                              Start
                            </Button>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{assignment.observer?.firstName} {assignment.observer?.lastName}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{new Date(assignment.assignmentDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{assignment.shiftStart} - {assignment.shiftEnd}</span>
                      </div>
                    </div>

                    {assignment.pollingStation?.address && (
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>{assignment.pollingStation.address}</span>
                      </div>
                    )}

                    {assignment.notes && (
                      <div className="text-sm text-muted-foreground bg-gray-50 p-2 rounded">
                        <strong>Notes:</strong> {assignment.notes}
                      </div>
                    )}

                    {/* Traffic & Weather Information - only show if polling station has GPS coordinates */}
                    {assignment.pollingStation?.latitude && assignment.pollingStation?.longitude && (
                      <div className="border-t pt-3 mt-3 space-y-2">
                        <StationTrafficStatus stationId={assignment.pollingStation.id} compact={true} />
                        {assignment.pollingStation?.parish && (
                          <StationWeatherStatus parish={assignment.pollingStation.parish} compact={true} />
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}