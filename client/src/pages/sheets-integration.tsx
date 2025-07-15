import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { 
  Upload, 
  TestTube, 
  Download, 
  RefreshCw, 
  FileSpreadsheet, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  Info,
  Settings,
  Clock,
  Database
} from "lucide-react";

interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

interface TestResult {
  success: boolean;
  rowCount: number;
  headers: string[];
  error?: string;
}

export default function SheetsIntegration() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [range, setRange] = useState("Sheet1!A1:Z1000");
  const [isImporting, setIsImporting] = useState(false);
  const [lastImportResult, setLastImportResult] = useState<ImportResult | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  // Test connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/integration/sheets/test", { spreadsheetId, range });
      return response as unknown as TestResult;
    },
    onSuccess: (result: TestResult) => {
      setTestResult(result);
      if (result.success) {
        toast({
          title: "Connection Successful",
          description: `Found ${result.rowCount} rows with ${result.headers.length} columns`,
        });
      } else {
        toast({
          title: "Connection Failed",
          description: result.error || "Unable to access the spreadsheet",
          variant: "destructive"
        });
      }
    },
    onError: () => {
      toast({
        title: "Test Failed",
        description: "Failed to test Google Sheets connection",
        variant: "destructive"
      });
    }
  });

  // Import mutation
  const importMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/integration/sheets/import", { spreadsheetId, range });
      return response as unknown as ImportResult;
    },
    onSuccess: (result: ImportResult) => {
      setLastImportResult(result);
      setIsImporting(false);
      toast({
        title: "Import Complete",
        description: `Imported ${result.imported} incidents, skipped ${result.skipped}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
    },
    onError: () => {
      setIsImporting(false);
      toast({
        title: "Import Failed",
        description: "Failed to import incidents from Google Sheets",
        variant: "destructive"
      });
    }
  });

  // Validate Google Sheets service
  const { data: serviceStatus } = useQuery<{ valid: boolean; message: string }>({
    queryKey: ["/api/integration/sheets/validate"],
    refetchInterval: 60000
  });

  const handleImport = () => {
    if (!spreadsheetId.trim() || !range.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter both Spreadsheet ID and Range",
        variant: "destructive"
      });
      return;
    }
    setIsImporting(true);
    importMutation.mutate();
  };

  const extractSpreadsheetId = (url: string) => {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : url;
  };

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-8 text-center">
              <Settings className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
              <p className="text-muted-foreground">
                Administrator privileges required to access Google Sheets integration.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary flex items-center space-x-2">
              <FileSpreadsheet className="h-8 w-8 text-green-600" />
              <span>Google Sheets Integration</span>
            </h1>
            <p className="text-muted-foreground">Import incident data from external Google Sheets</p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant={serviceStatus?.valid ? "default" : "destructive"}>
              {serviceStatus?.valid ? "Service Connected" : "Service Offline"}
            </Badge>
          </div>
        </div>

        {/* Service Status Alert */}
        {serviceStatus && !serviceStatus.valid && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Google Sheets service is not properly configured. Please check your service account credentials.
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="import" className="space-y-6">
          <TabsList>
            <TabsTrigger value="import">Import Data</TabsTrigger>
            <TabsTrigger value="setup">Setup Guide</TabsTrigger>
            <TabsTrigger value="history">Import History</TabsTrigger>
          </TabsList>

          <TabsContent value="import" className="space-y-6">
            {/* Import Configuration */}
            <Card>
              <CardHeader>
                <CardTitle>Import Configuration</CardTitle>
                <CardDescription>
                  Configure Google Sheets import settings and test connection
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="spreadsheetId">Google Sheets URL or Spreadsheet ID</Label>
                  <Input
                    id="spreadsheetId"
                    value={spreadsheetId}
                    onChange={(e) => setSpreadsheetId(extractSpreadsheetId(e.target.value))}
                    placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Paste the full Google Sheets URL or just the spreadsheet ID
                  </p>
                </div>

                <div>
                  <Label htmlFor="range">Data Range</Label>
                  <Input
                    id="range"
                    value={range}
                    onChange={(e) => setRange(e.target.value)}
                    placeholder="Sheet1!A1:Z1000"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Specify the sheet name and cell range (e.g., Sheet1!A1:Z1000)
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => testConnectionMutation.mutate()}
                    disabled={testConnectionMutation.isPending || !spreadsheetId}
                  >
                    <TestTube className="h-4 w-4 mr-2" />
                    {testConnectionMutation.isPending ? "Testing..." : "Test Connection"}
                  </Button>
                  <Button
                    onClick={handleImport}
                    disabled={isImporting || !spreadsheetId || !testResult?.success}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {isImporting ? "Importing..." : "Import Data"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Test Results */}
            {testResult && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    {testResult.success ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                    <span>Connection Test Results</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {testResult.success ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium">Total Rows</p>
                          <p className="text-2xl font-bold text-green-600">{testResult.rowCount}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Columns Detected</p>
                          <p className="text-2xl font-bold text-blue-600">{testResult.headers.length}</p>
                        </div>
                      </div>
                      
                      {testResult.headers.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2">Column Headers</p>
                          <div className="flex flex-wrap gap-1">
                            {testResult.headers.map((header, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {header}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{testResult.error}</AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Import Results */}
            {lastImportResult && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Database className="h-5 w-5 text-blue-600" />
                    <span>Last Import Results</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{lastImportResult.imported}</p>
                      <p className="text-sm text-muted-foreground">Imported</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-yellow-600">{lastImportResult.skipped}</p>
                      <p className="text-sm text-muted-foreground">Skipped</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-600">{lastImportResult.errors.length}</p>
                      <p className="text-sm text-muted-foreground">Errors</p>
                    </div>
                  </div>

                  {lastImportResult.errors.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Import Errors</p>
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 max-h-32 overflow-y-auto">
                        {lastImportResult.errors.map((error, index) => (
                          <p key={index} className="text-xs text-red-700 mb-1">{error}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="setup" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Setup Instructions</CardTitle>
                <CardDescription>
                  Configure Google Sheets integration for your organization
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">1. Prepare Your Google Sheet</h3>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                      <li>Create a Google Sheet with incident data</li>
                      <li>Include column headers in the first row</li>
                      <li>Use recognizable column names like "Title", "Description", "Type", "Priority"</li>
                      <li>Ensure data is consistently formatted</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">2. Share Your Sheet</h3>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                      <li>Share the sheet with the service account email</li>
                      <li>Grant "Viewer" permissions (read-only access)</li>
                      <li>Alternatively, make the sheet publicly readable</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">3. Supported Column Mappings</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-medium">Incident Information</p>
                        <ul className="text-muted-foreground ml-4">
                          <li>• Title, Subject, Incident Title</li>
                          <li>• Description, Details, Notes</li>
                          <li>• Type, Category, Classification</li>
                          <li>• Priority, Severity, Urgency</li>
                        </ul>
                      </div>
                      <div>
                        <p className="font-medium">Location & Reporter</p>
                        <ul className="text-muted-foreground ml-4">
                          <li>• Location, Address, Place</li>
                          <li>• Parish, District, Region</li>
                          <li>• Reporter, Observer, Name</li>
                          <li>• Contact, Phone, Email</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">4. Data Processing</h3>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                      <li>Duplicate incidents are automatically detected and skipped</li>
                      <li>Missing polling stations will be created automatically</li>
                      <li>External reporters get temporary accounts</li>
                      <li>All imports are logged for audit purposes</li>
                    </ul>
                  </div>
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    For security, this integration only reads data from Google Sheets. No data is written back to your sheets.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5" />
                  <span>Import History</span>
                </CardTitle>
                <CardDescription>
                  Recent Google Sheets import activities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Import history will appear here after you perform imports</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}