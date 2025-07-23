import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, Users, MapPin, AlertTriangle, Activity, Eye, Clock, CheckCircle } from "lucide-react";

const CHART_COLORS = ['#1E3A8A', '#059669', '#DC2626', '#D97706', '#7C3AED', '#BE185D'];

export default function RealTimeAnalytics() {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState("24h");
  const [selectedParish, setSelectedParish] = useState("all");

  const { data: analyticsData = {
    summary: { totalReports: 0, activeObservers: 0, pollingStations: 0, criticalIncidents: 0 },
    reportsByHour: [],
    reportsByType: [],
    reportsByParish: [],
    observerActivity: [],
    incidentSeverity: []
  } } = useQuery<any>({
    queryKey: ["/api/analytics", timeRange, selectedParish],
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const { data: parishes = [] } = useQuery<any[]>({
    queryKey: ["/api/parishes"],
  });

  const { data: liveUpdates = [] } = useQuery<any[]>({
    queryKey: ["/api/analytics/live-updates"],
    refetchInterval: 5000 // Refresh every 5 seconds
  });

  // Real-time WebSocket connection for live updates
  useEffect(() => {
    if (!user?.id) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws?userId=${user.id}`;
    
    try {
      const socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        console.log("Analytics WebSocket connected");
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'analytics_update') {
            // Handle real-time analytics updates
            console.log("Real-time analytics update:", data);
          }
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      socket.onerror = (error) => {
        console.error("Analytics WebSocket error:", error);
      };

      return () => {
        socket.close();
      };
    } catch (error) {
      console.error("Failed to create WebSocket connection:", error);
    }
  }, [user?.id]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "#DC2626";
      case "high": return "#D97706";
      case "medium": return "#059669";
      case "low": return "#1E3A8A";
      default: return "#6B7280";
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary">Real-Time Analytics</h1>
            <p className="text-muted-foreground">Live electoral observation monitoring and insights</p>
          </div>
          
          <div className="flex space-x-4">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">Last Hour</SelectItem>
                <SelectItem value="24h">Last 24 Hours</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedParish} onValueChange={setSelectedParish}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Parishes</SelectItem>
                {parishes.map((parish: any) => (
                  <SelectItem key={parish.id} value={parish.id.toString()}>
                    {parish.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="government-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Reports</p>
                  <p className="text-2xl font-bold text-primary">{formatNumber(analyticsData.summary.totalReports)}</p>
                  <p className="text-xs text-green-600 mt-1 flex items-center">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    +12% from yesterday
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="government-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Observers</p>
                  <p className="text-2xl font-bold text-green-600">{formatNumber(analyticsData.summary.activeObservers)}</p>
                  <p className="text-xs text-green-600 mt-1 flex items-center">
                    <Activity className="h-3 w-3 mr-1" />
                    Currently online
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="government-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Polling Stations</p>
                  <p className="text-2xl font-bold text-blue-600">{formatNumber(analyticsData.summary.pollingStations)}</p>
                  <p className="text-xs text-blue-600 mt-1 flex items-center">
                    <Eye className="h-3 w-3 mr-1" />
                    Under monitoring
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <MapPin className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="government-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Critical Incidents</p>
                  <p className="text-2xl font-bold text-red-600">{formatNumber(analyticsData.summary.criticalIncidents)}</p>
                  <p className="text-xs text-red-600 mt-1 flex items-center">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Require attention
                  </p>
                </div>
                <div className="p-3 bg-red-100 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live Updates Feed */}
        <Card className="government-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-green-500" />
              <span>Live Updates</span>
              <Badge variant="outline" className="ml-2">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></div>
                Live
              </Badge>
            </CardTitle>
            <CardDescription>Real-time activity feed from observers in the field</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {liveUpdates.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No recent updates</p>
              ) : (
                liveUpdates.slice(0, 10).map((update: any, index: number) => (
                  <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-shrink-0">
                      {update.type === 'report' ? (
                        <AlertTriangle className="h-4 w-4 text-orange-500 mt-1" />
                      ) : update.type === 'checkin' ? (
                        <CheckCircle className="h-4 w-4 text-green-500 mt-1" />
                      ) : (
                        <Activity className="h-4 w-4 text-blue-500 mt-1" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{update.message}</p>
                      <p className="text-xs text-muted-foreground">{update.location}</p>
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {update.timestamp}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Reports by Hour */}
          <Card className="government-card">
            <CardHeader>
              <CardTitle>Reports by Hour</CardTitle>
              <CardDescription>Incident reporting activity over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analyticsData.reportsByHour}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="reports" stroke="#1E3A8A" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Reports by Type */}
          <Card className="government-card">
            <CardHeader>
              <CardTitle>Incident Types</CardTitle>
              <CardDescription>Distribution of reported incidents</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analyticsData.reportsByType}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {analyticsData.reportsByType.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Reports by Parish */}
          <Card className="government-card">
            <CardHeader>
              <CardTitle>Activity by Parish</CardTitle>
              <CardDescription>Geographic distribution of incidents</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analyticsData.reportsByParish}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="parish" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="reports" fill="#059669" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Observer Activity */}
          <Card className="government-card">
            <CardHeader>
              <CardTitle>Observer Activity</CardTitle>
              <CardDescription>Active observers throughout the day</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analyticsData.observerActivity}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="active" stroke="#059669" strokeWidth={2} />
                  <Line type="monotone" dataKey="total" stroke="#1E3A8A" strokeWidth={2} strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Incident Severity Breakdown */}
        <Card className="government-card">
          <CardHeader>
            <CardTitle>Incident Severity Analysis</CardTitle>
            <CardDescription>Breakdown of incidents by severity level</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {analyticsData.incidentSeverity.map((item: any) => (
                <div key={item.severity} className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold mb-2" style={{ color: getSeverityColor(item.severity) }}>
                    {item.count}
                  </div>
                  <div className="text-sm font-medium capitalize mb-1">{item.severity}</div>
                  <div className="text-xs text-muted-foreground">
                    {((item.count / analyticsData.summary.totalReports) * 100 || 0).toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}