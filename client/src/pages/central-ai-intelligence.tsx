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

  const { data: twitterStatus } = useQuery({
    queryKey: ["/api/social-monitoring/twitter-status"],
    refetchInterval: 30000 // Check every 30 seconds
  });

  // Jamaica News Aggregation
  const { data: jamaicaNewsData, isLoading: jamaicaNewsLoading, refetch: refetchJamaicaNews } = useQuery({
    queryKey: ["/api/news/jamaica-aggregated"],
    refetchInterval: 60000 // Refresh every minute for fresh news
  });

  // News Source Health Check
  const { data: sourceHealthData, isLoading: sourceHealthLoading, refetch: refetchSourceHealth } = useQuery({
    queryKey: ["/api/news/source-health"],
    refetchInterval: 120000 // Check source health every 2 minutes
  });

  const handleRefreshAll = async () => {
    setRefreshing(true);
    await Promise.all([
      refetchStatus(),
      refetchIntelligence(),
      refetchSentiment(),
      refetchNews(),
      refetchSocial(),
      refetchJamaicaNews(),
      refetchSourceHealth()
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
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="jamaica-news">Jamaica News</TabsTrigger>
          <TabsTrigger value="sentiment">Sentiment</TabsTrigger>
          <TabsTrigger value="news">Global News</TabsTrigger>
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

        <TabsContent value="jamaica-news" className="space-y-4">
          {/* Source Health Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Jamaica News Source Health
              </CardTitle>
              <CardDescription>
                Real-time monitoring of authentic Jamaica news sources
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sourceHealthLoading ? (
                <div className="text-center py-4">Loading source health...</div>
              ) : sourceHealthData?.overall ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Overall Status:</span>
                    <Badge className={sourceHealthData.overall.status === 'operational' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {sourceHealthData.overall.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{sourceHealthData.overall.healthy}/{sourceHealthData.overall.total}</div>
                      <div className="text-sm text-muted-foreground">Sources Online</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{sourceHealthData.overall.uptime}</div>
                      <div className="text-sm text-muted-foreground">Uptime</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {sourceHealthData.sources?.map((source: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${source.status === 'healthy' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                          <span className="font-medium">{source.name}</span>
                          <Badge variant="outline">{source.type}</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {source.responseTime}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">No source health data available</div>
              )}
            </CardContent>
          </Card>

          {/* Jamaica News Statistics */}
          {jamaicaNewsData?.data && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Articles</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{jamaicaNewsData.data.statistics?.totalProcessed || 0}</div>
                  <p className="text-xs text-muted-foreground">Processed articles</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">High Relevance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{jamaicaNewsData.data.statistics?.highRelevance || 0}</div>
                  <p className="text-xs text-muted-foreground">Election relevant</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Duplicates Removed</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{jamaicaNewsData.data.statistics?.duplicatesRemoved || 0}</div>
                  <p className="text-xs text-muted-foreground">Clean data</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Critical Alerts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{jamaicaNewsData.data.criticalAlerts?.length || 0}</div>
                  <p className="text-xs text-muted-foreground">Urgent items</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Critical Alerts */}
          {jamaicaNewsData?.data?.criticalAlerts?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="w-5 h-5" />
                  Critical Election Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {jamaicaNewsData.data.criticalAlerts.slice(0, 5).map((alert: any, index: number) => (
                    <Alert key={index} className="border-red-200">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <AlertDescription>
                        <div className="space-y-2">
                          <div className="font-medium">{alert.title}</div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">{alert.source}</span>
                            <div className="flex items-center gap-2">
                              <Badge className="bg-red-100 text-red-800">Score: {alert.relevanceScore}/10</Badge>
                              <Badge className="bg-yellow-100 text-yellow-800">{alert.sentimentAnalysis?.riskLevel}</Badge>
                            </div>
                          </div>
                          {alert.parishMentions?.length > 0 && (
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {alert.parishMentions.map((parish: string, i: number) => (
                                <Badge key={i} variant="outline" className="text-xs">{parish}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Jamaica News Articles with Scoring */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Newspaper className="w-5 h-5" />
                Jamaica News Analysis
              </CardTitle>
              <CardDescription>
                Real-time news from authentic Jamaica sources with AI relevance scoring
              </CardDescription>
            </CardHeader>
            <CardContent>
              {jamaicaNewsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-sm text-muted-foreground">Aggregating Jamaica news sources...</p>
                </div>
              ) : jamaicaNewsData?.data?.articles?.length > 0 ? (
                <div className="space-y-4">
                  {jamaicaNewsData.data.articles.slice(0, 10).map((article: any, index: number) => (
                    <div key={index} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-lg leading-tight">{article.title}</h4>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline">{article.source}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(article.publishedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 ml-4">
                          <Badge className={`${article.relevanceScore >= 7 ? 'bg-red-100 text-red-800' : 
                                           article.relevanceScore >= 4 ? 'bg-yellow-100 text-yellow-800' : 
                                           'bg-green-100 text-green-800'}`}>
                            Score: {article.relevanceScore}/10
                          </Badge>
                          {article.sentimentAnalysis?.riskLevel && (
                            <Badge className={getRiskLevelColor(article.sentimentAnalysis.riskLevel)}>
                              {article.sentimentAnalysis.riskLevel}
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {article.content && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {article.content}
                        </p>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {article.electionKeywords?.length > 0 && (
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-medium">Keywords:</span>
                              {article.electionKeywords.slice(0, 3).map((keyword: string, i: number) => (
                                <Badge key={i} variant="secondary" className="text-xs">{keyword}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        {article.parishMentions?.length > 0 && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {article.parishMentions.map((parish: string, i: number) => (
                              <Badge key={i} variant="outline" className="text-xs">{parish}</Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      {article.aiAnalysis && (
                        <div className="bg-blue-50 p-3 rounded border-l-4 border-blue-500">
                          <div className="text-sm">
                            <strong>AI Analysis:</strong> {article.aiAnalysis.summary}
                          </div>
                          {article.aiAnalysis.actionRequired && (
                            <Badge className="mt-2 bg-red-100 text-red-800">Action Required</Badge>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  <div className="text-center pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      Showing top 10 most relevant articles from {jamaicaNewsData.data.articles.length} total
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Newspaper className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No Jamaica news data available</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    The system will fetch news from Jamaica Observer, Gleaner, and other authentic sources
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* News Sources Information */}
          {jamaicaNewsData?.data?.sources && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  Authentic Jamaica News Sources
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(jamaicaNewsData.data.sources).map(([source, description]: [string, any], index) => (
                    <div key={index} className="flex items-center gap-3 p-3 border rounded">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <div>
                        <div className="font-medium">{source}</div>
                        <div className="text-sm text-muted-foreground">{description}</div>
                      </div>
                    </div>
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
              ) : socialData?.social_data && socialData.social_data.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex flex-wrap gap-2">
                      <span className="text-sm font-medium">Active Sources:</span>
                      {socialData.platforms_monitored.map((platform, idx) => (
                        <Badge key={idx} variant="outline">{platform}</Badge>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      {twitterStatus?.connected ? (
                        <>
                          <Shield className="w-4 h-4 text-green-600" />
                          <span className="text-xs text-green-600 font-medium">
                            {twitterStatus.status === 'Rate limited' ? 'API Connected (Rate Limited)' : 'Live API Data'}
                          </span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-4 h-4 text-orange-600" />
                          <span className="text-xs text-orange-600 font-medium">API Inactive</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      {twitterStatus?.status === 'Rate limited' 
                        ? `Twitter/X API connected successfully! Showing demo data due to rate limiting. API status: ${twitterStatus.message}`
                        : `Displaying authentic social media content from ${socialData.social_data.length} recent posts via Twitter/X API`
                      }
                    </AlertDescription>
                  </Alert>
                  
                  <Separator />
                  <div className="space-y-3">
                    {socialData.social_data.slice(0, 15).map((post, index) => (
                      <Card key={index} className="border-l-4 border-l-blue-500">
                        <CardContent className="pt-4">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">{post.platform}</Badge>
                              {post.is_authentic && (
                                <Badge variant="outline" className="text-green-600 border-green-600">
                                  <Shield className="w-3 h-3 mr-1" />
                                  Verified
                                </Badge>
                              )}
                              <span className="text-sm text-muted-foreground">{post.location}</span>
                              {post.author && (
                                <span className="text-xs text-blue-600">@{post.author.username}</span>
                              )}
                            </div>
                            <Badge className={getSentimentColor(post.ai_analysis?.overall_sentiment)}>
                              {post.ai_analysis?.overall_sentiment || 'neutral'}
                            </Badge>
                          </div>
                          <p className="text-sm mb-2">{post.content}</p>
                          <div className="flex justify-between items-center text-xs text-muted-foreground">
                            <span>
                              {post.engagement.likes} likes • {post.engagement.shares} retweets • {post.engagement.comments} replies
                            </span>
                            <span>{new Date(post.posted_at).toLocaleDateString()}</span>
                          </div>
                          {post.relevance_score && (
                            <div className="mt-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">Election Relevance:</span>
                                <Progress value={post.relevance_score * 100} className="w-16 h-1" />
                                <span className="text-xs font-medium">{Math.round(post.relevance_score * 100)}%</span>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 space-y-4">
                  <Alert className="max-w-md mx-auto">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      No authentic social media data available. This requires active X/Twitter API credentials for real-time monitoring.
                    </AlertDescription>
                  </Alert>
                  <div className="text-sm text-muted-foreground">
                    <p>To enable authentic social media monitoring:</p>
                    <ul className="text-left mt-2 space-y-1 max-w-md mx-auto">
                      <li>• X/Twitter API credentials are configured</li>
                      <li>• Monitoring Jamaica-specific election content</li>
                      <li>• Real-time sentiment analysis active</li>
                    </ul>
                  </div>
                </div>
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