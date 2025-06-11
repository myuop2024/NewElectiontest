import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Settings, 
  Users, 
  MapPin, 
  MessageSquare, 
  Shield, 
  Bell, 
  Database,
  Wifi,
  CheckCircle,
  AlertTriangle,
  Info
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SystemSetting {
  key: string;
  value: string;
  description: string;
  category: string;
  type: 'text' | 'boolean' | 'number' | 'select';
  options?: string[];
}

export default function AdminSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('system');
  const [testResults, setTestResults] = useState<Record<string, boolean>>({});
  const [isTesting, setIsTesting] = useState(false);

  // Fetch system settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['/api/settings'],
    queryFn: async () => {
      const response = await fetch('/api/settings');
      if (!response.ok) throw new Error('Failed to fetch settings');
      return response.json() as SystemSetting[];
    }
  });

  // Fetch system health
  const { data: systemHealth } = useQuery({
    queryKey: ['/api/admin/system/health'],
    queryFn: async () => {
      const response = await fetch('/api/admin/system/health');
      if (!response.ok) throw new Error('Failed to fetch system health');
      return response.json();
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Update setting mutation
  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value })
      });
      if (!response.ok) throw new Error('Failed to update setting');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      toast({ title: "Setting updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  // Test all services
  const testAllServices = async () => {
    setIsTesting(true);
    try {
      const response = await fetch('/api/admin/features/test-all');
      const results = await response.json();
      setTestResults(results);
      toast({ title: "Service tests completed" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to test services", variant: "destructive" });
    }
    setIsTesting(false);
  };

  const settingsByCategory = settings?.reduce((acc, setting) => {
    if (!acc[setting.category]) acc[setting.category] = [];
    acc[setting.category].push(setting);
    return acc;
  }, {} as Record<string, SystemSetting[]>) || {};

  const renderSettingControl = (setting: SystemSetting) => {
    const currentValue = setting.value;

    switch (setting.type) {
      case 'boolean':
        return (
          <Switch
            checked={currentValue === 'true'}
            onCheckedChange={(checked) => 
              updateSettingMutation.mutate({ key: setting.key, value: checked.toString() })
            }
          />
        );
      case 'select':
        return (
          <Select
            value={currentValue}
            onValueChange={(value) => 
              updateSettingMutation.mutate({ key: setting.key, value })
            }
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {setting.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case 'number':
        return (
          <Input
            type="number"
            value={currentValue}
            onChange={(e) => 
              updateSettingMutation.mutate({ key: setting.key, value: e.target.value })
            }
            className="w-32"
          />
        );
      default:
        return (
          <Input
            value={currentValue}
            onChange={(e) => 
              updateSettingMutation.mutate({ key: setting.key, value: e.target.value })
            }
            className="w-64"
          />
        );
    }
  };

  if (isLoading) {
    return <div className="p-6">Loading settings...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Administration</h1>
          <p className="text-muted-foreground">Manage system settings and monitor health</p>
        </div>
        <Button onClick={testAllServices} disabled={isTesting}>
          {isTesting ? "Testing..." : "Test All Services"}
        </Button>
      </div>

      {/* System Health Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            System Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <div className={`h-3 w-3 rounded-full ${systemHealth?.database ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm">Database</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`h-3 w-3 rounded-full ${systemHealth?.websocket ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm">WebSocket</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`h-3 w-3 rounded-full ${systemHealth?.storage ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm">File Storage</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`h-3 w-3 rounded-full ${systemHealth?.notifications ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm">Notifications</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="system">
            <Settings className="h-4 w-4 mr-2" />
            System
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="h-4 w-4 mr-2" />
            Users
          </TabsTrigger>
          <TabsTrigger value="locations">
            <MapPin className="h-4 w-4 mr-2" />
            Locations
          </TabsTrigger>
          <TabsTrigger value="communication">
            <MessageSquare className="h-4 w-4 mr-2" />
            Communication
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="h-4 w-4 mr-2" />
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Application Settings</CardTitle>
              <CardDescription>Core system configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {settingsByCategory.system?.map((setting) => (
                <div key={setting.key} className="flex items-center justify-between py-2">
                  <div className="space-y-1">
                    <Label className="font-medium">{setting.key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</Label>
                    <p className="text-sm text-muted-foreground">{setting.description}</p>
                  </div>
                  {renderSettingControl(setting)}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>User Management Settings</CardTitle>
              <CardDescription>Configure user registration, authentication, and roles</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {settingsByCategory.users?.map((setting) => (
                <div key={setting.key} className="flex items-center justify-between py-2">
                  <div className="space-y-1">
                    <Label className="font-medium">{setting.key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</Label>
                    <p className="text-sm text-muted-foreground">{setting.description}</p>
                  </div>
                  {renderSettingControl(setting)}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="locations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Location & Mapping Settings</CardTitle>
              <CardDescription>Configure GPS tracking, polling stations, and geographical features</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {settingsByCategory.location?.map((setting) => (
                <div key={setting.key} className="flex items-center justify-between py-2">
                  <div className="space-y-1">
                    <Label className="font-medium">{setting.key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</Label>
                    <p className="text-sm text-muted-foreground">{setting.description}</p>
                  </div>
                  {renderSettingControl(setting)}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="communication" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Communication Settings</CardTitle>
              <CardDescription>Configure messaging, notifications, and emergency alerts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {settingsByCategory.communication?.map((setting) => (
                <div key={setting.key} className="flex items-center justify-between py-2">
                  <div className="space-y-1">
                    <Label className="font-medium">{setting.key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</Label>
                    <p className="text-sm text-muted-foreground">{setting.description}</p>
                  </div>
                  {renderSettingControl(setting)}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Configure authentication, encryption, and access controls</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {settingsByCategory.security?.map((setting) => (
                <div key={setting.key} className="flex items-center justify-between py-2">
                  <div className="space-y-1">
                    <Label className="font-medium">{setting.key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</Label>
                    <p className="text-sm text-muted-foreground">{setting.description}</p>
                  </div>
                  {renderSettingControl(setting)}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Service Test Results */}
          {Object.keys(testResults).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Service Test Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(testResults).map(([service, status]) => (
                    <div key={service} className="flex items-center justify-between p-2 rounded border">
                      <span className="font-medium">{service}</span>
                      <Badge variant={status ? "default" : "destructive"}>
                        {status ? "Passed" : "Failed"}
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