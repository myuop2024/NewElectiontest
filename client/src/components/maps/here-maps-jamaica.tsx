import React, { useEffect, useRef, useState } from 'react';

interface HereMapsJamaicaProps {
  parishStats: any[];
  selectedMetric: "incidents" | "turnout" | "observers" | "critical";
  onParishSelect: (parish: string) => void;
  selectedParish: string | null;
}

declare global {
  interface Window {
    H: any;
  }
}

const HereMapsJamaica: React.FC<HereMapsJamaicaProps> = ({ parishStats, selectedMetric, onParishSelect, selectedParish }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [platform, setPlatform] = useState<any>(null);
  const [ui, setUi] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    const loadHereMapsScript = (apiKey: string) => {
      return new Promise<void>((resolve, reject) => {
        if (document.querySelector('script[data-here-maps]')) {
          return resolve();
        }

        const coreScript = document.createElement('script');
        coreScript.src = 'https://js.api.here.com/v3/3.1/mapsjs-core.js';
        coreScript.setAttribute('data-here-maps', 'true');
        coreScript.async = true;
        document.head.appendChild(coreScript);

        const serviceScript = document.createElement('script');
        serviceScript.src = 'https://js.api.here.com/v3/3.1/mapsjs-service.js';
        serviceScript.async = true;
        document.head.appendChild(serviceScript);

        const uiScript = document.createElement('script');
        uiScript.src = 'https://js.api.here.com/v3/3.1/mapsjs-ui.js';
        uiScript.async = true;
        document.head.appendChild(uiScript);

        const eventsScript = document.createElement('script');
        eventsScript.src = 'https://js.api.here.com/v3/3.1/mapsjs-mapevents.js';
        eventsScript.async = true;
        document.head.appendChild(eventsScript);

        const cssLink = document.createElement('link');
        cssLink.rel = 'stylesheet';
        cssLink.type = 'text/css';
        cssLink.href = 'https://js.api.here.com/v3/3.1/mapsjs-ui.css';
        document.head.appendChild(cssLink);

        uiScript.onload = () => resolve();
        uiScript.onerror = () => reject(new Error('Failed to load HERE Maps script'));
      });
    };

    const fetchHereApiKey = async () => {
      try {
        const response = await fetch('/api/settings/here-api');
        const data = await response.json();
        if (!data.hasKey) {
          throw new Error('HERE API key not configured');
        }
        return data.apiKey;
      } catch (error) {
        console.error('[MAPS DEBUG] Failed to fetch HERE API key:', error);
        throw error;
      }
    };

    const initializeMap = async () => {
      if (!mapRef.current) return;

      try {
        setIsLoading(true);
        setApiError(null);

        const apiKey = await fetchHereApiKey();
        await loadHereMapsScript(apiKey);

        const platform = new window.H.service.Platform({
          apikey: apiKey
        });
        setPlatform(platform);

        const defaultLayers = platform.createDefaultLayers();
        const map = new window.H.Map(
          mapRef.current,
          defaultLayers.vector.normal.map,
          {
            center: { lat: 18.1096, lng: -77.2975 },
            zoom: 9,
            pixelRatio: window.devicePixelRatio || 1
          }
        );
        setMap(map);

        const mapEvents = new window.H.mapevents.MapEvents(map);
        new window.H.mapevents.Behavior(mapEvents);
        const ui = window.H.ui.UI.createDefault(map, defaultLayers);
        setUi(ui);

        setIsLoading(false);
      } catch (error) {
        console.error('[MAPS DEBUG] Error initializing HERE Maps:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        setApiError(`Failed to initialize map: ${errorMessage}`);
      }
    };

    initializeMap();
  }, []);

  return (
    <div className="w-full h-full relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="spinner"></div>
            <p className="mt-2 text-sm text-gray-600">Loading map...</p>
          </div>
        </div>
      )}
      {apiError && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-50">
          <div className="text-center text-red-800">
            <p className="font-semibold">Map Error</p>
            <p className="text-sm">{apiError}</p>
          </div>
        </div>
      )}
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
};

export default HereMapsJamaica;
