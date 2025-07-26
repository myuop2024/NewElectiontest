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
  AlertTriangle, 
  Clock, 
  MapPin, 
  Users, 
  CheckCircle,
  XCircle,
  Bell,
  Volume2,
  Phone,
  Mail,
  MessageSquare,
  Filter,
  RefreshCw,
  ArrowUp,
  Shield,
  Zap,
  Activity
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface AlertData {
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
  escalationLevel: number;
  responseTime?: number;
  impactRadius?: number;
}

interface AlertStats {
  total: number;
  active: number;
  critical: number;
  averageResponseTime: number;
  escalationRate: number;
}

export default function RealTimeAlerts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [parishFilter, setParishFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch real-time alerts
  const { data: alerts = [], isLoading, refetch } = useQuery<AlertData[]>({
    queryKey: ['/api/alerts/real-time'],
    refetchInterval: autoRefresh ? 5000 : false, // Refresh every 5 seconds
  });

  // Fetch alert statistics
  const { data: stats } = useQuery<AlertStats>({
    queryKey: ['/api/alerts/stats'],
    refetchInterval: autoRefresh ? 10000 : false,
  });

  // Acknowledge alert
  const acknowledgeMutation = useMutation({
    mutationFn: async (alertId: string) => {
      return apiRequest(`/api/alerts/${alertId}/acknowledge`, 'POST', {});
    },
    onSuccess: () => {
      toast({ title: "Alert Acknowledged", description: "Alert has been acknowledged" });
      queryClient.invalidateQueries({ queryKey: ['/api/alerts/real-time'] });
    },
  });

  // Resolve alert
  const resolveMutation = useMutation({
    mutationFn: async (data: { alertId: string; resolution: string }) => {
      return apiRequest(`/api/alerts/${data.alertId}/resolve`, 'POST', { resolution: data.resolution });
    },
    onSuccess: () => {
      toast({ title: "Alert Resolved", description: "Alert has been marked as resolved" });
      queryClient.invalidateQueries({ queryKey: ['/api/alerts/real-time'] });
    },
  });

  // Escalate alert
  const escalateMutation = useMutation({
    mutationFn: async (data: { alertId: string; reason: string }) => {
      return apiRequest(`/api/alerts/${data.alertId}/escalate`, 'POST', { reason: data.reason });
    },
    onSuccess: () => {
      toast({ title: "Alert Escalated", description: "Alert has been escalated to higher authority" });
      queryClient.invalidateQueries({ queryKey: ['/api/alerts/real-time'] });
    },
  });

  // Filter alerts
  const filteredAlerts = alerts.filter(alert => {
    const severityMatch = severityFilter === 'all' || alert.severity === severityFilter;
    const statusMatch = statusFilter === 'all' || alert.status === statusFilter;
    const parishMatch = parishFilter === 'all' || alert.location.parish === parishFilter;
    const searchMatch = searchTerm === '' || 
      alert.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    return severityMatch && statusMatch && parishMatch && searchMatch;
  });

  const parishes = Array.from(new Set(alerts.map(alert => alert.location.parish)));
  
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'acknowledged': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'resolved': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'escalated': return <ArrowUp className="h-4 w-4 text-purple-500" />;
      default: return <Bell className="h-4 w-4" />;
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

  // Auto-refresh effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(() => {
        refetch();
      }, 5000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, refetch]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Real-time Alert Center</h1>
          <p className="text-muted-foreground">Monitor and respond to alerts across all polling stations</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Activity className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-pulse' : ''}`} />
            Auto Refresh
          </Button>
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Bell className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Total Alerts</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-8 w-8 text-red-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.active}</p>
                  <p className="text-sm text-muted-foreground">Active Alerts</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Zap className="h-8 w-8 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.critical}</p>
                  <p className="text-sm text-muted-foreground">Critical</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Clock className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{Math.round(stats.averageResponseTime)}m</p>
                  <p className="text-sm text-muted-foreground">Avg Response</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <ArrowUp className="h-8 w-8 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">{Math.round(stats.escalationRate)}%</p>
                  <p className="text-sm text-muted-foreground">Escalation Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filter Alerts</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Search alerts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="severity">Severity</Label>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="acknowledged">Acknowledged</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="escalated">Escalated</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="parish">Parish</Label>
              <Select value={parishFilter} onValueChange={setParishFilter}>
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
            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSeverityFilter('all');
                  setStatusFilter('all');
                  setParishFilter('all');
                  setSearchTerm('');
                }}
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts List */}
      <div className="space-y-4">
        {isLoading ? (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-center">
                <Activity className="h-6 w-6 animate-spin mr-2" />
                <span>Loading alerts...</span>
              </div>
            </CardContent>
          </Card>
        ) : filteredAlerts.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No alerts match your current filters</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredAlerts.map((alert) => (
            <Card key={alert.id} className="border-l-4" style={{ 
              borderLeftColor: alert.severity === 'critical' ? '#ef4444' : 
                              alert.severity === 'high' ? '#f97316' : 
                              alert.severity === 'medium' ? '#eab308' : '#6b7280' 
            }}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(alert.status)}
                    <div>
                      <CardTitle className="text-lg">{alert.title}</CardTitle>
                      <CardDescription>{alert.category}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={getSeverityColor(alert.severity)}>
                      {alert.severity}
                    </Badge>
                    <Badge variant="outline">
                      {alert.status}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {formatTimeAgo(alert.createdAt)}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm">{alert.description}</p>
                
                {/* Location */}
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>
                    {alert.location.pollingStation && `${alert.location.pollingStation}, `}
                    {alert.location.parish}
                  </span>
                </div>

                {/* Channels */}
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">Channels:</span>
                  <div className="flex space-x-1">
                    {alert.channels.includes('sms') && <MessageSquare className="h-4 w-4 text-blue-500" />}
                    {alert.channels.includes('email') && <Mail className="h-4 w-4 text-green-500" />}
                    {alert.channels.includes('call') && <Phone className="h-4 w-4 text-red-500" />}
                    {alert.channels.includes('push') && <Bell className="h-4 w-4 text-purple-500" />}
                  </div>
                </div>

                {/* Actions */}
                {alert.status === 'active' && (
                  <div className="flex space-x-2">
                    <Button 
                      size="sm" 
                      onClick={() => acknowledgeMutation.mutate(alert.id)}
                      disabled={acknowledgeMutation.isPending}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Acknowledge
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        const reason = prompt('Enter escalation reason:');
                        if (reason) escalateMutation.mutate({ alertId: alert.id, reason });
                      }}
                      disabled={escalateMutation.isPending}
                    >
                      <ArrowUp className="h-4 w-4 mr-1" />
                      Escalate
                    </Button>
                  </div>
                )}

                {alert.status === 'acknowledged' && (
                  <div className="flex space-x-2">
                    <Button 
                      size="sm" 
                      variant="default"
                      onClick={() => {
                        const resolution = prompt('Enter resolution details:');
                        if (resolution) resolveMutation.mutate({ alertId: alert.id, resolution });
                      }}
                      disabled={resolveMutation.isPending}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Mark Resolved
                    </Button>
                  </div>
                )}

                {/* Response Time */}
                {alert.acknowledgedAt && (
                  <div className="text-xs text-muted-foreground">
                    Response time: {Math.round((new Date(alert.acknowledgedAt).getTime() - new Date(alert.createdAt).getTime()) / (1000 * 60))} minutes
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}