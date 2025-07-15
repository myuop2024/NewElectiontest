import { useState, useEffect } from "react";
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
  Eye,
  RefreshCw,
  CheckCircle,
  XCircle,
  ExternalLink,
  Shield,
  Target,
  Clock,
  User,
  Play,
  Pause
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ParishHeatMapNew from "./parish-heat-map-new";
import XSentimentDashboard from "./x-sentiment-dashboard";

interface AIStatus {
  valid: boolean;
  message?: string;
  model?: string;
  confidence?: number;
}

interface XStatus {
  connected: boolean;
  message?: string;
  lastUpdate?: string;
  postsProcessed?: number;
}

interface NewsResponse {
  success: boolean;
  data?: {
    articles?: Array<{
      title: string;
      url: string;
      source: string;
      publishedAt: string;
      aiAnalysis?: {
        relevance: number;
        confidence: number;
        sentiment: string;
      };
    }>;
    [key: string]: any;
  };
}

interface ParishData {
  parishId: number;
  parishName: string;
  incidents: number;
  turnout: number;
  observers: number;
  critical: number;
  lastUpdate: string;
  sourceUrl?: string;
}

interface SentimentSummary {
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
  ai_confidence: number;
  data_sources: Array<{
    platform: string;
    count: number;
    lastUpdate: string;
  }>;
  last_analysis: string;
}

