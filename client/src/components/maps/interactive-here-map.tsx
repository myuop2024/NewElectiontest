import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, MapPin, Navigation } from "lucide-react";

interface InteractiveHereMapProps {
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
  onLocationSelect?: (lat: number, lng: number) => void;
  interactive?: boolean;
}

export default function InteractiveHereMap({
  center = { lat: 18.1096, lng: -77.2975 },
  zoom = 10,
  width = "100%",
  height = "400px",
  markers = [],
  onLocationSelect,
  interactive = true
}: InteractiveHereMapProps) {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentCenter, setCurrentCenter] = useState(center);
  const [currentZoom, setCurrentZoom] = useState(zoom);
  const [selectedMarker, setSelectedMarker] = useState<number | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

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

  const generateMapUrl = () => {
    if (!apiKey) return '';

    const mapWidth = Math.min(parseInt(width.toString()) || 800, 1024);
    const mapHeight = Math.min(parseInt(height.toString()) || 400, 1024);

    // Simplified map without markers to avoid rate limits
    return `https://image.maps.ls.hereapi.com/mia/1.6/mapview?` +
      `apikey=${apiKey}&` +
      `c=${currentCenter.lat},${currentCenter.lng}&` +
      `z=${currentZoom}&` +
      `w=${mapWidth}&` +
      `h=${mapHeight}&` +
      `t=0&` +
      `fmt=png`;
  };

  const handleMapClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive || !onLocationSelect) return;

    const rect = mapContainerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Convert pixel coordinates to lat/lng (approximation)
    const mapWidth = rect.width;
    const mapHeight = rect.height;

    // Calculate the approximate bounds based on zoom level
    const latRange = 180 / Math.pow(2, currentZoom);
    const lngRange = 360 / Math.pow(2, currentZoom);

    const lat = currentCenter.lat + (0.5 - y / mapHeight) * latRange;
    const lng = currentCenter.lng + (x / mapWidth - 0.5) * lngRange;

    onLocationSelect(lat, lng);
  };

  const zoomIn = () => {
    setCurrentZoom(prev => Math.min(prev + 1, 20));
  };

  const zoomOut = () => {
    setCurrentZoom(prev => Math.max(prev - 1, 1));
  };

  const panTo = (lat: number, lng: number) => {
    setCurrentCenter({ lat, lng });
  };

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

  return (
    <div style={{ width, height }} className="border rounded-lg relative overflow-hidden">
      {/* Map Image */}
      <div 
        ref={mapContainerRef}
        className="w-full h-full cursor-crosshair"
        onClick={handleMapClick}
      >
        <img 
          src={generateMapUrl()}
          alt="HERE Map"
          className="w-full h-full object-cover"
          onError={() => setError("Failed to load map image")}
        />
      </div>

      {/* Map Controls */}
      {interactive && (
        <div className="absolute top-4 right-4 flex flex-col gap-2">
          <Button
            size="sm"
            variant="outline"
            className="bg-white/90 backdrop-blur-sm"
            onClick={zoomIn}
          >
            +
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="bg-white/90 backdrop-blur-sm"
            onClick={zoomOut}
          >
            -
          </Button>
        </div>
      )}

      {/* Station Info Overlay */}
      {markers.length > 0 && (
        <div className="absolute bottom-4 left-4 right-4">
          <div className="bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-red-500" />
                <span className="font-medium text-sm">
                  {markers.length} Polling Station{markers.length !== 1 ? 's' : ''}
                </span>
              </div>
              {interactive && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => panTo(18.1096, -77.2975)}
                >
                  <Navigation className="h-3 w-3 mr-1" />
                  Center Jamaica
                </Button>
              )}
            </div>
            
            {selectedMarker !== null && markers[selectedMarker] && (
              <div className="border-t pt-2">
                <h4 className="font-medium text-sm">{markers[selectedMarker].title}</h4>
                {markers[selectedMarker].info && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {markers[selectedMarker].info}
                  </p>
                )}
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-2 mt-2">
              {markers.slice(0, 4).map((marker, index) => (
                <button
                  key={index}
                  className="text-left p-2 rounded bg-gray-50 hover:bg-gray-100 transition-colors"
                  onClick={() => {
                    panTo(marker.lat, marker.lng);
                    setSelectedMarker(index);
                    setCurrentZoom(14);
                  }}
                >
                  <div className="font-medium text-xs truncate">{marker.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {marker.lat.toFixed(4)}, {marker.lng.toFixed(4)}
                  </div>
                </button>
              ))}
            </div>
            
            {markers.length > 4 && (
              <div className="text-center mt-2">
                <span className="text-xs text-muted-foreground">
                  +{markers.length - 4} more stations
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Click instruction */}
      {interactive && onLocationSelect && (
        <div className="absolute top-4 left-4">
          <div className="bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 text-xs">
            Click map to select location
          </div>
        </div>
      )}
    </div>
  );
}