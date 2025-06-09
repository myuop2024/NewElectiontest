import { useState } from "react";
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
  EyeOff
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ChatRoomManager from "@/components/admin/chat-room-manager";
import FeatureStatusDashboard from "@/components/admin/feature-status-dashboard";

export default function AdminSettings() {
  const [showSecrets, setShowSecrets] = useState({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  const handleUpdateSetting = (key: string, value: string) => {
    console.log(`Updating setting: ${key} = ${value}`);
    updateSettingMutation.mutate({ key, value });
  };

  const toggleShowSecret = (key: string) => {
    setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getSettingValue = (key: string) => {
    return settings?.find((s: any) => s.key === key)?.value || '';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Settings className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Admin Settings & Configuration</h1>
      </div>

      <Tabs defaultValue="status" className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="status">System Status</TabsTrigger>
          <TabsTrigger value="apis">API Keys</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="communications">Communications</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="chat">Chat Management</TabsTrigger>
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
                      type={showSecrets['bigquery_key'] ? 'text' : 'password'}
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

              {/* HERE Maps API */}
              <div className="space-y-3 border-t pt-6">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">HERE Maps & Routing</Label>
                  <Badge variant={getSettingValue('here_maps_enabled') === 'true' ? 'default' : 'secondary'}>
                    {getSettingValue('here_maps_enabled') === 'true' ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                <div>
                  <Label>HERE API Key</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      placeholder="your-here-api-key"
                      type={showSecrets['here_key'] ? 'text' : 'password'}
                      defaultValue={getSettingValue('here_api_key')}
                      onBlur={(e) => handleUpdateSetting('here_api_key', e.target.value)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleShowSecret('here_key')}
                    >
                      {showSecrets['here_key'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Get your API key from <a href="https://developer.here.com" target="_blank" className="text-blue-500 hover:underline">HERE Developer Portal</a>
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={getSettingValue('here_maps_enabled') === 'true'}
                    onCheckedChange={(checked) => handleUpdateSetting('here_maps_enabled', checked.toString())}
                  />
                  <Label>Enable HERE Maps Integration</Label>
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

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Security & KYC Configuration</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* DidIT KYC Integration */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">DidIT KYC Verification</Label>
                  <Badge variant={getSettingValue('didit_kyc_enabled') === 'true' ? 'default' : 'secondary'}>
                    {getSettingValue('didit_kyc_enabled') === 'true' ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label>API Endpoint</Label>
                    <Input
                      placeholder="https://api.didit.me/v1/"
                      defaultValue={getSettingValue('didit_api_endpoint')}
                      onBlur={(e) => handleUpdateSetting('didit_api_endpoint', e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Client ID</Label>
                      <div className="flex items-center space-x-2">
                        <Input
                          placeholder="your-didit-client-id"
                          type={showSecrets['didit_client_id'] ? 'text' : 'password'}
                          defaultValue={getSettingValue('didit_client_id')}
                          onBlur={(e) => handleUpdateSetting('didit_client_id', e.target.value)}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleShowSecret('didit_client_id')}
                        >
                          {showSecrets['didit_client_id'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label>Client Secret</Label>
                      <div className="flex items-center space-x-2">
                        <Input
                          placeholder="your-didit-client-secret"
                          type={showSecrets['didit_client_secret'] ? 'text' : 'password'}
                          defaultValue={getSettingValue('didit_client_secret')}
                          onBlur={(e) => handleUpdateSetting('didit_client_secret', e.target.value)}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleShowSecret('didit_client_secret')}
                        >
                          {showSecrets['didit_client_secret'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={getSettingValue('didit_kyc_enabled') === 'true'}
                    onCheckedChange={(checked) => handleUpdateSetting('didit_kyc_enabled', checked.toString())}
                  />
                  <Label>Enable KYC Verification</Label>
                </div>
              </div>

              {/* Security Levels */}
              <div className="space-y-3 border-t pt-6">
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
      </Tabs>
    </div>
  );
}