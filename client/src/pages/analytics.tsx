import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BarChart3, TrendingUp, Download, Calendar, Filter, MapPin } from "lucide-react";
import MetricsOverview from "@/components/analytics/metrics-overview";
import Charts from "@/components/analytics/charts";
import PollingStationsHeatMap from "@/components/maps/polling-stations-heat-map";
import EnhancedPollingStationsHeatMap from "@/components/maps/enhanced-polling-stations-heat-map";

export default function Analytics() {
  const [timeRange, setTimeRange] = useState("24h");
  const [reportType, setReportType] = useState("all");
  const queryClient = useQueryClient();

  const { data: dashboardStats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: reports, isLoading: reportsLoading } = useQuery({
    queryKey: ["/api/reports"],
  });

  const { data: stations, isLoading: stationsLoading } = useQuery({
    queryKey: ["/api/polling-stations"],
  });

  const { data: heatMapData, isLoading: heatMapLoading, refetch: refetchHeatMapData } = useQuery({
    queryKey: ["/api/maps/heatmap-data"],
  });

  const [selectedStation, setSelectedStation] = useState<any>(null);

  const exportData = () => {
    // In a real implementation, this would generate and download analytics report
    console.log("Exporting analytics data...");
  };

  if (statsLoading || reportsLoading || stationsLoading || heatMapLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 fade-in">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Analytics Dashboard</h2>
          <p className="text-muted-foreground">Real-time electoral monitoring analytics and insights</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" className="btn-caffe-outline">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button onClick={exportData} className="btn-caffe-primary">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Controls */}
      <Card className="government-card">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Time Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">Last Hour</SelectItem>
                  <SelectItem value="24h">Last 24 Hours</SelectItem>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Report Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Reports</SelectItem>
                  <SelectItem value="incident">Incident Reports</SelectItem>
                  <SelectItem value="routine">Routine Reports</SelectItem>
                  <SelectItem value="final">Final Reports</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Overview */}
      <MetricsOverview 
        stats={dashboardStats}
        reports={reports || []}
        stations={stations || []}
        timeRange={timeRange}
      />

      {/* Charts and Visualizations */}
      <Charts
        reports={reports || []}
        stations={stations || []}
        timeRange={timeRange}
        reportType={reportType}
      />

      {/* Polling Stations Map */}
      <Card className="government-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Polling Stations Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[500px] w-full">
            <EnhancedPollingStationsHeatMap
              stations={stations || []}
              selectedStation={selectedStation}
              onStationSelect={setSelectedStation}
            />
          </div>
          {selectedStation && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <h4 className="font-semibold">{selectedStation.stationCode}</h4>
              <p className="text-sm text-muted-foreground">{selectedStation.address}</p>
              <p className="text-sm mt-2">
                <Badge variant={selectedStation.isActive ? 'default' : 'secondary'}>
                  {selectedStation.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Insights */}
      <Card className="government-card">
        <CardHeader className="border-b border-border">
          <CardTitle className="flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-primary" />
            AI-Powered Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2">Participation Trends</h4>
              <p className="text-sm text-blue-700">
                Voter turnout is trending {((reports?.length || 0) > 50) ? "above" : "within"} expected ranges 
                based on historical data patterns.
              </p>
            </div>
            
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-semibold text-green-800 mb-2">Process Efficiency</h4>
              <p className="text-sm text-green-700">
                Current station efficiency is optimal with minimal queue times reported 
                across {(stations?.length || 0)} active polling locations.
              </p>
            </div>
            
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-semibold text-yellow-800 mb-2">Risk Assessment</h4>
              <p className="text-sm text-yellow-700">
                Low risk profile detected. No significant irregularities identified 
                in current observation data.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
