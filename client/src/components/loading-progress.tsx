import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, 
  MessageSquare, 
  Globe, 
  MapPin, 
  TrendingUp,
  CheckCircle,
  XCircle,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';

interface LoadingStep {
  key: string;
  label: string;
  icon: React.ReactNode;
  isLoading: boolean;
  isComplete: boolean;
  hasError: boolean;
  message?: string;
}

interface LoadingProgressProps {
  steps: LoadingStep[];
  title?: string;
  description?: string;
  showDetailedProgress?: boolean;
}

export default function LoadingProgress({ 
  steps, 
  title = "Loading System Components",
  description = "Initializing AI intelligence systems...",
  showDetailedProgress = true
}: LoadingProgressProps) {
  const completedSteps = steps.filter(step => step.isComplete).length;
  const totalSteps = steps.length;
  const progressPercentage = (completedSteps / totalSteps) * 100;
  
  const hasErrors = steps.some(step => step.hasError);
  const isLoading = steps.some(step => step.isLoading);
  const allComplete = completedSteps === totalSteps;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isLoading ? (
              <RefreshCw className="h-5 w-5 animate-spin text-blue-500" />
            ) : allComplete ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : hasErrors ? (
              <AlertTriangle className="h-5 w-5 text-red-500" />
            ) : (
              <Brain className="h-5 w-5 text-blue-500" />
            )}
            {title}
          </CardTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {description}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Overall Progress */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className="text-sm text-gray-600">
                {completedSteps} of {totalSteps} components loaded
              </span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
            <div className="text-xs text-gray-500 text-center">
              {progressPercentage.toFixed(0)}% Complete
            </div>
          </div>

          {/* Detailed Progress */}
          {showDetailedProgress && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Component Status
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {steps.map((step) => (
                  <div
                    key={step.key}
                    className={`p-3 rounded-lg border ${
                      step.isComplete 
                        ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' 
                        : step.hasError 
                        ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
                        : step.isLoading 
                        ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
                        : 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex-shrink-0">
                        {step.isLoading ? (
                          <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                        ) : step.isComplete ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : step.hasError ? (
                          <XCircle className="h-4 w-4 text-red-500" />
                        ) : (
                          <div className="h-4 w-4 rounded-full bg-gray-300 dark:bg-gray-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {step.icon}
                          <span className="text-sm font-medium">{step.label}</span>
                        </div>
                        {step.message && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            {step.message}
                          </p>
                        )}
                      </div>
                      <Badge 
                        variant={
                          step.isComplete 
                            ? "default" 
                            : step.hasError 
                            ? "destructive" 
                            : step.isLoading 
                            ? "secondary" 
                            : "outline"
                        }
                        className="text-xs"
                      >
                        {step.isComplete 
                          ? "Complete" 
                          : step.hasError 
                          ? "Error" 
                          : step.isLoading 
                          ? "Loading..." 
                          : "Waiting"
                        }
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status Summary */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  {completedSteps} Complete
                </span>
                {steps.filter(s => s.isLoading).length > 0 && (
                  <span className="flex items-center gap-1">
                    <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                    {steps.filter(s => s.isLoading).length} Loading
                  </span>
                )}
                {steps.filter(s => s.hasError).length > 0 && (
                  <span className="flex items-center gap-1">
                    <XCircle className="h-4 w-4 text-red-500" />
                    {steps.filter(s => s.hasError).length} Errors
                  </span>
                )}
              </div>
              <div className="text-gray-500">
                {allComplete ? (
                  <span className="text-green-600 font-medium">All Systems Ready</span>
                ) : isLoading ? (
                  <span className="text-blue-600">Loading...</span>
                ) : hasErrors ? (
                  <span className="text-red-600">Some Components Failed</span>
                ) : (
                  <span>Initializing...</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function useLoadingSteps() {
  const [steps, setSteps] = React.useState<LoadingStep[]>([
    {
      key: 'ai',
      label: 'AI Engine',
      icon: <Brain className="h-4 w-4" />,
      isLoading: false,
      isComplete: false,
      hasError: false,
      message: 'Initializing AI processing engine...'
    },
    {
      key: 'x',
      label: 'Social Monitoring',
      icon: <MessageSquare className="h-4 w-4" />,
      isLoading: false,
      isComplete: false,
      hasError: false,
      message: 'Connecting to social media APIs...'
    },
    {
      key: 'news',
      label: 'News Aggregation',
      icon: <Globe className="h-4 w-4" />,
      isLoading: false,
      isComplete: false,
      hasError: false,
      message: 'Fetching Jamaica news sources...'
    },
    {
      key: 'parish',
      label: 'Parish Data',
      icon: <MapPin className="h-4 w-4" />,
      isLoading: false,
      isComplete: false,
      hasError: false,
      message: 'Loading parish monitoring data...'
    },
    {
      key: 'sentiment',
      label: 'Sentiment Analysis',
      icon: <TrendingUp className="h-4 w-4" />,
      isLoading: false,
      isComplete: false,
      hasError: false,
      message: 'Analyzing public sentiment...'
    }
  ]);

  const updateStep = (key: string, updates: Partial<LoadingStep>) => {
    setSteps(prev => prev.map(step => 
      step.key === key ? { ...step, ...updates } : step
    ));
  };

  const setStepLoading = (key: string, message?: string) => {
    updateStep(key, { isLoading: true, isComplete: false, hasError: false, message });
  };

  const setStepComplete = (key: string, message?: string) => {
    updateStep(key, { isLoading: false, isComplete: true, hasError: false, message });
  };

  const setStepError = (key: string, message?: string) => {
    updateStep(key, { isLoading: false, isComplete: false, hasError: true, message });
  };

  const resetSteps = () => {
    setSteps(prev => prev.map(step => ({
      ...step,
      isLoading: false,
      isComplete: false,
      hasError: false
    })));
  };

  return {
    steps,
    updateStep,
    setStepLoading,
    setStepComplete,
    setStepError,
    resetSteps
  };
}