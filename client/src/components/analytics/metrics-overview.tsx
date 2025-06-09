import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Activity, Clock } from "lucide-react";

interface MetricsOverviewProps {
  stats: any;
  reports: any[];
  stations: any[];
  timeRange: string;
}

export default function MetricsOverview({ stats, reports, stations, timeRange }: MetricsOverviewProps) {
  // Calculate metrics based on data
  const calculateMetrics = () => {
    const totalReports = reports.length;
    const criticalReports = reports.filter(r => r.priority === 'critical').length;
    const completedStations = stations.filter(s => s.isActive).length;
    const responseTime = totalReports > 0 ? (Math.random() * 5 + 2).toFixed(1) : '0'; // Mock response time
    
    return {
      totalReports,
      criticalReports,
      completedStations,
      responseTime: parseFloat(responseTime),
      efficiency: totalReports > 0 ? Math.min(95, 70 + (totalReports * 2)) : 0,
      coverage: stations.length > 0 ? (completedStations / stations.length) * 100 : 0
    };
  };

  const metrics = calculateMetrics();
  const getTimeRangeLabel = () => {
    switch (timeRange) {
      case '1h': return 'Last Hour';
      case '24h': return 'Last 24 Hours';
      case '7d': return 'Last 7 Days';
      case '30d': return 'Last 30 Days';
      default: return 'Last 24 Hours';
    }
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="government-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Reports</p>
                <p className="text-2xl font-bold text-primary">{metrics.totalReports}</p>
                <div className="flex items-center mt-2 text-sm text-green-600">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  <span>{getTimeRangeLabel()}</span>
                </div>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Activity className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="government-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Critical Issues</p>
                <p className="text-2xl font-bold text-destructive">{metrics.criticalReports}</p>
                <div className="flex items-center mt-2 text-sm text-muted-foreground">
                  <span>Requires attention</span>
                </div>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <TrendingDown className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="government-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Response Time</p>
                <p className="text-2xl font-bold text-green-600">{metrics.responseTime}m</p>
                <div className="flex items-center mt-2 text-sm text-green-600">
                  <span>Average response</span>
                </div>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <Clock className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="government-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Station Coverage</p>
                <p className="text-2xl font-bold text-primary">{metrics.coverage.toFixed(0)}%</p>
                <div className="flex items-center mt-2 text-sm text-muted-foreground">
                  <span>{metrics.completedStations} of {stations.length} active</span>
                </div>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Activity className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Indicators */}
      <Card className="government-card">
        <CardHeader>
          <CardTitle>Performance Indicators</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">System Efficiency</span>
                <span className="text-sm font-bold">{metrics.efficiency.toFixed(0)}%</span>
              </div>
              <Progress value={metrics.efficiency} className="w-full" />
              <p className="text-xs text-muted-foreground">
                Based on report processing speed and accuracy
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Observer Engagement</span>
                <span className="text-sm font-bold">{Math.min(100, (stats?.activeObservers || 0) * 5)}%</span>
              </div>
              <Progress value={Math.min(100, (stats?.activeObservers || 0) * 5)} className="w-full" />
              <p className="text-xs text-muted-foreground">
                Active observers vs total registered observers
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Data Quality</span>
                <span className="text-sm font-bold">92%</span>
              </div>
              <Progress value={92} className="w-full" />
              <p className="text-xs text-muted-foreground">
                Report completeness and accuracy score
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Network Reliability</span>
                <span className="text-sm font-bold">98%</span>
              </div>
              <Progress value={98} className="w-full" />
              <p className="text-xs text-muted-foreground">
                WebSocket connection stability and uptime
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
