import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { RefreshCw, Wifi, WifiOff, CheckCircle, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export interface SyncStatus {
  isConnected: boolean;
  lastSync: Date | null;
  isSyncing: boolean;
  error?: string;
  dataSource: string;
}

interface SyncIndicatorProps {
  status: SyncStatus;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function SyncIndicator({ status, size = 'md', showLabel = true, className }: SyncIndicatorProps) {
  const [timeAgo, setTimeAgo] = useState<string>('');

  useEffect(() => {
    const updateTimeAgo = () => {
      if (!status.lastSync) {
        setTimeAgo('Never');
        return;
      }

      const now = new Date();
      const diff = now.getTime() - status.lastSync.getTime();
      const seconds = Math.floor(diff / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);

      if (seconds < 60) {
        setTimeAgo(`${seconds}s ago`);
      } else if (minutes < 60) {
        setTimeAgo(`${minutes}m ago`);
      } else if (hours < 24) {
        setTimeAgo(`${hours}h ago`);
      } else {
        setTimeAgo('Over 24h ago');
      }
    };

    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 1000);
    return () => clearInterval(interval);
  }, [status.lastSync]);

  const getStatusIcon = () => {
    if (status.isSyncing) {
      return <RefreshCw className={cn('animate-spin', getSizeClass('icon'))} />;
    }
    if (status.error) {
      return <AlertCircle className={cn('text-red-500', getSizeClass('icon'))} />;
    }
    if (status.isConnected) {
      return <CheckCircle className={cn('text-green-500', getSizeClass('icon'))} />;
    }
    return <WifiOff className={cn('text-gray-400', getSizeClass('icon'))} />;
  };

  const getStatusColor = () => {
    if (status.isSyncing) return 'bg-blue-500';
    if (status.error) return 'bg-red-500';
    if (status.isConnected) return 'bg-green-500';
    return 'bg-gray-400';
  };

  const getStatusText = () => {
    if (status.isSyncing) return 'Syncing...';
    if (status.error) return 'Sync Error';
    if (status.isConnected) return 'Connected';
    return 'Disconnected';
  };

  const getSizeClass = (element: 'icon' | 'badge' | 'text') => {
    const sizes = {
      sm: { icon: 'h-3 w-3', badge: 'text-xs px-1', text: 'text-xs' },
      md: { icon: 'h-4 w-4', badge: 'text-sm px-2', text: 'text-sm' },
      lg: { icon: 'h-5 w-5', badge: 'text-base px-3', text: 'text-base' }
    };
    return sizes[size][element];
  };

  const tooltipContent = (
    <div className="space-y-1">
      <div className="font-semibold">{status.dataSource}</div>
      <div>Status: {getStatusText()}</div>
      <div>Last sync: {timeAgo}</div>
      {status.error && <div className="text-red-300">Error: {status.error}</div>}
    </div>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn('flex items-center space-x-2', className)}>
            <div className="relative">
              {getStatusIcon()}
              <div className={cn(
                'absolute -top-1 -right-1 w-2 h-2 rounded-full',
                getStatusColor(),
                size === 'sm' && 'w-1.5 h-1.5',
                size === 'lg' && 'w-2.5 h-2.5'
              )} />
            </div>
            
            {showLabel && (
              <div className="flex flex-col">
                <Badge variant="secondary" className={getSizeClass('badge')}>
                  {getStatusText()}
                </Badge>
                <span className={cn('text-gray-500', getSizeClass('text'))}>
                  {timeAgo}
                </span>
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Multi-source sync indicator for dashboards
interface MultiSyncIndicatorProps {
  sources: Array<SyncStatus & { name: string }>;
  className?: string;
}

export function MultiSyncIndicator({ sources, className }: MultiSyncIndicatorProps) {
  const overallStatus = {
    connected: sources.filter(s => s.isConnected).length,
    syncing: sources.filter(s => s.isSyncing).length,
    errors: sources.filter(s => s.error).length,
    total: sources.length
  };

  const getOverallColor = () => {
    if (overallStatus.errors > 0) return 'text-red-500';
    if (overallStatus.syncing > 0) return 'text-blue-500';
    if (overallStatus.connected === overallStatus.total) return 'text-green-500';
    return 'text-yellow-500';
  };

  return (
    <div className={cn('flex items-center space-x-4', className)}>
      <div className="flex items-center space-x-2">
        <Wifi className={cn('h-4 w-4', getOverallColor())} />
        <span className="text-sm font-medium">
          {overallStatus.connected}/{overallStatus.total} Connected
        </span>
      </div>
      
      <div className="flex space-x-2">
        {sources.map((source, index) => (
          <SyncIndicator
            key={index}
            status={source}
            size="sm"
            showLabel={false}
            className="cursor-pointer"
          />
        ))}
      </div>
      
      {overallStatus.syncing > 0 && (
        <Badge variant="secondary" className="text-xs">
          {overallStatus.syncing} syncing
        </Badge>
      )}
      
      {overallStatus.errors > 0 && (
        <Badge variant="destructive" className="text-xs">
          {overallStatus.errors} errors
        </Badge>
      )}
    </div>
  );
}