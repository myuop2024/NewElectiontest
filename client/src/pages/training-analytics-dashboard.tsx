import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Trophy, 
  BookOpen, 
  Award, 
  TrendingUp, 
  Clock, 
  Star, 
  Download, 
  RefreshCw,
  CheckCircle,
  AlertCircle,
  BarChart3,
  Target,
  GraduationCap,
  Zap
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

export default function TrainingAnalyticsDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [syncingProgress, setSyncingProgress] = useState(false);

  // Fetch training dashboard data
  const { data: dashboard, isLoading, error } = useQuery({
    queryKey: ['/api/training/dashboard'],
    queryFn: async ({ queryKey }) => {
      const response = await fetch(queryKey[0]);
      if (!response.ok) throw new Error('Failed to fetch dashboard data');
      return response.json();
    },
    refetchInterval: 30000,
    retry: 2
  });

  // Fetch user certificates
  const { data: certificates, isLoading: certificatesLoading } = useQuery({
    queryKey: ['/api/certificates/user'],
    queryFn: async ({ queryKey }) => {
      const response = await fetch(queryKey[0]);
      if (!response.ok) throw new Error('Failed to fetch certificates');
      return response.json();
    },
    retry: 2
  });

  // Sync progress mutation
  const syncProgressMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/training/sync-progress', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Failed to sync progress');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Progress Synced",
        description: "Your Google Classroom progress has been updated successfully."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/training/dashboard'] });
    },
    onError: (error) => {
      toast({
        title: "Sync Failed",
        description: error instanceof Error ? error.message : "Failed to sync progress",
        variant: "destructive"
      });
    }
  });

  const handleSyncProgress = async () => {
    setSyncingProgress(true);
    try {
      await syncProgressMutation.mutateAsync();
    } finally {
      setSyncingProgress(false);
    }
  };

  const getReadinessColor = (level: string) => {
    switch (level) {
      case 'expert_ready': return 'bg-green-500';
      case 'field_ready': return 'bg-blue-500';
      case 'basic_ready': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getReadinessLabel = (level: string) => {
    switch (level) {
      case 'expert_ready': return 'Expert Ready';
      case 'field_ready': return 'Field Ready';
      case 'basic_ready': return 'Basic Ready';
      default: return 'Not Ready';
    }
  };

  const getCompetencyLevel = (score: number) => {
    if (score >= 90) return { label: 'Expert', color: 'bg-purple-500' };
    if (score >= 80) return { label: 'Advanced', color: 'bg-green-500' };
    if (score >= 70) return { label: 'Intermediate', color: 'bg-blue-500' };
    if (score >= 60) return { label: 'Basic', color: 'bg-yellow-500' };
    return { label: 'Beginner', color: 'bg-gray-500' };
  };

  const handleDownloadCertificate = async (certificateId) => {
    try {
      const response = await fetch(`/api/certificates/${certificateId}/download`);
      if (!response.ok) throw new Error('Failed to download');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `certificate-${certificateId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      toast({ title: 'Download Failed', description: error.message, variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-gray-600 dark:text-gray-400">Loading your training analytics...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    console.error("Training dashboard error:", error);
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="max-w-7xl mx-auto">
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load training analytics. Please try refreshing the page or contact support.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  const analytics = dashboard?.analytics;
  const competency = analytics ? getCompetencyLevel(analytics.competencyScore || 0) : { label: 'Unknown', color: 'bg-gray-500' };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <GraduationCap className="h-8 w-8 text-blue-600" />
              Training Analytics Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Track your electoral observer training progress and achievements
            </p>
          </div>
          <Button 
            onClick={handleSyncProgress}
            disabled={syncingProgress}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncingProgress ? 'animate-spin' : ''}`} />
            Sync Progress
          </Button>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Courses Completed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboard?.summary?.coursesCompleted || 0}</div>
              <p className="text-blue-100 text-xs">
                {analytics?.totalCoursesEnrolled || 0} enrolled
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Award className="h-4 w-4" />
                Certificates Earned
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboard?.summary?.certificatesEarned || 0}</div>
              <p className="text-green-100 text-xs">Digital certificates</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Star className="h-4 w-4" />
                Competency Level
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{competency.label}</div>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 bg-white/20 rounded-full h-2">
                  <div 
                    className="bg-white rounded-full h-2 transition-all"
                    style={{ width: `${analytics?.competencyScore || 0}%` }}
                  />
                </div>
                <span className="text-purple-100 text-xs">
                  {Math.round(analytics?.competencyScore || 0)}%
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Target className="h-4 w-4" />
                Readiness Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">
                {getReadinessLabel(dashboard?.summary?.readinessStatus || 'not_ready')}
              </div>
              <p className="text-orange-100 text-xs">Current deployment status</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
            <TabsTrigger value="certificates">Certificates</TabsTrigger>
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Performance Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Performance Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {analytics ? (
                    <>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Average Grade</span>
                          <span className="font-medium">{analytics.averageGrade?.toFixed(1) || 0}%</span>
                        </div>
                        <Progress value={analytics.averageGrade || 0} className="h-2" />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Training Efficiency</span>
                          <span className="font-medium">{analytics.trainingEfficiency?.toFixed(1) || 0}%</span>
                        </div>
                        <Progress value={analytics.trainingEfficiency || 0} className="h-2" />
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-600">Study Hours</span>
                        </div>
                        <span className="font-medium">{analytics.totalStudyHours?.toFixed(1) || 0}h</span>
                      </div>
                    </>
                  ) : (
                    <p className="text-gray-500 text-center py-4">No analytics data available</p>
                  )}
                </CardContent>
              </Card>

              {/* Skill Assessment */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Skill Assessment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics && analytics.strongAreas && analytics.improvementAreas ? (
                    <div className="space-y-3">
                      <div>
                        <h4 className="text-sm font-medium text-green-600 mb-2">Strong Areas</h4>
                        <div className="flex flex-wrap gap-1">
                          {analytics.strongAreas.map((area, index) => (
                            <Badge key={index} variant="secondary" className="bg-green-100 text-green-800 text-xs">
                              {area}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium text-orange-600 mb-2">Improvement Areas</h4>
                        <div className="flex flex-wrap gap-1">
                          {analytics.improvementAreas.map((area, index) => (
                            <Badge key={index} variant="secondary" className="bg-orange-100 text-orange-800 text-xs">
                              {area}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">Complete courses to see skill assessment</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="certificates" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Digital Certificates
                </CardTitle>
                <CardDescription>
                  Your earned certificates with blockchain-style verification
                </CardDescription>
              </CardHeader>
              <CardContent>
                {certificatesLoading ? (
                  <p className="text-center py-4">Loading certificates...</p>
                ) : certificates && certificates.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {certificates.map((cert) => (
                      <Card key={cert.id} className="border-2 border-dashed border-gray-200 hover:border-blue-300 transition-colors">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <Award className="h-8 w-8 text-yellow-500" />
                            <Badge variant="secondary">{cert.certificateType?.replace('_', ' ') || 'Certificate'}</Badge>
                          </div>
                          <CardTitle className="text-sm">{cert.title}</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <p className="text-xs text-gray-600 mb-3">{cert.description}</p>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span>Certificate #:</span>
                              <span className="font-mono text-xs">{cert.certificateNumber}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Issued:</span>
                              <span>{new Date(cert.issueDate).toLocaleDateString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Downloads:</span>
                              <span>{cert.downloadCount || 0}</span>
                            </div>
                          </div>
                          <Button size="sm" className="w-full mt-3" variant="outline" onClick={() => handleDownloadCertificate(cert.id)}>
                            <Download className="h-3 w-3 mr-1" />
                            Download
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No certificates earned yet. Complete training courses to earn certificates!</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recommendations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  AI-Powered Recommendations
                </CardTitle>
                <CardDescription>
                  Personalized course suggestions based on your progress and goals
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analytics?.recommendedCourses && analytics.recommendedCourses.length > 0 ? (
                  <div className="space-y-4">
                    {analytics.recommendedCourses.map((course, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center">
                            <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <h4 className="font-medium">{course}</h4>
                            <p className="text-sm text-gray-600">Recommended for your career advancement</p>
                          </div>
                        </div>
                        <Button size="sm" variant="outline">
                          View Course
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">Complete more courses to receive personalized recommendations!</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="progress" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Learning Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {dashboard?.currentProgress?.length > 0 ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-gray-100 rounded-lg">
                      <p className="text-center text-gray-600">Progress visualization coming soon</p>
                    </div>
                    <div className="space-y-2">
                      {dashboard.currentProgress.map((progress, index) => (
                        <div key={index} className="p-3 bg-gray-50 rounded-lg">
                          <p className="font-medium">{progress.assignmentTitle}</p>
                          <p className="text-sm text-gray-600">Status: {progress.submissionState}</p>
                          <p className="text-sm text-gray-600">Grade: {progress.grade || 'Pending'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">
                    No progress data available. Sync your Google Classroom progress to view details.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}