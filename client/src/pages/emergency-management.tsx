import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useWebSocket } from "@/hooks/use-websocket";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AlertTriangle, Phone, MessageSquare, Mail, Users, Clock, MapPin, Shield, Zap, Bell } from "lucide-react";

interface EmergencyAlert {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  location: {
    pollingStation?: string;
    parish: string;
    coordinates?: { lat: number; lng: number };
  };
  status: 'active' | 'acknowledged' | 'resolved' | 'escalated';
  channels: string[];
  recipients: string[];
  createdBy: number;
  createdAt: string;
  acknowledgedBy?: number;
  acknowledgedAt?: string;
  resolvedBy?: number;
  resolvedAt?: string;
}

interface NotificationChannel {
  id: string;
  name: string;
  type: 'sms' | 'email' | 'push' | 'call' | 'whatsapp';
  enabled: boolean;
  priority: number;
  config: any;
}

interface EscalationRule {
  id: string;
  name: string;
  severity: string[];
  categories: string[];
  timeThreshold: number; // minutes
  escalateTo: string[];
  channels: string[];
  enabled: boolean;
}

export default function EmergencyManagement() {
  const [selectedAlert, setSelectedAlert] = useState<EmergencyAlert | null>(null);
  const [newAlertData, setNewAlertData] = useState({
    title: "",
    description: "",
    severity: "medium" as const,
    category: "",
    parish: "",
    pollingStation: "",
    channels: [] as string[],
    recipients: [] as string[]
  });

  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { sendMessage } = useWebSocket();

  // Fetch active emergency alerts
  const { data: activeAlerts, isLoading: alertsLoading } = useQuery<EmergencyAlert[]>({
    queryKey: ["/api/emergency/alerts/active"],
    refetchInterval: 5000 // Real-time updates
  });

  // Fetch all emergency alerts
  const { data: allAlerts } = useQuery<EmergencyAlert[]>({
    queryKey: ["/api/emergency/alerts/all"]
  });

  // Fetch notification channels
  const { data: channels } = useQuery<NotificationChannel[]>({
    queryKey: ["/api/emergency/channels"]
  });

  // Fetch escalation rules
  const { data: escalationRules } = useQuery<EscalationRule[]>({
    queryKey: ["/api/emergency/escalation-rules"]
  });

  // Fetch emergency statistics
  const { data: emergencyStats } = useQuery({
    queryKey: ["/api/emergency/stats"]
  });

  // Create emergency alert mutation
  const createAlertMutation = useMutation({
    mutationFn: async (alertData: any) => {
      return await apiRequest("POST", "/api/emergency/alerts", alertData);
    },
    onSuccess: () => {
      toast({
        title: "Emergency Alert Created",
        description: "Alert has been broadcast to all specified channels",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/emergency"] });
      setNewAlertData({
        title: "",
        description: "",
        severity: "medium",
        category: "",
        parish: "",
        pollingStation: "",
        channels: [],
        recipients: []
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Create Alert",
        description: error.message || "Unable to broadcast emergency alert",
        variant: "destructive",
      });
    },
  });

  // Acknowledge alert mutation
  const acknowledgeAlertMutation = useMutation({
    mutationFn: async (alertId: string) => {
      return await apiRequest("POST", `/api/emergency/alerts/${alertId}/acknowledge`);
    },
    onSuccess: () => {
      toast({
        title: "Alert Acknowledged",
        description: "Emergency alert has been acknowledged",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/emergency"] });
    }
  });

  // Resolve alert mutation
  const resolveAlertMutation = useMutation({
    mutationFn: async (data: { alertId: string; resolution: string }) => {
      return await apiRequest(`/api/emergency/alerts/${data.alertId}/resolve`, "POST", {
        resolution: data.resolution
      });
    },
    onSuccess: () => {
      toast({
        title: "Alert Resolved",
        description: "Emergency alert has been marked as resolved",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/emergency"] });
      setSelectedAlert(null);
    }
  });

  // Test emergency system mutation
  const testSystemMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/emergency/test");
    },
    onSuccess: () => {
      toast({
        title: "System Test Complete",
        description: "Emergency notification system is operational",
      });
    }
  });

  const handleCreateAlert = () => {
    if (!newAlertData.title.trim() || !newAlertData.description.trim()) {
      toast({
        title: "Required Fields Missing",
        description: "Please provide both title and description",
        variant: "destructive",
      });
      return;
    }

    createAlertMutation.mutate(newAlertData);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-black';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-red-100 text-red-800 border-red-300';
      case 'acknowledged': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'resolved': return 'bg-green-100 text-green-800 border-green-300';
      case 'escalated': return 'bg-purple-100 text-purple-800 border-purple-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  // Listen for real-time emergency alerts
  useEffect(() => {
    const handleEmergencyAlert = (data: any) => {
      if (data.type === 'emergency_alert') {
        toast({
          title: "🚨 EMERGENCY ALERT",
          description: `${data.alert.title} - ${data.alert.severity.toUpperCase()}`,
          variant: "destructive",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/emergency"] });
      }
    };

    // Add event listener for WebSocket messages
    window.addEventListener('emergency-alert', handleEmergencyAlert as EventListener);
    
    return () => {
      window.removeEventListener('emergency-alert', handleEmergencyAlert as EventListener);
    };
  }, [queryClient, toast]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Emergency Management</h1>
          <p className="text-gray-600 dark:text-gray-300">
            Real-time emergency alert system for critical election incidents
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Button
            onClick={() => testSystemMutation.mutate()}
            variant="outline"
            disabled={testSystemMutation.isPending}
          >
            <Bell className="h-4 w-4 mr-2" />
            Test System
          </Button>
          <Badge variant="outline" className="text-sm">
            <Shield className="h-4 w-4 mr-1" />
            Emergency Ready
          </Badge>
        </div>
      </div>

      {/* Emergency Statistics */}
      {emergencyStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Active Alerts</p>
                  <p className="text-2xl font-bold">{(emergencyStats as any)?.activeAlerts || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Avg Response</p>
                  <p className="text-2xl font-bold">{(emergencyStats as any)?.avgResponseTime || 0}m</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Recipients</p>
                  <p className="text-2xl font-bold">{(emergencyStats as any)?.totalRecipients || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Success Rate</p>
                  <p className="text-2xl font-bold">{(emergencyStats as any)?.successRate || 0}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="active" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="active">Active Alerts</TabsTrigger>
          <TabsTrigger value="create">Create Alert</TabsTrigger>
          <TabsTrigger value="history">Alert History</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <span>Active Emergency Alerts</span>
              </CardTitle>
              <CardDescription>
                Current active alerts requiring attention or response
              </CardDescription>
            </CardHeader>
            <CardContent>
              {alertsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Clock className="h-6 w-6 animate-spin mr-2" />
                  <span>Loading active alerts...</span>
                </div>
              ) : activeAlerts && activeAlerts.length > 0 ? (
                <div className="space-y-4">
                  {activeAlerts.map((alert) => (
                    <Card key={alert.id} className="border-l-4 border-l-red-500">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center space-x-2">
                              <Badge className={getSeverityColor(alert.severity)}>
                                {alert.severity.toUpperCase()}
                              </Badge>
                              <Badge variant="outline" className={getStatusColor(alert.status)}>
                                {alert.status.toUpperCase()}
                              </Badge>
                              <span className="text-sm text-gray-500">
                                {alert.category}
                              </span>
                            </div>
                            <h3 className="font-semibold text-lg">{alert.title}</h3>
                            <p className="text-gray-600 dark:text-gray-400">{alert.description}</p>
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              <span className="flex items-center">
                                <MapPin className="h-4 w-4 mr-1" />
                                {alert.location.parish}
                                {alert.location.pollingStation && ` - ${alert.location.pollingStation}`}
                              </span>
                              <span className="flex items-center">
                                <Clock className="h-4 w-4 mr-1" />
                                {new Date(alert.createdAt).toLocaleString()}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {alert.channels.map((channel, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {channel}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div className="flex flex-col space-y-2 ml-4">
                            {alert.status === 'active' && (
                              <Button
                                size="sm"
                                onClick={() => acknowledgeAlertMutation.mutate(alert.id)}
                                disabled={acknowledgeAlertMutation.isPending}
                              >
                                Acknowledge
                              </Button>
                            )}
                            {(alert.status === 'acknowledged' || alert.status === 'active') && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedAlert(alert)}
                              >
                                Resolve
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No active emergency alerts</p>
                  <p className="text-sm">System is operating normally</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="create" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="h-5 w-5 text-red-600" />
                <span>Create Emergency Alert</span>
              </CardTitle>
              <CardDescription>
                Broadcast an emergency alert to designated responders and observers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="alert-title">Alert Title</Label>
                  <Input
                    id="alert-title"
                    placeholder="Brief description of the emergency"
                    value={newAlertData.title}
                    onChange={(e) => setNewAlertData(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="severity">Severity Level</Label>
                  <Select 
                    value={newAlertData.severity} 
                    onValueChange={(value: any) => setNewAlertData(prev => ({ ...prev, severity: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low - Information</SelectItem>
                      <SelectItem value="medium">Medium - Attention Required</SelectItem>
                      <SelectItem value="high">High - Urgent Response</SelectItem>
                      <SelectItem value="critical">Critical - Immediate Action</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="alert-description">Detailed Description</Label>
                <Textarea
                  id="alert-description"
                  placeholder="Provide detailed information about the emergency situation..."
                  value={newAlertData.description}
                  onChange={(e) => setNewAlertData(prev => ({ ...prev, description: e.target.value }))}
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select 
                    value={newAlertData.category} 
                    onValueChange={(value) => setNewAlertData(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="security_threat">Security Threat</SelectItem>
                      <SelectItem value="violence">Violence/Assault</SelectItem>
                      <SelectItem value="equipment_failure">Equipment Failure</SelectItem>
                      <SelectItem value="crowd_control">Crowd Control</SelectItem>
                      <SelectItem value="medical_emergency">Medical Emergency</SelectItem>
                      <SelectItem value="natural_disaster">Natural Disaster</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="parish">Parish</Label>
                  <Select 
                    value={newAlertData.parish} 
                    onValueChange={(value) => setNewAlertData(prev => ({ ...prev, parish: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select parish" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Kingston">Kingston</SelectItem>
                      <SelectItem value="St. Andrew">St. Andrew</SelectItem>
                      <SelectItem value="St. Catherine">St. Catherine</SelectItem>
                      <SelectItem value="Clarendon">Clarendon</SelectItem>
                      <SelectItem value="Manchester">Manchester</SelectItem>
                      <SelectItem value="St. Elizabeth">St. Elizabeth</SelectItem>
                      <SelectItem value="Westmoreland">Westmoreland</SelectItem>
                      <SelectItem value="Hanover">Hanover</SelectItem>
                      <SelectItem value="St. James">St. James</SelectItem>
                      <SelectItem value="Trelawny">Trelawny</SelectItem>
                      <SelectItem value="St. Ann">St. Ann</SelectItem>
                      <SelectItem value="St. Mary">St. Mary</SelectItem>
                      <SelectItem value="Portland">Portland</SelectItem>
                      <SelectItem value="St. Thomas">St. Thomas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="polling-station">Polling Station (Optional)</Label>
                  <Input
                    id="polling-station"
                    placeholder="Station code or name"
                    value={newAlertData.pollingStation}
                    onChange={(e) => setNewAlertData(prev => ({ ...prev, pollingStation: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label>Notification Channels</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {['SMS', 'Email', 'Push Notification', 'WhatsApp', 'Voice Call'].map((channel) => (
                    <div key={channel} className="flex items-center space-x-2">
                      <Switch
                        id={`channel-${channel}`}
                        checked={newAlertData.channels.includes(channel)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setNewAlertData(prev => ({
                              ...prev,
                              channels: [...prev.channels, channel]
                            }));
                          } else {
                            setNewAlertData(prev => ({
                              ...prev,
                              channels: prev.channels.filter(c => c !== channel)
                            }));
                          }
                        }}
                      />
                      <Label htmlFor={`channel-${channel}`} className="text-sm">
                        {channel}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <Button 
                onClick={handleCreateAlert}
                disabled={createAlertMutation.isPending}
                className="w-full bg-red-600 hover:bg-red-700"
                size="lg"
              >
                {createAlertMutation.isPending ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Broadcasting Alert...
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Broadcast Emergency Alert
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Alert History</CardTitle>
              <CardDescription>
                View all emergency alerts and their resolution status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {allAlerts && allAlerts.length > 0 ? (
                <div className="space-y-4">
                  {allAlerts.map((alert) => (
                    <Card key={alert.id} className="border-l-4 border-l-gray-300">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <Badge className={getSeverityColor(alert.severity)}>
                                {alert.severity.toUpperCase()}
                              </Badge>
                              <Badge variant="outline" className={getStatusColor(alert.status)}>
                                {alert.status.toUpperCase()}
                              </Badge>
                            </div>
                            <h3 className="font-semibold">{alert.title}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{alert.description}</p>
                            <div className="text-sm text-gray-500">
                              Created: {new Date(alert.createdAt).toLocaleString()}
                              {alert.resolvedAt && (
                                <span> • Resolved: {new Date(alert.resolvedAt).toLocaleString()}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No emergency alerts found
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Emergency System Configuration</CardTitle>
              <CardDescription>
                Configure notification channels and escalation rules
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Notification Channels</h3>
                  {channels && channels.length > 0 ? (
                    <div className="space-y-3">
                      {channels.map((channel) => (
                        <div key={channel.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            {channel.type === 'sms' && <MessageSquare className="h-5 w-5" />}
                            {channel.type === 'email' && <Mail className="h-5 w-5" />}
                            {channel.type === 'call' && <Phone className="h-5 w-5" />}
                            <div>
                              <p className="font-medium">{channel.name}</p>
                              <p className="text-sm text-gray-500">Priority: {channel.priority}</p>
                            </div>
                          </div>
                          <Switch checked={channel.enabled} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No notification channels configured</p>
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">Escalation Rules</h3>
                  {escalationRules && escalationRules.length > 0 ? (
                    <div className="space-y-3">
                      {escalationRules.map((rule) => (
                        <div key={rule.id} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{rule.name}</p>
                              <p className="text-sm text-gray-500">
                                Escalate after {rule.timeThreshold} minutes
                              </p>
                            </div>
                            <Switch checked={rule.enabled} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No escalation rules configured</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Alert Resolution Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-96 max-w-[90%]">
            <CardHeader>
              <CardTitle>Resolve Emergency Alert</CardTitle>
              <CardDescription>Provide resolution details for this alert</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="font-medium">{selectedAlert.title}</p>
                <p className="text-sm text-gray-600">{selectedAlert.description}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="resolution">Resolution Notes</Label>
                <Textarea
                  id="resolution"
                  placeholder="Describe how the emergency was resolved..."
                  rows={3}
                />
              </div>
              <div className="flex space-x-2">
                <Button
                  onClick={() => {
                    const resolution = (document.getElementById('resolution') as HTMLTextAreaElement)?.value;
                    resolveAlertMutation.mutate({
                      alertId: selectedAlert.id,
                      resolution: resolution || "Alert resolved"
                    });
                  }}
                  disabled={resolveAlertMutation.isPending}
                  className="flex-1"
                >
                  Resolve Alert
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSelectedAlert(null)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}