# Advanced Offline-First Patterns

## React Query + MMKV Full Integration

### Persistent Query Client Setup

For apps that want React Query to automatically persist ALL queries:

```typescript
// src/services/query-client.ts
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { storage } from './storage/mmkv';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

const mmkvStorageAdapter = {
  getItem: (key: string) => storage.getString(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
};

const persister = createSyncStoragePersister({
  storage: mmkvStorageAdapter,
  key: 'REACT_QUERY_OFFLINE_CACHE',
});

// Usage in App.tsx
export function App() {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister }}
      onSuccess={() => {
        // Cache has been restored
        queryClient.resumePausedMutations();
      }}
    >
      <AppContent />
    </PersistQueryClientProvider>
  );
}
```

## Optimistic Updates with Offline Queue

For mutations that should work offline:

```typescript
// src/services/offline-mutation-queue.ts
import { storage } from './storage/mmkv';

type QueuedMutation = {
  id: string;
  endpoint: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body: unknown;
  timestamp: number;
}

const MUTATION_QUEUE_KEY = '@offline:mutation_queue';

export const mutationQueue = {
  getQueue(): QueuedMutation[] {
    const data = storage.getString(MUTATION_QUEUE_KEY);
    return data ? JSON.parse(data) : [];
  },

  addToQueue(mutation: Omit<QueuedMutation, 'id' | 'timestamp'>): string {
    const queue = this.getQueue();
    const newMutation: QueuedMutation = {
      ...mutation,
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp: Date.now(),
    };
    queue.push(newMutation);
    storage.set(MUTATION_QUEUE_KEY, JSON.stringify(queue));
    return newMutation.id;
  },

  removeFromQueue(id: string): void {
    const queue = this.getQueue().filter((m) => m.id !== id);
    storage.set(MUTATION_QUEUE_KEY, JSON.stringify(queue));
  },

  clearQueue(): void {
    storage.delete(MUTATION_QUEUE_KEY);
  },

  async processQueue(apiClient: any): Promise<void> {
    const queue = this.getQueue();

    for (const mutation of queue) {
      try {
        await apiClient[mutation.method.toLowerCase()](
          mutation.endpoint,
          mutation.body
        );
        this.removeFromQueue(mutation.id);
      } catch (error) {
        console.error(`Failed to process mutation ${mutation.id}:`, error);
        // Keep in queue for retry
      }
    }
  },
};
```

### Using the Mutation Queue

```typescript
// src/hooks/useOfflineMutation.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNetworkStatus } from './useNetworkStatus';
import { mutationQueue } from '@/services/offline-mutation-queue';

type UseOfflineMutationOptions<TData, TVariables> = {
  mutationFn: (variables: TVariables) => Promise<TData>;
  endpoint: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  onOptimisticUpdate?: (variables: TVariables) => void;
  invalidateKeys?: string[][];
};

export function useOfflineMutation<TData, TVariables>({
  mutationFn,
  endpoint,
  method,
  onOptimisticUpdate,
  invalidateKeys = [],
}: UseOfflineMutationOptions<TData, TVariables>) {
  const { isOffline } = useNetworkStatus();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: TVariables) => {
      if (isOffline) {
        // Queue for later and apply optimistic update
        mutationQueue.addToQueue({
          endpoint,
          method,
          body: variables,
        });
        onOptimisticUpdate?.(variables);
        return null as TData; // Return optimistic result
      }

      return mutationFn(variables);
    },
    onSuccess: () => {
      invalidateKeys.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
    },
  });
}
```

## Connection Quality Detection

For handling poor connections (not just offline):

```typescript
// src/hooks/useConnectionQuality.ts
import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

type ConnectionQuality = 'offline' | 'poor' | 'good' | 'excellent';

export function useConnectionQuality() {
  const [quality, setQuality] = useState<ConnectionQuality>('good');

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (!state.isConnected) {
        setQuality('offline');
        return;
      }

      // Check connection details for cellular
      if (state.type === 'cellular') {
        const generation = state.details?.cellularGeneration;
        if (generation === '2g') {
          setQuality('poor');
        } else if (generation === '3g') {
          setQuality('good');
        } else {
          setQuality('excellent');
        }
        return;
      }

      // WiFi or other - assume good unless proven otherwise
      setQuality(state.isInternetReachable ? 'excellent' : 'poor');
    });

    return () => unsubscribe();
  }, []);

  return {
    quality,
    isOffline: quality === 'offline',
    isPoor: quality === 'poor',
    shouldReduceDataUsage: quality === 'offline' || quality === 'poor',
  };
}
```

