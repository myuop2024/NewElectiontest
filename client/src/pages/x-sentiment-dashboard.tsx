import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Twitter, 
  TrendingUp, 
  AlertTriangle, 
  MessageSquare, 
  Heart,
  Users,
  Settings,
  Play,
  RefreshCw,
  BarChart3,
  Brain,
  Shield,
  Eye,
  Filter,
  Download
} from "lucide-react";

interface SentimentAnalysis {
  parish?: string;
  station_id?: number;
  sentiment_analysis: {
    total_posts: number;
    sentiment_summary: {
      average_sentiment: number;
      sentiment_distribution: {
        positive: number;
        negative: number;
        neutral: number;
      };
      threat_assessment: {
        low: number;
        medium: number;
        high: number;
        critical: number;
      };
      key_insights: {
        politicians: Array<{name: string, count: number}>;
        parties: Array<{name: string, count: number}>;
        topics: Array<{name: string, count: number}>;
      };
    };
  };
  generated_at: string;
}

interface XMonitoringAlert {
  id: number;
  alertType: string;
  severity: string;
  title: string;
  description: string;
  parish?: string;
  pollingStationId?: number;
  isResolved: boolean;
  createdAt: string;
  sentimentData?: any;
  recommendations?: string[];
}

interface DashboardData {
  summary: {
    total_posts: number;
    processed_posts: number;
    active_alerts: number;
    processing_rate: string;
  };
  sentiment_distribution: Array<{sentiment: string, count: string}>;
  threat_distribution: Array<{threatLevel: string, count: string}>;
  period_hours: number;
  generated_at: string;
}

const JAMAICA_PARISHES = [
  'Kingston', 'St. Andrew', 'St. Thomas', 'Portland', 'St. Mary', 'St. Ann',
  'Trelawny', 'St. James', 'Hanover', 'Westmoreland', 'St. Elizabeth',
  'Manchester', 'Clarendon', 'St. Catherine'
];

