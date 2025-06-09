import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, Plus, Minus, RotateCcw, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

interface EnhancedMapProps {
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

export default function EnhancedMap({
  center = { lat: 18.1096, lng: -77.2975 },
  zoom = 10,
  width = "100%",
  height = "400px",
  markers = [],
  onLocationSelect,
  interactive = true
}: EnhancedMapProps) {
  const [currentCenter, setCurrentCenter] = useState(center);
  const [currentZoom, setCurrentZoom] = useState(zoom);
  const [selectedMarker, setSelectedMarker] = useState<number | null>(null);
  const [showAllStations, setShowAllStations] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number; lat: number; lng: number } | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Web Mercator projection utilities
  const deg2rad = (deg: number) => deg * (Math.PI / 180);
  const rad2deg = (rad: number) => rad * (180 / Math.PI);

  const latLngToPixel = (lat: number, lng: number, mapWidth: number, mapHeight: number) => {
    const scale = Math.pow(2, currentZoom);
    const worldSize = 256 * scale;
    
    // Convert coordinates to world pixels
    const worldX = ((lng + 180) / 360) * worldSize;
    const latRad = deg2rad(lat);
    const worldY = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * worldSize;
    
    // Convert center to world pixels
    const centerWorldX = ((currentCenter.lng + 180) / 360) * worldSize;
    const centerLatRad = deg2rad(currentCenter.lat);
    const centerWorldY = ((1 - Math.log(Math.tan(centerLatRad) + 1 / Math.cos(centerLatRad)) / Math.PI) / 2) * worldSize;
    
    // Calculate screen position
    const x = mapWidth / 2 + (worldX - centerWorldX);
    const y = mapHeight / 2 + (worldY - centerWorldY);
    
    return { x, y };
  };

