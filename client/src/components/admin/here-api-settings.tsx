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
import { hereApiService } from "@/lib/here-api";

export default function HereApiSettings() {
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["/api/settings/here-api"],
  });

  const updateApiKeyMutation = useMutation({
    mutationFn: async (newApiKey: string) => {
      const response = await apiRequest("POST", "/api/settings/here-api", { apiKey: newApiKey });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/here-api"] });
      hereApiService.setApiKey(apiKey);
      toast({
        title: "HERE API Key Updated",
        description: "The HERE API key has been successfully configured.",
      });
      setApiKey("");
      setShowKey(false);
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update HERE API key",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      toast({
        title: "Invalid API Key",
        description: "Please enter a valid HERE API key",
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
      hereApiService.setApiKey(apiKey.trim());
      const results = await hereApiService.autocompleteAddress("Kingston", "Kingston");
      
      if (results.length > 0) {
        toast({
          title: "API Key Valid",
          description: "HERE API connection successful!",
        });
      } else {
        toast({
          title: "API Key Issue",
          description: "API key works but returned no results for test query",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "API Key Invalid",
        description: "Failed to connect to HERE API. Please check your API key.",
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
            <span>HERE API Configuration</span>
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
          <span>HERE API Configuration</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">API Status</h3>
            <p className="text-sm text-gray-600">
              HERE API provides address autocomplete for Jamaican locations
            </p>
          </div>
          <Badge variant={settings?.configured ? "default" : "secondary"} className="flex items-center space-x-1">
            {settings?.configured ? (
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
            To enable address autocomplete for Jamaican locations, you need a HERE API key. 
            <a 
              href="https://developer.here.com/sign-up" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center ml-1 text-blue-600 hover:text-blue-700"
            >
              Get your free API key here
              <ExternalLink className="h-3 w-3 ml-1" />
            </a>
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="here-api-key">HERE API Key</Label>
            <div className="flex space-x-2 mt-1">
              <Input
                id="here-api-key"
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your HERE API key"
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
          <h4 className="font-medium mb-2">Features Enabled by HERE API:</h4>
          <ul className="space-y-1 text-sm text-gray-600">
            <li>• Address autocomplete for observer registration</li>
            <li>• Jamaican parish and community suggestions</li>
            <li>• GPS coordinate extraction for addresses</li>
            <li>• Polling station location services</li>
            <li>• Route optimization for roving observers</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}