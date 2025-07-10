import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  CheckCircle, 
  AlertCircle, 
  ExternalLink, 
  Copy,
  Settings,
  Key,
  Shield,
  Globe
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useToast } from '@/hooks/use-toast';

export default function TrainingSetupGuide() {
  const { toast } = useToast();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "Text has been copied to your clipboard"
    });
  };

  const currentDomain = window.location.origin;
  const redirectUri = `${currentDomain}/api/auth/google/callback`;
  
  // Also show the current Replit domain if available
  const replitDomain = window.location.hostname;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Google Classroom Setup</h1>
          <p className="text-muted-foreground">
            Configure Google Cloud Console for Google Classroom integration
          </p>
        </div>
        <Badge variant="outline" className="text-amber-600 border-amber-600">
          Setup Required
        </Badge>
      </div>

      <Alert className="border-amber-200 bg-amber-50">
        <AlertCircle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800">
          <strong>Important:</strong> This integration requires proper Google Cloud Console configuration. 
          Follow the steps below to enable Google Classroom for your electoral observer training platform.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Step-by-step guide */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Setup Instructions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-600 rounded-full text-sm font-semibold">
                  1
                </div>
                <div>
                  <h4 className="font-semibold">Create Google Cloud Project</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Go to Google Cloud Console and create a new project or select an existing one.
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open Cloud Console
                    </a>
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-600 rounded-full text-sm font-semibold">
                  2
                </div>
                <div>
                  <h4 className="font-semibold">Enable Google Classroom API</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    In the API & Services section, enable the Google Classroom API for your project.
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://console.cloud.google.com/apis/library/classroom.googleapis.com" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Enable API
                    </a>
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-600 rounded-full text-sm font-semibold">
                  3
                </div>
                <div>
                  <h4 className="font-semibold">Configure OAuth Consent Screen</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Set up the OAuth consent screen with your organization details.
                  </p>
                  <div className="space-y-2 text-xs">
                    <div><strong>Application name:</strong> CAFFE Electoral Observer Platform</div>
                    <div><strong>User support email:</strong> Your contact email</div>
                    <div><strong>Scopes:</strong> Add Google Classroom read-only scopes</div>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-600 rounded-full text-sm font-semibold">
                  4
                </div>
                <div>
                  <h4 className="font-semibold">Create OAuth 2.0 Credentials</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Create OAuth 2.0 Client IDs with the correct redirect URI.
                  </p>
                  <div className="space-y-2">
                    <div className="text-xs">
                      <strong>Application type:</strong> Web application
                    </div>
                    <div className="text-xs">
                      <strong>Authorized redirect URI:</strong>
                      <div className="space-y-2 mt-1">
                        <div className="flex items-center gap-2">
                          <code className="bg-gray-100 px-2 py-1 rounded text-xs flex-1">{redirectUri}</code>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => copyToClipboard(redirectUri)}
                            className="h-6 px-2"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="text-red-600 bg-red-50 p-2 rounded text-xs">
                          <strong>⚠️ Important:</strong> Copy this exact URI to your Google Cloud Console
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-6 h-6 bg-green-100 text-green-600 rounded-full text-sm font-semibold">
                  5
                </div>
                <div>
                  <h4 className="font-semibold">Add Credentials to Replit</h4>
                  <p className="text-sm text-muted-foreground">
                    Copy your Client ID and Client Secret to Replit Secrets (already configured).
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-600">Credentials configured</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Troubleshooting */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Troubleshooting
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>403 Error:</strong> This typically occurs when the OAuth application needs verification 
                or the Classroom API isn't enabled.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <h4 className="font-semibold">Common Issues:</h4>
              
              <div className="space-y-3 text-sm">
                <div>
                  <strong>OAuth App Verification:</strong>
                  <p className="text-muted-foreground">
                    For production use, Google may require app verification. During development, 
                    add test users to your OAuth consent screen.
                  </p>
                </div>

                <div>
                  <strong>Redirect URI Mismatch (Error 400):</strong>
                  <p className="text-muted-foreground mb-2">
                    This error means the redirect URI in Google Cloud Console doesn't match your current domain.
                  </p>
                  <div className="bg-red-50 border border-red-200 p-3 rounded">
                    <p className="text-sm font-semibold text-red-800 mb-2">Required Action:</p>
                    <p className="text-sm text-red-700 mb-2">Add this exact URI to your Google Cloud Console:</p>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-white px-2 py-1 rounded border flex-1">{redirectUri}</code>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => copyToClipboard(redirectUri)}
                        className="h-6 px-2 border-red-300"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div>
                  <strong>API Quotas:</strong>
                  <p className="text-muted-foreground">
                    Check that you haven't exceeded Google Classroom API quotas in the Cloud Console.
                  </p>
                </div>

                <div>
                  <strong>Scopes:</strong>
                  <p className="text-muted-foreground">
                    The application uses read-only scopes to minimize permission requirements.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="font-semibold mb-2">Required Scopes:</h4>
              <div className="space-y-1 text-xs">
                <div className="bg-gray-50 p-2 rounded">
                  <code>https://www.googleapis.com/auth/classroom.courses.readonly</code>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <code>https://www.googleapis.com/auth/classroom.coursework.me.readonly</code>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <code>https://www.googleapis.com/auth/userinfo.profile</code>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <code>https://www.googleapis.com/auth/userinfo.email</code>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Links */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Helpful Resources
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" asChild>
              <a href="https://developers.google.com/classroom/guides/auth" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Classroom Auth Guide
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer">
                <Key className="h-4 w-4 mr-2" />
                Manage Credentials
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href="https://support.google.com/cloud/answer/6158849" target="_blank" rel="noopener noreferrer">
                <Shield className="h-4 w-4 mr-2" />
                OAuth Verification
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}