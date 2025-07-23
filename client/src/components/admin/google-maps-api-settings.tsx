import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Key, CheckCircle, AlertCircle, ExternalLink } from "lucide-react";

export default function GoogleMapsApiSettings() {
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: settings = { configured: false, hasKey: false }, isLoading } = useQuery<{
    configured: boolean;
    hasKey: boolean;
  }>({
    queryKey: ["/api/settings/google-maps-api"],
  });

  const updateApiKeyMutation = useMutation({
    mutationFn: async (newApiKey: string) => {
      const response = await apiRequest("POST", "/api/settings/google-maps-api", { apiKey: newApiKey });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/google-maps-api"] });
      toast({
        title: "Google Maps API Key Updated",
        description: "The Google Maps API key has been successfully configured.",
      });
      setApiKey("");
      setShowKey(false);
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update Google Maps API key",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      toast({
        title: "Invalid API Key",
        description: "Please enter a valid Google Maps API key",
        variant: "destructive",
      });
      return;
    }
    updateApiKeyMutation.mutate(apiKey.trim());
  };

  const testApiKey = async () => {
    if (!apiKey.trim()) {
      toast({
        title: "No API Key",
        description: "Please enter an API key to test",
        variant: "destructive",
      });
      return;
    }

    try {
      // Test the API key by making a simple geocoding request
      const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=Kingston,Jamaica&key=${apiKey.trim()}`);
      const data = await response.json();
      
      if (data.status === 'OK' && data.results.length > 0) {
        toast({
          title: "API Key Valid",
          description: "Google Maps API connection successful!",
        });
      } else {
        toast({
          title: "API Key Issue",
          description: `API key works but returned status: ${data.status}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "API Key Invalid",
        description: "Failed to connect to Google Maps API. Please check your API key.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MapPin className="h-5 w-5" />
            <span>Google Maps API Configuration</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <MapPin className="h-5 w-5" />
          <span>Google Maps API Configuration</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">API Status</h3>
            <p className="text-sm text-gray-600">
              Google Maps provides mapping and geocoding services for the application
            </p>
          </div>
          <Badge variant={settings.configured ? "default" : "secondary"} className="flex items-center space-x-1">
            {settings.configured ? (
              <>
                <CheckCircle className="h-3 w-3" />
                <span>Configured</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-3 w-3" />
                <span>Not Configured</span>
              </>
            )}
          </Badge>
        </div>

        <Alert>
          <Key className="h-4 w-4" />
          <AlertDescription>
            To enable Google Maps functionality, you need a Google Maps API key. 
            <a 
              href="https://developers.google.com/maps/documentation/javascript/get-api-key" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center ml-1 text-blue-600 hover:text-blue-700"
            >
              Get your API key here
              <ExternalLink className="h-3 w-3 ml-1" />
            </a>
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="google-maps-api-key">Google Maps API Key</Label>
            <div className="flex space-x-2 mt-1">
              <Input
                id="google-maps-api-key"
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your Google Maps API key"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowKey(!showKey)}
                className="px-3"
              >
                {showKey ? "Hide" : "Show"}
              </Button>
            </div>
          </div>

          <div className="flex space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={testApiKey}
              disabled={!apiKey.trim() || updateApiKeyMutation.isPending}
            >
              Test API Key
            </Button>
            <Button
              type="submit"
              disabled={!apiKey.trim() || updateApiKeyMutation.isPending}
              className="flex-1"
            >
              {updateApiKeyMutation.isPending ? "Updating..." : "Update API Key"}
            </Button>
          </div>
        </form>

        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium mb-2">Features Enabled by Google Maps API:</h4>
          <ul className="space-y-1 text-sm text-gray-600">
            <li>• Interactive maps for polling stations</li>
            <li>• Geocoding and address validation</li>
            <li>• Route planning and navigation</li>
            <li>• Heat maps and data visualization</li>
            <li>• Location-based analytics</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
} 