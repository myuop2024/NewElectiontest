import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  MessageCircle, 
  TrendingUp, 
  AlertTriangle, 
  Eye, 
  RefreshCw, 
  BarChart3,
  Users,
  Activity,
  Send,
  Brain,
  MapPin,
  Clock,
  Shield,
  Zap
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SentimentTweet {
  id: string;
  text: string;
  author: string;
  location?: string;
  createdAt: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  relevanceScore: number;
  topics: string[];
  parish?: string;
  analysis: {
    summary: string;
    keyPoints: string[];
    riskLevel: 'low' | 'medium' | 'high';
    actionable: boolean;
  };
}

interface SentimentReport {
  overall: 'positive' | 'negative' | 'neutral';
  distribution: { positive: number; negative: number; neutral: number };
  averageConfidence: number;
  topTopics: string[];
  riskAssessment: string;
  recommendations: string[];
}

export default function SocialSentimentPage() {
  const [selectedTab, setSelectedTab] = useState("live");
  const [selectedParish, setSelectedParish] = useState<string>("all");
  const [timeframe, setTimeframe] = useState("24");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [customText, setCustomText] = useState("");
  const [customAuthor, setCustomAuthor] = useState("");
  const [customLocation, setCustomLocation] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Jamaica parishes
  const parishes = [
    "Kingston", "St. Andrew", "St. Catherine", "Clarendon", "Manchester",
    "St. Elizabeth", "Westmoreland", "Hanover", "St. James", "Trelawny",
    "St. Ann", "St. Mary", "Portland", "St. Thomas"
  ];

  // Fetch live sentiment analysis
  const { data: liveData, isLoading: isLiveLoading } = useQuery({
    queryKey: ['/api/sentiment/live-analysis', selectedParish, timeframe],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch sentiment report
  const { data: reportData, isLoading: isReportLoading } = useQuery({
    queryKey: ['/api/sentiment/report', selectedParish, timeframe],
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch parish overview
  const { data: parishOverview, isLoading: isParishLoading } = useQuery({
    queryKey: ['/api/sentiment/parish-overview', timeframe],
    refetchInterval: 60000,
  });

  // Fetch alerts
  const { data: alertsData, isLoading: isAlertsLoading } = useQuery({
    queryKey: ['/api/sentiment/alerts', selectedParish, timeframe],
    refetchInterval: 30000,
  });

  // Analyze custom text mutation
  const analyzeMutation = useMutation({
    mutationFn: async (data: { text: string; author: string; location?: string }) => {
      const response = await fetch('/api/sentiment/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error('Failed to analyze text');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Analysis Complete",
        description: "Text analyzed successfully with Grok API 4"
      });
    }
  });

  // Manual refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['/api/sentiment'] });
    setIsRefreshing(false);
    toast({
      title: "Data Refreshed",
      description: "All sentiment data updated"
    });
  };

  // Analyze custom text
  const handleAnalyzeCustom = () => {
    if (!customText.trim() || !customAuthor.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter both text and author",
        variant: "destructive"
      });
      return;
    }

    analyzeMutation.mutate({
      text: customText,
      author: customAuthor,
      location: customLocation
    });
  };

  // Get sentiment color
  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-600 bg-green-50 border-green-200';
      case 'negative': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  // Get risk level color
  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-green-600 bg-green-50 border-green-200';
    }
  };

  const tweets: SentimentTweet[] = liveData?.data || [];
  const report: SentimentReport = reportData?.report || null;
  const parishStats = parishOverview?.data || [];
  const alerts = alertsData?.alerts || [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Brain className="h-8 w-8 text-blue-600" />
            Social Media Sentiment Analysis
          </h1>
          <p className="text-muted-foreground">
            Powered by Grok API 4 - Real-time X (Twitter) sentiment analysis for Jamaica elections
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-blue-600">
            <Zap className="w-3 h-3 mr-1" />
            Grok API 4
          </Badge>
          <Badge variant="outline" className="text-green-600">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
            Live Analysis
          </Badge>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <Select value={selectedParish} onValueChange={setSelectedParish}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select parish" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Parishes</SelectItem>
            {parishes.map(parish => (
              <SelectItem key={parish} value={parish}>{parish}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={timeframe} onValueChange={setTimeframe}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Time frame" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">1 Hour</SelectItem>
            <SelectItem value="6">6 Hours</SelectItem>
            <SelectItem value="24">24 Hours</SelectItem>
            <SelectItem value="72">3 Days</SelectItem>
            <SelectItem value="168">1 Week</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Quick Stats */}
      {report && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Overall Sentiment</p>
                  <p className={`text-2xl font-bold ${getSentimentColor(report.overall).split(' ')[0]}`}>
                    {report.overall}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Positive</p>
                  <p className="text-2xl font-bold text-green-600">{report.distribution.positive}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Negative</p>
                  <p className="text-2xl font-bold text-red-600">{report.distribution.negative}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Activity className="h-5 w-5 text-gray-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Confidence</p>
                  <p className="text-2xl font-bold">{Math.round(report.averageConfidence * 100)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="live">Live Analysis</TabsTrigger>
          <TabsTrigger value="report">AI Report</TabsTrigger>
          <TabsTrigger value="alerts">Risk Alerts</TabsTrigger>
          <TabsTrigger value="parishes">Parish View</TabsTrigger>
          <TabsTrigger value="analyze">Custom Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="live" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Live X (Twitter) Sentiment Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLiveLoading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  {tweets.map((tweet) => (
                    <div key={tweet.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{tweet.author}</span>
                          {tweet.location && (
                            <Badge variant="outline" className="text-xs">
                              <MapPin className="w-3 h-3 mr-1" />
                              {tweet.location}
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            <Clock className="w-3 h-3 mr-1" />
                            {new Date(tweet.createdAt).toLocaleTimeString()}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={`${getSentimentColor(tweet.sentiment)} text-xs`}>
                            {tweet.sentiment}
                          </Badge>
                          <Badge className={`${getRiskColor(tweet.analysis.riskLevel)} text-xs`}>
                            {tweet.analysis.riskLevel} risk
                          </Badge>
                        </div>
                      </div>
                      
                      <p className="text-sm">{tweet.text}</p>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                        <div>
                          <span className="font-medium">Confidence:</span>
                          <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${tweet.confidence * 100}%` }}
                            />
                          </div>
                        </div>
                        <div>
                          <span className="font-medium">Relevance:</span>
                          <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                            <div 
                              className="bg-green-600 h-2 rounded-full" 
                              style={{ width: `${(tweet.relevanceScore / 10) * 100}%` }}
                            />
                          </div>
                        </div>
                        <div>
                          <span className="font-medium">Topics:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {tweet.topics.map(topic => (
                              <Badge key={topic} variant="secondary" className="text-xs">
                                {topic}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <span className="font-medium">Parish:</span>
                          <p className="text-gray-600 mt-1">{tweet.parish || 'Unknown'}</p>
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 p-3 rounded text-sm">
                        <p className="font-medium mb-1">AI Analysis:</p>
                        <p className="text-gray-700">{tweet.analysis.summary}</p>
                        {tweet.analysis.keyPoints.length > 0 && (
                          <div className="mt-2">
                            <p className="font-medium mb-1">Key Points:</p>
                            <ul className="list-disc list-inside text-gray-600">
                              {tweet.analysis.keyPoints.map((point, idx) => (
                                <li key={idx}>{point}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="report" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Grok AI Sentiment Report
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isReportLoading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : report ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{report.distribution.positive}%</div>
                      <div className="text-sm text-green-700">Positive</div>
                    </div>
                    <div className="text-center p-4 bg-red-50 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">{report.distribution.negative}%</div>
                      <div className="text-sm text-red-700">Negative</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-600">{report.distribution.neutral}%</div>
                      <div className="text-sm text-gray-700">Neutral</div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Top Topics</h3>
                    <div className="flex flex-wrap gap-2">
                      {report.topTopics.map(topic => (
                        <Badge key={topic} variant="secondary">{topic}</Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Risk Assessment</h3>
                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                      <p className="text-yellow-800">{report.riskAssessment}</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">AI Recommendations</h3>
                    <div className="space-y-2">
                      {report.recommendations.map((rec, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                          <p className="text-sm">{rec}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">No report data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                High-Risk Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isAlertsLoading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                </div>
              ) : alerts.length > 0 ? (
                <div className="space-y-4">
                  {alerts.map((alert) => (
                    <div key={alert.id} className="border-l-4 border-red-500 bg-red-50 p-4 rounded-r-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-medium text-red-800">{alert.author}</h4>
                          <p className="text-sm text-red-600">{alert.location}</p>
                        </div>
                        <Badge variant="destructive">High Risk</Badge>
                      </div>
                      <p className="text-sm text-red-700 mb-3">{alert.content}</p>
                      <div className="bg-red-100 p-3 rounded">
                        <p className="text-sm text-red-800 mb-2"><strong>Analysis:</strong> {alert.summary}</p>
                        <div className="text-sm text-red-700">
                          <strong>Key Points:</strong>
                          <ul className="list-disc list-inside mt-1">
                            {alert.keyPoints.map((point, idx) => (
                              <li key={idx}>{point}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">No high-risk alerts found</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="parishes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Parish Sentiment Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isParishLoading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Parish</th>
                        <th className="text-center p-2">Posts</th>
                        <th className="text-center p-2">Avg Sentiment</th>
                        <th className="text-center p-2">Confidence</th>
                        <th className="text-center p-2">Relevance</th>
                        <th className="text-center p-2">Risk Levels</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parishStats.map((parish) => (
                        <tr key={parish.parish} className="border-b hover:bg-gray-50">
                          <td className="p-2 font-medium">{parish.parish}</td>
                          <td className="text-center p-2">{parish.totalPosts}</td>
                          <td className="text-center p-2">
                            <Badge className={`${getSentimentColor(parish.avgSentiment > 0 ? 'positive' : parish.avgSentiment < 0 ? 'negative' : 'neutral')} text-xs`}>
                              {parish.avgSentiment > 0 ? 'Positive' : parish.avgSentiment < 0 ? 'Negative' : 'Neutral'}
                            </Badge>
                          </td>
                          <td className="text-center p-2">{Math.round(parish.avgConfidence * 100)}%</td>
                          <td className="text-center p-2">{parish.avgRelevance.toFixed(1)}/10</td>
                          <td className="text-center p-2">
                            <div className="flex justify-center gap-1">
                              {parish.highRiskCount > 0 && (
                                <Badge variant="destructive" className="text-xs">
                                  {parish.highRiskCount}H
                                </Badge>
                              )}
                              {parish.mediumRiskCount > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  {parish.mediumRiskCount}M
                                </Badge>
                              )}
                              {parish.lowRiskCount > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  {parish.lowRiskCount}L
                                </Badge>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analyze" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Custom Text Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Author/Handle</label>
                  <Input
                    value={customAuthor}
                    onChange={(e) => setCustomAuthor(e.target.value)}
                    placeholder="@username or Full Name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Location (Optional)</label>
                  <Input
                    value={customLocation}
                    onChange={(e) => setCustomLocation(e.target.value)}
                    placeholder="Kingston, Jamaica"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Text to Analyze</label>
                <Textarea
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder="Enter the social media post or text you want to analyze..."
                  rows={4}
                />
              </div>
              
              <Button 
                onClick={handleAnalyzeCustom}
                disabled={analyzeMutation.isPending}
                className="w-full"
              >
                {analyzeMutation.isPending ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Analyzing with Grok AI...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    Analyze with Grok API 4
                  </div>
                )}
              </Button>
              
              {analyzeMutation.data && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h3 className="font-semibold mb-2">Analysis Results</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Sentiment:</span>
                      <Badge className={getSentimentColor(analyzeMutation.data.analysis.sentiment)}>
                        {analyzeMutation.data.analysis.sentiment}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Confidence:</span>
                      <span>{Math.round(analyzeMutation.data.analysis.confidence * 100)}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Relevance Score:</span>
                      <span>{analyzeMutation.data.analysis.relevanceScore}/10</span>
                    </div>
                    <div>
                      <span className="font-medium">Summary:</span>
                      <p className="text-gray-700 mt-1">{analyzeMutation.data.analysis.analysis.summary}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Real-time sentiment monitoring active</span>
            </div>
            <div className="flex items-center gap-4">
              <span>Auto-refresh: 30s intervals</span>
              <span>Powered by Grok API 4</span>
              <span>Last updated: {new Date().toLocaleTimeString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}