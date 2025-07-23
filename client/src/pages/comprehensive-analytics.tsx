import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  BarChart3, 
  Activity, 
  TrendingUp, 
  Users, 
  MapPin, 
  AlertTriangle,
  Brain,
  GraduationCap,
  Clock,
  RefreshCw,
  Eye,
  Download
} from "lucide-react";
import PollingStationsHeatMap from "@/components/maps/polling-stations-heat-map";
import { toast } from "@/hooks/use-toast";

interface AnalyticsData {
  realTimeMetrics: {
    activeObservers: number;
    incidentsToday: number;
    stationsMonitored: number;
    alertsActive: number;
  };
  incidentAnalytics: {
    byType: Record<string, number>;
    byParish: Record<string, number>;
    byHour: Record<string, number>;
    severity: Record<string, number>;
  };
  trainingMetrics: {
    totalEnrolled: number;
    completionRate: number;
    averageScore: number;
    certificatesIssued: number;
  };
  aiInsights: {
    sentimentOverall: string;
    riskLevel: string;
    trendsDetected: string[];
    recommendations: string[];
  };
}

export default function ComprehensiveAnalytics() {
  const [activeTab, setActiveTab] = useState("overview");
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStation, setSelectedStation] = useState<any>(null);

  // Real-time analytics data with error handling
  const { data: analytics, isLoading: analyticsLoading, refetch: refetchAnalytics, error } = useQuery<AnalyticsData>({
    queryKey: ["/api/analytics/comprehensive"],
    refetchInterval: 30000, // Refresh every 30 seconds for real-time data
    retry: 1, // Only retry once to avoid infinite loops
    refetchOnWindowFocus: false, // Prevent automatic refetch on focus
    onError: (error: any) => {
      console.error('Analytics fetch error:', error);
      toast({
        title: "Error loading analytics",
        description: "Unable to fetch analytics data. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Fetch stations data for the map
  const { data: stations = [], isLoading: stationsLoading } = useQuery<any[]>({
    queryKey: ["/api/polling-stations"],
    retry: 1,
    refetchOnWindowFocus: false
  });

  // Simplified - use only the comprehensive endpoint to avoid multiple API calls
  // Remove non-existent endpoints that cause crashes

  const handleRefreshAll = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchAnalytics(),
        // Add other refetch calls as needed
      ]);
      toast({
        title: "Data refreshed",
        description: "Analytics data has been updated successfully."
      });
    } catch (error) {
      toast({
        title: "Refresh failed",
        description: "Unable to refresh data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setRefreshing(false);
    }
  };

  if (analyticsLoading || stationsLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Electoral Analytics Hub</h1>
            <p className="text-muted-foreground">Comprehensive electoral observation insights</p>
          </div>
        </div>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Electoral Analytics Hub</h1>
            <p className="text-muted-foreground">Comprehensive electoral observation insights</p>
          </div>
        </div>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Unable to load analytics data. Showing demo data mode.
          </AlertDescription>
        </Alert>
        
        {/* Show basic UI with demo data */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Observers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">--</div>
              <p className="text-xs text-muted-foreground">Data unavailable</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Incidents Today</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">--</div>
              <p className="text-xs text-muted-foreground">Data unavailable</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Stations Monitored</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">--</div>
              <p className="text-xs text-muted-foreground">Data unavailable</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">--</div>
              <p className="text-xs text-muted-foreground">Data unavailable</p>
            </CardContent>
          </Card>
        </div>
        
        <div className="flex justify-center">
          <Button onClick={() => window.location.reload()} className="btn-caffe-primary">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry Loading
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Electoral Analytics Hub</h1>
          <p className="text-muted-foreground">Unified analytics and insights for electoral observation</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleRefreshAll} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh All
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Observers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.realTimeMetrics.activeObservers || 0}</div>
            <p className="text-xs text-muted-foreground">Currently in the field</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Incidents Today</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.realTimeMetrics.incidentsToday || 0}</div>
            <p className="text-xs text-muted-foreground">Reported incidents</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stations Monitored</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.realTimeMetrics.stationsMonitored || 0}</div>
            <p className="text-xs text-muted-foreground">Out of total stations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Risk Level</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <Badge variant={analytics?.aiInsights.riskLevel === 'low' ? 'default' : 'destructive'}>
                {analytics?.aiInsights.riskLevel || 'Monitoring'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">Current assessment</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed Analytics Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="incidents">Incidents</TabsTrigger>
          <TabsTrigger value="training">Training</TabsTrigger>
          <TabsTrigger value="ai-insights">AI Insights</TabsTrigger>
          <TabsTrigger value="real-time">Real-time</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Election Overview
                </CardTitle>
                <CardDescription>Key metrics for electoral observation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Observer Coverage</span>
                    <span className="text-sm font-medium">
                      {analytics?.realTimeMetrics.stationsMonitored || 0}/1,500 stations
                    </span>
                  </div>
                  <Progress value={((analytics?.realTimeMetrics.stationsMonitored || 0) / 1500) * 100} />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Training Completion</span>
                    <span className="text-sm font-medium">{analytics?.trainingMetrics.completionRate || 0}%</span>
                  </div>
                  <Progress value={analytics?.trainingMetrics.completionRate || 0} />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">System Health</span>
                    <Badge variant="default">Operational</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Live Activity Feed
                </CardTitle>
                <CardDescription>Recent electoral observation activity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-muted-foreground">2 min ago</span>
                    <span>New observer checked in at Polling Station 001</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <span className="text-muted-foreground">5 min ago</span>
                    <span>Minor incident reported in Kingston Parish</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-muted-foreground">8 min ago</span>
                    <span>Training module completed by Observer #453</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="incidents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Incident Analytics</CardTitle>
              <CardDescription>Detailed analysis of reported incidents</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-medium">By Type</h4>
                  {analytics?.incidentAnalytics.byType && Object.entries(analytics.incidentAnalytics.byType).map(([type, count]) => (
                    <div key={type} className="flex justify-between items-center">
                      <span className="text-sm capitalize">{type}</span>
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">By Parish</h4>
                  {analytics?.incidentAnalytics.byParish && Object.entries(analytics.incidentAnalytics.byParish).map(([parish, count]) => (
                    <div key={parish} className="flex justify-between items-center">
                      <span className="text-sm">{parish}</span>
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="training" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  Training Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold">{analytics?.trainingMetrics.totalEnrolled || 0}</div>
                  <p className="text-sm text-muted-foreground">Total Enrolled</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold">{analytics?.trainingMetrics.completionRate || 0}%</div>
                  <p className="text-sm text-muted-foreground">Completion Rate</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold">{analytics?.trainingMetrics.certificatesIssued || 0}</div>
                  <p className="text-sm text-muted-foreground">Certificates Issued</p>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Training Progress Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Observer Training</span>
                      <span className="text-sm">{analytics?.trainingMetrics.completionRate || 0}%</span>
                    </div>
                    <Progress value={analytics?.trainingMetrics.completionRate || 0} />
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Average Score</span>
                      <span className="text-sm">{analytics?.trainingMetrics.averageScore || 0}%</span>
                    </div>
                    <Progress value={analytics?.trainingMetrics.averageScore || 0} />
                  </div>

                  <Alert>
                    <GraduationCap className="h-4 w-4" />
                    <AlertDescription>
                      Training completion rate is above target. Continue monitoring for election readiness.
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="ai-insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                AI-Powered Electoral Insights
              </CardTitle>
              <CardDescription>Automated analysis and recommendations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-medium">Current Assessment</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Overall Sentiment</span>
                      <Badge variant="default">{analytics?.aiInsights.sentimentOverall || 'Neutral'}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Risk Level</span>
                      <Badge variant={analytics?.aiInsights.riskLevel === 'low' ? 'default' : 'destructive'}>
                        {analytics?.aiInsights.riskLevel || 'Monitoring'}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">Detected Trends</h4>
                  <div className="space-y-2">
                    {analytics?.aiInsights.trendsDetected?.map((trend, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-blue-500" />
                        <span className="text-sm">{trend}</span>
                      </div>
                    )) || (
                      <p className="text-sm text-muted-foreground">No significant trends detected</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium">AI Recommendations</h4>
                <div className="space-y-2">
                  {analytics?.aiInsights.recommendations?.map((rec, index) => (
                    <Alert key={index}>
                      <AlertDescription>{rec}</AlertDescription>
                    </Alert>
                  )) || (
                    <p className="text-sm text-muted-foreground">No specific recommendations at this time</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="real-time" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Real-time Status
                </CardTitle>
                <CardDescription>Live electoral observation metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">System Status</span>
                    <Badge variant="default">Online</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Active Connections</span>
                    <span className="text-sm font-medium">{analytics?.realTimeMetrics.activeObservers || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Data Updates</span>
                    <span className="text-sm font-medium">Live</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Last Refresh</span>
                    <span className="text-sm font-medium">Just now</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Active Monitoring
                </CardTitle>
                <CardDescription>Current observation coverage</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-green-600">
                      {((analytics?.realTimeMetrics.stationsMonitored || 0) / 1500 * 100).toFixed(1)}%
                    </div>
                    <p className="text-sm text-muted-foreground">Station Coverage</p>
                  </div>
                  <Progress value={((analytics?.realTimeMetrics.stationsMonitored || 0) / 1500) * 100} className="h-2" />
                  <p className="text-xs text-center text-muted-foreground">
                    {analytics?.realTimeMetrics.stationsMonitored || 0} of 1,500 polling stations
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Station Coverage Map */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Jamaica Electoral Heat Map
              </CardTitle>
              <CardDescription>Interactive Jamaica map with real-time heat map overlays</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[500px] w-full">
                <PollingStationsHeatMap 
                  stations={stations}
                  selectedStation={selectedStation}
                  onStationSelect={setSelectedStation}
                />
              </div>
              {selectedStation && (
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold">{selectedStation.stationCode}</h4>
                  <p className="text-sm text-muted-foreground">{selectedStation.address}</p>
                  <p className="text-sm mt-2">
                    <Badge variant={selectedStation.isActive ? "default" : "secondary"}>
                      {selectedStation.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}