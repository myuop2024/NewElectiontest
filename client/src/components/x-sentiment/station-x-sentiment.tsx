import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { 
  Twitter, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  AlertTriangle,
  MessageSquare,
  Shield,
  RefreshCw,
  Eye,
  BarChart3
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface StationXSentimentProps {
  stationId: number;
  stationName?: string;
  parish?: string;
  compact?: boolean;
  className?: string;
}

interface SentimentData {
  station_id: number;
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

export default function StationXSentiment({ 
  stationId, 
  stationName, 
  parish, 
  compact = false,
  className = ""
}: StationXSentimentProps) {
  const [selectedHours, setSelectedHours] = useState(24);

  const { data: sentimentData, isLoading, error, refetch } = useQuery({
    queryKey: ["/api/x-sentiment/station", stationId, selectedHours],
    enabled: !!stationId,
    refetchInterval: 300000, // Refetch every 5 minutes
    retry: false
  });

  const getSentimentColor = (sentiment: number): string => {
    if (sentiment > 0.3) return "text-green-600 bg-green-100";
    if (sentiment < -0.3) return "text-red-600 bg-red-100";
    return "text-yellow-600 bg-yellow-100";
  };

  const getSentimentIcon = (sentiment: number) => {
    if (sentiment > 0.3) return <TrendingUp className="h-4 w-4" />;
    if (sentiment < -0.3) return <TrendingDown className="h-4 w-4" />;
    return <BarChart3 className="h-4 w-4" />;
  };

  const getThreatColor = (threatLevel: string): string => {
    switch (threatLevel) {
      case 'low': return "text-green-600 bg-green-100";
      case 'medium': return "text-yellow-600 bg-yellow-100";
      case 'high': return "text-orange-600 bg-orange-100";
      case 'critical': return "text-red-600 bg-red-100";
      default: return "text-gray-600 bg-gray-100";
    }
  };

  const getOverallThreatLevel = (threats: any): string => {
    if (threats.critical > 0) return 'critical';
    if (threats.high > 0) return 'high';
    if (threats.medium > 0) return 'medium';
    return 'low';
  };

  const formatSentiment = (sentiment: number): string => {
    if (sentiment > 0.3) return "Positive";
    if (sentiment < -0.3) return "Negative";
    return "Neutral";
  };

  if (isLoading) {
    return (
      <Card className={`${className} border-l-4 border-l-blue-500`}>
        <CardHeader className={compact ? "pb-2" : ""}>
          <CardTitle className={`flex items-center ${compact ? "text-sm" : "text-base"}`}>
            <Twitter className={`mr-2 ${compact ? "h-4 w-4" : "h-5 w-5"} text-blue-500`} />
            X Sentiment {compact && "Loading..."}
          </CardTitle>
        </CardHeader>
        <CardContent className={compact ? "pt-0" : ""}>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            {!compact && (
              <>
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
              </>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !sentimentData?.sentiment_analysis) {
    return (
      <Card className={`${className} border-l-4 border-l-gray-300`}>
        <CardHeader className={compact ? "pb-2" : ""}>
          <CardTitle className={`flex items-center justify-between ${compact ? "text-sm" : "text-base"}`}>
            <span className="flex items-center">
              <Twitter className={`mr-2 ${compact ? "h-4 w-4" : "h-5 w-5"} text-gray-400`} />
              X Sentiment
            </span>
            <Button 
              onClick={() => refetch()} 
              variant="ghost" 
              size={compact ? "sm" : "default"}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className={compact ? "pt-0" : ""}>
          <div className="flex items-center justify-center py-4">
            <div className="text-center">
              <Eye className="h-8 w-8 mx-auto text-gray-400 mb-2" />
              <p className={`text-muted-foreground ${compact ? "text-xs" : "text-sm"}`}>
                No X sentiment data
              </p>
              {!compact && (
                <p className="text-xs text-muted-foreground mt-1">
                  {error ? "Failed to load data" : "No posts found for this location"}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const analysis = sentimentData.sentiment_analysis;
  const sentiment = analysis.sentiment_summary;
  const overallThreat = getOverallThreatLevel(sentiment.threat_assessment);

  if (compact) {
    return (
      <Card className={`${className} border-l-4 border-l-blue-500`}>
        <CardContent className="p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <Twitter className="h-4 w-4 mr-2 text-blue-500" />
              <span className="text-sm font-medium">X Sentiment</span>
            </div>
            <Badge 
              className={`${getSentimentColor(sentiment.average_sentiment)} text-xs`}
            >
              {formatSentiment(sentiment.average_sentiment)}
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Posts:</span>
              <span className="font-medium">{analysis.total_posts}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Threat:</span>
              <Badge className={`${getThreatColor(overallThreat)} text-xs px-1 py-0`}>
                {overallThreat}
              </Badge>
            </div>
          </div>

          {sentiment.key_insights.politicians.length > 0 && (
            <div className="mt-2 pt-2 border-t">
              <p className="text-xs text-muted-foreground mb-1">Top Mentions:</p>
              <div className="flex flex-wrap gap-1">
                {sentiment.key_insights.politicians.slice(0, 2).map((politician, index) => (
                  <Badge key={politician.name} variant="outline" className="text-xs px-1 py-0">
                    {politician.name} ({politician.count})
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${className} border-l-4 border-l-blue-500`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center">
            <Twitter className="h-5 w-5 mr-2 text-blue-500" />
            X Sentiment Analysis
          </span>
          <Button onClick={() => refetch()} variant="ghost" size="sm">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardTitle>
        {(stationName || parish) && (
          <p className="text-sm text-muted-foreground">
            {stationName && `${stationName} • `}
            {parish && `${parish} Parish`}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <MessageSquare className="h-4 w-4 mr-1 text-blue-500" />
            </div>
            <p className="text-lg font-bold">{analysis.total_posts}</p>
            <p className="text-xs text-muted-foreground">Total Posts</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              {getSentimentIcon(sentiment.average_sentiment)}
            </div>
            <p className="text-lg font-bold">
              {sentiment.average_sentiment.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground">Avg Sentiment</p>
          </div>
          
          <div className="text-center">
            <Badge className={getSentimentColor(sentiment.average_sentiment)}>
              {formatSentiment(sentiment.average_sentiment)}
            </Badge>
            <p className="text-xs text-muted-foreground mt-1">Overall</p>
          </div>
          
          <div className="text-center">
            <Badge className={getThreatColor(overallThreat)}>
              <Shield className="h-3 w-3 mr-1" />
              {overallThreat}
            </Badge>
            <p className="text-xs text-muted-foreground mt-1">Threat Level</p>
          </div>
        </div>

        {/* Sentiment Distribution */}
        <div>
          <h4 className="text-sm font-medium mb-2">Sentiment Distribution</h4>
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-2 bg-green-50 rounded">
              <p className="text-lg font-bold text-green-600">
                {sentiment.sentiment_distribution.positive}
              </p>
              <p className="text-xs text-green-600">Positive</p>
            </div>
            <div className="text-center p-2 bg-gray-50 rounded">
              <p className="text-lg font-bold text-gray-600">
                {sentiment.sentiment_distribution.neutral}
              </p>
              <p className="text-xs text-gray-600">Neutral</p>
            </div>
            <div className="text-center p-2 bg-red-50 rounded">
              <p className="text-lg font-bold text-red-600">
                {sentiment.sentiment_distribution.negative}
              </p>
              <p className="text-xs text-red-600">Negative</p>
            </div>
          </div>
        </div>

        {/* Key Insights */}
        {sentiment.key_insights && (
          <div className="space-y-3">
            {sentiment.key_insights.politicians.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Politicians Mentioned</h4>
                <div className="flex flex-wrap gap-2">
                  {sentiment.key_insights.politicians.slice(0, 5).map((politician) => (
                    <Badge key={politician.name} variant="outline" className="text-xs">
                      {politician.name} ({politician.count})
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {sentiment.key_insights.parties.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Political Parties</h4>
                <div className="flex flex-wrap gap-2">
                  {sentiment.key_insights.parties.slice(0, 3).map((party) => (
                    <Badge key={party.name} variant="secondary" className="text-xs">
                      {party.name} ({party.count})
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Threat Assessment Details */}
        {(sentiment.threat_assessment.medium > 0 || sentiment.threat_assessment.high > 0 || sentiment.threat_assessment.critical > 0) && (
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center">
              <AlertTriangle className="h-4 w-4 mr-1 text-orange-500" />
              Threat Assessment
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {sentiment.threat_assessment.medium > 0 && (
                <div className="flex justify-between">
                  <span>Medium:</span>
                  <Badge className={getThreatColor('medium')} variant="outline">
                    {sentiment.threat_assessment.medium}
                  </Badge>
                </div>
              )}
              {sentiment.threat_assessment.high > 0 && (
                <div className="flex justify-between">
                  <span>High:</span>
                  <Badge className={getThreatColor('high')} variant="outline">
                    {sentiment.threat_assessment.high}
                  </Badge>
                </div>
              )}
              {sentiment.threat_assessment.critical > 0 && (
                <div className="flex justify-between">
                  <span>Critical:</span>
                  <Badge className={getThreatColor('critical')} variant="outline">
                    {sentiment.threat_assessment.critical}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
          Last updated: {new Date(sentimentData.generated_at).toLocaleString()}
          <br />
          Data from last {selectedHours} hours
        </div>
      </CardContent>
    </Card>
  );
}