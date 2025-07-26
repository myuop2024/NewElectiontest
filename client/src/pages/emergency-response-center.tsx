import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Shield, 
  Phone, 
  MapPin, 
  Clock, 
  Users,
  Route,
  AlertTriangle,
  Zap,
  Navigation,
  Radio,
  Ambulance,
  Car,
  Siren,
  Target,
  Timer,
  Activity
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface EmergencyResponse {
  id: string;
  type: 'medical' | 'security' | 'fire' | 'evacuation' | 'ballot_transport';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'dispatched' | 'en_route' | 'on_scene' | 'resolved';
  location: {
    stationId?: number;
    stationName?: string;
    parish: string;
    coordinates: { lat: number; lng: number };
  };
  description: string;
  responseTeam: {
    id: string;
    type: 'ambulance' | 'police' | 'fire_department' | 'jdf' | 'observer_team';
    contactNumber: string;
    estimatedArrival?: string;
    currentLocation?: { lat: number; lng: number };
  }[];
  reportedBy: number;
  assignedTo?: number;
  createdAt: string;
  dispatchedAt?: string;
  arrivedAt?: string;
  resolvedAt?: string;
  escalationLevel: number;
  routes?: any[];
}

interface EmergencyContact {
  id: string;
  name: string;
  type: 'police' | 'ambulance' | 'fire' | 'jdf' | 'eoc' | 'parish_coordinator';
  number: string;
  parish: string;
  available: boolean;
  averageResponseTime: number;
}

