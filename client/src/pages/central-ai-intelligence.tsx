import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
  Brain, 
  Activity, 
  Globe, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  MessageSquare, 
  Newspaper, 
  MapPin,
  BarChart3,
  Clock,
  Shield
} from "lucide-react";
import { useState } from "react";

interface AIStatus {
  valid: boolean;
  message: string;
  model: string;
  features: string[];
  jamaica_coverage: {
    parishes: number;
    major_towns: number;
    monitoring_active: boolean;
  };
}

interface SentimentData {
  overall_sentiment: any;
  parish_breakdown: Record<string, any>;
  risk_alerts: any[];
  trending_topics: string[];
  election_trends: any[];
  recommendations: string[];
  last_updated: string;
}

interface NewsData {
  news_data: any[];
  sources_monitored: string[];
  keywords_tracked: string[];
  analysis_timestamp: string;
}

interface SocialData {
  social_data: any[];
  platforms_monitored: string[];
  geographic_coverage: string;
  analysis_timestamp: string;
}

export default function CentralAIIntelligence() {
  const [activeTab, setActiveTab] = useState("overview");
  const [refreshing, setRefreshing] = useState(false);

  // AI System Status
  const { data: aiStatus, isLoading: statusLoading, refetch: refetchStatus } = useQuery<AIStatus>({
    queryKey: ["/api/central-ai/status"],
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Comprehensive Intelligence
  const { data: intelligence, isLoading: intelligenceLoading, refetch: refetchIntelligence } = useQuery({
    queryKey: ["/api/central-ai/comprehensive-intelligence"],
    refetchInterval: 60000 // Refresh every minute
  });

  // Social Sentiment Monitoring
  const { data: sentimentData, isLoading: sentimentLoading, refetch: refetchSentiment } = useQuery<SentimentData>({
    queryKey: ["/api/social-monitoring/sentiment"],
    refetchInterval: 120000 // Refresh every 2 minutes
  });

  // News Monitoring
  const { data: newsData, isLoading: newsLoading, refetch: refetchNews } = useQuery<NewsData>({
    queryKey: ["/api/social-monitoring/news"],
    refetchInterval: 300000 // Refresh every 5 minutes
  });

  // Social Media Monitoring
  const { data: socialData, isLoading: socialLoading, refetch: refetchSocial } = useQuery<SocialData>({
    queryKey: ["/api/social-monitoring/social-media"],
    refetchInterval: 180000 // Refresh every 3 minutes
  });

  const handleRefreshAll = async () => {
    setRefreshing(true);
    await Promise.all([
      refetchStatus(),
      refetchIntelligence(),
      refetchSentiment(),
      refetchNews(),
      refetchSocial()
    ]);
    setRefreshing(false);
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive': return 'bg-green-100 text-green-800';
      case 'negative': return 'bg-red-100 text-red-800';
      case 'mixed': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'low': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-orange-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  if (statusLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Brain className="w-12 h-12 mx-auto mb-4 animate-pulse" />
            <p>Initializing Central AI Intelligence System...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="w-8 h-8" />
            Central AI Intelligence Hub
          </h1>
          <p className="text-muted-foreground mt-1">
            Real-time electoral monitoring and sentiment analysis across Jamaica
          </p>
        </div>
        <Button 
          onClick={handleRefreshAll} 
          disabled={refreshing}
          className="flex items-center gap-2"
        >
          <Activity className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh All'}
        </Button>
      </div>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            AI System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              {aiStatus?.valid ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-600" />
              )}
              <span className={aiStatus?.valid ? 'text-green-600' : 'text-red-600'}>
                {aiStatus?.message || 'Checking...'}
              </span>
            </div>
            <div>
              <span className="font-medium">Model: </span>
              <Badge variant="outline">{aiStatus?.model || 'Unknown'}</Badge>
            </div>
            <div>
              <span className="font-medium">Coverage: </span>
              <span>{aiStatus?.jamaica_coverage?.parishes || 0} parishes, {aiStatus?.jamaica_coverage?.major_towns || 0} towns</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sentiment">Sentiment</TabsTrigger>
          <TabsTrigger value="news">News</TabsTrigger>
          <TabsTrigger value="social">Social Media</TabsTrigger>
          <TabsTrigger value="intelligence">Intelligence</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Overall Sentiment</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {sentimentData?.overall_sentiment?.dominant_sentiment || 'Analyzing...'}
                </div>
                <Badge className={getSentimentColor(sentimentData?.overall_sentiment?.dominant_sentiment)}>
                  {sentimentData?.overall_sentiment?.total_analyzed || 0} sources
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {sentimentData?.risk_alerts?.length || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Risk indicators detected
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">News Sources</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {newsData?.sources_monitored?.length || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Media outlets tracked
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Social Platforms</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {socialData?.platforms_monitored?.length || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Platforms monitored
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Risk Alerts */}
          {sentimentData?.risk_alerts && sentimentData.risk_alerts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Active Risk Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {sentimentData.risk_alerts.slice(0, 5).map((alert, index) => (
                    <Alert key={index}>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="flex items-center justify-between">
                          <span>{alert.description}</span>
                          <div className="flex items-center gap-2">
                            <Badge className={getRiskLevelColor(alert.level)}>
                              {alert.level}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {alert.location}
                            </span>
                          </div>
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="sentiment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Jamaica Parish Sentiment Analysis
              </CardTitle>
              <CardDescription>
                Real-time sentiment monitoring across all 14 parishes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sentimentLoading ? (
                <div className="text-center py-8">
                  <Activity className="w-8 h-8 mx-auto mb-4 animate-spin" />
                  <p>Analyzing sentiment data...</p>
                </div>
              ) : sentimentData?.parish_breakdown ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(sentimentData.parish_breakdown).map(([parish, data]: [string, any]) => (
                    <Card key={parish} className="border">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          {parish}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm">Mentions:</span>
                            <Badge variant="outline">{data.total_mentions}</Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm">Risk Level:</span>
                            <span className={`text-sm font-medium ${getRiskLevelColor(data.risk_level)}`}>
                              {data.risk_level}
                            </span>
                          </div>
                          {data.key_issues && data.key_issues.length > 0 && (
                            <div className="mt-2">
                              <span className="text-xs text-muted-foreground">Key Issues:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {data.key_issues.slice(0, 3).map((issue: string, idx: number) => (
                                  <Badge key={idx} variant="secondary" className="text-xs">
                                    {issue}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No sentiment data available
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="news" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Newspaper className="w-5 h-5" />
                Jamaica News Monitoring
              </CardTitle>
              <CardDescription>
                Election-related news from major Jamaican media outlets
              </CardDescription>
            </CardHeader>
            <CardContent>
              {newsLoading ? (
                <div className="text-center py-8">
                  <Activity className="w-8 h-8 mx-auto mb-4 animate-spin" />
                  <p>Monitoring news sources...</p>
                </div>
              ) : newsData?.news_data ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="text-sm font-medium">Sources:</span>
                    {newsData.sources_monitored.map((source, idx) => (
                      <Badge key={idx} variant="outline">{source}</Badge>
                    ))}
                  </div>
                  <Separator />
                  <div className="space-y-3">
                    {newsData.news_data.slice(0, 10).map((news, index) => (
                      <Card key={index} className="border-l-4 border-l-blue-500">
                        <CardContent className="pt-4">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium">{news.title}</h4>
                            <Badge className={getSentimentColor(news.ai_analysis?.overall_sentiment)}>
                              {news.ai_analysis?.overall_sentiment || 'neutral'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {news.content.substring(0, 200)}...
                          </p>
                          <div className="flex justify-between items-center text-xs text-muted-foreground">
                            <span>{news.source.name} • {news.location}</span>
                            <span>{new Date(news.published_at).toLocaleDateString()}</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No news data available
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="social" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Social Media Monitoring
              </CardTitle>
              <CardDescription>
                Election sentiment across social media platforms
              </CardDescription>
            </CardHeader>
            <CardContent>
              {socialLoading ? (
                <div className="text-center py-8">
                  <Activity className="w-8 h-8 mx-auto mb-4 animate-spin" />
                  <p>Analyzing social media...</p>
                </div>
              ) : socialData?.social_data ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="text-sm font-medium">Platforms:</span>
                    {socialData.platforms_monitored.map((platform, idx) => (
                      <Badge key={idx} variant="outline">{platform}</Badge>
                    ))}
                  </div>
                  <Separator />
                  <div className="space-y-3">
                    {socialData.social_data.slice(0, 15).map((post, index) => (
                      <Card key={index} className="border-l-4 border-l-green-500">
                        <CardContent className="pt-4">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">{post.platform}</Badge>
                              <span className="text-sm text-muted-foreground">{post.location}</span>
                            </div>
                            <Badge className={getSentimentColor(post.ai_analysis?.overall_sentiment)}>
                              {post.ai_analysis?.overall_sentiment || 'neutral'}
                            </Badge>
                          </div>
                          <p className="text-sm mb-2">{post.content}</p>
                          <div className="flex justify-between items-center text-xs text-muted-foreground">
                            <span>Engagement: {post.engagement.likes + post.engagement.shares} interactions</span>
                            <span>{new Date(post.posted_at).toLocaleDateString()}</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No social media data available
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="intelligence" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Comprehensive Intelligence Report
              </CardTitle>
              <CardDescription>
                AI-generated insights from all data sources
              </CardDescription>
            </CardHeader>
            <CardContent>
              {intelligenceLoading ? (
                <div className="text-center py-8">
                  <Activity className="w-8 h-8 mx-auto mb-4 animate-spin" />
                  <p>Generating comprehensive intelligence...</p>
                </div>
              ) : intelligence ? (
                <div className="space-y-4">
                  <Alert>
                    <Clock className="h-4 w-4" />
                    <AlertDescription>
                      Report generated: {new Date(intelligence.generated_at).toLocaleString()}
                    </AlertDescription>
                  </Alert>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Intelligence Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded">
                        {JSON.stringify(intelligence.intelligence, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Data Sources</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {intelligence.data_sources.map((source: string, idx: number) => (
                            <Badge key={idx} variant="outline">{source}</Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Coverage</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-lg font-semibold">{intelligence.coverage}</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No intelligence data available
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}