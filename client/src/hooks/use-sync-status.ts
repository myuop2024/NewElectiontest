import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { SyncStatus } from '@/components/ui/sync-indicator';

interface UseSyncStatusOptions {
  queryKey: string[];
  dataSource: string;
  refetchInterval?: number;
  enabled?: boolean;
}

export function useSyncStatus({ queryKey, dataSource, refetchInterval = 30000, enabled = true }: UseSyncStatusOptions) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isConnected: false,
    lastSync: null,
    isSyncing: false,
    dataSource,
  });

  const lastSuccessRef = useRef<Date | null>(null);
  const lastErrorRef = useRef<string | undefined>(undefined);

  const query = useQuery({
    queryKey,
    enabled,
    refetchInterval,
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: 1000,
  });

  useEffect(() => {
    const { isLoading, isFetching, isError, error, isSuccess, dataUpdatedAt } = query;

    // Update sync status based on query state
    setSyncStatus(prev => ({
      ...prev,
      isSyncing: isLoading || isFetching,
      isConnected: isSuccess && !isError,
      lastSync: isSuccess && dataUpdatedAt ? new Date(dataUpdatedAt) : lastSuccessRef.current,
      error: isError ? (error as Error)?.message || 'Sync failed' : undefined,
    }));

    // Track last successful sync
    if (isSuccess && dataUpdatedAt) {
      lastSuccessRef.current = new Date(dataUpdatedAt);
    }

    // Track last error
    if (isError) {
      lastErrorRef.current = (error as Error)?.message || 'Sync failed';
    } else if (isSuccess) {
      lastErrorRef.current = undefined;
    }
  }, [query.isLoading, query.isFetching, query.isError, query.error, query.isSuccess, query.dataUpdatedAt]);

  return {
    syncStatus,
    ...query,
  };
}

// Hook for multiple data sources
export function useMultiSyncStatus(sources: Array<UseSyncStatusOptions & { name: string }>) {
  const syncStatuses = sources.map(source => {
    const { syncStatus } = useSyncStatus(source);
    return {
      name: source.name,
      ...syncStatus,
    };
  });

  const overallStatus = {
    totalSources: sources.length,
    connectedSources: syncStatuses.filter(s => s.isConnected).length,
    syncingSources: syncStatuses.filter(s => s.isSyncing).length,
    errorSources: syncStatuses.filter(s => s.error).length,
    lastSync: Math.max(...syncStatuses.map(s => s.lastSync?.getTime() || 0)),
  };

  return {
    syncStatuses,
    overallStatus,
  };
}

// Specialized hook for heat map overlays
export function useHeatMapSyncStatus() {
  const sentimentStatus = useSyncStatus({
    queryKey: ['/api/x-sentiment/stations/all'],
    dataSource: 'X Sentiment Analysis',
    refetchInterval: 30000,
  });

  const trafficStatus = useSyncStatus({
    queryKey: ['/api/traffic/all-stations'],
    dataSource: 'Traffic Monitoring',
    refetchInterval: 30000,
  });

  const weatherStatus = useSyncStatus({
    queryKey: ['/api/weather/all-parishes'],
    dataSource: 'Weather Data',
    refetchInterval: 30000,
  });

  const incidentStatus = useSyncStatus({
    queryKey: ['/api/incidents/recent'],
    dataSource: 'Incident Reports',
    refetchInterval: 30000,
  });

  const allStatuses = [
    { name: 'Sentiment', ...sentimentStatus.syncStatus },
    { name: 'Traffic', ...trafficStatus.syncStatus },
    { name: 'Weather', ...weatherStatus.syncStatus },
    { name: 'Incidents', ...incidentStatus.syncStatus },
  ];

  return {
    individual: {
      sentiment: sentimentStatus,
      traffic: trafficStatus,
      weather: weatherStatus,
      incidents: incidentStatus,
    },
    combined: allStatuses,
    refetchAll: () => {
      sentimentStatus.refetch();
      trafficStatus.refetch();
      weatherStatus.refetch();
      incidentStatus.refetch();
    },
  };
}