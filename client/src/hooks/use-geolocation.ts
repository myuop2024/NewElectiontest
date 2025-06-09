import { useState, useEffect, useCallback } from "react";
import type { GeolocationPosition } from "@/types";

interface GeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  watch?: boolean;
}

interface GeolocationState {
  position: GeolocationPosition | null;
  error: string | null;
  isLoading: boolean;
  isSupported: boolean;
}

export function useGeolocation(options: GeolocationOptions = {}) {
  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 300000,
    watch = false
  } = options;

  const [state, setState] = useState<GeolocationState>({
    position: null,
    error: null,
    isLoading: false,
    isSupported: 'geolocation' in navigator
  });

  const updatePosition = useCallback((position: GeolocationPosition) => {
    setState(prev => ({
      ...prev,
      position: {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp
      },
      error: null,
      isLoading: false
    }));
  }, []);

  const updateError = useCallback((error: GeolocationPositionError) => {
    let errorMessage = 'An unknown error occurred';
    
    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = 'Location access denied by user';
        break;
      case error.POSITION_UNAVAILABLE:
        errorMessage = 'Location information unavailable';
        break;
      case error.TIMEOUT:
        errorMessage = 'Location request timed out';
        break;
    }

    setState(prev => ({
      ...prev,
      error: errorMessage,
      isLoading: false
    }));
  }, []);

  const getCurrentPosition = useCallback(() => {
    if (!state.isSupported) {
      setState(prev => ({
        ...prev,
        error: 'Geolocation is not supported by this browser'
      }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      updatePosition,
      updateError,
      {
        enableHighAccuracy,
        timeout,
        maximumAge
      }
    );
  }, [state.isSupported, enableHighAccuracy, timeout, maximumAge, updatePosition, updateError]);

  useEffect(() => {
    if (!state.isSupported || !watch) {
      return;
    }

    setState(prev => ({ ...prev, isLoading: true }));

    const watchId = navigator.geolocation.watchPosition(
      updatePosition,
      updateError,
      {
        enableHighAccuracy,
        timeout,
        maximumAge
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [watch, state.isSupported, enableHighAccuracy, timeout, maximumAge, updatePosition, updateError]);

  return {
    ...state,
    getCurrentPosition,
    clearError: useCallback(() => {
      setState(prev => ({ ...prev, error: null }));
    }, [])
  };
}
