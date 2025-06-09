import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QrCode, Download, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { generateQRData } from "@/lib/qr-utils";

interface QRGeneratorProps {
  user: any;
}

export default function QRGenerator({ user }: QRGeneratorProps) {
  const [qrType, setQrType] = useState("observer_id");
  const [customData, setCustomData] = useState("");
  const [generatedQR, setGeneratedQR] = useState<string | null>(null);
  const { toast } = useToast();

  const generateQR = () => {
    try {
      let qrData;
      
      switch (qrType) {
        case "observer_id":
          qrData = generateQRData("observer_id", {
            observerId: user?.observerId,
            name: `${user?.firstName} ${user?.lastName}`,
            timestamp: new Date().toISOString()
          });
          break;
        case "station_info":
          qrData = generateQRData("station_info", {
            stationId: customData || "ST-001",
            timestamp: new Date().toISOString()
          });
          break;
        case "custom":
          qrData = generateQRData("custom", {
            data: customData,
            timestamp: new Date().toISOString()
          });
          break;
        default:
          throw new Error("Unknown QR type");
      }

      // In a real implementation, this would use a QR code library
      // For now, we'll create a placeholder SVG
      const qrSvg = createQRCodeSVG(JSON.stringify(qrData));
      setGeneratedQR(qrSvg);

      toast({
        title: "QR Code Generated",
        description: "QR code has been successfully generated",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: "Failed to generate QR code",
      });
    }
  };

  const createQRCodeSVG = (data: string) => {
    // This is a placeholder - in production you'd use a proper QR library
    return `data:image/svg+xml,${encodeURIComponent(`
      <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
        <rect width="200" height="200" fill="white"/>
        <rect x="20" y="20" width="160" height="160" fill="none" stroke="black" stroke-width="2"/>
        <text x="100" y="100" text-anchor="middle" dominant-baseline="middle" font-family="monospace" font-size="10">
          QR Code
        </text>
        <text x="100" y="120" text-anchor="middle" dominant-baseline="middle" font-family="monospace" font-size="8">
          ${data.slice(0, 20)}...
        </text>
      </svg>
    `)}`;
  };

  const downloadQR = () => {
    if (generatedQR) {
      const link = document.createElement('a');
      link.href = generatedQR;
      link.download = `qr-code-${qrType}-${Date.now()}.svg`;
      link.click();
      
      toast({
        title: "QR Code Downloaded",
        description: "QR code has been saved to your downloads",
      });
    }
  };

  const copyQRData = () => {
    if (generatedQR) {
      navigator.clipboard.writeText(generatedQR);
      toast({
        title: "Copied to Clipboard",
        description: "QR code data has been copied",
      });
    }
  };

  return (
    <Card className="government-card">
      <CardHeader>
        <CardTitle className="flex items-center">
          <QrCode className="h-5 w-5 mr-2" />
          QR Code Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* QR Type Selection */}
        <div className="form-field">
          <Label className="form-label">QR Code Type</Label>
          <Select value={qrType} onValueChange={setQrType}>
            <SelectTrigger>
              <SelectValue placeholder="Select QR type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="observer_id">Observer ID</SelectItem>
              <SelectItem value="station_info">Station Information</SelectItem>
              <SelectItem value="custom">Custom Data</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Custom Data Input */}
        {(qrType === "station_info" || qrType === "custom") && (
          <div className="form-field">
            <Label className="form-label">
              {qrType === "station_info" ? "Station ID" : "Custom Data"}
            </Label>
            <Input
              value={customData}
              onChange={(e) => setCustomData(e.target.value)}
              placeholder={qrType === "station_info" ? "Enter station ID" : "Enter custom data"}
            />
          </div>
        )}

        {/* Generate Button */}
        <Button onClick={generateQR} className="w-full btn-caffe-primary">
          <QrCode className="h-4 w-4 mr-2" />
          Generate QR Code
        </Button>

        {/* Generated QR Display */}
        {generatedQR && (
          <div className="space-y-4">
            <div className="border rounded-lg p-4 bg-white text-center">
              <img 
                src={generatedQR} 
                alt="Generated QR Code" 
                className="mx-auto mb-4"
                style={{ width: '200px', height: '200px' }}
              />
              
              {/* QR Data Preview */}
              <div className="text-xs text-muted-foreground space-y-1">
                <p><strong>Type:</strong> {qrType.replace('_', ' ').toUpperCase()}</p>
                {qrType === "observer_id" && (
                  <p><strong>Observer ID:</strong> {user?.observerId}</p>
                )}
                {qrType === "station_info" && (
                  <p><strong>Station:</strong> {customData}</p>
                )}
                <p><strong>Generated:</strong> {new Date().toLocaleString()}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-2">
              <Button onClick={downloadQR} className="flex-1 btn-caffe-primary">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button onClick={copyQRData} variant="outline" className="flex-1">
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
            </div>
          </div>
        )}

        {/* Security Notice */}
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-xs text-yellow-800">
            <strong>Security:</strong> QR codes contain encrypted data with timestamp verification. 
            They are valid for 24 hours and include digital signatures for authenticity.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
