import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { 
  Users, 
  MapPin, 
  Clock, 
  Route, 
  AlertTriangle, 
  Target,
  Navigation,
  Battery,
  Signal,
  MessageSquare,
  Phone,
  Video,
  Shield,
  Radio,
  Activity
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface Observer {
  id: number;
  username: string;
  observerId: string;
  currentStatus: 'active' | 'inactive' | 'break' | 'emergency' | 'offline';
  currentLocation?: {
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: string;
    battery?: number;
    signal?: number;
  };
  assignedStations: number[];
  lastCheckIn: string;
  routeProgress: {
    totalStations: number;
    completedStations: number;
    currentStation?: number;
    estimatedCompletion: string;
  };
  emergencyContact: {
    primary: string;
    secondary?: string;
  };
  capabilities: string[];
  parish: string;
}

interface Coordination {
  id: string;
  type: 'assignment' | 'redeployment' | 'emergency' | 'backup_request';
  priority: 'low' | 'medium' | 'high' | 'critical';
  targetObservers: number[];
  message: string;
  deadline?: string;
  status: 'pending' | 'acknowledged' | 'completed' | 'failed';
  createdAt: string;
  responseData?: any;
}

export default function ObserverCoordination() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedObservers, setSelectedObservers] = useState<number[]>([]);
  const [coordinationMessage, setCoordinationMessage] = useState('');
  const [coordinationType, setCoordinationType] = useState<'assignment' | 'redeployment' | 'emergency' | 'backup_request'>('assignment');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [filterParish, setFilterParish] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Fetch active observers
  const { data: observers = [], isLoading, refetch } = useQuery<Observer[]>({
    queryKey: ['/api/observers/active'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch coordination history
  const { data: coordinations = [] } = useQuery<Coordination[]>({
    queryKey: ['/api/coordination/recent'],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Send coordination instruction
  const coordinationMutation = useMutation({
    mutationFn: async (data: {
      type: string;
      priority: string;
      targetObservers: number[];
      message: string;
      deadline?: string;
    }) => {
      return apiRequest('/api/coordination/send', 'POST', data);
    },
    onSuccess: () => {
      toast({ title: "Coordination Sent", description: "Instructions sent to selected observers" });
      setSelectedObservers([]);
      setCoordinationMessage('');
      queryClient.invalidateQueries({ queryKey: ['/api/coordination/recent'] });
    },
    onError: () => {
      toast({ title: "Failed to Send", description: "Could not send coordination instructions", variant: "destructive" });
    },
  });

  // Emergency broadcast
  const emergencyMutation = useMutation({
    mutationFn: async (data: {
      message: string;
      parish?: string;
      stationIds?: number[];
    }) => {
      return apiRequest('/api/coordination/emergency-broadcast', 'POST', data);
    },
    onSuccess: () => {
      toast({ title: "Emergency Broadcast Sent", description: "Alert sent to all active observers" });
    },
  });

  const filteredObservers = observers.filter(observer => {
    const parishMatch = filterParish === 'all' || observer.parish === filterParish;
    const statusMatch = filterStatus === 'all' || observer.currentStatus === filterStatus;
    return parishMatch && statusMatch;
  });

  const parishes = Array.from(new Set(observers.map(o => o.parish)));
  const statuses = ['active', 'inactive', 'break', 'emergency', 'offline'];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'inactive': return 'bg-gray-400';
      case 'break': return 'bg-yellow-500';
      case 'emergency': return 'bg-red-500';
      case 'offline': return 'bg-gray-600';
      default: return 'bg-gray-400';
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

  const handleSendCoordination = () => {
    if (selectedObservers.length === 0 || !coordinationMessage) {
      toast({ title: "Invalid Input", description: "Select observers and enter a message", variant: "destructive" });
      return;
    }

    coordinationMutation.mutate({
      type: coordinationType,
      priority,
      targetObservers: selectedObservers,
      message: coordinationMessage,
    });
  };

  const handleEmergencyBroadcast = () => {
    if (!coordinationMessage) {
      toast({ title: "Invalid Input", description: "Enter emergency message", variant: "destructive" });
      return;
    }

    emergencyMutation.mutate({
      message: coordinationMessage,
      parish: filterParish !== 'all' ? filterParish : undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Activity className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading observer coordination...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Observer Coordination</h1>
          <p className="text-muted-foreground">Real-time coordination and management of field observers</p>
        </div>
        <Button 
          onClick={() => refetch()}
          variant="outline"
          size="sm"
        >
          <Activity className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Users className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{observers.filter(o => o.currentStatus === 'active').length}</p>
                <p className="text-sm text-muted-foreground">Active Observers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <MapPin className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{parishes.length}</p>
                <p className="text-sm text-muted-foreground">Parishes Covered</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{observers.filter(o => o.currentStatus === 'emergency').length}</p>
                <p className="text-sm text-muted-foreground">Emergency Status</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Target className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{observers.reduce((sum, o) => sum + o.routeProgress.completedStations, 0)}</p>
                <p className="text-sm text-muted-foreground">Stations Covered</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="observers" className="space-y-4">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="observers">Observer Management</TabsTrigger>
          <TabsTrigger value="coordination">Send Instructions</TabsTrigger>
          <TabsTrigger value="history">Coordination History</TabsTrigger>
        </TabsList>

        {/* Observer Management */}
        <TabsContent value="observers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Filter Observers</CardTitle>
              <div className="flex space-x-4">
                <div className="flex-1">
                  <Label htmlFor="parish-filter">Parish</Label>
                  <Select value={filterParish} onValueChange={setFilterParish}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Parishes</SelectItem>
                      {parishes.map(parish => (
                        <SelectItem key={parish} value={parish}>{parish}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Label htmlFor="status-filter">Status</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      {statuses.map(status => (
                        <SelectItem key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredObservers.map((observer) => (
              <Card 
                key={observer.id} 
                className={`cursor-pointer transition-colors ${
                  selectedObservers.includes(observer.id) ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => {
                  setSelectedObservers(prev => 
                    prev.includes(observer.id) 
                      ? prev.filter(id => id !== observer.id)
                      : [...prev, observer.id]
                  );
                }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(observer.currentStatus)}`} />
                      <div>
                        <CardTitle className="text-lg">Observer #{observer.observerId}</CardTitle>
                        <CardDescription>{observer.username} • {observer.parish}</CardDescription>
                      </div>
                    </div>
                    <Badge variant="outline">{observer.currentStatus}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Location Info */}
                  {observer.currentLocation && (
                    <div className="flex items-center space-x-4 text-sm">
                      <div className="flex items-center space-x-1">
                        <MapPin className="h-4 w-4" />
                        <span>{observer.currentLocation.latitude.toFixed(4)}, {observer.currentLocation.longitude.toFixed(4)}</span>
                      </div>
                      {observer.currentLocation.battery && (
                        <div className="flex items-center space-x-1">
                          <Battery className="h-4 w-4" />
                          <span>{observer.currentLocation.battery}%</span>
                        </div>
                      )}
                      {observer.currentLocation.signal && (
                        <div className="flex items-center space-x-1">
                          <Signal className="h-4 w-4" />
                          <span>{observer.currentLocation.signal}%</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Route Progress */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Route Progress</span>
                      <span>{observer.routeProgress.completedStations}/{observer.routeProgress.totalStations}</span>
                    </div>
                    <Progress 
                      value={(observer.routeProgress.completedStations / observer.routeProgress.totalStations) * 100}
                      className="h-2"
                    />
                    <p className="text-xs text-muted-foreground">
                      Expected completion: {new Date(observer.routeProgress.estimatedCompletion).toLocaleTimeString()}
                    </p>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(`tel:${observer.emergencyContact.primary}`, '_self');
                      }}
                    >
                      <Phone className="h-4 w-4 mr-1" />
                      Call
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Implement direct messaging
                      }}
                    >
                      <MessageSquare className="h-4 w-4 mr-1" />
                      Message
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Send Instructions */}
        <TabsContent value="coordination" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Send Coordination Instructions</CardTitle>
              <CardDescription>
                Send instructions to selected observers ({selectedObservers.length} selected)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="coordination-type">Instruction Type</Label>
                  <Select value={coordinationType} onValueChange={(value: any) => setCoordinationType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="assignment">New Assignment</SelectItem>
                      <SelectItem value="redeployment">Redeployment</SelectItem>
                      <SelectItem value="emergency">Emergency Response</SelectItem>
                      <SelectItem value="backup_request">Backup Request</SelectItem>
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

              <div>
                <Label htmlFor="message">Instruction Message</Label>
                <Textarea
                  id="message"
                  placeholder="Enter detailed instructions for the selected observers..."
                  value={coordinationMessage}
                  onChange={(e) => setCoordinationMessage(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="flex space-x-2">
                <Button 
                  onClick={handleSendCoordination}
                  disabled={selectedObservers.length === 0 || !coordinationMessage || coordinationMutation.isPending}
                  className="flex-1"
                >
                  <Navigation className="h-4 w-4 mr-2" />
                  Send Instructions
                </Button>
                <Button 
                  onClick={handleEmergencyBroadcast}
                  disabled={!coordinationMessage || emergencyMutation.isPending}
                  variant="destructive"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Emergency Broadcast
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Coordination History */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Coordination Activities</CardTitle>
            </CardHeader>
            <CardContent>
              {coordinations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Radio className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No recent coordination activities</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {coordinations.map((coordination) => (
                    <div key={coordination.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Badge variant={getPriorityColor(coordination.priority)}>
                            {coordination.priority}
                          </Badge>
                          <span className="font-medium">{coordination.type.replace('_', ' ')}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">{coordination.status}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {new Date(coordination.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Sent to {coordination.targetObservers.length} observers
                      </p>
                      <p className="text-sm">{coordination.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}