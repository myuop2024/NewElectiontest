import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/hooks/use-websocket";
import { useAuth } from "@/hooks/use-auth";
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Eye, 
  MapPin, 
  User, 
  Calendar,
  Filter,
  Search,
  MoreHorizontal,
  Bell,
  RefreshCw
} from "lucide-react";

interface Report {
  id: number;
  title: string;
  description: string;
  type: string;
  priority: string;
  status: string;
  stationId: number;
  userId: number;
  createdAt: string;
  metadata?: any;
}

export default function IncidentManagement() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  // WebSocket for real-time updates
  const { lastMessage } = useWebSocket();

  // Fetch all reports
  const { data: reports = [], isLoading, refetch } = useQuery<Report[]>({
    queryKey: ["/api/reports"],
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Fetch polling stations for reference
  const { data: pollingStations = [] } = useQuery<any[]>({
    queryKey: ["/api/polling-stations"],
  });

  // Fetch users for reporter names
  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/users/observers"],
  });

  // Update report status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ reportId, status }: { reportId: number; status: string }) =>
      apiRequest(`/api/reports/${reportId}`, "PATCH", { status }),
    onSuccess: () => {
      toast({
        title: "Status Updated",
        description: "Incident report status has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update incident status",
        variant: "destructive"
      });
    }
  });

  // Handle real-time WebSocket updates
  useState(() => {
    if (lastMessage?.data) {
      try {
        const data = JSON.parse(lastMessage.data);
        if (data.type === 'incident_reported') {
          toast({
            title: "New Incident Report",
            description: `${data.report.title} - ${data.report.type}`,
          });
          refetch();
        }
      } catch (error) {
        // Ignore parsing errors
      }
    }
  }, [lastMessage]);

  // Filter reports based on status, priority, and search
  const filteredReports = reports.filter(report => {
    const matchesStatus = filterStatus === "all" || report.status === filterStatus;
    const matchesPriority = filterPriority === "all" || report.priority === filterPriority;
    const matchesSearch = !searchTerm || 
      report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.type.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesPriority && matchesSearch;
  });

  // Group reports by status for tabs
  const reportsByStatus = {
    all: filteredReports,
    submitted: filteredReports.filter(r => r.status === 'submitted'),
    reviewed: filteredReports.filter(r => r.status === 'reviewed'),
    resolved: filteredReports.filter(r => r.status === 'resolved')
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-black';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'submitted': return <Clock className="h-4 w-4" />;
      case 'reviewed': return <Eye className="h-4 w-4" />;
      case 'resolved': return <CheckCircle className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getStationName = (stationId: number) => {
    const station = pollingStations.find(s => s.id === stationId);
    return station ? `${station.name} (${station.stationCode})` : `Station ${stationId}`;
  };

  const getReporterName = (userId: number) => {
    const reporter = users.find(u => u.id === userId);
    return reporter ? reporter.username : `User ${userId}`;
  };

  const formatCategory = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const handleStatusChange = (reportId: number, newStatus: string) => {
    updateStatusMutation.mutate({ reportId, status: newStatus });
  };

  if (user?.role !== 'admin' && user?.role !== 'roving_observer') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-8 text-center">
              <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
              <p className="text-muted-foreground">
                You need administrator or roving observer privileges to access incident management.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary flex items-center space-x-2">
              <AlertTriangle className="h-8 w-8 text-orange-600" />
              <span>Incident Management</span>
            </h1>
            <p className="text-muted-foreground">Monitor and manage electoral incident reports</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Badge variant="secondary" className="flex items-center space-x-1">
              <Bell className="h-3 w-3" />
              <span>{reportsByStatus.submitted.length} New</span>
            </Badge>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search incidents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64"
                />
              </div>
              
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="reviewed">Reviewed</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>

              <Badge variant="outline" className="ml-auto">
                {filteredReports.length} incidents
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Reports Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all" className="flex items-center space-x-2">
              <span>All</span>
              <Badge variant="secondary">{reportsByStatus.all.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="submitted" className="flex items-center space-x-2">
              <span>New</span>
              <Badge variant="destructive">{reportsByStatus.submitted.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="reviewed" className="flex items-center space-x-2">
              <span>Reviewed</span>
              <Badge variant="secondary">{reportsByStatus.reviewed.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="resolved" className="flex items-center space-x-2">
              <span>Resolved</span>
              <Badge variant="secondary">{reportsByStatus.resolved.length}</Badge>
            </TabsTrigger>
          </TabsList>

          {Object.entries(reportsByStatus).map(([status, statusReports]) => (
            <TabsContent key={status} value={status} className="space-y-4">
              {isLoading ? (
                <div className="text-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
                  <p className="text-muted-foreground">Loading incident reports...</p>
                </div>
              ) : statusReports.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <AlertTriangle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Incidents Found</h3>
                    <p className="text-muted-foreground">
                      {status === 'all' ? 'No incident reports match your filters' : `No ${status} incidents`}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {statusReports.map((report) => (
                    <Card key={report.id} className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <CardTitle className="text-lg">{report.title}</CardTitle>
                            <CardDescription className="flex items-center space-x-2">
                              <Badge variant="outline">{formatCategory(report.type)}</Badge>
                              <Badge className={getPriorityColor(report.priority)}>
                                {report.priority.toUpperCase()}
                              </Badge>
                            </CardDescription>
                          </div>
                          <div className="flex items-center space-x-1">
                            {getStatusIcon(report.status)}
                            <span className="text-sm capitalize">{report.status}</span>
                          </div>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="space-y-3">
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {report.description}
                        </p>
                        
                        <div className="space-y-2 text-xs text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <MapPin className="h-3 w-3" />
                            <span>{getStationName(report.stationId)}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <User className="h-3 w-3" />
                            <span>Reported by {getReporterName(report.userId)}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3" />
                            <span>{new Date(report.createdAt).toLocaleString()}</span>
                          </div>
                        </div>

                        {user?.role === 'admin' && (
                          <div className="flex items-center space-x-2 pt-2 border-t">
                            <Select
                              value={report.status}
                              onValueChange={(newStatus) => handleStatusChange(report.id, newStatus)}
                            >
                              <SelectTrigger className="flex-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="submitted">Submitted</SelectItem>
                                <SelectItem value="reviewed">Reviewed</SelectItem>
                                <SelectItem value="resolved">Resolved</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setSelectedReport(report)}
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}