## Selective Sync Strategy

For large datasets, sync only essential data:

```typescript
// src/services/selective-sync.ts
import { offlineCache } from './storage/offline-cache';

type SyncConfig = {
  essential: string[]; // Always sync
  optional: string[];  // Sync only on good connection
  lazy: string[];      // Sync on demand
};

const SYNC_CONFIG: SyncConfig = {
  essential: ['user', 'currentContract'],
  optional: ['notifications', 'history'],
  lazy: ['analytics', 'preferences'],
};

export async function performSync(
  userId: string,
  api: any,
  connectionQuality: string
) {
  const toSync = connectionQuality === 'excellent' || connectionQuality === 'good'
    ? [...SYNC_CONFIG.essential, ...SYNC_CONFIG.optional]
    : SYNC_CONFIG.essential;

  const syncTasks = toSync.map(async (key) => {
    try {
      const endpoint = getSyncEndpoint(key);
      const data = await api.get(endpoint);
      offlineCache.set(`@sync:${userId}:${key}`, data);
      return { key, success: true };
    } catch (error) {
      return { key, success: false, error };
    }
  });

  return Promise.allSettled(syncTasks);
}

function getSyncEndpoint(key: string): string {
  const endpoints: Record<string, string> = {
    user: '/me',
    currentContract: '/services/current',
    notifications: '/notifications',
    history: '/services/history',
  };
  return endpoints[key] ?? `/${key}`;
}
```

## Background Sync (Expo Background Fetch)

For syncing data in the background:

```typescript
// src/services/background-sync.ts
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { performSync } from './selective-sync';
import { storage } from './storage/mmkv';

const BACKGROUND_SYNC_TASK = 'background-sync';

TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  try {
    const userId = storage.getString('@current_user_id');
    if (!userId) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // Perform minimal sync
    await performSync(userId, api, 'poor'); // Only essential data

    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerBackgroundSync() {
  const status = await BackgroundFetch.getStatusAsync();

  if (status === BackgroundFetch.BackgroundFetchStatus.Available) {
    await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
      minimumInterval: 15 * 60, // 15 minutes
      stopOnTerminate: false,
      startOnBoot: true,
    });
  }
}
```

## Data Versioning for Conflict Resolution

```typescript
// src/services/storage/versioned-cache.ts
type VersionedData<T> = {
  data: T;
  version: number;
  lastModified: number;
  syncedAt: number | null;
};

export const versionedCache = {
  get<T>(key: string): VersionedData<T> | null {
    const raw = storage.getString(key);
    return raw ? JSON.parse(raw) : null;
  },

  set<T>(key: string, data: T, fromServer = false): void {
    const existing = this.get<T>(key);
    const versioned: VersionedData<T> = {
      data,
      version: (existing?.version ?? 0) + 1,
      lastModified: Date.now(),
      syncedAt: fromServer ? Date.now() : existing?.syncedAt ?? null,
    };
    storage.set(key, JSON.stringify(versioned));
  },

  needsSync(key: string): boolean {
    const data = this.get(key);
    if (!data) return false;
    return data.syncedAt === null || data.lastModified > data.syncedAt;
  },

  markSynced(key: string): void {
    const data = this.get(key);
    if (data) {
      storage.set(key, JSON.stringify({
        ...data,
        syncedAt: Date.now(),
      }));
    }
  },
};
```

## Testing Offline Scenarios

```typescript
// __tests__/offline.test.ts
import { renderHook, waitFor } from '@testing-library/react-native';
import NetInfo from '@react-native-community/netinfo';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(),
  fetch: jest.fn(),
}));

describe('Offline functionality', () => {
  it('should return cached data when offline', async () => {
    // Setup: Simulate offline state
    (NetInfo.addEventListener as jest.Mock).mockImplementation((callback) => {
      callback({ isConnected: false, isInternetReachable: false });
      return () => {};
    });

    const { result } = renderHook(() => useNetworkStatus());

    await waitFor(() => {
      expect(result.current.isOffline).toBe(true);
    });
  });

  it('should revalidate when coming back online', async () => {
    let connectionCallback: (state: any) => void;

    (NetInfo.addEventListener as jest.Mock).mockImplementation((callback) => {
      connectionCallback = callback;
      callback({ isConnected: false, isInternetReachable: false });
      return () => {};
    });

    const { result } = renderHook(() => useNetworkStatus());

    // Simulate coming back online
    connectionCallback!({ isConnected: true, isInternetReachable: true });

    await waitFor(() => {
      expect(result.current.isOffline).toBe(false);
    });
  });
});
```
