import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExternalLink, UserCheck, Webhook, Eye, EyeOff, Settings } from 'lucide-react'; // Added Settings
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient"; // Assuming this path is correct
import { useToast } from "@/hooks/use-toast"; // Assuming this path is correct

// Define the shape of a setting object, if not already globally defined
interface Setting {
  id: number;
  key: string;
  value: string;
  description?: string;
  category?: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  lastChangedBy?: number | null;
}

export default function AdminDiditSettings() {
  const [settingsData, setSettingsData] = useState<Record<string, string>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({
    didit_api_key: false,
    didit_client_secret: false, // Added didit_client_secret
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const debounceTimeouts = useRef<Record<string, NodeJS.Timeout>>({});

  // Get current settings
  const { data: fetchedSettings, isLoading: isLoadingSettings } = useQuery<Setting[]>({
    queryKey: ['/api/settings'],
    // Assuming apiRequest is set up to handle GET for this key or you have a specific fetch function
    queryFn: () => apiRequest('GET', '/api/settings').then(res => res.json()),
  });

  useEffect(() => {
    if (fetchedSettings) {
      const newSettingsData: Record<string, string> = {};
      fetchedSettings.forEach(setting => {
        newSettingsData[setting.key] = setting.value;
      });
      setSettingsData(newSettingsData);
    }
  }, [fetchedSettings]);

  // Update setting mutation
  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      // Assuming apiRequest can handle POST and the body structure
      const response = await apiRequest('POST', '/api/settings', { key, value });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to save setting and parse error' }));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      return response.json();
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Setting Updated",
        description: `${variables.key} has been saved.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      // Also update local state immediately for responsiveness
      setSettingsData(prev => ({ ...prev, [variables.key]: variables.value }));
    },
    onError: (error: any, variables) => {
      toast({
        title: "Update Failed",
        description: `Failed to update ${variables.key}: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const handleUpdateSetting = useCallback((key: string, value: string) => {
    if (debounceTimeouts.current[key]) {
      clearTimeout(debounceTimeouts.current[key]);
    }
    debounceTimeouts.current[key] = setTimeout(() => {
      updateSettingMutation.mutate({ key, value });
      delete debounceTimeouts.current[key];
    }, 500);
  }, [updateSettingMutation]);

  const getSettingValue = (key: string, defaultValue: string = '') => {
    return settingsData[key] ?? defaultValue;
  };

  const toggleShowSecret = (key: string) => {
    setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (isLoadingSettings) {
    return <div>Loading settings...</div>;
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center space-x-2">
        <Settings className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Didit KYC Configuration</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <UserCheck className="h-5 w-5" />
            <span>DidIT KYC Verification Settings</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Configure the DidIT integration for robust Know Your Customer (KYC) verification.
              <a href="https://docs.didit.me/" target="_blank" rel="noopener noreferrer" className="ml-2 text-blue-500 hover:underline">
                Read Didit Docs <ExternalLink className="inline h-4 w-4" />
              </a>
            </p>
            <div className="flex items-center space-x-2">
              <Switch
                id="didit_kyc_enabled"
                checked={getSettingValue('didit_kyc_enabled') === 'true'}
                onCheckedChange={(checked) => handleUpdateSetting('didit_kyc_enabled', checked.toString())}
              />
              <Label htmlFor="didit_kyc_enabled">Enable DidIT KYC</Label>
            </div>
          </div>

          {/* API Credentials */}
          <div className="space-y-3 border-t pt-6">
            <Label className="text-base font-medium">API Credentials</Label>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="didit_api_endpoint">API Endpoint</Label>
                <Input
                  id="didit_api_endpoint"
                  placeholder="https://apx.didit.me/v2/"
                  value={getSettingValue('didit_api_endpoint')}
                  onChange={(e) => setSettingsData(prev => ({ ...prev, didit_api_endpoint: e.target.value }))}
                  onBlur={(e) => handleUpdateSetting('didit_api_endpoint', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="didit_api_key">API Key</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="didit_api_key"
                      placeholder="your-didit-api-key"
                      type={showSecrets['didit_api_key'] ? 'text' : 'password'}
                      value={getSettingValue('didit_api_key')}
                      onChange={(e) => setSettingsData(prev => ({ ...prev, didit_api_key: e.target.value }))}
                      onBlur={(e) => handleUpdateSetting('didit_api_key', e.target.value)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleShowSecret('didit_api_key')}
                    >
                      {showSecrets['didit_api_key'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                {/* New row for Client ID and Client Secret */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                  <div>
                    <Label htmlFor="didit_client_id">Didit Client ID</Label>
                    <Input
                      id="didit_client_id"
                      placeholder="your-didit-client-id"
                      value={getSettingValue('didit_client_id')}
                      onChange={(e) => setSettingsData(prev => ({ ...prev, didit_client_id: e.target.value }))}
                      onBlur={(e) => handleUpdateSetting('didit_client_id', e.target.value)}
                    />
                    <p className="text-sm text-muted-foreground pt-1">
                      Optional. Used for OAuth flows if applicable.
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="didit_client_secret">Didit Client Secret</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        id="didit_client_secret"
                        placeholder="your-didit-client-secret"
                        type={showSecrets['didit_client_secret'] ? 'text' : 'password'}
                        value={getSettingValue('didit_client_secret')}
                        onChange={(e) => setSettingsData(prev => ({ ...prev, didit_client_secret: e.target.value }))}
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
                     <p className="text-sm text-muted-foreground pt-1">
                      Optional. Used for OAuth flows if applicable. Keep this secret.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Verification Flow */}
          <div className="space-y-3 border-t pt-6">
            <Label className="text-base font-medium">Verification Flow & Webhooks</Label>
            {/* didit_liveness_level was here, now moved to Advanced */}
            <div>
              <Label htmlFor="didit_webhook_url">Webhook URL</Label>
              <Input
                id="didit_webhook_url"
                placeholder="e.g., https://yourapp.com/api/kyc/webhook"
                value={getSettingValue('didit_webhook_url')}
                onChange={(e) => setSettingsData(prev => ({ ...prev, didit_webhook_url: e.target.value }))}
                onBlur={(e) => handleUpdateSetting('didit_webhook_url', e.target.value)}
              />
               <p className="text-sm text-muted-foreground pt-1">
                Endpoint in your application to receive KYC status updates from Didit.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="didit_manual_override"
                checked={getSettingValue('didit_manual_override') === 'true'}
                onCheckedChange={(checked) => handleUpdateSetting('didit_manual_override', checked.toString())}
              />
              <Label htmlFor="didit_manual_override">Allow Manual Verification Override by Admins</Label>
            </div>
          </div>

          {/* Advanced Didit Configuration */}
          <div className="space-y-3 border-t pt-6">
            <Label className="text-base font-medium">Advanced Didit Configuration</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Liveness Mode */}
              <div>
                <Label htmlFor="didit_liveness_mode">Liveness Mode</Label>
                <Select
                  value={getSettingValue('didit_liveness_mode', 'console_default')}
                  onValueChange={(value) => handleUpdateSetting('didit_liveness_mode', value)}
                >
                  <SelectTrigger id="didit_liveness_mode">
                    <SelectValue placeholder="Select liveness mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="console_default">Console Default</SelectItem>
                    <SelectItem value="passive">Passive</SelectItem>
                    <SelectItem value="3d_flash">3D Flash</SelectItem>
                    <SelectItem value="3d_action_flash">3D Action & Flash</SelectItem>
                    <SelectItem value="none">None (Disable Liveness)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground pt-1">
                  Determines the type of liveness check performed.
                </p>
              </div>

              {/* Liveness Level */}
              <div>
                <Label htmlFor="didit_liveness_level">Liveness Strictness</Label>
                <Select
                  value={getSettingValue('didit_liveness_level', 'standard')}
                  onValueChange={(value) => handleUpdateSetting('didit_liveness_level', value)}
                >
                  <SelectTrigger id="didit_liveness_level">
                    <SelectValue placeholder="Select liveness level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    {/* <SelectItem value="strong">Strong</SelectItem> */}
                    {/* <SelectItem value="extreme">Extreme</SelectItem> */}
                  </SelectContent>
                </Select>
                  <p className="text-sm text-muted-foreground pt-1">
                  Adjust the strictness of the liveness detection.
                </p>
              </div>
            </div>

            {/* AML Check */}
            <div className="pt-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="didit_aml_check_enabled"
                  checked={getSettingValue('didit_aml_check_enabled') === 'true'}
                  onCheckedChange={(checked) => handleUpdateSetting('didit_aml_check_enabled', checked.toString())}
                />
                <Label htmlFor="didit_aml_check_enabled">Enable Anti-Money Laundering (AML) Check</Label>
              </div>
              {getSettingValue('didit_aml_check_enabled') === 'true' && (
                <div className="pl-8 pt-2 space-y-1">
                  <Label htmlFor="didit_aml_sensitivity">AML Sensitivity</Label>
                  <Select
                    value={getSettingValue('didit_aml_sensitivity', 'medium')}
                    onValueChange={(value) => handleUpdateSetting('didit_aml_sensitivity', value)}
                  >
                    <SelectTrigger id="didit_aml_sensitivity">
                      <SelectValue placeholder="Select AML sensitivity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    Configure the sensitivity for AML checks. Ensure this is active in your Didit console.
                  </p>
                </div>
              )}
            </div>

            {/* Age Estimation */}
            <div className="pt-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="didit_age_estimation_enabled"
                  checked={getSettingValue('didit_age_estimation_enabled') === 'true'}
                  onCheckedChange={(checked) => handleUpdateSetting('didit_age_estimation_enabled', checked.toString())}
                />
                <Label htmlFor="didit_age_estimation_enabled">Enable Age Estimation</Label>
              </div>
              <p className="text-sm text-muted-foreground pl-8 pt-1">
                Estimate user's age based on identity documents. Requires Didit console activation.
              </p>
            </div>

            {/* Proof of Address */}
            <div className="pt-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="didit_proof_of_address_enabled"
                  checked={getSettingValue('didit_proof_of_address_enabled') === 'true'}
                  onCheckedChange={(checked) => handleUpdateSetting('didit_proof_of_address_enabled', checked.toString())}
                />
                <Label htmlFor="didit_proof_of_address_enabled">Enable Proof of Address (PoA) Verification</Label>
              </div>
              <p className="text-sm text-muted-foreground pl-8 pt-1">
                Enable verification of user's address. Requires Didit console activation.
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t">
              <Button onClick={() => alert("Test DidIT Configuration logic to be implemented.")}>
              <Webhook className="mr-2 h-4 w-4" />
              Test DidIT Configuration
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
