import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { 
  Monitor, 
  Plus, 
  Trash2, 
  Globe, 
  X,
  Settings,
  Save,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Eye,
  Search,
  Brain
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface MonitoringTarget {
  id: string;
  name: string;
  url: string;
  type: 'social_media' | 'news_site' | 'blog' | 'government' | 'other';
  keywords: string[];
  parish?: string;
  constituency?: string;
  active: boolean;
  lastChecked?: string;
  status?: 'active' | 'error' | 'paused';
  description?: string;
  ai_assessment?: {
    relevance: number;
    confidence: number;
    reasoning: string;
    jamaica_focus: number;
    political_coverage: number;
    reliability: number;
    update_frequency: 'high' | 'medium' | 'low';
    language: 'english' | 'patois' | 'mixed';
    assessed_at: string;
  };
}

interface MonitoringConfig {
  id: string;
  name: string;
  targets: MonitoringTarget[];
  keywords: string[];
  parishes: string[];
  constituencies: string[];
  frequency: number; // minutes
  active: boolean;
  created_at: string;
  updated_at: string;
}

export default function MonitoringConfig() {
  const [newTarget, setNewTarget] = useState<Partial<MonitoringTarget>>({
    name: '',
    url: '',
    type: 'news_site',
    keywords: [],
    active: true
  });
  const [keywordInput, setKeywordInput] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [bulkSites, setBulkSites] = useState('');
  const [bulkResults, setBulkResults] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const jamaicaParishes = [
    'Kingston', 'St. Andrew', 'St. Thomas', 'Portland', 'St. Mary', 'St. Ann',
    'Trelawny', 'St. James', 'Hanover', 'Westmoreland', 'St. Elizabeth',
    'Manchester', 'Clarendon', 'St. Catherine'
  ];

  const electionKeywords = [
    'election', 'voting', 'democracy', 'political', 'campaign', 'candidate',
    'JLP', 'PNP', 'Andrew Holness', 'Mark Golding', 'manifesto', 'policy',
    'constituency', 'parliamentary', 'voter', 'ballot', 'polling station',
    'electoral commission', 'governance', 'corruption', 'transparency',
    'infrastructure', 'roads', 'healthcare', 'education', 'crime', 'economy',
    'unemployment', 'development', 'parish council'
  ];

  const { data: configs, isLoading } = useQuery<MonitoringConfig[]>({
    queryKey: ['/api/monitoring/configs'],
    staleTime: 300000, // 5 minutes
  });

  const addTargetMutation = useMutation({
    mutationFn: (target: Partial<MonitoringTarget>) => 
      apiRequest('/api/monitoring/targets', 'POST', target),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/monitoring/configs'] });
      setNewTarget({
        name: '',
        url: '',
        type: 'news_site',
        keywords: [],
        active: true
      });
      setKeywordInput('');
      setShowAddForm(false);
      toast({
        title: "Monitoring Target Added",
        description: "New monitoring target has been configured successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error Adding Target",
        description: error.message || "Failed to add monitoring target.",
        variant: "destructive",
      });
    }
  });

  const deleteTargetMutation = useMutation({
    mutationFn: (targetId: string) => 
      apiRequest(`/api/monitoring/targets/${targetId}`, 'DELETE'),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/monitoring/configs'] });
      toast({
        title: "Target Removed",
        description: data.message || "Monitoring target has been removed successfully.",
      });
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || error.message || "Failed to remove monitoring target.";
      toast({
        title: "Error Removing Target",
        description: errorMessage,
        variant: "destructive",
      });
    }
  });

  const toggleTargetMutation = useMutation({
    mutationFn: ({ targetId, active }: { targetId: string; active: boolean }) => 
      apiRequest(`/api/monitoring/targets/${targetId}/toggle`, 'POST', { active }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/monitoring/configs'] });
      toast({
        title: "Target Status Updated",
        description: data.message || "Monitoring target status has been updated.",
      });
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || error.message || "Failed to update target status.";
      toast({
        title: "Error Updating Target",
        description: errorMessage,
        variant: "destructive",
      });
    }
  });

  const bulkAddMutation = useMutation({
    mutationFn: (sites: Array<{ url: string; name?: string }>) => 
      apiRequest('/api/monitoring/bulk-add', 'POST', { sites }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/monitoring/configs'] });
      setBulkResults(data.result);
      toast({
        title: "Bulk Sites Added",
        description: data.message || "Sites have been added with AI assessment.",
      });
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || error.message || "Failed to add bulk sites.";
      toast({
        title: "Error Adding Sites",
        description: errorMessage,
        variant: "destructive",
      });
    }
  });

  const handleAddKeyword = () => {
    if (keywordInput.trim() && !newTarget.keywords?.includes(keywordInput.trim())) {
      setNewTarget(prev => ({
        ...prev,
        keywords: [...(prev.keywords || []), keywordInput.trim()]
      }));
      setKeywordInput('');
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    setNewTarget(prev => ({
      ...prev,
      keywords: prev.keywords?.filter(k => k !== keyword) || []
    }));
  };

  const handleSubmit = () => {
    if (!newTarget.name?.trim()) {
      toast({
        title: "Missing Name",
        description: "Please provide a name for the monitoring target.",
        variant: "destructive",
      });
      return;
    }

    if (!newTarget.url?.trim()) {
      toast({
        title: "Missing URL",
        description: "Please provide a URL for the monitoring target.",
        variant: "destructive",
      });
      return;
    }

    // Validate URL format
    try {
      new URL(newTarget.url.trim());
    } catch {
      toast({
        title: "Invalid URL",
        description: "Please provide a valid URL for the monitoring target.",
        variant: "destructive",
      });
      return;
    }

    // Keywords are now optional as AI will generate them
    const targetData = {
      ...newTarget,
      name: newTarget.name.trim(),
      url: newTarget.url.trim(),
      keywords: newTarget.keywords?.filter(k => k.trim()) || [],
      parish: newTarget.parish || 'All Parishes',
      description: newTarget.description?.trim() || ''
    };

    addTargetMutation.mutate(targetData);
  };

  const handleBulkSubmit = () => {
    if (!bulkSites.trim()) {
      toast({
        title: "Missing Sites",
        description: "Please provide URLs to add.",
        variant: "destructive",
      });
      return;
    }

    // Parse URLs from text
    const urlRegex = /https?:\/\/[^\s]+/g;
    const urls = bulkSites.match(urlRegex) || [];
    
    if (urls.length === 0) {
      toast({
        title: "No Valid URLs",
        description: "Please provide valid URLs starting with http:// or https://",
        variant: "destructive",
      });
      return;
    }

    const sites = urls.map(url => ({ url: url.trim() }));
    bulkAddMutation.mutate(sites);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'error': return 'bg-red-100 text-red-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'social_media': return <X className="h-4 w-4" />;
      case 'news_site': return <Globe className="h-4 w-4" />;
      case 'blog': return <Eye className="h-4 w-4" />;
      case 'government': return <Settings className="h-4 w-4" />;
      default: return <Monitor className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const allTargets = configs?.flatMap(config => config.targets) || [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Monitor className="h-8 w-8 text-blue-600" />
            Monitoring Configuration
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Configure custom monitoring targets for Jamaica election intelligence
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Single Target
          </Button>
          <Button 
            onClick={() => setShowBulkAdd(!showBulkAdd)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Globe className="h-4 w-4" />
            Bulk Add Sites
          </Button>
        </div>
      </div>

      {/* Add Target Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Monitoring Target</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Target Name</Label>
                <Input
                  id="name"
                  value={newTarget.name || ''}
                  onChange={(e) => setNewTarget(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Jamaica Observer Politics"
                />
              </div>
              <div>
                <Label htmlFor="url">URL</Label>
                <Input
                  id="url"
                  value={newTarget.url || ''}
                  onChange={(e) => setNewTarget(prev => ({ ...prev, url: e.target.value }))}
                  placeholder="https://jamaicaobserver.com/politics"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">Type</Label>
                <select
                  id="type"
                  value={newTarget.type || 'news_site'}
                  onChange={(e) => setNewTarget(prev => ({ ...prev, type: e.target.value as MonitoringTarget['type'] }))}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="news_site">News Site</option>
                  <option value="social_media">Social Media</option>
                  <option value="blog">Blog</option>
                  <option value="government">Government</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <Label htmlFor="parish">Parish (Optional)</Label>
                <select
                  id="parish"
                  value={newTarget.parish || ''}
                  onChange={(e) => setNewTarget(prev => ({ ...prev, parish: e.target.value }))}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="">All Parishes</option>
                  {jamaicaParishes.map(parish => (
                    <option key={parish} value={parish}>{parish}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={newTarget.description || ''}
                onChange={(e) => setNewTarget(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Monitors political news and election coverage from Jamaica Observer"
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="keywords">Election Keywords (Optional - AI will generate optimal keywords)</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  id="keywords"
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  placeholder="Add custom keywords (optional)"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddKeyword()}
                />
                <Button onClick={handleAddKeyword} type="button" variant="outline">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {newTarget.keywords?.map(keyword => (
                  <Badge key={keyword} variant="secondary" className="flex items-center gap-1">
                    {keyword}
                    <button
                      onClick={() => handleRemoveKeyword(keyword)}
                      className="text-xs hover:text-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <p className="text-sm text-gray-500 mt-2">
                AI will automatically assess the site and generate optimal election-related keywords
              </p>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleSubmit}
                disabled={addTargetMutation.isPending}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {addTargetMutation.isPending ? 'Adding...' : 'Add Target'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowAddForm(false)}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bulk Add Sites Form */}
      {showBulkAdd && (
        <Card>
          <CardHeader>
            <CardTitle>Bulk Add Monitoring Sites</CardTitle>
            <p className="text-sm text-gray-600">
              Add multiple sites at once. AI will automatically assess each site for relevance and generate optimal keywords.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="bulk-sites">Site URLs (One per line or separated by spaces)</Label>
              <Textarea
                id="bulk-sites"
                value={bulkSites}
                onChange={(e) => setBulkSites(e.target.value)}
                placeholder="https://example1.com&#10;https://example2.com&#10;https://example3.com"
                rows={6}
                className="font-mono text-sm"
              />
              <p className="text-sm text-gray-500 mt-2">
                Enter URLs starting with http:// or https://. AI will assess each site for Jamaica election relevance.
              </p>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleBulkSubmit}
                disabled={bulkAddMutation.isPending}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {bulkAddMutation.isPending ? 'Processing with AI...' : 'Add Sites with AI Assessment'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowBulkAdd(false);
                  setBulkSites('');
                  setBulkResults(null);
                }}
              >
                Cancel
              </Button>
            </div>

            {/* Bulk Results */}
            {bulkResults && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold mb-3">AI Assessment Results</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{bulkResults.summary.total_processed}</div>
                    <div className="text-sm text-gray-600">Total Processed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{bulkResults.summary.successfully_added}</div>
                    <div className="text-sm text-gray-600">Successfully Added</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{bulkResults.summary.failed}</div>
                    <div className="text-sm text-gray-600">Failed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{bulkResults.summary.average_relevance}%</div>
                    <div className="text-sm text-gray-600">Avg Relevance</div>
                  </div>
                </div>
                
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {bulkResults.sites.map((site: any, index: number) => (
                    <div key={index} className={`p-3 rounded border ${site.added ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-medium">{site.name || 'Unknown Site'}</div>
                          <div className="text-sm text-gray-600 break-all">{site.url}</div>
                          {site.target?.ai_assessment && (
                            <div className="mt-2 text-sm">
                              <span className="font-medium">AI Assessment: </span>
                              <span className="text-blue-600">{site.target.ai_assessment.relevance}% relevant</span>
                              <span className="text-gray-500 ml-2">({site.target.ai_assessment.confidence}% confidence)</span>
                            </div>
                          )}
                        </div>
                        <Badge variant={site.added ? "default" : "destructive"}>
                          {site.added ? "Added" : "Failed"}
                        </Badge>
                      </div>
                      {site.error && (
                        <div className="text-sm text-red-600 mt-1">{site.error}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Monitoring Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Targets</p>
                <p className="text-2xl font-bold">{allTargets.length}</p>
              </div>
              <Monitor className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Targets</p>
                <p className="text-2xl font-bold text-green-600">
                  {allTargets.filter(t => t.active).length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Paused Targets</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {allTargets.filter(t => !t.active).length}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">News Sources</p>
                <p className="text-2xl font-bold text-blue-600">
                  {allTargets.filter(t => t.type === 'news_site').length}
                </p>
              </div>
              <Globe className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Existing Targets */}
      <Card>
        <CardHeader>
          <CardTitle>Configured Monitoring Targets</CardTitle>
        </CardHeader>
        <CardContent>
          {allTargets.length === 0 ? (
            <div className="text-center py-8">
              <Monitor className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No monitoring targets configured yet.</p>
              <p className="text-sm text-gray-400 mt-2">
                Add your first target to start monitoring Jamaica election content.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {allTargets.map(target => (
                <div key={target.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {getTypeIcon(target.type)}
                      <div>
                        <h3 className="font-medium text-lg">{target.name}</h3>
                        <p className="text-sm text-gray-500 break-all">{target.url}</p>
                        {target.description && (
                          <p className="text-sm text-gray-600 mt-1">{target.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Badge className={getStatusColor(target.status || 'active')}>
                        {target.status || 'active'}
                      </Badge>
                      {target.parish && target.parish !== 'All Parishes' && (
                        <Badge variant="outline">{target.parish}</Badge>
                      )}
                      <Badge variant="outline">{target.type.replace('_', ' ')}</Badge>
                    </div>
                  </div>
                  
                  {/* AI Assessment */}
                  {target.ai_assessment && (
                    <div className="mb-3 p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Brain className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-800">AI Assessment</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        <div>
                          <span className="text-gray-600">Relevance:</span>
                          <span className="ml-1 font-medium text-blue-600">{target.ai_assessment.relevance}%</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Confidence:</span>
                          <span className="ml-1 font-medium text-blue-600">{target.ai_assessment.confidence}%</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Jamaica Focus:</span>
                          <span className="ml-1 font-medium text-blue-600">{target.ai_assessment.jamaica_focus}%</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Political Coverage:</span>
                          <span className="ml-1 font-medium text-blue-600">{target.ai_assessment.political_coverage}%</span>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-gray-600">
                        <span className="font-medium">Reasoning:</span> {target.ai_assessment.reasoning}
                      </div>
                    </div>
                  )}

                  {/* Keywords */}
                  {target.keywords && target.keywords.length > 0 && (
                    <div className="mb-3">
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        Monitoring Keywords {target.ai_assessment && '(AI Generated)'}:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {target.keywords.map(keyword => (
                          <Badge key={keyword} variant="secondary" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Last Checked */}
                  {target.lastChecked && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-500">
                        Last checked: {new Date(target.lastChecked).toLocaleString()}
                      </p>
                    </div>
                  )}
                  
                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (target.url && target.url.startsWith('http')) {
                          window.open(target.url, '_blank', 'noopener,noreferrer');
                        } else {
                          toast({
                            title: "Invalid URL",
                            description: "Cannot open invalid URL.",
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Visit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleTargetMutation.mutate({
                        targetId: target.id,
                        active: !target.active
                      })}
                      disabled={toggleTargetMutation.isPending}
                    >
                      {target.active ? 'Pause' : 'Resume'}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        // Check if it's a default target
                        const defaultTargets = ['jamaica_observer', 'jamaica_gleaner', 'nationwide_radio', 'x_jamaica_politics'];
                        if (defaultTargets.includes(target.id)) {
                          toast({
                            title: "Cannot Delete",
                            description: "Default monitoring targets cannot be deleted. Use pause instead.",
                            variant: "destructive",
                          });
                          return;
                        }
                        deleteTargetMutation.mutate(target.id);
                      }}
                      disabled={deleteTargetMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            Important Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <span>Only authentic data from configured sources will be monitored</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <span>Focus on Jamaica election-related content: politics, candidates, policies, infrastructure</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <span>Monitor constituency issues that may influence voting patterns</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <span>Include infrastructure, roads, and social issues affecting voter access</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}