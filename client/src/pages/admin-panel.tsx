import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
  Mail
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import FeatureStatusDashboard from "@/components/admin/feature-status-dashboard";
import ChatRoomManager from "@/components/admin/chat-room-manager";

export default function AdminPanel() {
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [localSettings, setLocalSettings] = useState<Record<string, string>>({});
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

  // Update setting mutation
  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      return apiRequest('/api/settings', {
        method: 'POST',
        body: { key, value }
      });
    },
    onSuccess: () => {
      toast({
        title: "Setting Updated",
        description: "Configuration has been saved successfully."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/features/status'] });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to save configuration.",
        variant: "destructive"
      });
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

  const toggleSecretVisibility = (key: string) => {
    setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Settings className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Administrative Control Panel</h1>
        </div>
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          CAFFE Electoral Observer Platform
        </Badge>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="status">System Status</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="apis">API Configuration</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="communications">Communications</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="chat">Chat Management</TabsTrigger>
        </TabsList>

        {/* Overview Dashboard */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Array.isArray(users) ? users.length : 0}</div>
                <p className="text-xs text-muted-foreground">Registered observers</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Features</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">23</div>
                <p className="text-xs text-muted-foreground">Advanced capabilities</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Security Level</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">High</div>
                <p className="text-xs text-muted-foreground">Military-grade encryption</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">API Integrations</CardTitle>
                <Server className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">8</div>
                <p className="text-xs text-muted-foreground">External services</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button variant="outline" className="h-20 flex flex-col space-y-2">
                  <Users className="h-6 w-6" />
                  <span>Manage Users</span>
                </Button>
                <Button variant="outline" className="h-20 flex flex-col space-y-2">
                  <Key className="h-6 w-6" />
                  <span>API Keys</span>
                </Button>
                <Button variant="outline" className="h-20 flex flex-col space-y-2">
                  <Shield className="h-6 w-6" />
                  <span>Security</span>
                </Button>
                <Button variant="outline" className="h-20 flex flex-col space-y-2">
                  <BarChart3 className="h-6 w-6" />
                  <span>Analytics</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Status */}
        <TabsContent value="status" className="space-y-6">
          <FeatureStatusDashboard />
        </TabsContent>

        {/* User Management */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Observer Management</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.isArray(users) && users.length > 0 ? (
                  <div className="grid gap-4">
                    {users.slice(0, 10).map((user: any) => (
                      <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-1">
                          <p className="font-medium">{user.firstName} {user.lastName}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                          <p className="text-xs text-gray-400">Role: {user.role}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                            {user.status}
                          </Badge>
                          <Badge variant={user.kycStatus === 'verified' ? 'default' : 'destructive'}>
                            {user.kycStatus || 'pending'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">No users found</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Configuration */}
        <TabsContent value="apis" className="space-y-6">
          <div className="grid gap-6">
            {/* Google BigQuery */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Database className="h-5 w-5" />
                  <span>Google BigQuery Analytics</span>
                  <Badge variant={getSettingValue('bigquery_enabled') === 'true' ? 'default' : 'secondary'}>
                    {getSettingValue('bigquery_enabled') === 'true' ? 'Enabled' : 'Disabled'}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={getSettingValue('bigquery_enabled') === 'true'}
                    onCheckedChange={(checked) => saveSetting('bigquery_enabled', checked.toString())}
                  />
                  <Label>Enable BigQuery Integration</Label>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Project ID</Label>
                    <Input
                      placeholder="your-gcp-project-id"
                      value={getSettingValue('bigquery_project_id')}
                      onChange={(e) => updateLocalSetting('bigquery_project_id', e.target.value)}
                      onBlur={(e) => saveSetting('bigquery_project_id', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Dataset ID</Label>
                    <Input
                      placeholder="electoral_analytics"
                      value={getSettingValue('bigquery_dataset_id')}
                      onChange={(e) => updateLocalSetting('bigquery_dataset_id', e.target.value)}
                      onBlur={(e) => saveSetting('bigquery_dataset_id', e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label>Service Account Key (JSON)</Label>
                  <div className="relative">
                    <Textarea
                      placeholder="Paste your service account JSON key here"
                      className="min-h-[100px] pr-10"
                      value={showSecrets['bigquery_key'] ? getSettingValue('bigquery_service_key') : '••••••••'}
                      onChange={(e) => updateLocalSetting('bigquery_service_key', e.target.value)}
                      onBlur={(e) => saveSetting('bigquery_service_key', e.target.value)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-2"
                      onClick={() => toggleSecretVisibility('bigquery_key')}
                    >
                      {showSecrets['bigquery_key'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* HERE Maps */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Map className="h-5 w-5" />
                  <span>HERE Maps Navigation</span>
                  <Badge variant={getSettingValue('here_maps_enabled') === 'true' ? 'default' : 'secondary'}>
                    {getSettingValue('here_maps_enabled') === 'true' ? 'Enabled' : 'Disabled'}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={getSettingValue('here_maps_enabled') === 'true'}
                    onCheckedChange={(checked) => saveSetting('here_maps_enabled', checked.toString())}
                  />
                  <Label>Enable HERE Maps Integration</Label>
                </div>
                
                <div>
                  <Label>API Key</Label>
                  <div className="relative">
                    <Input
                      placeholder="Your HERE Maps API key"
                      type={showSecrets['here_key'] ? 'text' : 'password'}
                      value={getSettingValue('here_api_key')}
                      onChange={(e) => updateLocalSetting('here_api_key', e.target.value)}
                      onBlur={(e) => saveSetting('here_api_key', e.target.value)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                      onClick={() => toggleSecretVisibility('here_key')}
                    >
                      {showSecrets['here_key'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Twilio */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Phone className="h-5 w-5" />
                  <span>Twilio SMS & Voice</span>
                  <Badge variant={getSettingValue('twilio_enabled') === 'true' ? 'default' : 'secondary'}>
                    {getSettingValue('twilio_enabled') === 'true' ? 'Enabled' : 'Disabled'}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={getSettingValue('twilio_enabled') === 'true'}
                    onCheckedChange={(checked) => saveSetting('twilio_enabled', checked.toString())}
                  />
                  <Label>Enable Twilio Integration</Label>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Account SID</Label>
                    <div className="relative">
                      <Input
                        placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                        type={showSecrets['twilio_sid'] ? 'text' : 'password'}
                        value={getSettingValue('twilio_account_sid')}
                        onChange={(e) => updateLocalSetting('twilio_account_sid', e.target.value)}
                        onBlur={(e) => saveSetting('twilio_account_sid', e.target.value)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 -translate-y-1/2"
                        onClick={() => toggleSecretVisibility('twilio_sid')}
                      >
                        {showSecrets['twilio_sid'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label>Auth Token</Label>
                    <div className="relative">
                      <Input
                        placeholder="Your Twilio auth token"
                        type={showSecrets['twilio_token'] ? 'text' : 'password'}
                        value={getSettingValue('twilio_auth_token')}
                        onChange={(e) => updateLocalSetting('twilio_auth_token', e.target.value)}
                        onBlur={(e) => saveSetting('twilio_auth_token', e.target.value)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 -translate-y-1/2"
                        onClick={() => toggleSecretVisibility('twilio_token')}
                      >
                        {showSecrets['twilio_token'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Phone Number</Label>
                  <Input
                    placeholder="+1234567890"
                    value={getSettingValue('twilio_phone_number')}
                    onChange={(e) => updateLocalSetting('twilio_phone_number', e.target.value)}
                    onBlur={(e) => saveSetting('twilio_phone_number', e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* OpenAI */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Bot className="h-5 w-5" />
                  <span>OpenAI AI Analytics</span>
                  <Badge variant={getSettingValue('openai_enabled') === 'true' ? 'default' : 'secondary'}>
                    {getSettingValue('openai_enabled') === 'true' ? 'Enabled' : 'Disabled'}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={getSettingValue('openai_enabled') === 'true'}
                    onCheckedChange={(checked) => saveSetting('openai_enabled', checked.toString())}
                  />
                  <Label>Enable OpenAI Integration</Label>
                </div>
                
                <div>
                  <Label>API Key</Label>
                  <div className="relative">
                    <Input
                      placeholder="sk-..."
                      type={showSecrets['openai_key'] ? 'text' : 'password'}
                      value={getSettingValue('openai_api_key')}
                      onChange={(e) => updateLocalSetting('openai_api_key', e.target.value)}
                      onBlur={(e) => saveSetting('openai_api_key', e.target.value)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                      onClick={() => toggleSecretVisibility('openai_key')}
                    >
                      {showSecrets['openai_key'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div>
                  <Label>Model</Label>
                  <Input
                    placeholder="gpt-4"
                    value={getSettingValue('openai_model')}
                    onChange={(e) => updateLocalSetting('openai_model', e.target.value)}
                    onBlur={(e) => saveSetting('openai_model', e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Lock className="h-5 w-5" />
                <span>DidIT KYC Verification</span>
                <Badge variant={getSettingValue('didit_kyc_enabled') === 'true' ? 'default' : 'secondary'}>
                  {getSettingValue('didit_kyc_enabled') === 'true' ? 'Enabled' : 'Disabled'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={getSettingValue('didit_kyc_enabled') === 'true'}
                  onCheckedChange={(checked) => saveSetting('didit_kyc_enabled', checked.toString())}
                />
                <Label>Enable KYC Verification</Label>
              </div>
              
              <div>
                <Label>API Endpoint</Label>
                <Input
                  placeholder="https://api.didit.me/v1"
                  value={getSettingValue('didit_api_endpoint')}
                  onChange={(e) => updateLocalSetting('didit_api_endpoint', e.target.value)}
                  onBlur={(e) => saveSetting('didit_api_endpoint', e.target.value)}
                />
              </div>

              <div>
                <Label>API Key</Label>
                <div className="relative">
                  <Input
                    placeholder="Your DidIT API key"
                    type={showSecrets['didit_key'] ? 'text' : 'password'}
                    value={getSettingValue('didit_api_key')}
                    onChange={(e) => updateLocalSetting('didit_api_key', e.target.value)}
                    onBlur={(e) => saveSetting('didit_api_key', e.target.value)}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    onClick={() => toggleSecretVisibility('didit_key')}
                  >
                    {showSecrets['didit_key'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Minimum Security Level</Label>
                  <Input
                    type="number"
                    min="1"
                    max="5"
                    value={getSettingValue('min_security_level')}
                    onChange={(e) => updateLocalSetting('min_security_level', e.target.value)}
                    onBlur={(e) => saveSetting('min_security_level', e.target.value)}
                  />
                </div>
                <div>
                  <Label>Session Timeout (minutes)</Label>
                  <Input
                    type="number"
                    min="5"
                    max="180"
                    value={getSettingValue('session_timeout')}
                    onChange={(e) => updateLocalSetting('session_timeout', e.target.value)}
                    onBlur={(e) => saveSetting('session_timeout', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={getSettingValue('device_binding_enabled') === 'true'}
                    onCheckedChange={(checked) => saveSetting('device_binding_enabled', checked.toString())}
                  />
                  <Label>Device Binding</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={getSettingValue('geo_verification_enabled') === 'true'}
                    onCheckedChange={(checked) => saveSetting('geo_verification_enabled', checked.toString())}
                  />
                  <Label>Geo-location Verification</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={getSettingValue('audit_logging_enabled') === 'true'}
                    onCheckedChange={(checked) => saveSetting('audit_logging_enabled', checked.toString())}
                  />
                  <Label>Audit Logging</Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Communications */}
        <TabsContent value="communications" className="space-y-6">
          <div className="grid gap-6">
            {/* WhatsApp */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5" />
                  <span>WhatsApp Business</span>
                  <Badge variant={getSettingValue('whatsapp_enabled') === 'true' ? 'default' : 'secondary'}>
                    {getSettingValue('whatsapp_enabled') === 'true' ? 'Enabled' : 'Disabled'}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={getSettingValue('whatsapp_enabled') === 'true'}
                    onCheckedChange={(checked) => saveSetting('whatsapp_enabled', checked.toString())}
                  />
                  <Label>Enable WhatsApp Integration</Label>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Phone Number ID</Label>
                    <Input
                      placeholder="WhatsApp Phone Number ID"
                      value={getSettingValue('whatsapp_phone_id')}
                      onChange={(e) => updateLocalSetting('whatsapp_phone_id', e.target.value)}
                      onBlur={(e) => saveSetting('whatsapp_phone_id', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Access Token</Label>
                    <div className="relative">
                      <Input
                        placeholder="WhatsApp access token"
                        type={showSecrets['whatsapp_token'] ? 'text' : 'password'}
                        value={getSettingValue('whatsapp_access_token')}
                        onChange={(e) => updateLocalSetting('whatsapp_access_token', e.target.value)}
                        onBlur={(e) => saveSetting('whatsapp_access_token', e.target.value)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 -translate-y-1/2"
                        onClick={() => toggleSecretVisibility('whatsapp_token')}
                      >
                        {showSecrets['whatsapp_token'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Email */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Mail className="h-5 w-5" />
                  <span>Email Notifications</span>
                  <Badge variant={getSettingValue('email_notifications_enabled') === 'true' ? 'default' : 'secondary'}>
                    {getSettingValue('email_notifications_enabled') === 'true' ? 'Enabled' : 'Disabled'}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={getSettingValue('email_notifications_enabled') === 'true'}
                    onCheckedChange={(checked) => saveSetting('email_notifications_enabled', checked.toString())}
                  />
                  <Label>Enable Email Notifications</Label>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>SMTP Server</Label>
                    <Input
                      placeholder="smtp.gmail.com"
                      value={getSettingValue('smtp_server')}
                      onChange={(e) => updateLocalSetting('smtp_server', e.target.value)}
                      onBlur={(e) => saveSetting('smtp_server', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>SMTP Port</Label>
                    <Input
                      type="number"
                      placeholder="587"
                      value={getSettingValue('smtp_port')}
                      onChange={(e) => updateLocalSetting('smtp_port', e.target.value)}
                      onBlur={(e) => saveSetting('smtp_port', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Email Address</Label>
                    <Input
                      type="email"
                      placeholder="notifications@caffe.org.jm"
                      value={getSettingValue('smtp_email')}
                      onChange={(e) => updateLocalSetting('smtp_email', e.target.value)}
                      onBlur={(e) => saveSetting('smtp_email', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Email Password</Label>
                    <div className="relative">
                      <Input
                        placeholder="App password or SMTP password"
                        type={showSecrets['email_pass'] ? 'text' : 'password'}
                        value={getSettingValue('smtp_password')}
                        onChange={(e) => updateLocalSetting('smtp_password', e.target.value)}
                        onBlur={(e) => saveSetting('smtp_password', e.target.value)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 -translate-y-1/2"
                        onClick={() => toggleSecretVisibility('email_pass')}
                      >
                        {showSecrets['email_pass'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Analytics */}
        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>AI Analytics Configuration</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Analysis Frequency</Label>
                  <select 
                    className="w-full p-2 border rounded"
                    value={getSettingValue('ai_analysis_frequency')}
                    onChange={(e) => saveSetting('ai_analysis_frequency', e.target.value)}
                  >
                    <option value="real-time">Real-time</option>
                    <option value="hourly">Hourly</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>
                <div>
                  <Label>AI Sensitivity</Label>
                  <select 
                    className="w-full p-2 border rounded"
                    value={getSettingValue('ai_sensitivity')}
                    onChange={(e) => saveSetting('ai_sensitivity', e.target.value)}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={getSettingValue('ai_anomaly_detection') === 'true'}
                    onCheckedChange={(checked) => saveSetting('ai_anomaly_detection', checked.toString())}
                  />
                  <Label>Anomaly Detection</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={getSettingValue('ai_predictive_analytics') === 'true'}
                    onCheckedChange={(checked) => saveSetting('ai_predictive_analytics', checked.toString())}
                  />
                  <Label>Predictive Analytics</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={getSettingValue('ai_real_time_insights') === 'true'}
                    onCheckedChange={(checked) => saveSetting('ai_real_time_insights', checked.toString())}
                  />
                  <Label>Real-time Insights</Label>
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