import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, Brain, CheckCircle, Clock, FileText, TrendingUp, Zap } from "lucide-react";

interface IncidentClassification {
  id: string;
  reportId: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  subcategory: string;
  confidence: number;
  riskScore: number;
  keywords: string[];
  suggestedActions: string[];
  escalationRecommended: boolean;
  timestamp: string;
  aiModel: string;
}

interface ClassificationModel {
  id: string;
  name: string;
  description: string;
  accuracy: number;
  isActive: boolean;
  lastTrained: string;
}

interface AnalysisResult {
  classification: IncidentClassification;
  patterns: {
    similarIncidents: number;
    geographicCluster: boolean;
    timePattern: string;
  };
  recommendations: string[];
}

export default function AIIncidentClassifier() {
  const [selectedModel, setSelectedModel] = useState<string>("gemini-pro");
  const [analysisText, setAnalysisText] = useState("");
  const [batchProcessing, setBatchProcessing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch available AI models
  const { data: models, isLoading: modelsLoading } = useQuery<ClassificationModel[]>({
    queryKey: ["/api/ai/models"],
  });

  // Fetch recent classifications
  const { data: recentClassifications, isLoading: classificationsLoading } = useQuery<IncidentClassification[]>({
    queryKey: ["/api/ai/classifications/recent"],
  });

  // Fetch classification statistics
  const { data: classificationStats } = useQuery({
    queryKey: ["/api/ai/classifications/stats"],
  });

  // Single incident analysis mutation
  const analyzeIncidentMutation = useMutation({
    mutationFn: async (data: { text: string; model: string; reportId?: number }) => {
      const response = await apiRequest("POST", "/api/ai/analyze-incident", data);
      return response as unknown as AnalysisResult;
    },
    onSuccess: (result) => {
      toast({
        title: "Incident Analyzed",
        description: `Classification: ${result.classification.category} (${result.classification.confidence}% confidence)`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/ai/classifications"] });
    },
    onError: (error: any) => {
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to analyze incident",
        variant: "destructive",
      });
    },
  });

  // Batch processing mutation
  const batchAnalyzeMutation = useMutation({
    mutationFn: async (data: { model: string; filters?: any }) => {
      return await apiRequest("POST", "/api/ai/batch-analyze", data);
    },
    onSuccess: (result: any) => {
      toast({
        title: "Batch Analysis Complete",
        description: `Processed ${result.processedCount} incidents`,
      });
      setBatchProcessing(false);
      queryClient.invalidateQueries({ queryKey: ["/api/ai/classifications"] });
    },
    onError: (error: any) => {
      toast({
        title: "Batch Analysis Failed",
        description: error.message || "Failed to process batch analysis",
        variant: "destructive",
      });
      setBatchProcessing(false);
    },
  });

  const handleSingleAnalysis = () => {
    if (!analysisText.trim()) {
      toast({
        title: "Input Required",
        description: "Please enter incident text for analysis",
        variant: "destructive",
      });
      return;
    }

    analyzeIncidentMutation.mutate({
      text: analysisText,
      model: selectedModel,
    });
  };

  const handleBatchAnalysis = () => {
    setBatchProcessing(true);
    batchAnalyzeMutation.mutate({
      model: selectedModel,
    });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-green-600';
    if (confidence >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">AI Incident Classifier</h1>
          <p className="text-gray-600 dark:text-gray-300">
            Advanced machine learning analysis for electoral incident classification
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Brain className="h-8 w-8 text-blue-600" />
          <Badge variant="outline" className="text-sm">
            AI Powered
          </Badge>
        </div>
      </div>

      {/* Classification Statistics */}
      {classificationStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Analyzed</p>
                  <p className="text-2xl font-bold">{(classificationStats as any)?.totalAnalyzed || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">High Risk</p>
                  <p className="text-2xl font-bold">{(classificationStats as any)?.highRisk || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Avg Confidence</p>
                  <p className="text-2xl font-bold">{(classificationStats as any)?.avgConfidence || 0}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Accuracy</p>
                  <p className="text-2xl font-bold">{(classificationStats as any)?.accuracy || 0}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="analyze" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="analyze">Analyze Incident</TabsTrigger>
          <TabsTrigger value="batch">Batch Processing</TabsTrigger>
          <TabsTrigger value="history">Classification History</TabsTrigger>
        </TabsList>

        <TabsContent value="analyze" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Single Incident Analysis</CardTitle>
              <CardDescription>
                Analyze individual incident reports using AI classification
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="model-select">AI Model</Label>
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select AI model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gemini-pro">Gemini Pro</SelectItem>
                      <SelectItem value="gemini-flash">Gemini Flash</SelectItem>
                      <SelectItem value="huggingface-bert">HuggingFace BERT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="incident-text">Incident Description</Label>
                <Textarea
                  id="incident-text"
                  placeholder="Enter the incident description for AI analysis..."
                  value={analysisText}
                  onChange={(e) => setAnalysisText(e.target.value)}
                  rows={6}
                />
              </div>

              <Button 
                onClick={handleSingleAnalysis}
                disabled={analyzeIncidentMutation.isPending || !analysisText.trim()}
                className="w-full"
              >
                {analyzeIncidentMutation.isPending ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4 mr-2" />
                    Analyze Incident
                  </>
                )}
              </Button>

              {/* Analysis Results */}
              {analyzeIncidentMutation.data && (
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span>Analysis Results</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Category</Label>
                        <p className="font-semibold">{analyzeIncidentMutation.data.classification.category}</p>
                      </div>
                      <div>
                        <Label>Severity</Label>
                        <Badge className={getSeverityColor(analyzeIncidentMutation.data.classification.severity)}>
                          {analyzeIncidentMutation.data.classification.severity.toUpperCase()}
                        </Badge>
                      </div>
                      <div>
                        <Label>Confidence</Label>
                        <p className={`font-semibold ${getConfidenceColor(analyzeIncidentMutation.data.classification.confidence)}`}>
                          {analyzeIncidentMutation.data.classification.confidence}%
                        </p>
                      </div>
                      <div>
                        <Label>Risk Score</Label>
                        <p className="font-semibold">{analyzeIncidentMutation.data.classification.riskScore}/100</p>
                      </div>
                    </div>

                    {analyzeIncidentMutation.data.classification.keywords.length > 0 && (
                      <div>
                        <Label>Key Indicators</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {analyzeIncidentMutation.data.classification.keywords.map((keyword, index) => (
                            <Badge key={index} variant="outline">{keyword}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {analyzeIncidentMutation.data.recommendations.length > 0 && (
                      <div>
                        <Label>Recommendations</Label>
                        <ul className="list-disc list-inside space-y-1 mt-2">
                          {analyzeIncidentMutation.data.recommendations.map((rec, index) => (
                            <li key={index} className="text-sm">{rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="batch" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Batch Processing</CardTitle>
              <CardDescription>
                Analyze multiple unclassified incidents in bulk
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Processing Model</Label>
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gemini-pro">Gemini Pro</SelectItem>
                      <SelectItem value="gemini-flash">Gemini Flash (Faster)</SelectItem>
                      <SelectItem value="huggingface-bert">HuggingFace BERT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {batchProcessing && (
                <div className="space-y-2">
                  <Label>Processing Progress</Label>
                  <Progress value={65} className="w-full" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Processing incidents... This may take several minutes.
                  </p>
                </div>
              )}

              <Button 
                onClick={handleBatchAnalysis}
                disabled={batchAnalyzeMutation.isPending || batchProcessing}
                className="w-full"
              >
                {batchProcessing ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Processing Batch...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Start Batch Analysis
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Classifications</CardTitle>
              <CardDescription>
                View recent AI incident classifications and their results
              </CardDescription>
            </CardHeader>
            <CardContent>
              {classificationsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Clock className="h-6 w-6 animate-spin mr-2" />
                  <span>Loading classifications...</span>
                </div>
              ) : recentClassifications && recentClassifications.length > 0 ? (
                <div className="space-y-4">
                  {recentClassifications.map((classification) => (
                    <Card key={classification.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <Badge className={getSeverityColor(classification.severity)}>
                                {classification.severity.toUpperCase()}
                              </Badge>
                              <span className="font-semibold">{classification.category}</span>
                              <span className="text-sm text-gray-500">
                                Report #{classification.reportId}
                              </span>
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              <span className={getConfidenceColor(classification.confidence)}>
                                {classification.confidence}% confidence
                              </span>
                              <span className="mx-2">•</span>
                              <span>Risk Score: {classification.riskScore}/100</span>
                              <span className="mx-2">•</span>
                              <span>{classification.aiModel}</span>
                            </div>
                            {classification.keywords.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {classification.keywords.slice(0, 3).map((keyword, index) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {keyword}
                                  </Badge>
                                ))}
                                {classification.keywords.length > 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{classification.keywords.length - 3} more
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">
                            {new Date(classification.timestamp).toLocaleString()}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No classifications found. Start analyzing incidents to see results here.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}