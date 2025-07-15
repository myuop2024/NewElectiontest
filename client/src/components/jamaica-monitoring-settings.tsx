import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  Users, 
  Building, 
  MessageSquare, 
  MapPin, 
  Vote, 
  AlertTriangle,
  Plus,
  Settings,
  Save,
  RefreshCw,
  Eye,
  EyeOff,
  Trash2,
  Edit
} from 'lucide-react';

interface MonitoringConfig {
  id: number;
  configName: string;
  category: string;
  keywords: string[];
  isEnabled: boolean;
  description: string;
  lastUpdated: string;
  createdBy: string;
  priority: number;
}

interface MonitoringStats {
  totalConfigurations: number;
  activeConfigurations: number;
  totalKeywords: number;
  activeKeywords: number;
  categoryCounts: Record<string, number>;
  lastUpdate: string;
}

interface KeywordsByPriority {
  high: string[];
  medium: string[];
  low: string[];
}

interface JamaicaMonitoringData {
  configurations: MonitoringConfig[];
  stats: MonitoringStats;
  keywordsByPriority: KeywordsByPriority;
  categories: string[];
}

export default function JamaicaMonitoringSettings() {
  const [selectedConfig, setSelectedConfig] = useState<MonitoringConfig | null>(null);
  const [newKeywords, setNewKeywords] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('politicians');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch monitoring settings
  const { data: monitoringData, isLoading, error } = useQuery<JamaicaMonitoringData>({
    queryKey: ['/api/jamaica-monitoring/settings'],
    staleTime: 300000, // 5 minutes
  });

  // Initialize default settings
  const initializeMutation = useMutation({
    mutationFn: () => apiRequest('/api/jamaica-monitoring/settings/initialize', {
      method: 'POST'
    }),
    onSuccess: () => {
      toast({
        title: "Settings Initialized",
        description: "Default Jamaica monitoring settings have been loaded",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/jamaica-monitoring/settings'] });
    },
    onError: (error: any) => {
      toast({
        title: "Initialization Failed",
        description: error.message || "Failed to initialize monitoring settings",
        variant: "destructive",
      });
    },
  });

  // Toggle configuration
  const toggleMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/jamaica-monitoring/settings/${id}/toggle`, {
      method: 'POST'
    }),
    onSuccess: () => {
      toast({
        title: "Configuration Updated",
        description: "Monitoring configuration has been toggled",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/jamaica-monitoring/settings'] });
    },
    onError: (error: any) => {
      toast({
        title: "Toggle Failed",
        description: error.message || "Failed to toggle configuration",
        variant: "destructive",
      });
    },
  });

  // Add custom keywords
  const addKeywordsMutation = useMutation({
    mutationFn: ({ category, keywords }: { category: string; keywords: string[] }) => 
      apiRequest('/api/jamaica-monitoring/settings/keywords', {
        method: 'POST',
        body: { category, keywords }
      }),
    onSuccess: () => {
      toast({
        title: "Keywords Added",
        description: "Custom keywords have been added successfully",
      });
      setNewKeywords('');
      setIsDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/jamaica-monitoring/settings'] });
    },
    onError: (error: any) => {
      toast({
        title: "Add Keywords Failed",
        description: error.message || "Failed to add custom keywords",
        variant: "destructive",
      });
    },
  });

  // Remove keywords
  const removeKeywordsMutation = useMutation({
    mutationFn: ({ id, keywords }: { id: number; keywords: string[] }) => 
      apiRequest(`/api/jamaica-monitoring/settings/${id}/keywords`, {
        method: 'DELETE',
        body: { keywords }
      }),
    onSuccess: () => {
      toast({
        title: "Keywords Removed",
        description: "Selected keywords have been removed",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/jamaica-monitoring/settings'] });
    },
    onError: (error: any) => {
      toast({
        title: "Remove Keywords Failed",
        description: error.message || "Failed to remove keywords",
        variant: "destructive",
      });
    },
  });

  const handleAddKeywords = () => {
    if (!newKeywords.trim()) return;
    
    const keywords = newKeywords.split(',').map(k => k.trim()).filter(k => k.length > 0);
    addKeywordsMutation.mutate({ category: selectedCategory, keywords });
  };

  const handleRemoveKeyword = (configId: number, keyword: string) => {
    removeKeywordsMutation.mutate({ id: configId, keywords: [keyword] });
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'politicians': return <Users className="h-4 w-4" />;
      case 'parties': return <Building className="h-4 w-4" />;
      case 'commentators': return <MessageSquare className="h-4 w-4" />;
      case 'constituencies': return <MapPin className="h-4 w-4" />;
      case 'electionKeywords': return <Vote className="h-4 w-4" />;
      case 'socialIssues': return <AlertTriangle className="h-4 w-4" />;
      default: return <Settings className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 1: return 'bg-red-100 text-red-800';
      case 2: return 'bg-yellow-100 text-yellow-800';
      case 3: return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityText = (priority: number) => {
    switch (priority) {
      case 1: return 'High';
      case 2: return 'Medium';
      case 3: return 'Low';
      default: return 'Normal';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading Jamaica monitoring settings...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Settings Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600 mb-4">Failed to load monitoring settings</p>
          <Button onClick={() => initializeMutation.mutate()} disabled={initializeMutation.isPending}>
            {initializeMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Settings className="h-4 w-4 mr-2" />}
            Initialize Default Settings
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!monitoringData || monitoringData.configurations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Jamaica Monitoring Settings</CardTitle>
          <CardDescription>No monitoring configurations found</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => initializeMutation.mutate()} disabled={initializeMutation.isPending}>
            {initializeMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Settings className="h-4 w-4 mr-2" />}
            Initialize Default Settings
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Configurations</p>
                <p className="text-2xl font-bold">{monitoringData.stats.totalConfigurations}</p>
              </div>
              <Settings className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Configurations</p>
                <p className="text-2xl font-bold text-green-600">{monitoringData.stats.activeConfigurations}</p>
              </div>
              <Eye className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Keywords</p>
                <p className="text-2xl font-bold">{monitoringData.stats.totalKeywords}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Keywords</p>
                <p className="text-2xl font-bold text-blue-600">{monitoringData.stats.activeKeywords}</p>
              </div>
              <Vote className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Keywords Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Custom Keywords
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Custom Keywords</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="politicians">Politicians</SelectItem>
                  <SelectItem value="parties">Political Parties</SelectItem>
                  <SelectItem value="commentators">Commentators</SelectItem>
                  <SelectItem value="constituencies">Constituencies</SelectItem>
                  <SelectItem value="electionKeywords">Election Keywords</SelectItem>
                  <SelectItem value="socialIssues">Social Issues</SelectItem>
                  <SelectItem value="customKeywords">Custom Keywords</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="keywords">Keywords (comma-separated)</Label>
              <Textarea
                id="keywords"
                value={newKeywords}
                onChange={(e) => setNewKeywords(e.target.value)}
                placeholder="Enter keywords separated by commas..."
                rows={3}
              />
            </div>
            
            <Button onClick={handleAddKeywords} disabled={addKeywordsMutation.isPending}>
              {addKeywordsMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Add Keywords
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Configurations */}
      <Tabs defaultValue="configurations" className="w-full">
        <TabsList>
          <TabsTrigger value="configurations">Configurations</TabsTrigger>
          <TabsTrigger value="priorities">By Priority</TabsTrigger>
          <TabsTrigger value="categories">By Category</TabsTrigger>
        </TabsList>
        
        <TabsContent value="configurations" className="space-y-4">
          {monitoringData.configurations.map((config) => (
            <Card key={config.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(config.category)}
                    <div>
                      <CardTitle className="text-lg">{config.configName}</CardTitle>
                      <CardDescription>{config.description}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getPriorityColor(config.priority)}>
                      {getPriorityText(config.priority)}
                    </Badge>
                    <Switch
                      checked={config.isEnabled}
                      onCheckedChange={() => toggleMutation.mutate(config.id)}
                      disabled={toggleMutation.isPending}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{config.keywords.length} keywords</Badge>
                    <Badge variant="outline">{config.category}</Badge>
                    <Badge variant="outline">Updated: {new Date(config.lastUpdated).toLocaleDateString()}</Badge>
                  </div>
                  
                  <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                    {config.keywords.slice(0, 20).map((keyword, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {keyword}
                        <button
                          onClick={() => handleRemoveKeyword(config.id, keyword)}
                          className="ml-1 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                    {config.keywords.length > 20 && (
                      <Badge variant="outline" className="text-xs">
                        +{config.keywords.length - 20} more
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
        
        <TabsContent value="priorities" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-red-600">High Priority ({monitoringData.keywordsByPriority.high.length} keywords)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1">
                {monitoringData.keywordsByPriority.high.slice(0, 50).map((keyword, index) => (
                  <Badge key={index} className="bg-red-100 text-red-800 text-xs">
                    {keyword}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-yellow-600">Medium Priority ({monitoringData.keywordsByPriority.medium.length} keywords)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1">
                {monitoringData.keywordsByPriority.medium.slice(0, 50).map((keyword, index) => (
                  <Badge key={index} className="bg-yellow-100 text-yellow-800 text-xs">
                    {keyword}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-green-600">Low Priority ({monitoringData.keywordsByPriority.low.length} keywords)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1">
                {monitoringData.keywordsByPriority.low.slice(0, 50).map((keyword, index) => (
                  <Badge key={index} className="bg-green-100 text-green-800 text-xs">
                    {keyword}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="categories" className="space-y-4">
          {Object.entries(monitoringData.stats.categoryCounts).map(([category, count]) => (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getCategoryIcon(category)}
                  {category} ({count} configurations)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {monitoringData.configurations
                    .filter(config => config.category === category)
                    .map(config => (
                      <div key={config.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div>
                          <p className="font-medium">{config.configName}</p>
                          <p className="text-sm text-gray-600">{config.keywords.length} keywords</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getPriorityColor(config.priority)}>
                            {getPriorityText(config.priority)}
                          </Badge>
                          {config.isEnabled ? (
                            <Eye className="h-4 w-4 text-green-500" />
                          ) : (
                            <EyeOff className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}