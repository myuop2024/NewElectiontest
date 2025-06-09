import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { QrCode, Camera, CheckCircle, AlertCircle, Download } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import QRGenerator from "@/components/qr/qr-generator";
import QRReader from "@/components/qr/qr-reader";

export default function QRScanner() {
  const [activeTab, setActiveTab] = useState<"generate" | "scan">("generate");
  const [scannedData, setScannedData] = useState<any>(null);
  const [scanHistory, setScanHistory] = useState<any[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleScanSuccess = (data: any) => {
    try {
      const qrData = JSON.parse(data);
      setScannedData(qrData);
      
      const scanRecord = {
        id: Date.now(),
        data: qrData,
        timestamp: new Date().toISOString(),
        scannedBy: user?.id,
        type: qrData.type || 'unknown'
      };
      
      setScanHistory(prev => [scanRecord, ...prev.slice(0, 9)]); // Keep last 10 scans
      
      toast({
        title: "QR Code Scanned",
        description: `Successfully scanned ${qrData.type || 'QR code'}`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Invalid QR Code",
        description: "The scanned QR code format is not recognized",
      });
    }
  };

  const handleScanError = (error: string) => {
    toast({
      variant: "destructive",
      title: "Scan Failed",
      description: error,
    });
  };

  const verifyObserverQR = (qrData: any) => {
    // In a real implementation, this would verify against the database
    if (qrData.type === 'observer_id' && qrData.observerId) {
      return {
        isValid: true,
        observerName: "John Smith", // Would come from database
        station: "Station 45A",
        status: "Active"
      };
    }
    return { isValid: false };
  };

  return (
    <div className="p-6 space-y-6 fade-in">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">QR Code Scanner</h2>
        <p className="text-muted-foreground">Generate and scan QR codes for observer verification</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
        <Button
          variant={activeTab === "generate" ? "default" : "ghost"}
          className={`flex-1 ${activeTab === "generate" ? "btn-caffe-primary" : ""}`}
          onClick={() => setActiveTab("generate")}
        >
          <QrCode className="h-4 w-4 mr-2" />
          Generate QR
        </Button>
        <Button
          variant={activeTab === "scan" ? "default" : "ghost"}
          className={`flex-1 ${activeTab === "scan" ? "btn-caffe-primary" : ""}`}
          onClick={() => setActiveTab("scan")}
        >
          <Camera className="h-4 w-4 mr-2" />
          Scan QR
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {activeTab === "generate" ? (
            <QRGenerator user={user} />
          ) : (
            <Card className="government-card">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Camera className="h-5 w-5 mr-2" />
                  QR Code Scanner
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <QRReader 
                  onScanSuccess={handleScanSuccess}
                  onScanError={handleScanError}
                />

                {/* Scanned Data Display */}
                {scannedData && (
                  <div className="space-y-4">
                    <h4 className="font-semibold">Scanned Data:</h4>
                    
                    {scannedData.type === 'observer_id' && (
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-start space-x-3">
                          <CheckCircle className="h-6 w-6 text-green-600 mt-1" />
                          <div className="flex-1">
                            <h5 className="font-medium text-blue-800">Observer Verification</h5>
                            <div className="mt-2 space-y-1 text-sm text-blue-700">
                              <p><strong>Observer ID:</strong> {scannedData.observerId}</p>
                              <p><strong>Name:</strong> {verifyObserverQR(scannedData).observerName || 'Unknown'}</p>
                              <p><strong>Status:</strong> 
                                <span className={`ml-1 px-2 py-1 rounded text-xs ${
                                  verifyObserverQR(scannedData).isValid 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {verifyObserverQR(scannedData).isValid ? 'Verified' : 'Invalid'}
                                </span>
                              </p>
                              <p><strong>Timestamp:</strong> {new Date(scannedData.timestamp).toLocaleString()}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {scannedData.type !== 'observer_id' && (
                      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                        <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                          {JSON.stringify(scannedData, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}

                {/* Manual Entry Option */}
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3">Manual Entry</h4>
                  <div className="space-y-3">
                    <div className="form-field">
                      <Label className="form-label">Observer ID</Label>
                      <Input 
                        placeholder="Enter 6-digit Observer ID"
                        maxLength={6}
                        pattern="[0-9]{6}"
                      />
                    </div>
                    <Button className="btn-caffe-primary">
                      Verify Observer
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Scan History */}
          <Card className="government-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Recent Scans</CardTitle>
            </CardHeader>
            <CardContent>
              {scanHistory.length === 0 ? (
                <div className="text-center py-4">
                  <QrCode className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No scans yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {scanHistory.map((scan) => (
                    <div key={scan.id} className="border rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-medium">
                          {scan.data.type === 'observer_id' ? 'Observer ID' : 'QR Code'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(scan.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      
                      {scan.data.observerId && (
                        <p className="text-sm text-muted-foreground">
                          ID: {scan.data.observerId}
                        </p>
                      )}
                      
                      <div className="flex items-center mt-2">
                        {verifyObserverQR(scan.data).isValid ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-red-600" />
                        )}
                        <span className={`text-xs ml-1 ${
                          verifyObserverQR(scan.data).isValid ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {verifyObserverQR(scan.data).isValid ? 'Verified' : 'Invalid'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="government-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full btn-caffe-primary">
                <Download className="h-4 w-4 mr-2" />
                Export Scan History
              </Button>
              
              <Button variant="outline" className="w-full">
                <QrCode className="h-4 w-4 mr-2" />
                Bulk Generate QR
              </Button>
              
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  QR codes are encrypted and contain timestamp verification for security.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
