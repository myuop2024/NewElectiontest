import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Camera, Square, RotateCcw } from "lucide-react";
import QrScanner from "qr-scanner";

interface QRReaderProps {
  onScanSuccess: (data: string) => void;
  onScanError: (error: string) => void;
}

export default function QRReader({ onScanSuccess, onScanError }: QRReaderProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);

  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, []);

  const startScanning = async () => {
    try {
      if (!videoRef.current) return;

      const qrScanner = new QrScanner(
        videoRef.current,
        (result) => {
          onScanSuccess(result.data);
          stopScanning();
        },
        {
          returnDetailedScanResult: true,
          highlightScanRegion: true,
          highlightCodeOutline: true,
          preferredCamera: 'environment'
        }
      );

      qrScannerRef.current = qrScanner;
      await qrScanner.start();
      setIsScanning(true);
      setHasPermission(true);

    } catch (error) {
      console.error('Failed to start QR scanner:', error);
      setHasPermission(false);
      onScanError('Camera access denied or QR scanner not available');
    }
  };

  const stopScanning = () => {
    if (qrScannerRef.current) {
      qrScannerRef.current.stop();
      qrScannerRef.current.destroy();
      qrScannerRef.current = null;
    }
    setIsScanning(false);
  };

  const resetCamera = () => {
    stopScanning();
    setTimeout(startScanning, 100);
  };

  return (
    <div className="space-y-4">
      {/* Camera View */}
      <div className="relative w-full h-64 bg-gray-900 rounded-lg overflow-hidden">
        {isScanning ? (
          <>
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              autoPlay
              muted
              playsInline
            />
            
            {/* Scanning Overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-48 h-48 border-2 border-white relative">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary"></div>
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary"></div>
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary"></div>
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary"></div>
                
                {/* Scanning line animation */}
                <div className="absolute top-0 left-0 w-full h-1 bg-primary animate-pulse"></div>
              </div>
            </div>

            {/* Scanning indicator */}
            <div className="absolute top-4 left-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Scanning...</span>
              </div>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white">
            <div className="text-center">
              <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm opacity-75">Camera will appear here</p>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex space-x-2">
        {!isScanning ? (
          <Button onClick={startScanning} className="flex-1 btn-caffe-primary">
            <Camera className="h-4 w-4 mr-2" />
            Start Camera
          </Button>
        ) : (
          <>
            <Button onClick={stopScanning} variant="outline" className="flex-1">
              <Square className="h-4 w-4 mr-2" />
              Stop Scanning
            </Button>
            <Button onClick={resetCamera} variant="outline">
              <RotateCcw className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      {/* Permissions */}
      {hasPermission === false && (
        <Alert variant="destructive">
          <Camera className="h-4 w-4" />
          <AlertDescription>
            Camera access is required to scan QR codes. Please allow camera permissions and try again.
          </AlertDescription>
        </Alert>
      )}

      {/* Instructions */}
      <Alert>
        <Camera className="h-4 w-4" />
        <AlertDescription>
          Position the QR code within the scanning frame. The camera will automatically detect and process the code.
        </AlertDescription>
      </Alert>
    </div>
  );
}