export default function EmergencyResponseCenter() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [emergencyType, setEmergencyType] = useState<string>('');
  const [emergencyDescription, setEmergencyDescription] = useState('');
  const [selectedStation, setSelectedStation] = useState<string>('');
  const [selectedParish, setSelectedParish] = useState<string>('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');

  // Fetch active emergencies
  const { data: emergencies = [], isLoading } = useQuery<EmergencyResponse[]>({
    queryKey: ['/api/emergency/active'],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Fetch emergency contacts
  const { data: contacts = [] } = useQuery<EmergencyContact[]>({
    queryKey: ['/api/emergency/contacts'],
  });

  // Fetch polling stations for dropdown
  const { data: stations = [] } = useQuery<any[]>({
    queryKey: ['/api/polling-stations'],
  });

  // Create emergency response
  const createEmergencyMutation = useMutation({
    mutationFn: async (data: {
      type: string;
      priority: string;
      description: string;
      stationId?: string;
      parish: string;
    }) => {
      return apiRequest('/api/emergency/create', 'POST', data);
    },
    onSuccess: () => {
      toast({ title: "Emergency Reported", description: "Emergency response has been initiated" });
      setEmergencyType('');
      setEmergencyDescription('');
      setSelectedStation('');
      queryClient.invalidateQueries({ queryKey: ['/api/emergency/active'] });
    },
  });

  // Dispatch emergency team
  const dispatchMutation = useMutation({
    mutationFn: async (data: { emergencyId: string; teamType: string; contactId: string }) => {
      return apiRequest('/api/emergency/dispatch', 'POST', data);
    },
    onSuccess: () => {
      toast({ title: "Team Dispatched", description: "Emergency team has been dispatched" });
      queryClient.invalidateQueries({ queryKey: ['/api/emergency/active'] });
    },
  });

  // Update emergency status
  const updateStatusMutation = useMutation({
    mutationFn: async (data: { emergencyId: string; status: string; notes?: string }) => {
      return apiRequest('/api/emergency/update-status', 'POST', data);
    },
    onSuccess: () => {
      toast({ title: "Status Updated", description: "Emergency status has been updated" });
      queryClient.invalidateQueries({ queryKey: ['/api/emergency/active'] });
    },
  });

  const parishes = Array.from(new Set(stations.map(s => s.parish)));

  const getEmergencyIcon = (type: string) => {
    switch (type) {
      case 'medical': return <Ambulance className="h-5 w-5 text-red-500" />;
      case 'security': return <Shield className="h-5 w-5 text-blue-500" />;
      case 'fire': return <Siren className="h-5 w-5 text-orange-500" />;
      case 'evacuation': return <Users className="h-5 w-5 text-purple-500" />;
      case 'ballot_transport': return <Car className="h-5 w-5 text-green-500" />;
      default: return <AlertTriangle className="h-5 w-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'destructive';
      case 'dispatched': return 'default';
      case 'en_route': return 'default';
      case 'on_scene': return 'default';
      case 'resolved': return 'secondary';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const handleCreateEmergency = () => {
    if (!emergencyType || !emergencyDescription || !selectedParish) {
      toast({ title: "Invalid Input", description: "Please fill all required fields", variant: "destructive" });
      return;
    }

    createEmergencyMutation.mutate({
      type: emergencyType,
      priority,
      description: emergencyDescription,
      stationId: selectedStation || undefined,
      parish: selectedParish,
    });
  };

  const activeEmergencies = emergencies.filter(e => e.status !== 'resolved');
  const resolvedEmergencies = emergencies.filter(e => e.status === 'resolved');

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Emergency Response Center</h1>
          <p className="text-muted-foreground">Rapid emergency coordination and response management</p>
        </div>
        <div className="flex space-x-2">
          {/* Quick contact buttons */}
          <Button variant="destructive" size="sm" onClick={() => window.open('tel:119', '_self')}>
            <Phone className="h-4 w-4 mr-1" />
            Police (119)
          </Button>
          <Button variant="destructive" size="sm" onClick={() => window.open('tel:110', '_self')}>
            <Ambulance className="h-4 w-4 mr-1" />
            Ambulance (110)
          </Button>
        </div>
      </div>

      {/* Overview Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{activeEmergencies.length}</p>
                <p className="text-sm text-muted-foreground">Active Emergencies</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Zap className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{activeEmergencies.filter(e => e.priority === 'critical').length}</p>
                <p className="text-sm text-muted-foreground">Critical</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Route className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{activeEmergencies.filter(e => e.status === 'en_route').length}</p>
                <p className="text-sm text-muted-foreground">En Route</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Target className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{activeEmergencies.filter(e => e.status === 'on_scene').length}</p>
                <p className="text-sm text-muted-foreground">On Scene</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="active">Active Emergencies</TabsTrigger>
          <TabsTrigger value="create">Report Emergency</TabsTrigger>
          <TabsTrigger value="contacts">Emergency Contacts</TabsTrigger>
        </TabsList>

        {/* Active Emergencies */}
        <TabsContent value="active" className="space-y-4">
          {activeEmergencies.length === 0 ? (
            <Card>
              <CardContent className="p-6">
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No active emergencies</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            activeEmergencies.map((emergency) => (
              <Card key={emergency.id} className="border-l-4" style={{ 
                borderLeftColor: emergency.priority === 'critical' ? '#ef4444' : 
                                emergency.priority === 'high' ? '#f97316' : 
                                emergency.priority === 'medium' ? '#eab308' : '#6b7280' 
              }}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getEmergencyIcon(emergency.type)}
                      <div>
                        <CardTitle className="text-lg">{emergency.type.replace('_', ' ').toUpperCase()}</CardTitle>
                        <CardDescription>
                          {emergency.location.stationName && `${emergency.location.stationName}, `}
                          {emergency.location.parish}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={getPriorityColor(emergency.priority)}>
                        {emergency.priority}
                      </Badge>
                      <Badge variant={getStatusColor(emergency.status)}>
                        {emergency.status.replace('_', ' ')}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {formatTimeAgo(emergency.createdAt)}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm">{emergency.description}</p>
                  
                  {/* Response Teams */}
                  {emergency.responseTeam.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium">Response Teams:</h4>
                      {emergency.responseTeam.map((team, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                          <div className="flex items-center space-x-2">
                            <Radio className="h-4 w-4" />
                            <span className="text-sm">{team.type.replace('_', ' ')}</span>
                            <span className="text-sm text-muted-foreground">{team.contactNumber}</span>
                          </div>
                          {team.estimatedArrival && (
                            <Badge variant="outline">
                              ETA: {new Date(team.estimatedArrival).toLocaleTimeString()}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex space-x-2">
                    {emergency.status === 'pending' && (
                      <Button 
                        size="sm"
                        onClick={() => {
                          // Show dispatch dialog
                          const teamType = prompt('Team type (ambulance/police/fire/jdf):');
                          if (teamType) {
                            dispatchMutation.mutate({
                              emergencyId: emergency.id,
                              teamType,
                              contactId: 'default'
                            });
                          }
                        }}
                        disabled={dispatchMutation.isPending}
                      >
                        <Navigation className="h-4 w-4 mr-1" />
                        Dispatch Team
                      </Button>
                    )}
                    
                    {emergency.status !== 'resolved' && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          const newStatus = prompt('New status (dispatched/en_route/on_scene/resolved):');
                          if (newStatus) {
                            updateStatusMutation.mutate({
                              emergencyId: emergency.id,
                              status: newStatus
                            });
                          }
                        }}
                        disabled={updateStatusMutation.isPending}
                      >
                        <Activity className="h-4 w-4 mr-1" />
                        Update Status
                      </Button>
                    )}
                    
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => window.open(`tel:${emergency.responseTeam[0]?.contactNumber}`, '_self')}
                    >
                      <Phone className="h-4 w-4 mr-1" />
                      Contact Team
                    </Button>
                  </div>

                  {/* Timeline */}
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>Reported: {new Date(emergency.createdAt).toLocaleString()}</div>
                    {emergency.dispatchedAt && (
                      <div>Dispatched: {new Date(emergency.dispatchedAt).toLocaleString()}</div>
                    )}
                    {emergency.arrivedAt && (
                      <div>Arrived: {new Date(emergency.arrivedAt).toLocaleString()}</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Report Emergency */}
        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Report New Emergency</CardTitle>
              <CardDescription>Create a new emergency response request</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="emergency-type">Emergency Type</Label>
                  <Select value={emergencyType} onValueChange={setEmergencyType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select emergency type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="medical">Medical Emergency</SelectItem>
                      <SelectItem value="security">Security Incident</SelectItem>
                      <SelectItem value="fire">Fire Emergency</SelectItem>
                      <SelectItem value="evacuation">Evacuation Required</SelectItem>
                      <SelectItem value="ballot_transport">Ballot Transport Issue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="priority">Priority Level</Label>
                  <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low Priority</SelectItem>
                      <SelectItem value="medium">Medium Priority</SelectItem>
                      <SelectItem value="high">High Priority</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="parish">Parish</Label>
                  <Select value={selectedParish} onValueChange={setSelectedParish}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select parish" />
                    </SelectTrigger>
                    <SelectContent>
                      {parishes.map(parish => (
                        <SelectItem key={parish} value={parish}>{parish}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="station">Polling Station (Optional)</Label>
                  <Select value={selectedStation} onValueChange={setSelectedStation}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select station" />
                    </SelectTrigger>
                    <SelectContent>
                      {stations.filter(s => s.parish === selectedParish).map(station => (
                        <SelectItem key={station.id} value={station.id.toString()}>
                          {station.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Emergency Description</Label>
                <Textarea
                  id="description"
                  placeholder="Provide detailed description of the emergency situation..."
                  value={emergencyDescription}
                  onChange={(e) => setEmergencyDescription(e.target.value)}
                  rows={4}
                />
              </div>

              <Button 
                onClick={handleCreateEmergency}
                disabled={createEmergencyMutation.isPending}
                className="w-full"
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Report Emergency
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Emergency Contacts */}
        <TabsContent value="contacts" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {contacts.map((contact) => (
              <Card key={contact.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{contact.name}</CardTitle>
                    <Badge variant={contact.available ? "default" : "secondary"}>
                      {contact.available ? "Available" : "Unavailable"}
                    </Badge>
                  </div>
                  <CardDescription>{contact.type.replace('_', ' ')} • {contact.parish}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{contact.number}</p>
                      <p className="text-xs text-muted-foreground">
                        Avg response: {contact.averageResponseTime}min
                      </p>
                    </div>
                    <Button 
                      size="sm"
                      onClick={() => window.open(`tel:${contact.number}`, '_self')}
                    >
                      <Phone className="h-4 w-4 mr-1" />
                      Call
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}