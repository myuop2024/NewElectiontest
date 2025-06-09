import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

declare global {
  interface Window {
    H: any;
  }
}

interface HereMapProps {
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

export default function HereMap({
  center = { lat: 18.1096, lng: -77.2975 }, // Jamaica center
  zoom = 10,
  width = "100%",
  height = "400px",
  markers = [],
  onLocationSelect,
  interactive = true
}: HereMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const platform = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);

  useEffect(() => {
    // Check if HERE API key is available
    fetch('/api/settings/here-api')
      .then(res => res.json())
      .then(data => {
        if (data.hasKey) {
          setApiKey('configured');
        } else {
          setError("HERE API key not configured. Please set it in admin settings.");
        }
      })
      .catch(() => {
        setError("Failed to load HERE API configuration.");
      });
  }, []);

  useEffect(() => {
    if (!apiKey || !mapRef.current) return;

    const loadHereAPI = () => {
      if (window.H) {
        initializeMap();
        return;
      }

      // Load HERE Maps API
      const script = document.createElement('script');
      script.src = 'https://js.api.here.com/v3/3.1/mapsjs-core.js';
      script.onload = () => {
        const serviceScript = document.createElement('script');
        serviceScript.src = 'https://js.api.here.com/v3/3.1/mapsjs-service.js';
        serviceScript.onload = () => {
          const uiScript = document.createElement('script');
          uiScript.src = 'https://js.api.here.com/v3/3.1/mapsjs-ui.js';
          uiScript.onload = () => {
            const mapeventsScript = document.createElement('script');
            mapeventsScript.src = 'https://js.api.here.com/v3/3.1/mapsjs-mapevents.js';
            mapeventsScript.onload = initializeMap;
            document.head.appendChild(mapeventsScript);
          };
          document.head.appendChild(uiScript);
        };
        document.head.appendChild(serviceScript);
      };
      document.head.appendChild(script);

      // Load HERE Maps CSS
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://js.api.here.com/v3/3.1/mapsjs-ui.css';
      document.head.appendChild(link);
    };

    const initializeMap = () => {
      try {
        // Get actual API key from backend
        fetch('/api/settings/here-api')
          .then(res => res.json())
          .then(data => {
            if (!data.apiKey) {
              throw new Error("API key not available");
            }

            platform.current = new window.H.service.Platform({
              'apikey': data.apiKey
            });

            const defaultMapOptions = platform.current.createDefaultMapOptions();
            
            map.current = new window.H.Map(
              mapRef.current,
              defaultMapOptions.baseMapOptions,
              {
                zoom,
                center: { lat: center.lat, lng: center.lng }
              }
            );

            let ui: any = null;
            
            if (interactive) {
              const behavior = new window.H.mapevents.Behavior();
              ui = new window.H.ui.UI.createDefault(map.current);
              
              if (onLocationSelect) {
                map.current.addEventListener('tap', (evt: any) => {
                  const coord = map.current.screenToGeo(
                    evt.currentPointer.viewportX,
                    evt.currentPointer.viewportY
                  );
                  onLocationSelect(coord.lat, coord.lng);
                });
              }
            }

            // Add markers
            if (markers.length > 0) {
              const group = new window.H.map.Group();
              
              markers.forEach(marker => {
                const icon = new window.H.map.Icon(
                  '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#0066CC"/></svg>',
                  { size: { w: 24, h: 24 } }
                );

                const mapMarker = new window.H.map.Marker(
                  { lat: marker.lat, lng: marker.lng },
                  { icon }
                );

                if ((marker.title || marker.info) && ui) {
                  const bubble = new window.H.ui.InfoBubble(`
                    <div>
                      ${marker.title ? `<h4>${marker.title}</h4>` : ''}
                      ${marker.info ? `<p>${marker.info}</p>` : ''}
                    </div>
                  `);
                  
                  mapMarker.addEventListener('tap', () => {
                    ui.addBubble(bubble);
                    bubble.setPosition({ lat: marker.lat, lng: marker.lng });
                  });
                }

                group.addObject(mapMarker);
              });

              map.current.addObject(group);
              
              if (markers.length > 1) {
                map.current.setBounds(group.getBounds());
              }
            }

            setIsLoaded(true);
            setError(null);
          })
          .catch(err => {
            setError(`Failed to load API key: ${err.message}`);
          });
      } catch (err) {
        setError(`Failed to initialize HERE Map: ${err}`);
      }
    };

    loadHereAPI();

    return () => {
      if (map.current) {
        map.current.dispose();
      }
    };
  }, [apiKey, center.lat, center.lng, zoom, markers, onLocationSelect, interactive]);

  if (error) {
    return (
      <div style={{ width, height }} className="border rounded-lg">
        <Alert className="h-full">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error}
            {error.includes("not configured") && (
              <div className="mt-2">
                <Button size="sm" variant="outline" onClick={() => window.open('/admin', '_blank')}>
                  Configure API Key
                </Button>
              </div>
            )}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!isLoaded) {
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
    <div 
      ref={mapRef} 
      style={{ width, height }} 
      className="border rounded-lg"
    />
  );
}