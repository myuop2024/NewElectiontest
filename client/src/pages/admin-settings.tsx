import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Settings, 
  Key, 
  Database, 
  Shield, 
  MessageSquare, 
  MapPin, 
  Brain, 
  Phone,
  Mail,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Save,
  Eye,
  EyeOff,
  Heart,
  UserCheck,
  Webhook
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ChatRoomManager from "@/components/admin/chat-room-manager";
import FeatureStatusDashboard from "@/components/admin/feature-status-dashboard";
import HereApiSettings from "@/components/admin/here-api-settings";
import GoogleMapsApiSettings from "@/components/admin/google-maps-api-settings";

export default function AdminSettings() {
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({
    bigquery_key: false,
    here_key: false,
    twilio_sid: false,
    twilio_token: false,
    openai_key: false,
    // didit_client_id: false, // Assuming these were for Didit, removed if not used elsewhere here
    // didit_client_secret: false, // Assuming these were for Didit, removed if not used elsewhere here
    whatsapp_token: false,
    email_pass: false,
    // didit_api_key: false, // Removed as the input field is being removed
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const debounceTimeouts = useRef<Record<string, NodeJS.Timeout>>({});

  // Get current settings
  const { data: settings } = useQuery({
    queryKey: ['/api/settings']
  });

  // Update setting mutation
  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const response = await apiRequest('POST', '/api/settings', { key, value });
      return response.json();
    },
    onSuccess: (data) => {
      console.log('Setting update successful:', data);
      toast({
        title: "Settings Updated",
        description: "Configuration has been saved successfully."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
    },
    onError: (error: any) => {
      console.error('Setting update failed:', error);
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update settings.",
        variant: "destructive"
      });
    }
  });

  const handleUpdateSetting = useCallback((key: string, value: string) => {
    // Clear existing timeout for this key
    if (debounceTimeouts.current[key]) {
      clearTimeout(debounceTimeouts.current[key]);
    }
    
    // Set new timeout to debounce the update
    debounceTimeouts.current[key] = setTimeout(() => {
      console.log(`Updating setting: ${key} = ${value}`);
      updateSettingMutation.mutate({ key, value });
      delete debounceTimeouts.current[key];
    }, 500); // 500ms debounce
  }, [updateSettingMutation]);

  const toggleShowSecret = (key: string) => {
    setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getSettingValue = (key: string) => {
    if (!settings || !Array.isArray(settings)) return '';
    return settings.find((s: any) => s.key === key)?.value || '';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Settings className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Admin Settings & Configuration</h1>
      </div>

      <Tabs defaultValue="status" className="w-full">
        <TabsList className="grid w-full grid-cols-9">
          <TabsTrigger value="status">System Status</TabsTrigger>
          <TabsTrigger value="apis">API Keys</TabsTrigger>
          <TabsTrigger value="didit">Didit KYC</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="communications">Communications</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="chat">Chat Management</TabsTrigger>
          <TabsTrigger value="mapping">Mapping</TabsTrigger>
        </TabsList>

        {/* System Status Dashboard */}
        <TabsContent value="status" className="space-y-6">
          <FeatureStatusDashboard />
        </TabsContent>

        {/* API Keys Configuration */}
        <TabsContent value="apis" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Key className="h-5 w-5" />
                <span>External API Configuration</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Google BigQuery */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">Google BigQuery Analytics</Label>
                  <Badge variant={getSettingValue('bigquery_enabled') === 'true' ? 'default' : 'secondary'}>
                    {getSettingValue('bigquery_enabled') === 'true' ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Project ID</Label>
                    <Input
                      placeholder="your-gcp-project-id"
                      defaultValue={getSettingValue('bigquery_project_id')}
                      onBlur={(e) => handleUpdateSetting('bigquery_project_id', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Dataset ID</Label>
                    <Input
                      placeholder="electoral_analytics"
                      defaultValue={getSettingValue('bigquery_dataset_id')}
                      onBlur={(e) => handleUpdateSetting('bigquery_dataset_id', e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label>Service Account JSON Key</Label>
                  <div className="flex items-center space-x-2">
                    <Textarea
                      placeholder="Paste your Google Cloud service account JSON key here..."
                      className="min-h-20"
                      defaultValue={getSettingValue('bigquery_service_key')}
                      onBlur={(e) => handleUpdateSetting('bigquery_service_key', e.target.value)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleShowSecret('bigquery_key')}
                    >
                      {showSecrets['bigquery_key'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={getSettingValue('bigquery_enabled') === 'true'}
                    onCheckedChange={(checked) => handleUpdateSetting('bigquery_enabled', checked.toString())}
                  />
                  <Label>Enable BigQuery Analytics</Label>
                </div>
              </div>

              {/* Twilio Communications */}
              <div className="space-y-3 border-t pt-6">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">Twilio SMS & Voice</Label>
                  <Badge variant={getSettingValue('twilio_enabled') === 'true' ? 'default' : 'secondary'}>
                    {getSettingValue('twilio_enabled') === 'true' ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Account SID</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                        type={showSecrets['twilio_sid'] ? 'text' : 'password'}
                        defaultValue={getSettingValue('twilio_account_sid')}
                        onBlur={(e) => handleUpdateSetting('twilio_account_sid', e.target.value)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleShowSecret('twilio_sid')}
                      >
                        {showSecrets['twilio_sid'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label>Auth Token</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        placeholder="your-auth-token"
                        type={showSecrets['twilio_token'] ? 'text' : 'password'}
                        defaultValue={getSettingValue('twilio_auth_token')}
                        onBlur={(e) => handleUpdateSetting('twilio_auth_token', e.target.value)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleShowSecret('twilio_token')}
                      >
                        {showSecrets['twilio_token'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label>Phone Number</Label>
                    <Input
                      placeholder="+1234567890"
                      defaultValue={getSettingValue('twilio_phone_number')}
                      onBlur={(e) => handleUpdateSetting('twilio_phone_number', e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={getSettingValue('twilio_enabled') === 'true'}
                    onCheckedChange={(checked) => handleUpdateSetting('twilio_enabled', checked.toString())}
                  />
                  <Label>Enable Twilio Communications</Label>
                </div>
              </div>

              {/* OpenAI API */}
              <div className="space-y-3 border-t pt-6">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">OpenAI AI Analytics</Label>
                  <Badge variant={getSettingValue('openai_enabled') === 'true' ? 'default' : 'secondary'}>
                    {getSettingValue('openai_enabled') === 'true' ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                <div>
                  <Label>OpenAI API Key</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      type={showSecrets['openai_key'] ? 'text' : 'password'}
                      defaultValue={getSettingValue('openai_api_key')}
                      onBlur={(e) => handleUpdateSetting('openai_api_key', e.target.value)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleShowSecret('openai_key')}
                    >
                      {showSecrets['openai_key'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div>
                  <Label>Model Selection</Label>
                  <Select 
                    defaultValue={getSettingValue('openai_model') || 'gpt-4'}
                    onValueChange={(value) => handleUpdateSetting('openai_model', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpt-4">GPT-4 (Recommended)</SelectItem>
                      <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                      <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={getSettingValue('openai_enabled') === 'true'}
                    onCheckedChange={(checked) => handleUpdateSetting('openai_enabled', checked.toString())}
                  />
                  <Label>Enable AI-Powered Analytics</Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* DidIT KYC Settings */}
        <TabsContent value="didit" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <UserCheck className="h-5 w-5" />
                <span>DidIT KYC Overview</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-sm text-gray-600">
                DidIT KYC specific configurations have been moved to a dedicated page.
              </p>
              <p className="text-sm text-gray-600">
                You can manage all DidIT settings, including API credentials, liveness checks, AML features, and more,
                by navigating to the "Didit Settings" page from the sidebar.
              </p>
              <Link href="/admin/didit-settings" className="mt-4">
                <Button variant="outline">
                  Go to Didit Settings <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              {/* Any other non-configuration KYC related info could remain or be added here in the future,
                  e.g., a summary of KYC statuses, link to verification logs, etc.
                  For now, it just acts as a placeholder and pointer to the new page.
              */}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Application Security</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Security Levels */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Security Settings</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Minimum Security Level</Label>
                    <Select 
                      defaultValue={getSettingValue('min_security_level') || '3'}
                      onValueChange={(value) => handleUpdateSetting('min_security_level', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Level 1 - Basic</SelectItem>
                        <SelectItem value="2">Level 2 - Standard</SelectItem>
                        <SelectItem value="3">Level 3 - Enhanced</SelectItem>
                        <SelectItem value="4">Level 4 - High</SelectItem>
                        <SelectItem value="5">Level 5 - Maximum</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Session Timeout (minutes)</Label>
                    <Input
                      type="number"
                      placeholder="30"
                      defaultValue={getSettingValue('session_timeout')}
                      onBlur={(e) => handleUpdateSetting('session_timeout', e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={getSettingValue('device_binding_enabled') === 'true'}
                      onCheckedChange={(checked) => handleUpdateSetting('device_binding_enabled', checked.toString())}
                    />
                    <Label>Enable Device Binding</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={getSettingValue('geo_verification_enabled') === 'true'}
                      onCheckedChange={(checked) => handleUpdateSetting('geo_verification_enabled', checked.toString())}
                    />
                    <Label>Enable Geolocation Verification</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={getSettingValue('audit_logging_enabled') === 'true'}
                      onCheckedChange={(checked) => handleUpdateSetting('audit_logging_enabled', checked.toString())}
                    />
                    <Label>Enable Comprehensive Audit Logging</Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Communications Settings */}
        <TabsContent value="communications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Phone className="h-5 w-5" />
                <span>Communication Channels</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* WhatsApp Integration */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">WhatsApp Business API</Label>
                  <Badge variant={getSettingValue('whatsapp_enabled') === 'true' ? 'default' : 'secondary'}>
                    {getSettingValue('whatsapp_enabled') === 'true' ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Business Phone Number ID</Label>
                    <Input
                      placeholder="123456789012345"
                      defaultValue={getSettingValue('whatsapp_phone_id')}
                      onBlur={(e) => handleUpdateSetting('whatsapp_phone_id', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Access Token</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        placeholder="your-whatsapp-access-token"
                        type={showSecrets['whatsapp_token'] ? 'text' : 'password'}
                        defaultValue={getSettingValue('whatsapp_access_token')}
                        onBlur={(e) => handleUpdateSetting('whatsapp_access_token', e.target.value)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleShowSecret('whatsapp_token')}
                      >
                        {showSecrets['whatsapp_token'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={getSettingValue('whatsapp_enabled') === 'true'}
                    onCheckedChange={(checked) => handleUpdateSetting('whatsapp_enabled', checked.toString())}
                  />
                  <Label>Enable WhatsApp Notifications</Label>
                </div>
              </div>

              {/* Email Configuration */}
              <div className="space-y-3 border-t pt-6">
                <Label className="text-base font-medium">Email Notifications</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>SMTP Server</Label>
                    <Input
                      placeholder="smtp.gmail.com"
                      defaultValue={getSettingValue('smtp_server')}
                      onBlur={(e) => handleUpdateSetting('smtp_server', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>SMTP Port</Label>
                    <Input
                      placeholder="587"
                      defaultValue={getSettingValue('smtp_port')}
                      onBlur={(e) => handleUpdateSetting('smtp_port', e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Email Address</Label>
                    <Input
                      placeholder="noreply@caffe.org.jm"
                      defaultValue={getSettingValue('smtp_email')}
                      onBlur={(e) => handleUpdateSetting('smtp_email', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Email Password</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        placeholder="your-email-password"
                        type={showSecrets['email_pass'] ? 'text' : 'password'}
                        defaultValue={getSettingValue('smtp_password')}
                        onBlur={(e) => handleUpdateSetting('smtp_password', e.target.value)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleShowSecret('email_pass')}
                      >
                        {showSecrets['email_pass'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={getSettingValue('email_notifications_enabled') === 'true'}
                    onCheckedChange={(checked) => handleUpdateSetting('email_notifications_enabled', checked.toString())}
                  />
                  <Label>Enable Email Notifications</Label>
                </div>
              </div>

              {/* WebRTC Configuration */}
              <div className="space-y-3 border-t pt-6">
                <Label className="text-base font-medium">Video Calling (WebRTC)</Label>
                <div>
                  <Label>STUN/TURN Server</Label>
                  <Input
                    placeholder="stun:stun.l.google.com:19302"
                    defaultValue={getSettingValue('webrtc_stun_server')}
                    onBlur={(e) => handleUpdateSetting('webrtc_stun_server', e.target.value)}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={getSettingValue('webrtc_enabled') === 'true'}
                    onCheckedChange={(checked) => handleUpdateSetting('webrtc_enabled', checked.toString())}
                  />
                  <Label>Enable Video Calling</Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Settings */}
        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Brain className="h-5 w-5" />
                <span>Analytics & AI Configuration</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* AI Analytics Settings */}
              <div className="space-y-3">
                <Label className="text-base font-medium">AI-Powered Analytics</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Analysis Frequency</Label>
                    <Select 
                      defaultValue={getSettingValue('ai_analysis_frequency') || 'hourly'}
                      onValueChange={(value) => handleUpdateSetting('ai_analysis_frequency', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="realtime">Real-time</SelectItem>
                        <SelectItem value="hourly">Hourly</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="manual">Manual Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Insight Sensitivity</Label>
                    <Select 
                      defaultValue={getSettingValue('ai_sensitivity') || 'medium'}
                      onValueChange={(value) => handleUpdateSetting('ai_sensitivity', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={getSettingValue('ai_anomaly_detection') === 'true'}
                      onCheckedChange={(checked) => handleUpdateSetting('ai_anomaly_detection', checked.toString())}
                    />
                    <Label>Enable Anomaly Detection</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={getSettingValue('ai_predictive_analytics') === 'true'}
                      onCheckedChange={(checked) => handleUpdateSetting('ai_predictive_analytics', checked.toString())}
                    />
                    <Label>Enable Predictive Analytics</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={getSettingValue('ai_real_time_insights') === 'true'}
                      onCheckedChange={(checked) => handleUpdateSetting('ai_real_time_insights', checked.toString())}
                    />
                    <Label>Enable Real-time Insights</Label>
                  </div>
                </div>
              </div>

              {/* BigQuery Analytics */}
              <div className="space-y-3 border-t pt-6">
                <Label className="text-base font-medium">BigQuery Data Warehouse</Label>
                <div>
                  <Label>Data Retention Period (days)</Label>
                  <Input
                    type="number"
                    placeholder="365"
                    defaultValue={getSettingValue('bigquery_retention_days')}
                    onBlur={(e) => handleUpdateSetting('bigquery_retention_days', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={getSettingValue('bigquery_auto_export') === 'true'}
                      onCheckedChange={(checked) => handleUpdateSetting('bigquery_auto_export', checked.toString())}
                    />
                    <Label>Enable Automatic Data Export</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={getSettingValue('bigquery_real_time_streaming') === 'true'}
                      onCheckedChange={(checked) => handleUpdateSetting('bigquery_real_time_streaming', checked.toString())}
                    />
                    <Label>Enable Real-time Data Streaming</Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations Settings */}
        <TabsContent value="integrations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <ExternalLink className="h-5 w-5" />
                <span>External Integrations</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Platform Settings */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Platform Configuration</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Platform Name</Label>
                    <Input
                      placeholder="CAFFE Electoral Observer"
                      defaultValue={getSettingValue('platform_name')}
                      onBlur={(e) => handleUpdateSetting('platform_name', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Organization</Label>
                    <Input
                      placeholder="Citizens Action for Free & Fair Elections"
                      defaultValue={getSettingValue('organization_name')}
                      onBlur={(e) => handleUpdateSetting('organization_name', e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label>Contact Email</Label>
                  <Input
                    placeholder="admin@caffe.org.jm"
                    defaultValue={getSettingValue('contact_email')}
                    onBlur={(e) => handleUpdateSetting('contact_email', e.target.value)}
                  />
                </div>
              </div>

              {/* Feature Toggles */}
              <div className="space-y-3 border-t pt-6">
                <Label className="text-base font-medium">Feature Controls</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={getSettingValue('observer_id_generation') === 'true'}
                        onCheckedChange={(checked) => handleUpdateSetting('observer_id_generation', checked.toString())}
                      />
                      <Label>Observer ID Generation</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={getSettingValue('dynamic_form_builder') === 'true'}
                        onCheckedChange={(checked) => handleUpdateSetting('dynamic_form_builder', checked.toString())}
                      />
                      <Label>Dynamic Form Builder</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={getSettingValue('route_optimization') === 'true'}
                        onCheckedChange={(checked) => handleUpdateSetting('route_optimization', checked.toString())}
                      />
                      <Label>Route Optimization</Label>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={getSettingValue('adaptive_training') === 'true'}
                        onCheckedChange={(checked) => handleUpdateSetting('adaptive_training', checked.toString())}
                      />
                      <Label>Adaptive Training System</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={getSettingValue('qr_code_integration') === 'true'}
                        onCheckedChange={(checked) => handleUpdateSetting('qr_code_integration', checked.toString())}
                      />
                      <Label>QR Code Integration</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={getSettingValue('document_processing') === 'true'}
                        onCheckedChange={(checked) => handleUpdateSetting('document_processing', checked.toString())}
                      />
                      <Label>Document Processing</Label>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Chat Management */}
        <TabsContent value="chat" className="space-y-6">
          <ChatRoomManager />
        </TabsContent>

        {/* Location & Mapping Settings */}
        <TabsContent value="mapping" className="space-y-6">
          <HereApiSettings />
          <GoogleMapsApiSettings />
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MapPin className="h-5 w-5" />
                <span>Location & Mapping Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* GPS Tracking */}
              <div className="space-y-3">
                <Label className="text-base font-medium">GPS Tracking</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Accuracy Threshold (meters)</Label>
                    <Input
                      type="number"
                      placeholder="50"
                      defaultValue={getSettingValue('gps_accuracy_threshold')}
                      onBlur={(e) => handleUpdateSetting('gps_accuracy_threshold', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Update Interval (seconds)</Label>
                    <Input
                      type="number"
                      placeholder="30"
                      defaultValue={getSettingValue('gps_update_interval')}
                      onBlur={(e) => handleUpdateSetting('gps_update_interval', e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={getSettingValue('gps_tracking_enabled') === 'true'}
                    onCheckedChange={(checked) => handleUpdateSetting('gps_tracking_enabled', checked.toString())}
                  />
                  <Label>Enable GPS Tracking</Label>
                </div>
              </div>
              {/* Polling Stations */}
              <div className="space-y-3 border-t pt-6">
                <Label className="text-base font-medium">Polling Stations</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Default Map Zoom</Label>
                    <Input
                      type="number"
                      placeholder="12"
                      defaultValue={getSettingValue('polling_default_zoom')}
                      onBlur={(e) => handleUpdateSetting('polling_default_zoom', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Auto-Update Source</Label>
                    <Select 
                      defaultValue={getSettingValue('polling_update_source') || 'manual'}
                      onValueChange={(value) => handleUpdateSetting('polling_update_source', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">Manual Upload</SelectItem>
                        <SelectItem value="api">External API</SelectItem>
                        <SelectItem value="database">Internal Database</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={getSettingValue('polling_auto_update') === 'true'}
                    onCheckedChange={(checked) => handleUpdateSetting('polling_auto_update', checked.toString())}
                  />
                  <Label>Enable Auto-Update</Label>
                </div>
              </div>
              {/* Geographical Features */}
              <div className="space-y-3 border-t pt-6">
                <Label className="text-base font-medium">Geographical Features</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={getSettingValue('geo_parish_boundaries') === 'true'}
                      onCheckedChange={(checked) => handleUpdateSetting('geo_parish_boundaries', checked.toString())}
                    />
                    <Label>Show Parish Boundaries</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={getSettingValue('geo_heat_map') === 'true'}
                      onCheckedChange={(checked) => handleUpdateSetting('geo_heat_map', checked.toString())}
                    />
                    <Label>Enable Heat Maps</Label>
                  </div>
                </div>
                <div>
                  <Label>Heat Map Intensity</Label>
                  <Select 
                    defaultValue={getSettingValue('geo_heat_intensity') || 'medium'}
                    onValueChange={(value) => handleUpdateSetting('geo_heat_intensity', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}