  const pixelToLatLng = (x: number, y: number, mapWidth: number, mapHeight: number) => {
    const scale = Math.pow(2, currentZoom);
    const worldSize = 256 * scale;
    
    // Convert center to world pixels
    const centerWorldX = ((currentCenter.lng + 180) / 360) * worldSize;
    const centerLatRad = deg2rad(currentCenter.lat);
    const centerWorldY = ((1 - Math.log(Math.tan(centerLatRad) + 1 / Math.cos(centerLatRad)) / Math.PI) / 2) * worldSize;
    
    // Calculate world coordinates of clicked point
    const worldX = centerWorldX + (x - mapWidth / 2);
    const worldY = centerWorldY + (y - mapHeight / 2);
    
    // Convert to lat/lng
    const lng = (worldX / worldSize) * 360 - 180;
    const n = Math.PI - 2 * Math.PI * worldY / worldSize;
    const lat = rad2deg(Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))));
    
    return { lat, lng };
  };

  const getTileGrid = () => {
    const mapWidth = 800;
    const mapHeight = 600;
    const tileSize = 256;
    
    // Calculate tiles needed
    const tilesX = Math.ceil(mapWidth / tileSize) + 2;
    const tilesY = Math.ceil(mapHeight / tileSize) + 2;
    
    // Calculate center tile
    const centerTileX = Math.floor(((currentCenter.lng + 180) / 360) * Math.pow(2, currentZoom));
    const centerTileY = Math.floor((1 - Math.log(Math.tan(deg2rad(currentCenter.lat)) + 1 / Math.cos(deg2rad(currentCenter.lat))) / Math.PI) / 2 * Math.pow(2, currentZoom));
    
    const tiles = [];
    const startX = centerTileX - Math.floor(tilesX / 2);
    const startY = centerTileY - Math.floor(tilesY / 2);
    
    for (let y = 0; y < tilesY; y++) {
      for (let x = 0; x < tilesX; x++) {
        const tileX = startX + x;
        const tileY = startY + y;
        
        // Calculate tile position on screen
        const tileWorldX = tileX * tileSize;
        const tileWorldY = tileY * tileSize;
        
        const centerWorldX = ((currentCenter.lng + 180) / 360) * Math.pow(2, currentZoom) * tileSize;
        const centerLatRad = deg2rad(currentCenter.lat);
        const centerWorldY = ((1 - Math.log(Math.tan(centerLatRad) + 1 / Math.cos(centerLatRad)) / Math.PI) / 2) * Math.pow(2, currentZoom) * tileSize;
        
        const screenX = mapWidth / 2 + (tileWorldX - centerWorldX);
        const screenY = mapHeight / 2 + (tileWorldY - centerWorldY);
        
        tiles.push({
          url: `https://tile.openstreetmap.org/${currentZoom}/${tileX}/${tileY}.png`,
          x: screenX,
          y: screenY,
          tileX,
          tileY
        });
      }
    }
    
    return tiles;
  };

  const handleMapClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive || !onLocationSelect || isDragging) return;

    const rect = mapContainerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const { lat, lng } = pixelToLatLng(x, y, rect.width, rect.height);
    onLocationSelect(lat, lng);
  };

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive) return;
    
    const rect = mapContainerRef.current?.getBoundingClientRect();
    if (!rect) return;

    setIsDragging(true);
    setDragStart({
      x: event.clientX,
      y: event.clientY,
      lat: currentCenter.lat,
      lng: currentCenter.lng
    });
    
    event.preventDefault();
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStart || !interactive) return;

    const rect = mapContainerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const deltaX = event.clientX - dragStart.x;
    const deltaY = event.clientY - dragStart.y;

    // Convert pixel movement to lat/lng delta
    const scale = Math.pow(2, currentZoom);
    const worldSize = 256 * scale;
    
    const lngDelta = -(deltaX / rect.width) * (360 / scale);
    const latDelta = (deltaY / rect.height) * (180 / scale);

    setCurrentCenter({
      lat: dragStart.lat + latDelta,
      lng: dragStart.lng + lngDelta
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragStart(null);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    setDragStart(null);
  };

  const zoomIn = () => setCurrentZoom(prev => Math.min(prev + 1, 18));
  const zoomOut = () => setCurrentZoom(prev => Math.max(prev - 1, 1));
  const panTo = (lat: number, lng: number) => setCurrentCenter({ lat, lng });

  const panDelta = 0.005 * Math.pow(2, Math.max(0, 12 - currentZoom));
  const panNorth = () => setCurrentCenter(prev => ({ ...prev, lat: prev.lat + panDelta }));
  const panSouth = () => setCurrentCenter(prev => ({ ...prev, lat: prev.lat - panDelta }));
  const panEast = () => setCurrentCenter(prev => ({ ...prev, lng: prev.lng + panDelta }));
  const panWest = () => setCurrentCenter(prev => ({ ...prev, lng: prev.lng - panDelta }));

  const resetView = () => {
    setCurrentCenter({ lat: 18.1096, lng: -77.2975 });
    setCurrentZoom(10);
    setSelectedMarker(null);
  };

  const fitAllMarkers = () => {
    if (markers.length === 0) return;
    
    const lats = markers.map(m => m.lat);
    const lngs = markers.map(m => m.lng);
    
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    
    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
    
    const latSpan = maxLat - minLat;
    const lngSpan = maxLng - minLng;
    const maxSpan = Math.max(latSpan, lngSpan);
    
    let zoom = 10;
    if (maxSpan < 0.01) zoom = 16;
    else if (maxSpan < 0.05) zoom = 14;
    else if (maxSpan < 0.1) zoom = 12;
    else if (maxSpan < 0.5) zoom = 10;
    else zoom = 8;
    
    setCurrentCenter({ lat: centerLat, lng: centerLng });
    setCurrentZoom(zoom);
  };

  const tiles = getTileGrid();

  return (
    <div style={{ width, height }} className="border rounded-lg relative overflow-hidden bg-slate-100">
      {/* High-Quality Map Tiles */}
      <div 
        ref={mapContainerRef}
        className={`w-full h-full relative select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onClick={handleMapClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        {tiles.map((tile, index) => (
          <img
            key={`${tile.tileX}-${tile.tileY}`}
            src={tile.url}
            alt=""
            className="absolute select-none"
            style={{
              left: tile.x,
              top: tile.y,
              width: '256px',
              height: '256px',
              imageRendering: 'crisp-edges'
            }}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.opacity = '0';
            }}
            onLoad={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.opacity = '1';
            }}
          />
        ))}

        {/* Enhanced Polling Station Markers */}
        {markers.map((marker, index) => {
          const rect = mapContainerRef.current?.getBoundingClientRect();
          if (!rect) return null;
          
          const markerPos = latLngToPixel(marker.lat, marker.lng, rect.width, rect.height);
          
          // Only show markers within reasonable bounds
          if (markerPos.x < -50 || markerPos.x > rect.width + 50 || 
              markerPos.y < -50 || markerPos.y > rect.height + 50) {
            return null;
          }

          const isSelected = selectedMarker === index;

          return (
            <div
              key={index}
              className="absolute transform -translate-x-1/2 -translate-y-full cursor-pointer z-20 transition-all duration-200 hover:scale-110"
              style={{ 
                left: markerPos.x, 
                top: markerPos.y,
                filter: isSelected ? 'drop-shadow(0 0 8px rgba(239, 68, 68, 0.8))' : 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))'
              }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedMarker(isSelected ? null : index);
                if (!isSelected) {
                  panTo(marker.lat, marker.lng);
                  if (currentZoom < 14) setCurrentZoom(14);
                }
              }}
            >
              <div className={`relative ${isSelected ? 'animate-bounce' : ''}`}>
                <MapPin 
                  className={`h-8 w-8 ${isSelected ? 'text-red-600' : 'text-red-500'}`} 
                  fill={isSelected ? '#dc2626' : '#ef4444'} 
                />
                {/* Station number badge */}
                <div className="absolute -top-1 -right-1 bg-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold text-red-600 border border-red-500">
                  {index + 1}
                </div>
              </div>
              
              {/* Info popup */}
              {isSelected && (
                <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-xl p-3 text-sm whitespace-nowrap z-30 border">
                  <div className="font-semibold text-gray-900">{marker.title}</div>
                  {marker.info && <div className="text-gray-600 text-xs mt-1">{marker.info}</div>}
                  <div className="text-xs text-blue-600 mt-1">
                    {marker.lat.toFixed(5)}, {marker.lng.toFixed(5)}
                  </div>
                  {/* Arrow pointing down */}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-white"></div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Enhanced Control Panel */}
      {interactive && (
        <>
          {/* Zoom and Pan Controls */}
          <div className="absolute top-4 right-4 flex flex-col gap-1">
            <Button size="sm" variant="outline" className="bg-white/95 backdrop-blur-sm w-8 h-8 p-0 shadow-lg" onClick={zoomIn}>
              <Plus className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" className="bg-white/95 backdrop-blur-sm w-8 h-8 p-0 shadow-lg" onClick={zoomOut}>
              <Minus className="h-4 w-4" />
            </Button>
            
            {/* Directional controls */}
            <div className="mt-2 grid grid-cols-3 gap-1">
              <div></div>
              <Button size="sm" variant="outline" className="bg-white/95 backdrop-blur-sm w-6 h-6 p-0" onClick={panNorth}>
                <ChevronUp className="h-3 w-3" />
              </Button>
              <div></div>
              <Button size="sm" variant="outline" className="bg-white/95 backdrop-blur-sm w-6 h-6 p-0" onClick={panWest}>
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="outline" className="bg-white/95 backdrop-blur-sm w-6 h-6 p-0" onClick={resetView}>
                <RotateCcw className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="outline" className="bg-white/95 backdrop-blur-sm w-6 h-6 p-0" onClick={panEast}>
                <ChevronRight className="h-3 w-3" />
              </Button>
              <div></div>
              <Button size="sm" variant="outline" className="bg-white/95 backdrop-blur-sm w-6 h-6 p-0" onClick={panSouth}>
                <ChevronDown className="h-3 w-3" />
              </Button>
              <div></div>
            </div>
          </div>

          {/* View All Stations Button */}
          {markers.length > 0 && (
            <div className="absolute top-4 left-4">
              <Button size="sm" variant="outline" className="bg-white/95 backdrop-blur-sm shadow-lg" onClick={fitAllMarkers}>
                <Navigation className="h-3 w-3 mr-1" />
                View All Stations
              </Button>
            </div>
          )}
        </>
      )}

      {/* Station Info Panel */}
      {markers.length > 0 && (
        <div className="absolute bottom-4 left-4 right-4">
          <div className="bg-white/95 backdrop-blur-sm rounded-lg p-4 shadow-xl border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-red-500" />
                <span className="font-semibold text-sm">
                  {markers.length} Polling Station{markers.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="text-xs text-gray-500">
                Zoom: {currentZoom} | {currentCenter.lat.toFixed(4)}, {currentCenter.lng.toFixed(4)}
              </div>
            </div>
            
            {selectedMarker !== null && markers[selectedMarker] && (
              <div className="border-t pt-3 mb-3">
                <h4 className="font-semibold text-sm text-gray-900">{markers[selectedMarker].title}</h4>
                {markers[selectedMarker].info && (
                  <p className="text-xs text-gray-600 mt-1">{markers[selectedMarker].info}</p>
                )}
                <p className="text-xs text-blue-600 mt-1">
                  Coordinates: {markers[selectedMarker].lat.toFixed(5)}, {markers[selectedMarker].lng.toFixed(5)}
                </p>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-2 max-h-24 overflow-y-auto">
              {markers.slice(0, showAllStations ? markers.length : 6).map((marker, index) => (
                <button
                  key={index}
                  className={`text-left p-2 rounded text-xs transition-all ${
                    selectedMarker === index 
                      ? 'bg-blue-100 border border-blue-300 shadow-sm' 
                      : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                  }`}
                  onClick={() => {
                    panTo(marker.lat, marker.lng);
                    setSelectedMarker(index);
                    setCurrentZoom(Math.max(currentZoom, 14));
                  }}
                >
                  <div className="font-medium truncate">#{index + 1} {marker.title}</div>
                  <div className="text-gray-500 text-xs">
                    {marker.lat.toFixed(4)}, {marker.lng.toFixed(4)}
                  </div>
                </button>
              ))}
            </div>
            
            {markers.length > 6 && (
              <div className="text-center mt-2">
                <button 
                  className="text-xs text-blue-600 hover:text-blue-800"
                  onClick={() => setShowAllStations(!showAllStations)}
                >
                  {showAllStations ? 'Show Less' : `+${markers.length - 6} more stations`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Click instruction */}
      {interactive && onLocationSelect && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="bg-black/20 text-white text-xs px-2 py-1 rounded opacity-0 hover:opacity-100 transition-opacity">
            Click to select location
          </div>
        </div>
      )}
    </div>
  );
}