export default function XSentimentDashboard() {
  const [selectedParish, setSelectedParish] = useState<string>("");
  const [selectedHours, setSelectedHours] = useState(24);
  const [alertFilters, setAlertFilters] = useState({
    severity: "",
    parish: "",
    resolved: ""
  });
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [newConfig, setNewConfig] = useState({
    configName: "",
    monitoringFrequency: 15,
    keywords: "election,vote,democracy,Jamaica,politics",
    locations: "Kingston,St. Andrew,St. Catherine"
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch dashboard summary data
  const { data: dashboardData, isLoading: dashboardLoading, refetch: refetchDashboard } = useQuery({
    queryKey: ["/api/x-sentiment/dashboard", selectedHours],
    refetchInterval: 30000 // Auto-refresh every 30 seconds
  });

  // Fetch parish sentiment analysis
  const { data: parishAnalysis, isLoading: parishLoading } = useQuery({
    queryKey: ["/api/x-sentiment/parish", selectedParish, selectedHours],
    enabled: !!selectedParish
  });

  // Fetch monitoring alerts
  const { data: alertsData, isLoading: alertsLoading } = useQuery({
    queryKey: ["/api/x-sentiment/alerts", alertFilters],
    refetchInterval: 15000 // Refresh alerts frequently
  });

  // Fetch monitoring configurations
  const { data: configsData, isLoading: configsLoading } = useQuery({
    queryKey: ["/api/x-sentiment/config"]
  });

  // Monitor X content mutation
  const monitorMutation = useMutation({
    mutationFn: (configId?: number) => 
      apiRequest("/api/x-sentiment/monitor", "POST", { configId }),
    onSuccess: (data) => {
      toast({
        title: "X Monitoring Complete",
        description: `Processed ${data.posts_processed} posts, generated ${data.alerts_generated} alerts`
      });
      queryClient.invalidateQueries({ queryKey: ["/api/x-sentiment/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/x-sentiment/alerts"] });
    },
    onError: (error: any) => {
      toast({
        title: "Monitoring Failed",
        description: error.message || "Failed to monitor X content",
        variant: "destructive"
      });
    }
  });

  // Create monitoring configuration mutation
  const createConfigMutation = useMutation({
    mutationFn: (configData: any) =>
      apiRequest("/api/x-sentiment/config", "POST", configData),
    onSuccess: () => {
      toast({
        title: "Configuration Created",
        description: "X monitoring configuration created successfully"
      });
      setShowConfigDialog(false);
      queryClient.invalidateQueries({ queryKey: ["/api/x-sentiment/config"] });
      setNewConfig({
        configName: "",
        monitoringFrequency: 15,
        keywords: "election,vote,democracy,Jamaica,politics",
        locations: "Kingston,St. Andrew,St. Catherine"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Configuration Failed",
        description: error.message || "Failed to create configuration",
        variant: "destructive"
      });
    }
  });

  // Batch analysis mutation
  const batchAnalysisMutation = useMutation({
    mutationFn: (limit: number) =>
      apiRequest("/api/x-sentiment/analyze/batch", "POST", { limit }),
    onSuccess: (data) => {
      toast({
        title: "Batch Analysis Complete",
        description: `Processed ${data.successfully_processed} posts`
      });
      queryClient.invalidateQueries({ queryKey: ["/api/x-sentiment/dashboard"] });
    },
    onError: (error: any) => {
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to perform batch analysis",
        variant: "destructive"
      });
    }
  });

  const handleManualMonitor = () => {
    monitorMutation.mutate();
  };

  const handleCreateConfig = () => {
    const configData = {
      ...newConfig,
      keywords: newConfig.keywords.split(',').map(k => k.trim()),
      locations: newConfig.locations.split(',').map(l => l.trim())
    };
    createConfigMutation.mutate(configData);
  };

  const handleBatchAnalysis = () => {
    batchAnalysisMutation.mutate(50);
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-600 bg-green-100';
      case 'negative': return 'text-red-600 bg-red-100';
      case 'neutral': return 'text-gray-600 bg-gray-100';
      default: return 'text-blue-600 bg-blue-100';
    }
  };

  const getThreatColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatNumber = (num: number | string) => {
    const number = typeof num === 'string' ? parseInt(num) : num;
    return number.toLocaleString();
  };

  return (
    <div className="p-6 space-y-6 fade-in">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center">
            <Twitter className="h-6 w-6 mr-2 text-blue-500" />
            X (Twitter) Sentiment Analysis
          </h2>
          <p className="text-muted-foreground">
            Real-time social media sentiment monitoring for Jamaica elections
          </p>
        </div>
        <div className="flex space-x-2">
          <Button 
            onClick={handleManualMonitor}
            disabled={monitorMutation.isPending}
            className="btn-caffe-primary"
          >
            {monitorMutation.isPending ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Monitor Now
          </Button>
          <Button 
            onClick={handleBatchAnalysis}
            disabled={batchAnalysisMutation.isPending}
            variant="outline"
          >
            {batchAnalysisMutation.isPending ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Brain className="h-4 w-4 mr-2" />
            )}
            Analyze Pending
          </Button>
          <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Configure
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>X Monitoring Configuration</DialogTitle>
                <DialogDescription>
                  Configure monitoring parameters for X social media analysis
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="configName">Configuration Name</Label>
                  <Input
                    id="configName"
                    placeholder="e.g., Jamaica Elections 2024"
                    value={newConfig.configName}
                    onChange={(e) => setNewConfig(prev => ({ ...prev, configName: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="frequency">Monitoring Frequency (minutes)</Label>
                  <Input
                    id="frequency"
                    type="number"
                    value={newConfig.monitoringFrequency}
                    onChange={(e) => setNewConfig(prev => ({ ...prev, monitoringFrequency: parseInt(e.target.value) }))}
                  />
                </div>
                <div>
                  <Label htmlFor="keywords">Keywords (comma-separated)</Label>
                  <Input
                    id="keywords"
                    placeholder="election,vote,democracy,Jamaica"
                    value={newConfig.keywords}
                    onChange={(e) => setNewConfig(prev => ({ ...prev, keywords: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="locations">Locations (comma-separated)</Label>
                  <Input
                    id="locations"
                    placeholder="Kingston,St. Andrew,St. Catherine"
                    value={newConfig.locations}
                    onChange={(e) => setNewConfig(prev => ({ ...prev, locations: e.target.value }))}
                  />
                </div>
                <Button 
                  onClick={handleCreateConfig}
                  disabled={createConfigMutation.isPending || !newConfig.configName}
                  className="w-full btn-caffe-primary"
                >
                  {createConfigMutation.isPending ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    "Create Configuration"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Time Period Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <Label>Analysis Period:</Label>
            <Select value={selectedHours.toString()} onValueChange={(value) => setSelectedHours(parseInt(value))}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Last Hour</SelectItem>
                <SelectItem value="6">Last 6 Hours</SelectItem>
                <SelectItem value="24">Last 24 Hours</SelectItem>
                <SelectItem value="48">Last 48 Hours</SelectItem>
                <SelectItem value="168">Last Week</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => refetchDashboard()} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="parish">Parish Analysis</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {dashboardLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : dashboardData ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="government-card">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Posts</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {formatNumber(dashboardData.summary.total_posts)}
                        </p>
                      </div>
                      <MessageSquare className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="government-card">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Processed</p>
                        <p className="text-2xl font-bold text-green-600">
                          {formatNumber(dashboardData.summary.processed_posts)}
                        </p>
                        <p className="text-xs text-green-600 mt-1">
                          {dashboardData.summary.processing_rate}% complete
                        </p>
                      </div>
                      <Brain className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="government-card">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Active Alerts</p>
                        <p className="text-2xl font-bold text-orange-600">
                          {formatNumber(dashboardData.summary.active_alerts)}
                        </p>
                      </div>
                      <AlertTriangle className="h-8 w-8 text-orange-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="government-card">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Period</p>
                        <p className="text-2xl font-bold text-purple-600">
                          {dashboardData.period_hours}h
                        </p>
                      </div>
                      <BarChart3 className="h-8 w-8 text-purple-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Sentiment & Threat Analysis */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Sentiment Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Heart className="h-5 w-5 mr-2" />
                      Sentiment Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {dashboardData.sentiment_distribution.map((item) => (
                        <div key={item.sentiment} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Badge className={getSentimentColor(item.sentiment)}>
                              {item.sentiment}
                            </Badge>
                          </div>
                          <span className="font-semibold">{formatNumber(item.count)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Threat Level Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Shield className="h-5 w-5 mr-2" />
                      Threat Assessment
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {dashboardData.threat_distribution.map((item) => (
                        <div key={item.threatLevel} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Badge className={getThreatColor(item.threatLevel)}>
                              {item.threatLevel}
                            </Badge>
                          </div>
                          <span className="font-semibold">{formatNumber(item.count)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Twitter className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Data Available</h3>
                <p className="text-muted-foreground mb-4">
                  No X sentiment data found for the selected period.
                </p>
                <Button onClick={handleManualMonitor} className="btn-caffe-primary">
                  Start Monitoring
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Parish Analysis Tab */}
        <TabsContent value="parish" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Parish Sentiment Analysis</CardTitle>
              <CardContent className="pt-0">
                <div className="flex items-center space-x-4 mb-6">
                  <Label>Select Parish:</Label>
                  <Select value={selectedParish} onValueChange={setSelectedParish}>
                    <SelectTrigger className="w-60">
                      <SelectValue placeholder="Choose a parish to analyze" />
                    </SelectTrigger>
                    <SelectContent>
                      {JAMAICA_PARISHES.map((parish) => (
                        <SelectItem key={parish} value={parish}>
                          {parish}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedParish && (
                  parishLoading ? (
                    <div className="space-y-4">
                      <div className="animate-pulse">
                        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {[...Array(3)].map((_, i) => (
                            <div key={i} className="h-24 bg-gray-200 rounded"></div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : parishAnalysis?.sentiment_analysis ? (
                    <div className="space-y-6">
                      {/* Parish Summary */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card>
                          <CardContent className="p-4 text-center">
                            <p className="text-sm text-muted-foreground">Total Posts</p>
                            <p className="text-2xl font-bold">
                              {formatNumber(parishAnalysis.sentiment_analysis.total_posts)}
                            </p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-4 text-center">
                            <p className="text-sm text-muted-foreground">Average Sentiment</p>
                            <p className="text-2xl font-bold">
                              {parishAnalysis.sentiment_analysis.sentiment_summary.average_sentiment.toFixed(2)}
                            </p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-4 text-center">
                            <p className="text-sm text-muted-foreground">Period</p>
                            <p className="text-2xl font-bold">{selectedHours}h</p>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Top Politicians & Parties */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Top Politicians Mentioned</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              {parishAnalysis.sentiment_analysis.sentiment_summary.key_insights.politicians.slice(0, 5).map((politician, index) => (
                                <div key={politician.name} className="flex items-center justify-between">
                                  <span className="text-sm">{politician.name}</span>
                                  <Badge variant="outline">{politician.count}</Badge>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Political Parties</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              {parishAnalysis.sentiment_analysis.sentiment_summary.key_insights.parties.slice(0, 5).map((party, index) => (
                                <div key={party.name} className="flex items-center justify-between">
                                  <span className="text-sm">{party.name}</span>
                                  <Badge variant="outline">{party.count}</Badge>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Eye className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-muted-foreground">
                        No sentiment data available for {selectedParish} in the last {selectedHours} hours.
                      </p>
                    </div>
                  )
                )}
              </CardContent>
            </CardHeader>
          </Card>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  X Sentiment Alerts
                </span>
                <div className="flex items-center space-x-2">
                  <Select 
                    value={alertFilters.severity} 
                    onValueChange={(value) => setAlertFilters(prev => ({ ...prev, severity: value }))}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Severity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {alertsLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-20 bg-gray-200 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : alertsData?.alerts?.length > 0 ? (
                <div className="space-y-4">
                  {alertsData.alerts.map((alert: XMonitoringAlert) => (
                    <Card key={alert.id} className="border-l-4 border-l-orange-500">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <Badge className={getThreatColor(alert.severity)}>
                                {alert.severity.toUpperCase()}
                              </Badge>
                              <Badge variant="outline">{alert.alertType}</Badge>
                              {alert.parish && (
                                <Badge variant="secondary">{alert.parish}</Badge>
                              )}
                            </div>
                            <h4 className="font-semibold mb-1">{alert.title}</h4>
                            <p className="text-sm text-muted-foreground mb-2">
                              {alert.description}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(alert.createdAt).toLocaleString()}
                            </p>
                            {alert.recommendations && alert.recommendations.length > 0 && (
                              <div className="mt-2">
                                <p className="text-xs font-medium mb-1">Recommendations:</p>
                                <ul className="text-xs text-muted-foreground list-disc list-inside">
                                  {alert.recommendations.slice(0, 2).map((rec, index) => (
                                    <li key={index}>{rec}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge 
                              variant={alert.isResolved ? "default" : "destructive"}
                            >
                              {alert.isResolved ? "Resolved" : "Active"}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Shield className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-muted-foreground">No alerts found matching the current filters.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Configuration Tab */}
        <TabsContent value="config" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                Monitoring Configurations
              </CardTitle>
            </CardHeader>
            <CardContent>
              {configsLoading ? (
                <div className="space-y-4">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-16 bg-gray-200 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : configsData?.configurations?.length > 0 ? (
                <div className="space-y-4">
                  {configsData.configurations.map((config: any) => (
                    <Card key={config.id} className="border">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold">{config.configName}</h4>
                            <p className="text-sm text-muted-foreground">
                              Frequency: {config.monitoringFrequency} minutes | 
                              Max Posts: {config.maxPostsPerSession} | 
                              API Limit: {config.apiRateLimit}/15min
                            </p>
                            <div className="flex items-center space-x-2 mt-2">
                              <Badge variant={config.isActive ? "default" : "secondary"}>
                                {config.isActive ? "Active" : "Inactive"}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                Last run: {config.lastExecuted 
                                  ? new Date(config.lastExecuted).toLocaleString() 
                                  : "Never"
                                }
                              </span>
                            </div>
                          </div>
                          <Button 
                            onClick={() => monitorMutation.mutate(config.id)}
                            disabled={monitorMutation.isPending}
                            size="sm"
                            variant="outline"
                          >
                            Run Now
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Settings className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-muted-foreground mb-4">No monitoring configurations found.</p>
                  <Button onClick={() => setShowConfigDialog(true)} className="btn-caffe-primary">
                    Create Configuration
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}