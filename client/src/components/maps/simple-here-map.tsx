import { useEffect, useRef, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

interface SimpleHereMapProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  width?: string;
  height?: string;
  markers?: Array<{
    lat: number;
    lng: number;
    title?: string;
    info?: string;
  }>;
}

export default function SimpleHereMap({
  center = { lat: 18.1096, lng: -77.2975 },
  zoom = 10,
  width = "100%",
  height = "400px",
  markers = []
}: SimpleHereMapProps) {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/settings/here-api')
      .then(res => res.json())
      .then(data => {
        if (data.hasKey && data.apiKey) {
          setApiKey(data.apiKey);
        } else {
          setError("HERE API key not configured");
        }
      })
      .catch(() => setError("Failed to load HERE API configuration"));
  }, []);

  if (error) {
    return (
      <div style={{ width, height }} className="border rounded-lg">
        <Alert className="h-full">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!apiKey) {
    return (
      <div 
        style={{ width, height }} 
        className="border rounded-lg flex items-center justify-center bg-gray-50"
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Loading HERE Map...</p>
        </div>
      </div>
    );
  }

  // Generate markers parameter for HERE Map Embed API
  const markersParam = markers.map(marker => 
    `${marker.lat},${marker.lng}`
  ).join('|');

  const embedUrl = `https://image.maps.ls.hereapi.com/mia/1.6/mapview?` +
    `apikey=${apiKey}&` +
    `c=${center.lat},${center.lng}&` +
    `z=${zoom}&` +
    `w=${parseInt(width.toString()) || 800}&` +
    `h=${parseInt(height.toString()) || 400}&` +
    `t=0&` +
    `ppi=320&` +
    (markersParam ? `poi=${markersParam}&` : '') +
    `poitxs=12&` +
    `poitxc=white&` +
    `poifc=red&` +
    `fmt=png`;

  return (
    <div style={{ width, height }} className="border rounded-lg overflow-hidden">
      <img 
        src={embedUrl}
        alt="HERE Map"
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        onError={() => setError("Failed to load map image")}
      />
      
      {/* Overlay with station info */}
      {markers.length > 0 && (
        <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm rounded-lg p-2 text-xs">
          <p className="font-medium">{markers.length} polling station{markers.length !== 1 ? 's' : ''}</p>
        </div>
      )}
    </div>
  );
}