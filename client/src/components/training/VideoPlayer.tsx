import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Play, Pause, AlertCircle } from 'lucide-react';

interface VideoPlayerProps {
  videoId: string;
  title: string;
  onComplete?: (completed: boolean) => void;
  onProgress?: (progress: number) => void;
  required?: boolean;
  className?: string;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export function VideoPlayer({ 
  videoId, 
  title, 
  onComplete, 
  onProgress, 
  required = true,
  className = "" 
}: VideoPlayerProps) {
  const [player, setPlayer] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [watchedSegments, setWatchedSegments] = useState<Set<number>>(new Set());
  
  const playerRef = useRef<HTMLDivElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const apiLoadedRef = useRef(false);

  // Load YouTube API
  useEffect(() => {
    if (apiLoadedRef.current) return;

    const loadYouTubeAPI = () => {
      if (window.YT && window.YT.Player) {
        apiLoadedRef.current = true;
        setIsLoading(false);
        return;
      }

      window.onYouTubeIframeAPIReady = () => {
        apiLoadedRef.current = true;
        setIsLoading(false);
      };

      if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        const script = document.createElement('script');
        script.src = 'https://www.youtube.com/iframe_api';
        script.async = true;
        document.head.appendChild(script);
      }
    };

    loadYouTubeAPI();
  }, []);

  // Initialize player
  useEffect(() => {
    if (!apiLoadedRef.current || !playerRef.current || player) return;

    try {
      const newPlayer = new window.YT.Player(playerRef.current, {
        videoId: videoId,
        playerVars: {
          enablejsapi: 1,
          origin: window.location.origin,
          rel: 0,
          modestbranding: 1,
          disablekb: 0,
          controls: 1,
          autoplay: 0,
        },
        events: {
          onReady: handlePlayerReady,
          onStateChange: handlePlayerStateChange,
          onError: handlePlayerError,
        },
      });

      setPlayer(newPlayer);
    } catch (error) {
      console.error('Failed to initialize YouTube player:', error);
      setHasError(true);
      setIsLoading(false);
    }
  }, [apiLoadedRef.current, videoId, player]);

  const handlePlayerReady = useCallback((event: any) => {
    const playerInstance = event.target;
    setDuration(playerInstance.getDuration());
    setIsLoading(false);
  }, []);

  const handlePlayerStateChange = useCallback((event: any) => {
    const playerInstance = event.target;
    const state = event.data;

    // YouTube player states
    // -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (cued)
    
    if (state === 1) { // playing
      setIsPlaying(true);
      startProgressTracking(playerInstance);
    } else if (state === 2) { // paused
      setIsPlaying(false);
      stopProgressTracking();
    } else if (state === 0) { // ended
      setIsPlaying(false);
      stopProgressTracking();
      checkCompletion();
    }
  }, []);

  const handlePlayerError = useCallback((event: any) => {
    console.error('YouTube player error:', event.data);
    setHasError(true);
    setIsLoading(false);
  }, []);

  const startProgressTracking = useCallback((playerInstance: any) => {
    if (progressIntervalRef.current) return;

    progressIntervalRef.current = setInterval(() => {
      if (playerInstance && typeof playerInstance.getCurrentTime === 'function') {
        const currentTime = playerInstance.getCurrentTime();
        const videoDuration = playerInstance.getDuration();
        
        if (videoDuration > 0) {
          const currentProgress = (currentTime / videoDuration) * 100;
          setProgress(currentProgress);
          onProgress?.(currentProgress);

          // Track watched segments (divide video into 10-second segments)
          const segment = Math.floor(currentTime / 10);
          setWatchedSegments(prev => new Set([...prev, segment]));
        }
      }
    }, 1000);
  }, [onProgress]);

  const stopProgressTracking = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  const checkCompletion = useCallback(() => {
    if (!required) {
      setCompleted(true);
      onComplete?.(true);
      return;
    }

    // Video is considered complete if:
    // 1. Progress reaches 95% OR
    // 2. User has watched at least 90% of the segments
    const totalSegments = Math.ceil(duration / 10);
    const watchedPercentage = (watchedSegments.size / totalSegments) * 100;
    
    const isComplete = progress >= 95 || watchedPercentage >= 90;
    
    if (isComplete && !completed) {
      setCompleted(true);
      onComplete?.(true);
    }
  }, [progress, watchedSegments, duration, completed, required, onComplete]);

  // Check completion whenever progress or watched segments change
  useEffect(() => {
    checkCompletion();
  }, [checkCompletion]);

  // Cleanup
  useEffect(() => {
    return () => {
      stopProgressTracking();
      if (player && typeof player.destroy === 'function') {
        player.destroy();
      }
    };
  }, [player, stopProgressTracking]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (hasError) {
    return (
      <Card className={`border-red-200 ${className}`}>
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="font-semibold text-red-800 mb-2">Video Load Error</h3>
          <p className="text-red-600 text-sm">
            Unable to load video: {title}
          </p>
          <p className="text-gray-500 text-xs mt-2">
            Please check your internet connection or try refreshing the page.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${className}`}>
      <CardContent className="p-0">
        <div className="relative">
          {/* Video Player */}
          <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            )}
            <div
              ref={playerRef}
              className="absolute top-0 left-0 w-full h-full"
              style={{ display: isLoading ? 'none' : 'block' }}
            />
          </div>

          {/* Completion Overlay */}
          {completed && (
            <div className="absolute top-4 right-4 bg-green-600 text-white rounded-full p-2 shadow-lg">
              <CheckCircle className="h-5 w-5" />
            </div>
          )}
        </div>

        {/* Video Info & Progress */}
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-900 truncate">{title}</h3>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {duration > 0 && (
                <span>{formatTime((progress / 100) * duration)} / {formatTime(duration)}</span>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <Progress 
              value={progress} 
              className="w-full" 
              aria-label={`Video progress: ${Math.round(progress)}%`}
            />
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Progress: {Math.round(progress)}%</span>
              {required && !completed && (
                <span className="text-orange-600">
                  Must watch to {progress >= 95 ? 'end' : '95%'} to continue
                </span>
              )}
              {completed && (
                <span className="text-green-600 font-medium">
                  ✓ Video completed
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 