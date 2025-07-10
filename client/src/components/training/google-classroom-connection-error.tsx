import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ExternalLink, AlertTriangle, Settings } from "lucide-react";

interface ConnectionErrorProps {
  error?: string;
  onRetry?: () => void;
}

export function GoogleClassroomConnectionError({ error, onRetry }: ConnectionErrorProps) {
  const isOAuthError = error?.includes('invalid_request') || error?.includes('redirect_uri');

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-600">
          <AlertTriangle className="h-5 w-5" />
          Google Classroom Connection Error
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isOAuthError ? (
          <Alert>
            <Settings className="h-4 w-4" />
            <AlertDescription>
              <strong>OAuth Configuration Required</strong>
              <br />
              The Google Cloud Console needs to be configured with the correct redirect URI for this Replit environment.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Connection Error:</strong> {error || 'Unknown error occurred'}
            </AlertDescription>
          </Alert>
        )}

        {isOAuthError && (
          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <h4 className="font-semibold">Setup Required:</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Go to <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google Cloud Console</a></li>
              <li>Navigate to APIs & Services → Credentials</li>
              <li>Edit your OAuth 2.0 Client ID</li>
              <li>Add this redirect URI:</li>
            </ol>
            
            <div className="bg-white p-3 rounded border font-mono text-sm break-all">
              https://{window.location.host}/api/auth/google/callback
            </div>
            
            <p className="text-xs text-gray-600">
              Complete setup instructions are available in the project documentation.
            </p>
          </div>
        )}

        <div className="flex gap-2">
          {onRetry && (
            <Button onClick={onRetry} variant="outline">
              Try Again
            </Button>
          )}
          <Button variant="outline" asChild>
            <a 
              href="https://console.cloud.google.com/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Open Google Cloud Console
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}