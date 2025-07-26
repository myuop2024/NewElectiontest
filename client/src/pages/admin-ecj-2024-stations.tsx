/**
 * Admin ECJ 2024 Polling Stations Management
 * Extract and manage authentic 2024 ECJ polling stations as test data
 */

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { LoaderIcon, MapPinIcon, TrashIcon, DownloadIcon } from "lucide-react";

interface ExtractionStats {
  totalStations: number;
  testDataStations: number;
  productionStations: number;
  testStationsByParish: Record<string, number>;
  hasTestData: boolean;
}

export default function AdminECJ2024Stations() {
  const [isExtracting, setIsExtracting] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [extractionStats, setExtractionStats] = useState<ExtractionStats | null>(null);
  const [extractionResults, setExtractionResults] = useState<any>(null);
  const { toast } = useToast();

  // Fetch extraction status
  const fetchExtractionStatus = async () => {
    try {
      console.log('[ECJ 2024] Fetching extraction status...');
      const response = await apiRequest('GET', '/api/ecj-2024-stations/extraction-status');
      const data = await response.json();
      console.log('[ECJ 2024] Status response:', data);
      if (data.success) {
        setExtractionStats(data.statistics);
      }
    } catch (error) {
      console.error('[ECJ 2024] Error fetching extraction status:', error);
    }
  };

  // Extract 2024 polling stations
  const handleExtraction = async () => {
    setIsExtracting(true);
    try {
      console.log('[ECJ 2024] Starting extraction...');
      const response = await apiRequest('POST', '/api/ecj-2024-stations/extract-2024-stations', {});
      const data = await response.json();

      console.log('[ECJ 2024] Extraction response:', data);

      if (data.success) {
        setExtractionResults(data.data);
        toast({
          title: "Extraction Successful",
          description: `Extracted ${data.data.totalInserted} authentic 2024 ECJ polling stations`,
        });
        await fetchExtractionStatus();
      } else {
        console.error('[ECJ 2024] Extraction failed:', data);
        throw new Error(data.error || 'Extraction failed');
      }
    } catch (error: any) {
      console.error('[ECJ 2024] Extraction error:', error);
      toast({
        title: "Extraction Failed",
        description: error.message || "Failed to extract 2024 polling stations",
        variant: "destructive"
      });
    } finally {
      setIsExtracting(false);
    }
  };

  // Remove all test data
  const handleRemoveTestData = async () => {
    if (!confirm('Are you sure you want to remove ALL test data polling stations? This cannot be undone.')) {
      return;
    }

    setIsRemoving(true);
    try {
      const response = await apiRequest('DELETE', '/api/ecj-2024-stations/remove-test-data', {});
      const data = await response.json();

      if (data.success) {
        toast({
          title: "Test Data Removed",
          description: `Removed ${data.removedCount} test data polling stations`,
        });
        setExtractionResults(null);
        await fetchExtractionStatus();
      } else {
        throw new Error(data.error || 'Failed to remove test data');
      }
    } catch (error: any) {
      toast({
        title: "Removal Failed",
        description: error.message || "Failed to remove test data",
        variant: "destructive"
      });
    } finally {
      setIsRemoving(false);
    }
  };

  // Initial load
  React.useEffect(() => {
    fetchExtractionStatus();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">ECJ 2024 Polling Stations</h1>
        <p className="text-muted-foreground">
          Extract authentic 2024 ECJ polling stations as removable test data for system testing
        </p>
      </div>

      {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle>Current System Status</CardTitle>
          <CardDescription>Overview of polling stations in the system</CardDescription>
        </CardHeader>
        <CardContent>
          {extractionStats ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{extractionStats.totalStations}</div>
                <div className="text-sm text-muted-foreground">Total Stations</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{extractionStats.testDataStations}</div>
                <div className="text-sm text-muted-foreground">Test Data Stations</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{extractionStats.productionStations}</div>
                <div className="text-sm text-muted-foreground">Production Stations</div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <LoaderIcon className="h-6 w-6 animate-spin mx-auto mb-2" />
              <p>Loading system status...</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test Data by Parish */}
      {extractionStats?.hasTestData && (
        <Card>
          <CardHeader>
            <CardTitle>Test Data Distribution</CardTitle>
            <CardDescription>Polling stations by parish (test data only)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(extractionStats.testStationsByParish).map(([parish, count]) => (
                <div key={parish} className="flex items-center justify-between p-3 border rounded">
                  <span className="font-medium">{parish}</span>
                  <Badge variant="secondary">{count} stations</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Extract Stations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DownloadIcon className="h-5 w-5" />
              Extract 2024 ECJ Stations
            </CardTitle>
            <CardDescription>
              Download and populate authentic polling stations from 2024 ECJ election documents
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleExtraction} 
              disabled={isExtracting}
              className="w-full"
            >
              {isExtracting ? (
                <>
                  <LoaderIcon className="h-4 w-4 animate-spin mr-2" />
                  Extracting...
                </>
              ) : (
                <>
                  <MapPinIcon className="h-4 w-4 mr-2" />
                  Extract 2024 Stations
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              This will extract polling stations from authentic ECJ 2024 documents and mark them as removable test data.
            </p>
          </CardContent>
        </Card>

        {/* Remove Test Data */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrashIcon className="h-5 w-5" />
              Remove Test Data
            </CardTitle>
            <CardDescription>
              Remove all test data polling stations from the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleRemoveTestData} 
              disabled={isRemoving || !extractionStats?.hasTestData}
              variant="destructive"
              className="w-full"
            >
              {isRemoving ? (
                <>
                  <LoaderIcon className="h-4 w-4 animate-spin mr-2" />
                  Removing...
                </>
              ) : (
                <>
                  <TrashIcon className="h-4 w-4 mr-2" />
                  Remove All Test Data
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              This will permanently remove all polling stations marked as test data. This action cannot be undone.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Extraction Results */}
      {extractionResults && (
        <Card>
          <CardHeader>
            <CardTitle>Last Extraction Results</CardTitle>
            <CardDescription>Details from the most recent extraction</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium">Total Extracted</div>
                  <div className="text-2xl font-bold">{extractionResults.totalExtracted}</div>
                </div>
                <div>
                  <div className="text-sm font-medium">Total Inserted</div>
                  <div className="text-2xl font-bold text-green-600">{extractionResults.totalInserted}</div>
                </div>
                <div>
                  <div className="text-sm font-medium">Parishes Covered</div>
                  <div className="text-2xl font-bold">{extractionResults.parishes}</div>
                </div>
                <div>
                  <div className="text-sm font-medium">Document Source</div>
                  <div className="text-sm">{extractionResults.documentSource}</div>
                </div>
              </div>
              
              <div>
                <div className="text-sm font-medium mb-2">Extraction Date</div>
                <Badge variant="outline">
                  {new Date(extractionResults.extractionDate).toLocaleString()}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}