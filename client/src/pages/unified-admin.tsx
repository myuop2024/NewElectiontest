import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { 
  Settings, 
  Users, 
  Activity,
  Shield,
  MessageSquare,
  BarChart3,
  Key,
  Server,
  Eye,
  EyeOff,
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Database,
  Map,
  Phone,
  Bot,
  Lock,
  Mail,
  Save,
  TestTube,
  Cloud,
  Brain,
  GraduationCap
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import FeatureStatusDashboard from "@/components/admin/feature-status-dashboard";
import ChatRoomManager from "@/components/admin/chat-room-manager";
import ModelAutoPopulate from "@/components/admin/model-auto-populate";

interface ServiceConfig {
  name: string;
  icon: any;
  description: string;
  enabled: string;
  fields: {
    key: string;
    label: string;
    type: 'text' | 'password' | 'textarea';
    placeholder: string;
    required?: boolean;
  }[];
}

const SERVICE_CONFIGS: ServiceConfig[] = [
  {
    name: "BigQuery Analytics",
    icon: Database,
    description: "Google BigQuery data warehouse for advanced analytics",
    enabled: "bigquery_enabled",
    fields: [
      { key: "bigquery_project_id", label: "Project ID", type: "text", placeholder: "your-project-id", required: true },
      { key: "bigquery_dataset_id", label: "Dataset ID", type: "text", placeholder: "electoral_data", required: true },
      { key: "bigquery_service_key", label: "Service Account Key (JSON)", type: "textarea", placeholder: "Paste your service account JSON key here", required: true }
    ]
  },
  {
    name: "HERE Maps",
    icon: Map,
    description: "HERE Maps API for routing and geocoding",
    enabled: "here_maps_enabled",
    fields: [
      { key: "here_api_key", label: "API Key", type: "password", placeholder: "Your HERE Maps API key", required: true }
    ]
  },
  {
    name: "Twilio Communications",
    icon: Phone,
    description: "SMS, Voice, and WhatsApp messaging",
    enabled: "twilio_enabled",
    fields: [
      { key: "twilio_account_sid", label: "Account SID", type: "text", placeholder: "AC...", required: true },
      { key: "twilio_auth_token", label: "Auth Token", type: "password", placeholder: "Your auth token", required: true },
      { key: "twilio_phone_number", label: "Phone Number", type: "text", placeholder: "+1234567890", required: true }
    ]
  },
  {
    name: "OpenAI Integration",
    icon: Bot,
    description: "GPT-4 powered insights and analysis",
    enabled: "openai_enabled",
    fields: [
      { key: "openai_api_key", label: "API Key", type: "password", placeholder: "sk-...", required: true },
      { key: "openai_model", label: "Model", type: "text", placeholder: "gpt-4", required: true }
    ]
  },
  {
    name: "Hugging Face AI",
    icon: Brain,
    description: "Hugging Face model inference for AI analysis",
    enabled: "huggingface_enabled",
    fields: [
      { key: "huggingface_api_key", label: "API Key", type: "password", placeholder: "hf_...", required: true },
      { key: "huggingface_model", label: "Model", type: "text", placeholder: "microsoft/DialoGPT-medium", required: true }
    ]
  },
  {
    name: "Google Gemini AI",
    icon: Cloud,
    description: "Google Gemini advanced AI capabilities",
    enabled: "gemini_enabled",
    fields: [
      { key: "gemini_api_key", label: "API Key", type: "password", placeholder: "Your Gemini API key", required: true },
      { key: "gemini_model", label: "Model", type: "text", placeholder: "gemini-1.5-pro-latest", required: true }
    ]
  },
  {
    name: "WhatsApp Business",
    icon: MessageSquare,
    description: "WhatsApp Business API integration",
    enabled: "whatsapp_enabled",
    fields: [
      { key: "whatsapp_phone_id", label: "Phone Number ID", type: "text", placeholder: "123456789", required: true },
      { key: "whatsapp_access_token", label: "Access Token", type: "password", placeholder: "Your WhatsApp access token", required: true }
    ]
  },
  {
    name: "DidIT KYC",
    icon: Shield,
    description: "Identity verification and KYC compliance with OAuth 2.0",
    enabled: "didit_kyc_enabled",
    fields: [
      { key: "didit_api_endpoint", label: "API Endpoint", type: "text", placeholder: "https://api.didit.me/v2", required: true },
      { key: "didit_client_id", label: "Client ID", type: "text", placeholder: "Your DidIT OAuth Client ID", required: true },
      { key: "didit_client_secret", label: "Client Secret", type: "password", placeholder: "Your DidIT OAuth Client Secret", required: true }
    ]
  },
  {
    name: "Email Notifications",
    icon: Mail,
    description: "SMTP email service configuration",
    enabled: "email_notifications_enabled",
    fields: [
      { key: "smtp_server", label: "SMTP Server", type: "text", placeholder: "smtp.gmail.com", required: true },
      { key: "smtp_port", label: "SMTP Port", type: "text", placeholder: "587", required: true },
      { key: "smtp_email", label: "Email Address", type: "text", placeholder: "admin@caffe.org.jm", required: true },
      { key: "smtp_password", label: "Email Password", type: "password", placeholder: "Your email password", required: true }
    ]
  }
];

export default function UnifiedAdmin() {
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [localSettings, setLocalSettings] = useState<Record<string, string>>({});
  const [testingService, setTestingService] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get settings
  const { data: settings } = useQuery({
    queryKey: ['/api/settings']
  });

  // Get users
  const { data: users } = useQuery({
    queryKey: ['/api/users/observers']
  });

  // Get system health
  const { data: systemHealth } = useQuery({
    queryKey: ['/api/admin/system/health']
  });

  // Update setting mutation
  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const response = await apiRequest('POST', '/api/settings', { key, value });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Configuration Updated",
        description: "Settings have been saved successfully."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/features/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/system/health'] });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to save configuration.",
        variant: "destructive"
      });
    }
  });

  // Test service configuration
  const testServiceMutation = useMutation({
    mutationFn: async (serviceName: string) => {
      const response = await apiRequest('POST', `/api/admin/settings/validate/${serviceName}`, {});
      return response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Test Complete",
        description: data.message || "Service configuration validated successfully."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Test Failed",
        description: error.message || "Service configuration test failed.",
        variant: "destructive"
      });
    },
    onSettled: () => {
      setTestingService(null);
    }
  });

  const getSettingValue = (key: string): string => {
    if (localSettings[key] !== undefined) return localSettings[key];
    const setting = Array.isArray(settings) ? settings.find((s: any) => s.key === key) : null;
    return setting?.value || '';
  };

  const updateLocalSetting = (key: string, value: string) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  const saveSetting = (key: string, value: string) => {
    updateSettingMutation.mutate({ key, value });
  };

  const saveAllServiceSettings = (config: ServiceConfig) => {
    const values: Record<string, string> = {};
    
    // Get all field values
    config.fields.forEach(field => {
      const value = getSettingValue(field.key);
      if (value) {
        values[field.key] = value;
      }
    });

    // Save all settings
    Object.entries(values).forEach(([key, value]) => {
      saveSetting(key, value);
    });

    // Enable the service if it has all required fields
    const hasAllRequired = config.fields
      .filter(f => f.required)
      .every(f => values[f.key]);
    
    if (hasAllRequired) {
      saveSetting(config.enabled, 'true');
    }
  };

  const testService = (serviceName: string) => {
    setTestingService(serviceName);
    testServiceMutation.mutate(serviceName);
  };

  const toggleSecretVisibility = (key: string) => {
    setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getServiceStatus = (config: ServiceConfig) => {
    const enabled = getSettingValue(config.enabled) === 'true';
    const hasRequiredFields = config.fields
      .filter(f => f.required)
      .every(f => getSettingValue(f.key));
    
    if (enabled && hasRequiredFields) return 'active';
    if (enabled && !hasRequiredFields) return 'warning';
    return 'inactive';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-100 text-yellow-800"><AlertTriangle className="w-3 h-3 mr-1" />Needs Config</Badge>;
      default:
        return <Badge variant="secondary"><XCircle className="w-3 h-3 mr-1" />Inactive</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Settings className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold">Administrative Control Panel</h1>
            <p className="text-gray-600">Complete management of all electoral observation platform features</p>
          </div>
        </div>
        <Badge variant="outline" className="px-3 py-1">
          {Array.isArray(settings) ? `${settings.length} Settings` : '0 Settings'}
        </Badge>
      </div>

      <Tabs defaultValue="services" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="services">API Services</TabsTrigger>
          <TabsTrigger value="features">Feature Control</TabsTrigger>
          <TabsTrigger value="training">Training Management</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="security">Security Settings</TabsTrigger>
          <TabsTrigger value="monitoring">System Health</TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="space-y-6">
          <ModelAutoPopulate 
            onModelsPopulated={() => {
              queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
            }}
          />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {SERVICE_CONFIGS.map((config) => {
              const status = getServiceStatus(config);
              const Icon = config.icon;
              
              return (
                <Card key={config.name} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Icon className="h-5 w-5 text-blue-600" />
                        <CardTitle className="text-lg">{config.name}</CardTitle>
                      </div>
                      {getStatusBadge(status)}
                    </div>
                    <p className="text-sm text-gray-600">{config.description}</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Service Toggle */}
                    <div className="flex items-center justify-between">
                      <Label htmlFor={config.enabled}>Enable Service</Label>
                      <Switch
                        id={config.enabled}
                        checked={getSettingValue(config.enabled) === 'true'}
                        onCheckedChange={(checked) => {
                          saveSetting(config.enabled, checked.toString());
                        }}
                      />
                    </div>
                    
                    <Separator />
                    
                    {/* Configuration Fields */}
                    <div className="space-y-3">
                      {config.fields.map((field) => (
                        <div key={field.key} className="space-y-1">
                          <Label htmlFor={field.key} className="text-sm">
                            {field.label}
                            {field.required && <span className="text-red-500 ml-1">*</span>}
                          </Label>
                          <div className="relative">
                            {field.type === 'textarea' ? (
                              <Textarea
                                id={field.key}
                                placeholder={field.placeholder}
                                value={getSettingValue(field.key)}
                                onChange={(e) => updateLocalSetting(field.key, e.target.value)}
                                onBlur={(e) => saveSetting(field.key, e.target.value)}
                                className="min-h-[100px] text-xs"
                              />
                            ) : (
                              <>
                                <Input
                                  id={field.key}
                                  type={field.type === 'password' && !showSecrets[field.key] ? 'password' : 'text'}
                                  placeholder={field.placeholder}
                                  value={getSettingValue(field.key)}
                                  onChange={(e) => updateLocalSetting(field.key, e.target.value)}
                                  onBlur={(e) => saveSetting(field.key, e.target.value)}
                                  className="pr-10"
                                />
                                {field.type === 'password' && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-0 top-0 h-full px-3"
                                    onClick={() => toggleSecretVisibility(field.key)}
                                  >
                                    {showSecrets[field.key] ? (
                                      <EyeOff className="h-4 w-4" />
                                    ) : (
                                      <Eye className="h-4 w-4" />
                                    )}
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex space-x-2 pt-2">
                      <Button
                        onClick={() => saveAllServiceSettings(config)}
                        disabled={updateSettingMutation.isPending}
                        className="flex-1"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Save Config
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => testService(config.name.toLowerCase().replace(/\s+/g, ''))}
                        disabled={testServiceMutation.isPending || testingService === config.name}
                        className="flex-1"
                      >
                        {testingService === config.name ? (
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <TestTube className="w-4 h-4 mr-2" />
                        )}
                        Test
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="features">
          <FeatureStatusDashboard />
        </TabsContent>

        <TabsContent value="training" className="space-y-6">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Brain className="h-5 w-5 mr-2" />
                  Enhanced Training Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold">5</div>
                        <p className="text-xs text-muted-foreground">Training Programs</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold">10</div>
                        <p className="text-xs text-muted-foreground">Course Modules</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold">8</div>
                        <p className="text-xs text-muted-foreground">Active Quizzes</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold">3</div>
                        <p className="text-xs text-muted-foreground">Live Contests</p>
                      </CardContent>
                    </Card>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button 
                      onClick={() => window.open('/training-center', '_blank')}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <GraduationCap className="w-4 h-4 mr-2" />
                      Student Experience
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => window.open('/admin-training', '_blank')}
                    >
                      <Brain className="w-4 h-4 mr-2" />
                      Training Administration
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => window.open('/legacy-training-center', '_blank')}
                    >
                      Legacy Interface
                    </Button>
                  </div>
                  
                  <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Course Modules</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-600 mb-3">
                          Create structured learning modules with lessons, videos, and resources
                        </p>
                        <ul className="text-sm space-y-1">
                          <li>• Interactive lesson content</li>
                          <li>• Video and document resources</li>
                          <li>• Progress tracking</li>
                          <li>• Completion criteria</li>
                        </ul>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Quizzes & Assessments</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-600 mb-3">
                          Build comprehensive quizzes to test knowledge and skills
                        </p>
                        <ul className="text-sm space-y-1">
                          <li>• Multiple choice questions</li>
                          <li>• Time limits and attempts</li>
                          <li>• Automatic scoring</li>
                          <li>• Certification requirements</li>
                        </ul>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Contests & Challenges</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-600 mb-3">
                          Organize competitive training events and skill challenges
                        </p>
                        <ul className="text-sm space-y-1">
                          <li>• Practical challenges</li>
                          <li>• Leaderboards and rankings</li>
                          <li>• Prize distribution</li>
                          <li>• Team competitions</li>
                        </ul>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                User Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">{Array.isArray(users) ? users.length : 0}</div>
                      <p className="text-xs text-muted-foreground">Total Observers</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">1</div>
                      <p className="text-xs text-muted-foreground">Active Admins</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">0</div>
                      <p className="text-xs text-muted-foreground">Pending Approvals</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
          <ChatRoomManager />
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Lock className="h-5 w-5 mr-2" />
                  Security Features
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { key: 'multi_factor_auth_enabled', label: 'Multi-Factor Authentication' },
                  { key: 'device_binding_enabled', label: 'Device Binding' },
                  { key: 'biometric_verification', label: 'Biometric Verification' },
                  { key: 'geo_verification_enabled', label: 'Geographic Verification' },
                  { key: 'audit_logging_enabled', label: 'Audit Logging' }
                ].map((feature) => (
                  <div key={feature.key} className="flex items-center justify-between">
                    <Label htmlFor={feature.key}>{feature.label}</Label>
                    <Switch
                      id={feature.key}
                      checked={getSettingValue(feature.key) === 'true'}
                      onCheckedChange={(checked) => {
                        saveSetting(feature.key, checked.toString());
                      }}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  Advanced Security
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { key: 'blockchain_logging', label: 'Blockchain Logging' },
                  { key: 'emergency_broadcast_enabled', label: 'Emergency Broadcasting' },
                  { key: 'real_time_notifications', label: 'Real-time Notifications' },
                  { key: 'gps_tracking_enabled', label: 'GPS Tracking' }
                ].map((feature) => (
                  <div key={feature.key} className="flex items-center justify-between">
                    <Label htmlFor={feature.key}>{feature.label}</Label>
                    <Switch
                      id={feature.key}
                      checked={getSettingValue(feature.key) === 'true'}
                      onCheckedChange={(checked) => {
                        saveSetting(feature.key, checked.toString());
                      }}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Server className="h-5 w-5 mr-2" />
                  System Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span>Overall Health</span>
                    <Badge className={
                      (systemHealth as any)?.overall === 'healthy' ? 'bg-green-100 text-green-800' :
                      (systemHealth as any)?.overall === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }>
                      {(systemHealth as any)?.overall || 'Unknown'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  Active Services
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(systemHealth as any)?.services?.filter((s: any) => s.status === 'healthy').length || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  of {(systemHealth as any)?.services?.length || 0} total services
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  Warnings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">
                  {(systemHealth as any)?.warnings?.length || 0}
                </div>
                <p className="text-xs text-muted-foreground">Active warnings</p>
              </CardContent>
            </Card>
          </div>
          
          {(systemHealth as any)?.services && (
            <Card>
              <CardHeader>
                <CardTitle>Service Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {(systemHealth as any).services.map((service: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <div className="font-medium capitalize">{service.name}</div>
                        <div className="text-sm text-gray-600">{service.message}</div>
                      </div>
                      <Badge className={
                        service.status === 'healthy' ? 'bg-green-100 text-green-800' :
                        service.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }>
                        {service.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}