import { useState, useEffect } from 'react';

interface GeolocationCoords {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number | null;
  altitudeAccuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
}

interface GeolocationState {
  location: GeolocationCoords | null;
  error: string | null;
  isLoading: boolean;
}

export function useGeolocation(options?: PositionOptions): GeolocationState {
  const [state, setState] = useState<GeolocationState>({
    location: null,
    error: null,
    isLoading: true,
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      setState({
        location: null,
        error: 'Geolocation is not supported by this browser',
        isLoading: false,
      });
      return;
    }

    const defaultOptions: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 60000,
      ...options,
    };

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    const successHandler = (position: GeolocationPosition) => {
      setState({
        location: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
          altitudeAccuracy: position.coords.altitudeAccuracy,
          heading: position.coords.heading,
          speed: position.coords.speed,
        },
        error: null,
        isLoading: false,
      });
    };

    const errorHandler = (error: GeolocationPositionError) => {
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

      setState({
        location: null,
        error: errorMessage,
        isLoading: false,
      });
    };

    navigator.geolocation.getCurrentPosition(
      successHandler,
      errorHandler,
      defaultOptions
    );

    // Optional: Set up continuous tracking
    const watchId = navigator.geolocation.watchPosition(
      successHandler,
      errorHandler,
      defaultOptions
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  return state;
}