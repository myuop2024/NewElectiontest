import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { 
  Brain, 
  Activity, 
  MapPin, 
  MessageSquare, 
  TrendingUp, 
  AlertTriangle, 
  Settings,
  Zap,
  Globe,
  BarChart3,
  Radio,
  Eye
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ParishHeatMapNew from "./parish-heat-map-new";
import XSentimentDashboard from "./x-sentiment-dashboard";
import StationXSentiment from "@/components/x-sentiment/station-x-sentiment";

export default function CentralAIHub() {
  const [activeTab, setActiveTab] = useState("overview");
  const { toast } = useToast();

  // Check AI system status
  const { data: aiStatus, isLoading: aiLoading } = useQuery({
    queryKey: ["/api/central-ai/status"],
  });

  // Check X API connection status
  const { data: xStatus, isLoading: xLoading } = useQuery({
    queryKey: ["/api/x-sentiment/status"],
  });

  // Get Jamaica news data
  const { data: jamaicaNews, isLoading: newsLoading } = useQuery({
    queryKey: ["/api/news/jamaica-aggregated"],
  });

  // Get parish data for heat map
  const { data: parishData, isLoading: parishLoading } = useQuery({
    queryKey: ["/api/analytics/parishes"],
  });

  // Get real-time sentiment data
  const { data: sentimentData, isLoading: sentimentLoading } = useQuery({
    queryKey: ["/api/social-monitoring/sentiment"],
  });

  const getConnectionStatus = () => {
    const xConnected = xStatus?.connected === true;
    const aiConnected = aiStatus?.valid === true;
    const newsConnected = jamaicaNews?.success === true;
    
    if (xConnected && aiConnected && newsConnected) {
      return { status: "full", label: "All Systems Connected", color: "bg-green-100 text-green-800" };
    } else if (aiConnected && newsConnected) {
      return { status: "partial", label: "Core Systems Connected", color: "bg-yellow-100 text-yellow-800" };
    } else {
      return { status: "limited", label: "Limited Connectivity", color: "bg-red-100 text-red-800" };
    }
  };

  const connectionStatus = getConnectionStatus();

  if (aiLoading || xLoading || newsLoading) {
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
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Brain className="h-6 w-6" />
            Central AI Intelligence Hub
          </h2>
          <p className="text-muted-foreground">
            Unified intelligence platform for Jamaica electoral monitoring
          </p>
        </div>
        
        {/* Connection Status */}
        <div className="flex items-center gap-2">
          <Badge className={connectionStatus.color}>
            <Zap className="h-3 w-3 mr-1" />
            {connectionStatus.label}
          </Badge>
        </div>
      </div>

      {/* Real Data Verification Notice */}
      {connectionStatus.status === "full" && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-green-800 font-medium">
                ✓ Real Jamaica Data Active - X API (Grok 4) Connected, Live News Feeds, AI Analysis Operational
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {connectionStatus.status !== "full" && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <span className="text-orange-800">
                Demo Mode: Some data sources unavailable. Configure API keys for real Jamaica data.
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="parish-heat" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Parish Intelligence
          </TabsTrigger>
          <TabsTrigger value="x-sentiment" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            X Sentiment
          </TabsTrigger>
          <TabsTrigger value="news-analysis" className="flex items-center gap-2">
            <Radio className="h-4 w-4" />
            News Analysis
          </TabsTrigger>
          <TabsTrigger value="trends" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Trends
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configuration
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* System Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="government-card">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Brain className="h-4 w-4" />
                  AI Analysis Engine
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Grok 4 API</span>
                    <Badge variant={xStatus?.connected ? "default" : "secondary"}>
                      {xStatus?.connected ? "Connected" : "Offline"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Gemini AI</span>
                    <Badge variant={aiStatus?.valid ? "default" : "secondary"}>
                      {aiStatus?.valid ? "Active" : "Offline"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="government-card">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Globe className="h-4 w-4" />
                  Jamaica Data Sources
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">News Feeds</span>
                    <Badge variant={jamaicaNews?.success ? "default" : "secondary"}>
                      {jamaicaNews?.success ? `${jamaicaNews.data?.articles?.length || 0}` : "0"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Parish Coverage</span>
                    <Badge variant="default">14 Parishes</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="government-card">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <MessageSquare className="h-4 w-4" />
                  Social Monitoring
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">X (Twitter)</span>
                    <Badge variant={xStatus?.connected ? "default" : "secondary"}>
                      {xStatus?.connected ? "Live" : "Demo"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Sentiment Analysis</span>
                    <Badge variant="default">Active</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="government-card">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <BarChart3 className="h-4 w-4" />
                  Real-time Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Processing</span>
                    <Badge variant="default">Real-time</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Updates</span>
                    <Badge variant="default">Live</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Jamaica Intelligence */}
          <Card className="government-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Latest Jamaica Political Intelligence
              </CardTitle>
            </CardHeader>
            <CardContent>
              {jamaicaNews?.data?.articles?.slice(0, 5).map((article: any, index: number) => (
                <div key={index} className="border-b last:border-b-0 py-3">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{article.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {article.source} • {article.parish || "Jamaica"} • Score: {article.relevance_score}/10
                      </p>
                      {article.election_keywords?.length > 0 && (
                        <div className="flex gap-1 mt-2">
                          {article.election_keywords.slice(0, 3).map((keyword: string, i: number) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    {article.relevance_score >= 7 && (
                      <Badge variant="destructive" className="text-xs">High Priority</Badge>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="parish-heat" className="space-y-6">
          <ParishHeatMapNew />
        </TabsContent>

        <TabsContent value="x-sentiment" className="space-y-6">
          <XSentimentDashboard />
        </TabsContent>

        <TabsContent value="news-analysis" className="space-y-6">
          <Card className="government-card">
            <CardHeader>
              <CardTitle>Jamaica News Intelligence Analysis</CardTitle>
              <p className="text-sm text-muted-foreground">
                Real-time analysis of Jamaica political news from verified sources
              </p>
            </CardHeader>
            <CardContent>
              {jamaicaNews?.data?.articles ? (
                <div className="space-y-4">
                  {jamaicaNews.data.articles.map((article: any, index: number) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium">{article.title}</h4>
                        <Badge variant={article.relevance_score >= 7 ? "destructive" : "default"}>
                          Score: {article.relevance_score}/10
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {article.source} • {article.published_at} • {article.parish || "Jamaica"}
                      </p>
                      {article.content && (
                        <p className="text-sm mb-2">{article.content.substring(0, 200)}...</p>
                      )}
                      {article.election_keywords?.length > 0 && (
                        <div className="flex gap-1 flex-wrap">
                          {article.election_keywords.map((keyword: string, i: number) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Radio className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No news data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card className="government-card">
            <CardHeader>
              <CardTitle>Jamaica Political Trends Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Advanced trend analysis coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card className="government-card">
            <CardHeader>
              <CardTitle>AI System Configuration</CardTitle>
              <p className="text-sm text-muted-foreground">
                Configure data sources and AI analysis parameters
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">X API Status</label>
                  <div className="flex items-center gap-2">
                    <Badge variant={xStatus?.connected ? "default" : "secondary"}>
                      {xStatus?.connected ? "Connected" : "Disconnected"}
                    </Badge>
                    {!xStatus?.connected && (
                      <Button size="sm" variant="outline">
                        Configure X API
                      </Button>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">AI Engine Status</label>
                  <div className="flex items-center gap-2">
                    <Badge variant={aiStatus?.valid ? "default" : "secondary"}>
                      {aiStatus?.valid ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Data Sources</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Jamaica Gleaner: {jamaicaNews?.success ? "✓" : "✗"}</div>
                  <div>Jamaica Observer: {jamaicaNews?.success ? "✓" : "✗"}</div>
                  <div>Loop Jamaica: {jamaicaNews?.success ? "✓" : "✗"}</div>
                  <div>Nationwide Radio: {jamaicaNews?.success ? "✓" : "✗"}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}