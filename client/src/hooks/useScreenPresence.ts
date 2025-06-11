import { useState, useEffect, useRef, useCallback } from 'react';

interface UseScreenPresenceOptions {
  onPresenceChange?: (isPresent: boolean) => void;
  onTimeUpdate?: (activeTime: number) => void;
  minimumDuration?: number; // in seconds
  autoStart?: boolean;
}

export function useScreenPresence(options: UseScreenPresenceOptions = {}) {
  const [isPresent, setIsPresent] = useState(true);
  const [isActive, setIsActive] = useState(false);
  const [totalActiveTime, setTotalActiveTime] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  
  const activeTimeRef = useRef(0);
  const lastActiveTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Start/stop timer
  const startTimer = useCallback(() => {
    if (!isActive && isPresent) {
      setIsActive(true);
      setSessionStartTime(Date.now());
      lastActiveTimeRef.current = Date.now();
      
      intervalRef.current = setInterval(() => {
        if (lastActiveTimeRef.current && isPresent) {
          const now = Date.now();
          const elapsed = Math.floor((now - lastActiveTimeRef.current) / 1000);
          activeTimeRef.current += elapsed;
          setTotalActiveTime(activeTimeRef.current);
          lastActiveTimeRef.current = now;
          
          options.onTimeUpdate?.(activeTimeRef.current);
        }
      }, 1000);
    }
  }, [isActive, isPresent, options]);

  const pauseTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsActive(false);
  }, []);

  const resetTimer = useCallback(() => {
    pauseTimer();
    activeTimeRef.current = 0;
    setTotalActiveTime(0);
    setSessionStartTime(null);
  }, [pauseTimer]);

  // Presence detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;
      setIsPresent(isVisible);
      
      if (!isVisible && isActive) {
        pauseTimer();
      } else if (isVisible && sessionStartTime) {
        startTimer();
      }
      
      options.onPresenceChange?.(isVisible);
    };

    const handleFocus = () => {
      setIsPresent(true);
      if (sessionStartTime) startTimer();
      options.onPresenceChange?.(true);
    };

    const handleBlur = () => {
      setIsPresent(false);
      pauseTimer();
      options.onPresenceChange?.(false);
    };

    // Page Visibility API
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Window focus/blur events
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    
    // Mouse movement detection (additional presence indicator)
    let mouseTimer: NodeJS.Timeout;
    const handleMouseMove = () => {
      if (!isPresent) {
        setIsPresent(true);
        if (sessionStartTime) startTimer();
      }
      
      clearTimeout(mouseTimer);
      mouseTimer = setTimeout(() => {
        // Could implement idle detection here if needed
      }, 30000); // 30 seconds of no mouse movement
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('keypress', handleMouseMove);
    document.addEventListener('scroll', handleMouseMove);
    document.addEventListener('click', handleMouseMove);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('keypress', handleMouseMove);
      document.removeEventListener('scroll', handleMouseMove);
      document.removeEventListener('click', handleMouseMove);
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      clearTimeout(mouseTimer);
    };
  }, [isActive, isPresent, sessionStartTime, startTimer, pauseTimer, options]);

  // Auto start if enabled
  useEffect(() => {
    if (options.autoStart && !sessionStartTime) {
      startTimer();
    }
  }, [options.autoStart, sessionStartTime, startTimer]);

  // Check if minimum duration is met
  const hasMetMinimumDuration = useCallback(() => {
    if (!options.minimumDuration) return true;
    return totalActiveTime >= options.minimumDuration;
  }, [totalActiveTime, options.minimumDuration]);

  // Format time for display
  const formatTime = useCallback((seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return {
    isPresent,
    isActive,
    totalActiveTime,
    sessionStartTime,
    startTimer,
    pauseTimer,
    resetTimer,
    hasMetMinimumDuration,
    formatTime: (seconds?: number) => formatTime(seconds ?? totalActiveTime),
    getRemainingTime: () => options.minimumDuration ? Math.max(0, options.minimumDuration - totalActiveTime) : 0,
  };
} 