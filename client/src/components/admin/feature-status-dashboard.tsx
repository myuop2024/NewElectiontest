import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Settings, 
  Activity,
  Shield,
  MessageSquare,
  BarChart3,
  ExternalLink,
  RefreshCw
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function FeatureStatusDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get feature status
  const { data: features, isLoading: featuresLoading } = useQuery({
    queryKey: ['/api/admin/features/status']
  });

  // Get system health
  const { data: systemHealth, isLoading: healthLoading } = useQuery({
    queryKey: ['/api/admin/system/health']
  });

  // Initialize settings mutation
  const initializeSettingsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/admin/settings/initialize', {
        method: 'POST'
      });
    },
    onSuccess: () => {
      toast({
        title: "Settings Initialized",
        description: "Default settings have been created for all features."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/features/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/system/health'] });
    },
    onError: () => {
      toast({
        title: "Initialization Failed",
        description: "Failed to initialize default settings.",
        variant: "destructive"
      });
    }
  });

  const getStatusIcon = (enabled: boolean, configured: boolean) => {
    if (enabled && configured) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    } else if (enabled && !configured) {
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    } else {
      return <XCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusText = (enabled: boolean, configured: boolean) => {
    if (enabled && configured) return "Active";
    if (enabled && !configured) return "Needs Config";
    return "Disabled";
  };

  const getStatusVariant = (enabled: boolean, configured: boolean) => {
    if (enabled && configured) return "default";
    if (enabled && !configured) return "destructive";
    return "secondary";
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Security': return <Shield className="h-4 w-4" />;
      case 'Communications': return <MessageSquare className="h-4 w-4" />;
      case 'Analytics': return <BarChart3 className="h-4 w-4" />;
      case 'Navigation': return <ExternalLink className="h-4 w-4" />;
      default: return <Settings className="h-4 w-4" />;
    }
  };

  const groupedFeatures = features?.reduce((acc: any, feature: any) => {
    if (!acc[feature.category]) {
      acc[feature.category] = [];
    }
    acc[feature.category].push(feature);
    return acc;
  }, {}) || {};

  if (featuresLoading || healthLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Activity className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">System Status Overview</h2>
        </div>
        <Button
          onClick={() => initializeSettingsMutation.mutate()}
          disabled={initializeSettingsMutation.isPending}
          variant="outline"
          size="sm"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Initialize Defaults
        </Button>
      </div>

      {/* System Health Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">System Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              {systemHealth?.overall === 'healthy' && <CheckCircle className="h-5 w-5 text-green-500" />}
              {systemHealth?.overall === 'warning' && <AlertTriangle className="h-5 w-5 text-yellow-500" />}
              {systemHealth?.overall === 'error' && <XCircle className="h-5 w-5 text-red-500" />}
              <span className="font-medium capitalize">{systemHealth?.overall || 'Unknown'}</span>
            </div>
            
            <div className="flex space-x-4 text-sm text-gray-600">
              <span>{systemHealth?.services?.filter((s: any) => s.status === 'healthy').length || 0} Healthy</span>
              <span>{systemHealth?.warnings?.length || 0} Warnings</span>
              <span>{systemHealth?.errors?.length || 0} Errors</span>
            </div>
          </div>

          {systemHealth?.warnings?.length > 0 && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-sm font-medium text-yellow-800 mb-1">Warnings:</p>
              <ul className="text-sm text-yellow-700 space-y-1">
                {systemHealth.warnings.map((warning: string, index: number) => (
                  <li key={index}>• {warning}</li>
                ))}
              </ul>
            </div>
          )}

          {systemHealth?.errors?.length > 0 && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
              <p className="text-sm font-medium text-red-800 mb-1">Errors:</p>
              <ul className="text-sm text-red-700 space-y-1">
                {systemHealth.errors.map((error: string, index: number) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Feature Status by Category */}
      <Tabs defaultValue={Object.keys(groupedFeatures)[0]} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          {Object.keys(groupedFeatures).map((category) => (
            <TabsTrigger key={category} value={category} className="flex items-center space-x-1">
              {getCategoryIcon(category)}
              <span>{category}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {Object.entries(groupedFeatures).map(([category, categoryFeatures]: [string, any]) => (
          <TabsContent key={category} value={category} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoryFeatures.map((feature: any) => (
                <Card key={feature.key} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-sm font-medium">{feature.name}</CardTitle>
                        <p className="text-xs text-gray-500">{feature.description}</p>
                      </div>
                      {getStatusIcon(feature.enabled, feature.configured)}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between">
                      <Badge 
                        variant={getStatusVariant(feature.enabled, feature.configured)}
                        className="text-xs"
                      >
                        {getStatusText(feature.enabled, feature.configured)}
                      </Badge>
                      
                      {feature.lastUpdated && (
                        <span className="text-xs text-gray-400">
                          Updated {new Date(feature.lastUpdated).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    {feature.error && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                        {feature.error}
                      </div>
                    )}

                    {feature.enabled && !feature.configured && (
                      <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
                        This feature is enabled but requires additional configuration to function properly.
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {features?.filter((f: any) => f.enabled && f.configured).length || 0}
              </div>
              <div className="text-sm text-gray-600">Active Features</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {features?.filter((f: any) => f.enabled && !f.configured).length || 0}
              </div>
              <div className="text-sm text-gray-600">Need Config</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-500">
                {features?.filter((f: any) => !f.enabled).length || 0}
              </div>
              <div className="text-sm text-gray-600">Disabled</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {features?.length || 0}
              </div>
              <div className="text-sm text-gray-600">Total Features</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}