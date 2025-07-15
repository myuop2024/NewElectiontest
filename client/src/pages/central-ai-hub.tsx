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
  Eye
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ParishHeatMapNew from "./parish-heat-map-new";
import XSentimentDashboard from "./x-sentiment-dashboard";

interface AIStatus {
  valid: boolean;
  message?: string;
}

interface XStatus {
  connected: boolean;
  message?: string;
}

interface NewsResponse {
  success: boolean;
  data?: {
    articles?: any[];
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
}

export default function CentralAIHub() {
  const [activeTab, setActiveTab] = useState("overview");
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Add detailed logging
  console.log("[Central AI Hub] Component loaded, active tab:", activeTab);

  const {
    data: aiStatus,
    isLoading: aiLoading,
    error: aiError,
  } = useQuery<AIStatus>({
    queryKey: ["/api/central-ai/status"],
    refetchInterval: 300000,
    staleTime: 120000,
    gcTime: 300000,
    retry: 1,
    onSuccess: (data) => {
      console.log("[Central AI Hub] AI Status loaded:", data);
    },
    onError: (error) => {
      console.error("[Central AI Hub] AI Status error:", error);
    }
  });

  const {
    data: xStatus,
    isLoading: xLoading,
    error: xError,
  } = useQuery<XStatus>({
    queryKey: ["/api/x-sentiment/status"],
    refetchInterval: 600000,
    staleTime: 300000,
    gcTime: 600000,
    retry: 1,
  });

  const {
    data: jamaicaNews,
    isLoading: newsLoading,
    error: newsError,
  } = useQuery<NewsResponse>({
    queryKey: ["/api/news/jamaica-aggregated"],
    refetchInterval: 1800000,
    staleTime: 900000,
    retry: 2,
  });

  const {
    data: parishData,
    isLoading: parishLoading,
    error: parishError,
  } = useQuery<ParishData[]>({
    queryKey: ["/api/analytics/parishes"],
    refetchInterval: false,
    staleTime: 1800000,
    retry: 1,
    placeholderData: [], // Provide empty array as fallback
    onSuccess: (data) => {
      console.log("[Central AI Hub] Parish data loaded:", data);
      setIsLoading(false);
    },
    onError: (error) => {
      console.error("[Central AI Hub] Parish data error:", error);
      setIsLoading(false);
    }
  });

  const {
    data: sentimentData,
    isLoading: sentimentLoading,
    error: sentimentError,
  } = useQuery({
    queryKey: ["/api/social-monitoring/sentiment"],
    refetchInterval: 600000,
    staleTime: 300000,
    retry: 1,
    onSuccess: (data) => {
      console.log("[Central AI Hub] Sentiment data loaded:", data);
    },
    onError: (error) => {
      console.error("[Central AI Hub] Sentiment data error:", error);
    },
  });

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive':
        return 'bg-green-100 text-green-800';
      case 'negative':
        return 'bg-red-100 text-red-800';
      case 'mixed':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
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
  const noData = !aiStatus && !xStatus && !jamaicaNews && !parishData && !sentimentData;

  if (anyLoading && noData) {
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
      {/* Main content continues... */}
    </div>
  );
}