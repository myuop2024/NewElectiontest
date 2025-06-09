import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { FileText, Plus, Search, Filter, AlertTriangle, Calendar, CheckCircle, Download, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation } from "wouter";

export default function Reports() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [selectedTab, setSelectedTab] = useState("my-reports");
  
  // Fetch user's own reports
  const { data: userReports, isLoading: userReportsLoading } = useQuery({
    queryKey: ["/api/reports", "user", user?.id],
    enabled: !!user?.id
  });

  // Fetch all reports (for admins/roving observers)
  const { data: allReports, isLoading: allReportsLoading } = useQuery({
    queryKey: ["/api/reports"],
    enabled: user?.role === 'admin' || user?.role === 'roving_observer'
  });

  const myFilteredReports = Array.isArray(userReports) ? userReports.filter((report: any) => {
    const matchesSearch = report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || report.type === filterType;
    return matchesSearch && matchesType;
  }) : [];

  const allFilteredReports = Array.isArray(allReports) ? allReports.filter((report: any) => {
    const matchesSearch = report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || report.type === filterType;
    return matchesSearch && matchesType;
  }) : [];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'status-alert';
      case 'high': return 'status-warning';
      case 'normal': return 'status-active';
      case 'low': return 'status-neutral';
      default: return 'status-neutral';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return 'status-warning';
      case 'reviewed': return 'status-active';
      case 'resolved': return 'status-neutral';
      default: return 'status-neutral';
    }
  };

  if (userReportsLoading) {
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
          <h2 className="text-2xl font-bold text-foreground">Reports</h2>
          <p className="text-muted-foreground">Manage and track electoral observation reports</p>
        </div>
        <Button className="btn-caffe-primary">
          <Plus className="h-4 w-4 mr-2" />
          New Report
        </Button>
      </div>

      {/* Search and Filters */}
      <Card className="government-card">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search reports by title or type..."
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

      {/* Reports List */}
      <div className="space-y-4">
        {myFilteredReports.map((report: any) => (
          <Card key={report.id} className="government-card hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">{report.title}</h3>
                    <Badge className={`status-indicator ${getPriorityColor(report.priority)}`}>
                      {report.priority}
                    </Badge>
                    <Badge className={`status-indicator ${getStatusColor(report.status)}`}>
                      {report.status}
                    </Badge>
                  </div>
                  
                  <p className="text-muted-foreground mb-3">{report.description}</p>
                  
                  <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                    <span>Type: <span className="font-medium">{report.type}</span></span>
                    <span>Station: <span className="font-medium">{report.stationId}</span></span>
                    <span>Created: <span className="font-medium">
                      {new Date(report.createdAt).toLocaleDateString()}
                    </span></span>
                  </div>
                </div>
                
                <div className="flex space-x-2 ml-4">
                  <Button size="sm" variant="outline">
                    View
                  </Button>
                  <Button size="sm" className="btn-caffe-primary">
                    Edit
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {myFilteredReports.length === 0 && (
        <Card className="government-card">
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No reports found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm 
                ? "Try adjusting your search criteria" 
                : "No reports have been submitted yet"
              }
            </p>
            <Button className="btn-caffe-primary">
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Report
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