export default function CentralAIHub() {
  const [activeTab, setActiveTab] = useState("overview");
  const [isActive, setIsActive] = useState(false);
  const [lastActivation, setLastActivation] = useState<Date | null>(null);
  const { toast } = useToast();

  // Track when page becomes active/inactive
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        setIsActive(true);
        setLastActivation(new Date());
        
        // Notify server of activation
        try {
          await fetch('/api/central-ai/activation-status', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              isActive: true,
              action: 'page_visible'
            })
          });
        } catch (error) {
          console.error('Failed to notify server of activation:', error);
        }
        
        toast({
          title: "Central AI Hub Activated",
          description: "AI services are now active and monitoring Jamaica elections.",
        });
      } else {
        setIsActive(false);
        
        // Notify server of deactivation
        try {
          await fetch('/api/central-ai/activation-status', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              isActive: false,
              action: 'page_hidden'
            })
          });
        } catch (error) {
          console.error('Failed to notify server of deactivation:', error);
        }
        
        toast({
          title: "Central AI Hub Paused",
          description: "AI services paused to conserve API credits.",
        });
      }
    };

    // Set initial state
    setIsActive(document.visibilityState === 'visible');
    if (document.visibilityState === 'visible') {
      setLastActivation(new Date());
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [toast]);

  const {
    data: aiStatus,
    isLoading: aiLoading,
    error: aiError,
    refetch: refetchAI,
    isFetching: aiFetching
  } = useQuery<AIStatus>({
    queryKey: ["/api/central-ai/status"],
    refetchInterval: isActive ? 300000 : false, // Only refetch when active
    staleTime: 120000,
    gcTime: 300000,
    retry: 1,
    enabled: isActive // Only enable when page is active
  });

  const {
    data: xStatus,
    isLoading: xLoading,
    error: xError,
    refetch: refetchX,
    isFetching: xFetching
  } = useQuery<XStatus>({
    queryKey: ["/api/x-sentiment/status"],
    refetchInterval: isActive ? 600000 : false, // Only refetch when active
    staleTime: 300000,
    gcTime: 600000,
    retry: 1,
    enabled: isActive // Only enable when page is active
  });

  const {
    data: jamaicaNews,
    isLoading: newsLoading,
    error: newsError,
    refetch: refetchNews,
    isFetching: newsFetching
  } = useQuery<NewsResponse>({
    queryKey: ["/api/news/jamaica-aggregated"],
    refetchInterval: isActive ? 1800000 : false, // Only refetch when active
    staleTime: 900000,
    retry: 2,
    enabled: isActive // Only enable when page is active
  });

  const {
    data: parishData,
    isLoading: parishLoading,
    error: parishError,
    refetch: refetchParish,
    isFetching: parishFetching
  } = useQuery<ParishData[]>({
    queryKey: ["/api/analytics/parishes"],
    refetchInterval: false, // Never auto-refetch parish data
    staleTime: 1800000,
    retry: 1,
    enabled: isActive // Only enable when page is active
  });

  const {
    data: sentimentData,
    isLoading: sentimentLoading,
    error: sentimentError,
    refetch: refetchSentiment,
    isFetching: sentimentFetching
  } = useQuery<SentimentSummary>({
    queryKey: ["/api/social-monitoring/sentiment"],
    refetchInterval: isActive ? 600000 : false, // Only refetch when active
    staleTime: 300000,
    retry: 1,
    enabled: isActive // Only enable when page is active
  });

  const getSentimentColor = (sentiment: string | number | undefined) => {
    // Handle different sentiment data types
    let sentimentStr = '';
    
    if (typeof sentiment === 'number') {
      // Convert numeric sentiment to string
      if (sentiment >= 0.6) sentimentStr = 'positive';
      else if (sentiment <= 0.4) sentimentStr = 'negative';
      else sentimentStr = 'neutral';
    } else if (typeof sentiment === 'string') {
      sentimentStr = sentiment.toLowerCase();
    } else {
      return 'bg-gray-100 text-gray-800'; // Default for undefined/null
    }
    
    switch (sentimentStr) {
      case 'positive':
        return 'bg-green-100 text-green-800';
      case 'negative':
        return 'bg-red-100 text-red-800';
      case 'mixed':
      case 'neutral':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

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

  const handleRefreshAll = async () => {
    try {
      await Promise.all([
        refetchAI(),
        refetchX(),
        refetchNews(),
        refetchParish(),
        refetchSentiment()
      ]);
      toast({
        title: "Data Refreshed",
        description: "All systems data has been updated.",
      });
    } catch (error) {
      toast({
        title: "Refresh Failed",
        description: "Some data could not be refreshed.",
        variant: "destructive",
      });
    }
  };

  const handleViewSource = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  useEffect(() => {
    if (aiError) {
      toast({
        title: "AI Status Error",
        description: "Failed to fetch AI status.",
        variant: "destructive",
      });
    }
    if (xError) {
      toast({
        title: "X API Error",
        description: "Failed to fetch X API status.",
        variant: "destructive",
      });
    }
    if (newsError) {
      toast({
        title: "News Fetch Error",
        description: "Failed to load Jamaica news feed.",
        variant: "destructive",
      });
    }
    if (parishError) {
      toast({
        title: "Parish Data Error",
        description: "Failed to load parish data.",
        variant: "destructive",
      });
    }
    if (sentimentError) {
      toast({
        title: "Sentiment Error",
        description: "Failed to fetch sentiment summary.",
        variant: "destructive",
      });
    }
  }, [aiError, xError, newsError, parishError, sentimentError, toast]);

  const anyLoading = aiLoading || xLoading || newsLoading || parishLoading || sentimentLoading;

  if (anyLoading) {
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Brain className="h-8 w-8 text-blue-600" />
            Central AI Hub
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Jamaica Election Intelligence & Monitoring Center
          </p>
          {/* Activation Status */}
          <div className="flex items-center gap-2 mt-2">
            <Badge 
              variant={isActive ? "default" : "secondary"} 
              className={isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}
            >
              {isActive ? (
                <>
                  <Play className="h-3 w-3 mr-1" />
                  Active Monitoring
                </>
              ) : (
                <>
                  <Pause className="h-3 w-3 mr-1" />
                  Paused (Saving Credits)
                </>
              )}
            </Badge>
            {lastActivation && (
              <span className="text-xs text-gray-500">
                Last active: {lastActivation.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={connectionStatus.color} variant="outline">
            {connectionStatus.label}
          </Badge>
          {!isActive ? (
            <Button 
              onClick={async () => {
                setIsActive(true);
                setLastActivation(new Date());
                
                // Notify server of manual activation
                try {
                  await fetch('/api/central-ai/activation-status', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      isActive: true,
                      action: 'manual_activation'
                    })
                  });
                } catch (error) {
                  console.error('Failed to notify server of manual activation:', error);
                }
                
                toast({
                  title: "Central AI Hub Manually Activated",
                  description: "AI services are now active and monitoring Jamaica elections.",
                });
              }} 
              variant="default" 
              size="sm"
            >
              <Play className="h-4 w-4 mr-2" />
              Activate Monitoring
            </Button>
          ) : (
            <Button 
              onClick={handleRefreshAll} 
              variant="outline" 
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${aiFetching || xFetching || newsFetching || parishFetching || sentimentFetching ? 'animate-spin' : ''}`} />
              Refresh All
            </Button>
          )}
        </div>
      </div>

      {/* Inactive Status Warning */}
      {!isActive && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800">
                AI Services Paused
              </h3>
              <p className="text-sm text-yellow-700">
                Services are paused to conserve API credits. Click "Activate Monitoring" to resume real-time data collection.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* System Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Brain className="h-4 w-4" />
              AI Engine
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">
                {aiStatus?.valid ? (
                  <CheckCircle className="h-6 w-6 text-green-500" />
                ) : (
                  <XCircle className="h-6 w-6 text-red-500" />
                )}
              </div>
              <Badge variant={aiStatus?.valid ? "default" : "destructive"}>
                {aiStatus?.valid ? "Active" : "Offline"}
              </Badge>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              {aiStatus?.message || "Central AI processing engine"}
            </p>
            {aiStatus?.model && (
              <p className="text-xs text-blue-600 mt-1">
                Model: {aiStatus.model}
              </p>
            )}
            {aiStatus?.confidence && (
              <p className={`text-xs mt-1 ${getConfidenceColor(aiStatus.confidence)}`}>
                Confidence: {(aiStatus.confidence * 100).toFixed(1)}%
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Social Monitoring
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">
                {xStatus?.connected ? (
                  <CheckCircle className="h-6 w-6 text-green-500" />
                ) : (
                  <XCircle className="h-6 w-6 text-red-500" />
                )}
              </div>
              <Badge variant={xStatus?.connected ? "default" : "destructive"}>
                {xStatus?.connected ? "Connected" : "Disconnected"}
              </Badge>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              {xStatus?.message || "X (Twitter) sentiment analysis"}
            </p>
            {xStatus?.postsProcessed && (
              <p className="text-xs text-blue-600 mt-1">
                Posts: {xStatus.postsProcessed.toLocaleString()}
              </p>
            )}
            {xStatus?.lastUpdate && (
              <p className="text-xs text-gray-500 mt-1">
                Updated: {new Date(xStatus.lastUpdate).toLocaleTimeString()}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Globe className="h-4 w-4" />
              News Feed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">
                {jamaicaNews?.success ? (
                  <CheckCircle className="h-6 w-6 text-green-500" />
                ) : (
                  <XCircle className="h-6 w-6 text-red-500" />
                )}
              </div>
              <Badge variant={jamaicaNews?.success ? "default" : "destructive"}>
                {jamaicaNews?.success ? "Active" : "Offline"}
              </Badge>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              Jamaica news aggregation & analysis
            </p>
            {jamaicaNews?.data?.articles && (
              <p className="text-xs text-blue-600 mt-1">
                Articles: {jamaicaNews.data.articles.length}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Parish Coverage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {parishData?.length || 0}
            </div>
            <p className="text-xs text-gray-600 mt-2">
              Parishes with active monitoring
            </p>
            {parishData && parishData.length > 0 && (
              <p className="text-xs text-blue-600 mt-1">
                Last update: {new Date(parishData[0]?.lastUpdate || Date.now()).toLocaleTimeString()}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="intelligence">Intelligence</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sentiment Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Public Sentiment Overview
                  {sentimentData?.ai_confidence && (
                    <Badge variant="outline" className="ml-auto">
                      AI Confidence: {(sentimentData.ai_confidence * 100).toFixed(1)}%
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sentimentData ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Overall Sentiment</span>
                      <Badge className={getSentimentColor(sentimentData.overall_sentiment)}>
                        {typeof sentimentData.overall_sentiment === 'number' 
                          ? `${(sentimentData.overall_sentiment * 100).toFixed(0)}%`
                          : sentimentData.overall_sentiment || 'Neutral'
                        }
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Positive</span>
                        <span>{sentimentData.sentiment_distribution?.positive || 0}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Neutral</span>
                        <span>{sentimentData.sentiment_distribution?.neutral || 0}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Negative</span>
                        <span>{sentimentData.sentiment_distribution?.negative || 0}%</span>
                      </div>
                    </div>
                    
                    {/* Data Sources */}
                    {sentimentData.data_sources && sentimentData.data_sources.length > 0 && (
                      <div className="mt-4 pt-4 border-t">
                        <h4 className="text-sm font-medium mb-2">Data Sources</h4>
                        <div className="space-y-2">
                          {sentimentData.data_sources.map((source, index) => (
                            <div key={index} className="flex justify-between items-center text-xs">
                              <span className="flex items-center gap-1">
                                <Globe className="h-3 w-3" />
                                {source.platform}
                              </span>
                              <span className="text-gray-600">{source.count} posts</span>
                              <span className="text-gray-500">
                                {new Date(source.lastUpdate).toLocaleTimeString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {sentimentData.last_analysis && (
                      <div className="mt-2 text-xs text-gray-500">
                        Last AI Analysis: {new Date(sentimentData.last_analysis).toLocaleString()}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No sentiment data available</p>
                )}
              </CardContent>
            </Card>

            {/* Recent News with Sources */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Recent News Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                {jamaicaNews?.data?.articles && jamaicaNews.data.articles.length > 0 ? (
                  <div className="space-y-3">
                    {jamaicaNews.data.articles.slice(0, 5).map((article, index) => (
                      <div key={index} className="p-3 border rounded-lg hover:bg-gray-50">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1">
                            <h4 className="text-sm font-medium line-clamp-2">{article.title}</h4>
                            <div className="flex items-center gap-2 mt-1 text-xs text-gray-600">
                              <span>{article.source}</span>
                              <span>•</span>
                              <span>{new Date(article.publishedAt).toLocaleDateString()}</span>
                            </div>
                            {article.aiAnalysis && (
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  Relevance: {(article.aiAnalysis.relevance * 100).toFixed(0)}%
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  Confidence: {(article.aiAnalysis.confidence * 100).toFixed(0)}%
                                </Badge>
                                <Badge className={`text-xs ${getSentimentColor(article.aiAnalysis.sentiment)}`}>
                                  {typeof article.aiAnalysis.sentiment === 'number' 
                                    ? `${(article.aiAnalysis.sentiment * 100).toFixed(0)}%`
                                    : article.aiAnalysis.sentiment || 'Neutral'
                                  }
                                </Badge>
                              </div>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewSource(article.url)}
                            className="flex-shrink-0"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No news data available</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Real-time Monitoring
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ParishHeatMapNew />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Social Media Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <XSentimentDashboard />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="intelligence" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                AI Intelligence Reports
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-semibold text-blue-900">Election Integrity</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      AI monitoring electoral processes across all parishes
                    </p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="font-semibold text-green-900">Public Sentiment</h4>
                    <p className="text-sm text-green-700 mt-1">
                      Real-time analysis of public opinion and concerns
                    </p>
                  </div>
                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <h4 className="font-semibold text-yellow-900">Risk Assessment</h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      Identifying potential threats and irregularities
                    </p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <h4 className="font-semibold text-purple-900">Predictive Analytics</h4>
                    <p className="text-sm text-purple-700 mt-1">
                      Forecasting election trends and outcomes
                    </p>
                  </div>
                </div>
                
                <div className="mt-6">
                  <h4 className="font-semibold mb-3">Key Intelligence Areas</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <Badge variant="outline">Incident Analysis</Badge>
                    <Badge variant="outline">Document Processing</Badge>
                    <Badge variant="outline">Social Monitoring</Badge>
                    <Badge variant="outline">Election Intelligence</Badge>
                    <Badge variant="outline">Comprehensive Reporting</Badge>
                    <Badge variant="outline">Risk Assessment</Badge>
                    <Badge variant="outline">Predictive Modeling</Badge>
                    <Badge variant="outline">Geographic Analysis</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}