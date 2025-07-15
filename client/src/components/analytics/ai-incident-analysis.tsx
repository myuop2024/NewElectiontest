import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  Brain, 
  AlertTriangle, 
  TrendingUp, 
  Users, 
  Clock, 
  Target,
  CheckCircle,
  AlertCircle,
  Info,
  Zap
} from "lucide-react";

interface IncidentAnalysis {
  classification: {
    primaryCategory: string;
    subcategory: string;
    confidence: number;
  };
  severity: {
    level: string;
    reasoning: string;
    confidence: number;
  };
  recommendations: {
    immediateActions: string[];
    followUpActions: string[];
    stakeholders: string[];
  };
  patterns: {
    similarIncidents: string[];
    riskFactors: string[];
  };
  timeline: {
    urgency: string;
    estimatedResolutionTime: string;
  };
}

interface AIIncidentAnalysisProps {
  incidentData?: {
    type: string;
    title: string;
    description: string;
    location?: string;
    witnessCount?: string;
    evidenceNotes?: string;
    pollingStationId?: string;
  };
  onAnalysisComplete?: (analysis: IncidentAnalysis) => void;
}

export function AIIncidentAnalysis({ incidentData, onAnalysisComplete }: AIIncidentAnalysisProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [analysis, setAnalysis] = useState<IncidentAnalysis | null>(null);

  const analyzeIncidentMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/ai/analyze-incident", data),
    onSuccess: (response: any) => {
      setAnalysis(response.analysis);
      onAnalysisComplete?.(response.analysis);
      toast({
        title: "Analysis Complete",
        description: "AI-powered incident analysis has been generated",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
    },
    onError: (error) => {
      toast({
        title: "Analysis Failed",
        description: "Unable to generate AI analysis. Please check API configuration.",
        variant: "destructive"
      });
    }
  });

  const { data: patterns } = useQuery<any>({
    queryKey: ["/api/ai/incident-patterns"],
    enabled: !incidentData // Only fetch patterns when not analyzing specific incident
  });

  const handleAnalyze = () => {
    if (!incidentData) return;
    analyzeIncidentMutation.mutate(incidentData);
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

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'immediate': return <Zap className="h-4 w-4 text-red-500" />;
      case 'urgent': return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case 'standard': return <Clock className="h-4 w-4 text-blue-500" />;
      default: return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatCategory = (category: string) => {
    return category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="space-y-6">
      {/* Analysis Trigger */}
      {incidentData && !analysis && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Brain className="h-5 w-5 text-purple-600" />
              <span>AI-Powered Analysis</span>
            </CardTitle>
            <CardDescription>
              Generate intelligent classification and recommendations for this incident
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleAnalyze}
              disabled={analyzeIncidentMutation.isPending}
              className="w-full"
            >
              {analyzeIncidentMutation.isPending ? (
                <>
                  <Brain className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing Incident...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4 mr-2" />
                  Analyze with AI
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Analysis Results */}
      {analysis && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Classification & Severity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5 text-blue-600" />
                <span>Classification</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Primary Category</span>
                  <Badge variant="outline">
                    {formatCategory(analysis.classification.primaryCategory)}
                  </Badge>
                </div>
                <Progress value={analysis.classification.confidence * 100} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  {(analysis.classification.confidence * 100).toFixed(1)}% confidence
                </p>
              </div>

              <Separator />

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Severity Level</span>
                  <Badge className={getSeverityColor(analysis.severity.level)}>
                    {analysis.severity.level.toUpperCase()}
                  </Badge>
                </div>
                <Progress value={analysis.severity.confidence * 100} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  {analysis.severity.reasoning}
                </p>
              </div>

              <div className="flex items-center space-x-2 p-2 bg-muted rounded-lg">
                {getUrgencyIcon(analysis.timeline.urgency)}
                <span className="text-sm">
                  <strong>{formatCategory(analysis.timeline.urgency)}</strong> response needed
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span>Recommendations</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium text-sm mb-2">Immediate Actions</h4>
                <ul className="space-y-1">
                  {analysis.recommendations.immediateActions.map((action, index) => (
                    <li key={index} className="text-sm flex items-start space-x-2">
                      <span className="text-red-500 font-bold">•</span>
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium text-sm mb-2">Follow-up Actions</h4>
                <ul className="space-y-1">
                  {analysis.recommendations.followUpActions.map((action, index) => (
                    <li key={index} className="text-sm flex items-start space-x-2">
                      <span className="text-blue-500 font-bold">•</span>
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium text-sm mb-2 flex items-center space-x-2">
                  <Users className="h-4 w-4" />
                  <span>Stakeholders to Notify</span>
                </h4>
                <div className="flex flex-wrap gap-1">
                  {analysis.recommendations.stakeholders.map((stakeholder, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {stakeholder}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Patterns & Risk Factors */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-purple-600" />
                <span>Pattern Analysis</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-sm mb-2">Similar Incident Patterns</h4>
                  {analysis.patterns.similarIncidents.length > 0 ? (
                    <ul className="space-y-1">
                      {analysis.patterns.similarIncidents.map((pattern, index) => (
                        <li key={index} className="text-sm text-muted-foreground">
                          • {pattern}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No similar patterns identified</p>
                  )}
                </div>

                <div>
                  <h4 className="font-medium text-sm mb-2">Risk Factors</h4>
                  {analysis.patterns.riskFactors.length > 0 ? (
                    <ul className="space-y-1">
                      {analysis.patterns.riskFactors.map((risk, index) => (
                        <li key={index} className="text-sm text-muted-foreground">
                          • {risk}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No specific risk factors identified</p>
                  )}
                </div>
              </div>

              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="flex items-center space-x-2 mb-1">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-sm">Estimated Resolution</span>
                </div>
                <p className="text-sm text-blue-700">{analysis.timeline.estimatedResolutionTime}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* System-wide Patterns (when not analyzing specific incident) */}
      {!incidentData && patterns && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              <span>System-wide Incident Patterns</span>
            </CardTitle>
            <CardDescription>
              AI-identified patterns across all incidents
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {patterns.totalAnalyzed > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-sm mb-2">Category Distribution</h4>
                  <div className="space-y-2">
                    {Object.entries(patterns.categoryDistribution || {}).map(([category, count]) => (
                      <div key={category} className="flex items-center justify-between">
                        <span className="text-sm">{formatCategory(category)}</span>
                        <Badge variant="outline">{count}</Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-sm mb-2">Severity Distribution</h4>
                  <div className="space-y-2">
                    {Object.entries(patterns.severityDistribution || {}).map(([severity, count]) => (
                      <div key={severity} className="flex items-center justify-between">
                        <span className="text-sm">{severity.toUpperCase()}</span>
                        <Badge className={getSeverityColor(severity)}>{count}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No incidents available for pattern analysis
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}