import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Settings, Globe, Palette, Database, Download } from "lucide-react";

interface SystemPreferencesProps {
  canAccessAdmin: boolean;
}

export default function SystemPreferences({ canAccessAdmin }: SystemPreferencesProps) {
  const [preferences, setPreferences] = useState({
    language: 'en',
    timezone: 'America/Jamaica',
    darkMode: false,
    notifications: true,
    autoSave: true,
    dataSync: true,
    offlineMode: false,
    highContrast: false
  });
  const { toast } = useToast();

  const handlePreferenceChange = (key: string, value: any) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
    toast({
      title: "Preference Updated",
      description: `${key} has been updated`,
    });
  };

  const exportData = () => {
    toast({
      title: "Data Export Started",
      description: "Your data export is being prepared for download",
    });
  };

  const clearCache = () => {
    toast({
      title: "Cache Cleared",
      description: "Application cache has been cleared successfully",
    });
  };

  return (
    <div className="space-y-6">
      {/* General Preferences */}
      <Card className="government-card">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            General Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="form-field">
              <Label className="form-label">Language</Label>
              <Select 
                value={preferences.language} 
                onValueChange={(value) => handlePreferenceChange('language', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="form-field">
              <Label className="form-label">Timezone</Label>
              <Select 
                value={preferences.timezone} 
                onValueChange={(value) => handlePreferenceChange('timezone', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="America/Jamaica">Jamaica Time (GMT-5)</SelectItem>
                  <SelectItem value="America/New_York">Eastern Time (GMT-5)</SelectItem>
                  <SelectItem value="UTC">UTC (GMT+0)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">Dark Mode</Label>
                <p className="text-sm text-muted-foreground">Switch to dark theme</p>
              </div>
              <Switch
                checked={preferences.darkMode}
                onCheckedChange={(checked) => handlePreferenceChange('darkMode', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">High Contrast</Label>
                <p className="text-sm text-muted-foreground">Enhanced visibility for accessibility</p>
              </div>
              <Switch
                checked={preferences.highContrast}
                onCheckedChange={(checked) => handlePreferenceChange('highContrast', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">Push Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive browser notifications</p>
              </div>
              <Switch
                checked={preferences.notifications}
                onCheckedChange={(checked) => handlePreferenceChange('notifications', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data & Sync */}
      <Card className="government-card">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Database className="h-5 w-5 mr-2" />
            Data & Synchronization
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">Auto-Save</Label>
                <p className="text-sm text-muted-foreground">Automatically save form data</p>
              </div>
              <Switch
                checked={preferences.autoSave}
                onCheckedChange={(checked) => handlePreferenceChange('autoSave', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">Data Synchronization</Label>
                <p className="text-sm text-muted-foreground">Sync data across devices</p>
              </div>
              <Switch
                checked={preferences.dataSync}
                onCheckedChange={(checked) => handlePreferenceChange('dataSync', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">Offline Mode</Label>
                <p className="text-sm text-muted-foreground">Enable offline functionality</p>
              </div>
              <Switch
                checked={preferences.offlineMode}
                onCheckedChange={(checked) => handlePreferenceChange('offlineMode', checked)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button variant="outline" onClick={exportData}>
              <Download className="h-4 w-4 mr-2" />
              Export My Data
            </Button>
            <Button variant="outline" onClick={clearCache}>
              <Database className="h-4 w-4 mr-2" />
              Clear Cache
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Settings (Admin Only) */}
      {canAccessAdmin && (
        <Card className="government-card border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Globe className="h-5 w-5 mr-2 text-primary" />
              Advanced Settings (Admin)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">System Maintenance Mode</Label>
                  <p className="text-sm text-muted-foreground">Enable maintenance mode for all users</p>
                </div>
                <Switch />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Debug Logging</Label>
                  <p className="text-sm text-muted-foreground">Enable detailed system logging</p>
                </div>
                <Switch />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">API Rate Limiting</Label>
                  <p className="text-sm text-muted-foreground">Enable API request rate limiting</p>
                </div>
                <Switch defaultChecked />
              </div>
            </div>

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Advanced settings affect all system users. 
                Changes should be made carefully and with proper authorization.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
