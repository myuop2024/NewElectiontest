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

  // Convert lat/lng to pixel coordinates relative to the map using proper mercator projection
  const latLngToPixel = (lat: number, lng: number, mapWidth: number, mapHeight: number) => {
    // Web Mercator projection
    const scale = Math.pow(2, currentZoom);
    const worldWidth = 256 * scale;
    const worldHeight = 256 * scale;
    
    // Convert to world coordinates
    const worldX = ((lng + 180) / 360) * worldWidth;
    const latRad = lat * Math.PI / 180;
    const worldY = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * worldHeight;
    
    // Get center world coordinates
    const centerWorldX = ((currentCenter.lng + 180) / 360) * worldWidth;
    const centerLatRad = currentCenter.lat * Math.PI / 180;
    const centerWorldY = ((1 - Math.log(Math.tan(centerLatRad) + 1 / Math.cos(centerLatRad)) / Math.PI) / 2) * worldHeight;
    
    // Convert to screen coordinates
    const x = mapWidth / 2 + (worldX - centerWorldX);
    const y = mapHeight / 2 + (worldY - centerWorldY);
    
    return { x, y };
  };

  const generateTileUrl = () => {
    const mapWidth = Math.min(parseInt(width.toString()) || 800, 1024);
    const mapHeight = Math.min(parseInt(height.toString()) || 400, 600);
    
    // Calculate how many tiles we need to cover the view
    const tilesX = Math.ceil(mapWidth / 256) + 1;
    const tilesY = Math.ceil(mapHeight / 256) + 1;
    
    // Calculate center tile
    const centerTile = getTileCoords(currentCenter.lat, currentCenter.lng, currentZoom);
    
    // Generate tile grid
    const tiles = [];
    const startX = centerTile.x - Math.floor(tilesX / 2);
    const startY = centerTile.y - Math.floor(tilesY / 2);
    
    for (let y = 0; y < tilesY; y++) {
      for (let x = 0; x < tilesX; x++) {
        const tileX = startX + x;
        const tileY = startY + y;
        tiles.push({
          url: `https://tile.openstreetmap.org/${currentZoom}/${tileX}/${tileY}.png`,
          x: x * 256 - 128,
          y: y * 256 - 128
        });
      }
    }
    
    return tiles;
  };

  const handleMapClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive || !onLocationSelect) return;

    const rect = mapContainerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Convert pixel coordinates to lat/lng using proper projection
    const scale = Math.pow(2, currentZoom);
    const worldWidth = 256 * scale;
    const worldHeight = 256 * scale;
    
    // Calculate world coordinates of the center
    const centerWorldX = ((currentCenter.lng + 180) / 360) * worldWidth;
    const centerLatRad = currentCenter.lat * Math.PI / 180;
    const centerWorldY = ((1 - Math.log(Math.tan(centerLatRad) + 1 / Math.cos(centerLatRad)) / Math.PI) / 2) * worldHeight;
    
    // Calculate world coordinates of clicked point
    const clickWorldX = centerWorldX + (x - rect.width / 2);
    const clickWorldY = centerWorldY + (y - rect.height / 2);
    
    // Convert back to lat/lng
    const lng = (clickWorldX / worldWidth) * 360 - 180;
    const n = Math.PI - 2 * Math.PI * clickWorldY / worldHeight;
    const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));

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

  // Enhanced panning controls
  const panNorth = () => {
    const latOffset = 0.01 * Math.pow(2, Math.max(0, 10 - currentZoom));
    setCurrentCenter(prev => ({ ...prev, lat: prev.lat + latOffset }));
  };

  const panSouth = () => {
    const latOffset = 0.01 * Math.pow(2, Math.max(0, 10 - currentZoom));
    setCurrentCenter(prev => ({ ...prev, lat: prev.lat - latOffset }));
  };

  const panEast = () => {
    const lngOffset = 0.01 * Math.pow(2, Math.max(0, 10 - currentZoom));
    setCurrentCenter(prev => ({ ...prev, lng: prev.lng + lngOffset }));
  };

  const panWest = () => {
    const lngOffset = 0.01 * Math.pow(2, Math.max(0, 10 - currentZoom));
    setCurrentCenter(prev => ({ ...prev, lng: prev.lng - lngOffset }));
  };

  const tiles = generateTileUrl();

  return (
    <div style={{ width, height }} className="border rounded-lg relative overflow-hidden bg-blue-50">
      {/* Map with Multiple Tiles */}
      <div 
        ref={mapContainerRef}
        className="w-full h-full relative cursor-crosshair"
        onClick={handleMapClick}
        style={{ position: 'relative' }}
      >
        {/* High-quality tile grid */}
        {tiles.map((tile, index) => (
          <img
            key={index}
            src={tile.url}
            alt={`Map tile ${index}`}
            className="absolute"
            style={{
              left: tile.x,
              top: tile.y,
              width: '256px',
              height: '256px'
            }}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
        ))}
        
        {/* Jamaica coastline overlay for context */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <svg width="100%" height="100%" viewBox="0 0 100 100">
            <path
              d="M10,40 Q20,35 35,38 Q50,40 65,42 Q80,44 90,40 Q85,50 80,55 Q70,60 55,58 Q40,56 25,54 Q15,52 10,45 Z"
              fill="none"
              stroke="#2563eb"
              strokeWidth="0.5"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>
        
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

        {/* Enhanced Polling Station Markers */}
        {markers.map((marker, index) => {
          const mapRect = mapContainerRef.current?.getBoundingClientRect();
          if (!mapRect) return null;
          
          const markerPos = latLngToPixel(marker.lat, marker.lng, mapRect.width, mapRect.height);
          const x = markerPos.x;
          const y = markerPos.y;

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