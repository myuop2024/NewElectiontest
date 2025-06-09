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
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        if (data.hasKey && data.apiKey) {
          setApiKey(data.apiKey);
        } else {
          setError("HERE API key not configured. Please set it in admin settings.");
        }
      })
      .catch(err => {
        console.error('HERE API config error:', err);
        setError("Failed to load HERE API configuration.");
      });
  }, []);

  useEffect(() => {
    if (!apiKey || !mapRef.current) return;

    let mounted = true;

    const loadHereAPI = async () => {
      try {
        if (window.H && window.H.service && window.H.Map) {
          initializeMap();
          return;
        }

        // Load HERE Maps CSS
        if (!document.querySelector('link[href*="mapsjs-ui.css"]')) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = 'https://js.api.here.com/v3/3.1/mapsjs-ui.css';
          document.head.appendChild(link);
        }

        // Load scripts with global script inclusion approach
        const loadScript = (src: string): Promise<void> => {
          return new Promise((resolve, reject) => {
            const existingScript = document.querySelector(`script[src="${src}"]`);
            if (existingScript) {
              resolve();
              return;
            }
            
            const script = document.createElement('script');
            script.src = src;
            script.async = false; // Maintain order
            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`Failed to load ${src}`));
            document.head.appendChild(script);
          });
        };

        // Load all scripts
        await loadScript('https://js.api.here.com/v3/3.1/mapsjs-core.js');
        await loadScript('https://js.api.here.com/v3/3.1/mapsjs-service.js');
        await loadScript('https://js.api.here.com/v3/3.1/mapsjs-ui.js');
        await loadScript('https://js.api.here.com/v3/3.1/mapsjs-mapevents.js');

        // Wait for scripts to be ready
        let attempts = 0;
        const maxAttempts = 50;
        
        const waitForHere = () => {
          if (!mounted) return;
          
          if (window.H && window.H.service && window.H.Map && window.H.mapevents && window.H.ui) {
            initializeMap();
            return;
          }
          
          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(waitForHere, 100);
          } else {
            if (mounted) {
              setError('HERE Maps API failed to initialize properly');
            }
          }
        };

        waitForHere();

      } catch (error) {
        console.error('Failed to load HERE Maps API:', error);
        if (mounted) {
          setError(`Failed to load HERE Maps: ${error}`);
        }
      }
    };

    const initializeMap = () => {
      try {
        console.log('Initializing HERE Map with API key:', apiKey?.substring(0, 10) + '...');
        
        if (!window.H) {
          throw new Error('HERE Maps API not loaded');
        }

        if (!mapRef.current) {
          throw new Error('Map container not available');
        }

        platform.current = new window.H.service.Platform({
          'apikey': apiKey
        });

        const defaultMapTypes = platform.current.createDefaultMapTypes();
        
        map.current = new window.H.Map(
          mapRef.current,
          defaultMapTypes.vector.normal.map,
          {
            zoom,
            center: { lat: center.lat, lng: center.lng }
          }
        );
        
        console.log('HERE Map initialized successfully');

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
      } catch (err) {
        setError(`Failed to initialize HERE Map: ${err}`);
      }
    };

    loadHereAPI();

    return () => {
      mounted = false;
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