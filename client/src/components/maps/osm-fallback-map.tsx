import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, Plus, Minus } from "lucide-react";

interface OSMFallbackMapProps {
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

export default function OSMFallbackMap({
  center = { lat: 18.1096, lng: -77.2975 },
  zoom = 10,
  width = "100%",
  height = "400px",
  markers = [],
  onLocationSelect,
  interactive = true
}: OSMFallbackMapProps) {
  const [currentCenter, setCurrentCenter] = useState(center);
  const [currentZoom, setCurrentZoom] = useState(zoom);
  const [selectedMarker, setSelectedMarker] = useState<number | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Calculate tile coordinates for the given lat/lng and zoom
  const getTileCoords = (lat: number, lng: number, z: number) => {
    const x = Math.floor((lng + 180) / 360 * Math.pow(2, z));
    const y = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, z));
    return { x, y };
  };

  // Convert lat/lng to pixel coordinates relative to the map
  const latLngToPixel = (lat: number, lng: number) => {
    const mapWidth = 800;
    const mapHeight = 600;
    
    // Simple mercator projection
    const x = ((lng + 180) / 360) * mapWidth;
    const latRad = lat * Math.PI / 180;
    const mercN = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
    const y = (mapHeight / 2) - (mapWidth * mercN / (2 * Math.PI));
    
    return { x, y };
  };

  const generateTileUrl = () => {
    const tileSize = 256;
    const mapWidth = Math.min(parseInt(width.toString()) || 800, 1024);
    const mapHeight = Math.min(parseInt(height.toString()) || 400, 600);
    
    // Calculate center tile
    const centerTile = getTileCoords(currentCenter.lat, currentCenter.lng, currentZoom);
    
    // For simplicity, use a single tile centered on the view
    return `https://tile.openstreetmap.org/${currentZoom}/${centerTile.x}/${centerTile.y}.png`;
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

    // Calculate approximate lat/lng based on map bounds
    const latRange = 360 / Math.pow(2, currentZoom);
    const lngRange = 360 / Math.pow(2, currentZoom);

    const lat = currentCenter.lat + (0.5 - y / mapHeight) * latRange * 0.7;
    const lng = currentCenter.lng + (x / mapWidth - 0.5) * lngRange;

    onLocationSelect(lat, lng);
  };

  const zoomIn = () => {
    setCurrentZoom(prev => Math.min(prev + 1, 18));
  };

  const zoomOut = () => {
    setCurrentZoom(prev => Math.max(prev - 1, 1));
  };

  const panTo = (lat: number, lng: number) => {
    setCurrentCenter({ lat, lng });
  };

  return (
    <div style={{ width, height }} className="border rounded-lg relative overflow-hidden bg-blue-50">
      {/* Map Background */}
      <div 
        ref={mapContainerRef}
        className="w-full h-full relative cursor-crosshair"
        onClick={handleMapClick}
        style={{
          backgroundImage: `url(${generateTileUrl()})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        {/* Fallback pattern when tile fails */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-green-100 opacity-30"></div>
        
        {/* Grid overlay to show map structure */}
        <div className="absolute inset-0">
          <svg width="100%" height="100%" className="opacity-20">
            <defs>
              <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#2563eb" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Markers */}
        {markers.map((marker, index) => {
          const markerPos = latLngToPixel(marker.lat, marker.lng);
          const mapRect = mapContainerRef.current?.getBoundingClientRect();
          if (!mapRect) return null;

          // Position relative to current center
          const centerPos = latLngToPixel(currentCenter.lat, currentCenter.lng);
          const x = (markerPos.x - centerPos.x) + mapRect.width / 2;
          const y = (markerPos.y - centerPos.y) + mapRect.height / 2;

          // Only show markers within the visible area
          if (x < -20 || x > mapRect.width + 20 || y < -20 || y > mapRect.height + 20) {
            return null;
          }

          return (
            <div
              key={index}
              className="absolute transform -translate-x-1/2 -translate-y-full cursor-pointer z-10"
              style={{ left: x, top: y }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedMarker(index);
              }}
            >
              <MapPin className="h-6 w-6 text-red-500 drop-shadow-lg" fill="red" />
              {selectedMarker === index && marker.title && (
                <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg p-2 text-xs whitespace-nowrap">
                  <div className="font-medium">{marker.title}</div>
                  {marker.info && <div className="text-gray-600">{marker.info}</div>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Map Controls */}
      {interactive && (
        <div className="absolute top-4 right-4 flex flex-col gap-2">
          <Button
            size="sm"
            variant="outline"
            className="bg-white/90 backdrop-blur-sm w-8 h-8 p-0"
            onClick={zoomIn}
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="bg-white/90 backdrop-blur-sm w-8 h-8 p-0"
            onClick={zoomOut}
          >
            <Minus className="h-4 w-4" />
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
                  Jamaica
                </Button>
              )}
            </div>
            
            <div className="text-xs text-gray-600 mb-2">
              Zoom: {currentZoom} | Center: {currentCenter.lat.toFixed(4)}, {currentCenter.lng.toFixed(4)}
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              {markers.slice(0, 4).map((marker, index) => (
                <button
                  key={index}
                  className={`text-left p-2 rounded transition-colors ${
                    selectedMarker === index 
                      ? 'bg-blue-100 border border-blue-300' 
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                  onClick={() => {
                    panTo(marker.lat, marker.lng);
                    setSelectedMarker(index);
                    setCurrentZoom(Math.max(currentZoom, 14));
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
            Click to select location
          </div>
        </div>
      )}

      {/* Map attribution */}
      <div className="absolute bottom-1 right-1 text-xs text-gray-500 bg-white/80 px-1">
        Jamaica Electoral Map
      </div>
    </div>
  );
}