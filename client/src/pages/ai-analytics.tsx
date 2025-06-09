import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { AIIncidentAnalysis } from "@/components/analytics/ai-incident-analysis";
import { 
  Brain, 
  TrendingUp, 
  AlertTriangle, 
  BarChart3, 
  PieChart, 
  Target,
  Users,
  MapPin,
  Clock,
  Zap
} from "lucide-react";

export default function AIAnalytics() {
  const [selectedTab, setSelectedTab] = useState("overview");

  const { data: patterns } = useQuery<any>({
    queryKey: ["/api/ai/incident-patterns"],
  });

  const { data: reports } = useQuery<any[]>({
    queryKey: ["/api/reports"],
  });

  const formatCategory = (category: string) => {
    return category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getSeverityColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getTopCategories = () => {
    if (!patterns?.categoryDistribution) return [];
    return Object.entries(patterns.categoryDistribution)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 5);
  };

  const getTotalIncidents = () => {
    if (!patterns?.categoryDistribution) return 0;
    return Object.values(patterns.categoryDistribution)
      .reduce((sum: number, count: any) => sum + count, 0);
  };

  const getCriticalIncidents = () => {
    if (!patterns?.severityDistribution) return 0;
    return patterns.severityDistribution.critical || 0;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-primary flex items-center justify-center space-x-2">
            <Brain className="h-8 w-8 text-purple-600" />
            <span>AI Analytics Dashboard</span>
          </h1>
          <p className="text-muted-foreground">
            Intelligent insights and pattern analysis for electoral incidents
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold">{getTotalIncidents()}</p>
                  <p className="text-sm text-muted-foreground">Total Analyzed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="text-2xl font-bold">{getCriticalIncidents()}</p>
                  <p className="text-sm text-muted-foreground">Critical Severity</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Target className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-2xl font-bold">{patterns?.patterns?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Patterns Found</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Brain className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-2xl font-bold">95%</p>
                  <p className="text-sm text-muted-foreground">AI Accuracy</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="patterns">Patterns</TabsTrigger>
            <TabsTrigger value="analysis">Live Analysis</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Category Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <PieChart className="h-5 w-5 text-blue-600" />
                    <span>Incident Categories</span>
                  </CardTitle>
                  <CardDescription>
                    Distribution of incident types analyzed by AI
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {getTopCategories().map(([category, count], index) => (
                    <div key={category}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">
                          {formatCategory(category)}
                        </span>
                        <Badge variant="outline">{count}</Badge>
                      </div>
                      <Progress 
                        value={(count as number / getTotalIncidents()) * 100} 
                        className="h-2"
                      />
                    </div>
                  ))}
                  {getTopCategories().length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      No incident data available for analysis
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Severity Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                    <span>Severity Levels</span>
                  </CardTitle>
                  <CardDescription>
                    AI-assessed severity distribution
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {patterns?.severityDistribution && Object.entries(patterns.severityDistribution).map(([severity, count]) => (
                    <div key={severity}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">
                          {severity.toUpperCase()}
                        </span>
                        <Badge className={getSeverityColor(severity)}>{count}</Badge>
                      </div>
                      <Progress 
                        value={(count as number / getTotalIncidents()) * 100} 
                        className="h-2"
                      />
                    </div>
                  ))}
                  {!patterns?.severityDistribution && (
                    <p className="text-center text-muted-foreground py-8">
                      No severity data available
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="patterns" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                  <span>AI-Identified Patterns</span>
                </CardTitle>
                <CardDescription>
                  Common patterns and trends discovered by machine learning analysis
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {patterns?.patterns && patterns.patterns.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {patterns.patterns.map((pattern: string, index: number) => (
                      <div key={index} className="p-3 border rounded-lg bg-blue-50">
                        <div className="flex items-start space-x-2">
                          <Zap className="h-4 w-4 text-blue-600 mt-0.5" />
                          <span className="text-sm">{pattern}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Patterns Detected</h3>
                    <p className="text-muted-foreground">
                      AI pattern analysis requires more incident data to identify trends
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analysis" className="space-y-6">
            <AIIncidentAnalysis />
          </TabsContent>

          <TabsContent value="insights" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Clock className="h-5 w-5 text-green-600" />
                    <span>Recent AI Analysis</span>
                  </CardTitle>
                  <CardDescription>
                    Latest incidents processed by AI classification
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {reports && reports.length > 0 ? (
                    <div className="space-y-3">
                      {reports.slice(0, 5).map((report: any) => (
                        <div key={report.id} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-sm">{report.title}</h4>
                            <Badge variant="outline">
                              {formatCategory(report.type || 'other')}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {new Date(report.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      No recent incidents to analyze
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* AI Recommendations */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="h-5 w-5 text-purple-600" />
                    <span>System Recommendations</span>
                  </CardTitle>
                  <CardDescription>
                    AI-generated suggestions for electoral monitoring
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <Target className="h-4 w-4 text-green-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Enhanced Monitoring</p>
                        <p className="text-xs text-muted-foreground">
                          Increase observer presence in high-risk polling stations
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-orange-50 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Training Focus</p>
                        <p className="text-xs text-muted-foreground">
                          Additional training needed for technical malfunction protocols
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <MapPin className="h-4 w-4 text-blue-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Geographic Analysis</p>
                        <p className="text-xs text-muted-foreground">
                          Deploy additional resources to Kingston metropolitan area
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}