import React, { useState, useEffect, useRef } from 'react';
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

const HereMap: React.FC = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    const initializeMap = async () => {
      if (!mapRef.current) {
        return;
      }
      
      try {
        setIsLoading(true);
        setApiError(null);
        
        const apiKey = await fetch('/api/settings/here-api')
          .then(res => res.json())
          .then(data => data.hasKey ? data.apiKey : null);
        
        if (!apiKey) {
          setApiError('HERE Maps API key not configured');
          setIsLoading(false);
          return;
        }
        
        // Load HERE Maps script
        const script = document.createElement('script');
        script.src = `https://js.api.here.com/v3/3.1/maas.js?apikey=${apiKey}`;
        script.async = true;
        
        script.onload = () => {
          try {
            const platform = new window.H.map.Platform({
              apiKey: apiKey,
            });
            
            const newMap = new window.H.map.Map(mapRef.current, platform.createLayers(), {
              center: { latitude: 18.1096, longitude: -77.2975 },
              zoom: 8,
            });
            
            setMap(newMap);
            setIsLoading(false);
          } catch (error) {
            console.error('Error initializing HERE Maps:', error);
            setApiError(`Failed to initialize map: ${error.message}`);
            setIsLoading(false);
          }
        };
        
        script.onerror = () => {
          setApiError('Failed to load HERE Maps API');
          setIsLoading(false);
        };
        
        document.head.appendChild(script);
      } catch (error) {
        console.error('Error initializing HERE Maps:', error);
        setApiError(`Failed to initialize map: ${error.message}`);
        setIsLoading(false);
      };
    };
    
    initializeMap();
  }, []);

  return (
    <div className="w-full h-400 relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading HERE map...</p>
        </div>
      )}
      {apiError && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-50">
          <div className="text-center text-red-800">
            <p className="font-semibold">Map Error</p>
            <p className="text-sm">{apiError}</p>
            <button className="mt-2 px-4 py-2 bg-red-600 text-white rounded" onClick={() => window.location.reload()}>
              Retry
            </button>
          </div>
        </div>
      )}
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
};
export default HereMap;