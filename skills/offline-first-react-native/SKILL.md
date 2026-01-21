---
name: offline-first-react-native
description: |
  This skill provides guidance for implementing offline-first functionality in React Native/Expo applications.
  It should be used when the user needs to: (1) persist data locally for offline access using MMKV,
  (2) implement cache-first strategies with React Query, (3) handle network state detection and synchronization,
  (4) create robust offline experiences for mobile apps. The skill includes patterns for data persistence,
  network monitoring, and automatic revalidation when connectivity is restored.
---

# Offline-First React Native Implementation

This skill guides the implementation of offline-first patterns in React Native/Expo applications using MMKV for storage, React Query for caching, and NetInfo for network detection.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      With Internet                          │
│  API Backend → React Query → MMKV Storage → UI Components   │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│                     Without Internet                        │
│  MMKV Storage → React Query (cached) → UI Components        │
└─────────────────────────────────────────────────────────────┘
```

## Prerequisites

Verify the project uses Expo Dev Client (not Expo Go) since MMKV requires native modules.

## Implementation Steps

### 1. Install Dependencies

```bash
npm install react-native-mmkv @react-native-community/netinfo
cd ios && pod install
```

### 2. Create MMKV Storage Layer

Create `src/services/storage/mmkv.ts`:

```typescript
import { MMKV } from 'react-native-mmkv';

export const storage = new MMKV({
  id: 'app-offline-storage',
  encryptionKey: 'your-encryption-key', // Optional
});

// Storage keys - use user ID prefix to avoid conflicts
export const STORAGE_KEYS = {
  USER_DATA: (userId: string) => `@user:${userId}:data`,
  CURRENT_CONTRACT: (userId: string) => `@user:${userId}:contract`,
  LAST_SYNC: (userId: string) => `@user:${userId}:lastSync`,
} as const;
```

### 3. Create Offline Cache Helpers

Create `src/services/storage/offline-cache.ts`:

```typescript
import { storage, STORAGE_KEYS } from './mmkv';

type CacheOptions = {
  userId: string;
};

export const offlineCache = {
  // Generic get/set with JSON serialization
  get<T>(key: string): T | null {
    const data = storage.getString(key);
    if (!data) return null;
    try {
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  },

  set<T>(key: string, value: T): void {
    storage.set(key, JSON.stringify(value));
  },

  remove(key: string): void {
    storage.delete(key);
  },

  // Domain-specific methods
  getUserData<T>(userId: string): T | null {
    return this.get<T>(STORAGE_KEYS.USER_DATA(userId));
  },

  setUserData<T>(userId: string, data: T): void {
    this.set(STORAGE_KEYS.USER_DATA(userId), data);
  },

  getCurrentContract<T>(userId: string): T | null {
    return this.get<T>(STORAGE_KEYS.CURRENT_CONTRACT(userId));
  },

  setCurrentContract<T>(userId: string, data: T): void {
    this.set(STORAGE_KEYS.CURRENT_CONTRACT(userId), data);
  },

  clearUserCache(userId: string): void {
    storage.delete(STORAGE_KEYS.USER_DATA(userId));
    storage.delete(STORAGE_KEYS.CURRENT_CONTRACT(userId));
    storage.delete(STORAGE_KEYS.LAST_SYNC(userId));
  },

  clearContractCache(userId: string): void {
    storage.delete(STORAGE_KEYS.CURRENT_CONTRACT(userId));
  },
};
```

### 4. Create Network Status Hook

Create `src/hooks/useNetworkStatus.ts`:

```typescript
import { useEffect, useState, useCallback } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

type NetworkStatus = {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string;
};

export function useNetworkStatus() {
  const [status, setStatus] = useState<NetworkStatus>({
    isConnected: true,
    isInternetReachable: true,
    type: 'unknown',
  });

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setStatus({
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable,
        type: state.type,
      });
    });

    return () => unsubscribe();
  }, []);

  const checkConnection = useCallback(async () => {
    const state = await NetInfo.fetch();
    return state.isConnected && state.isInternetReachable;
  }, []);

  return {
    ...status,
    isOffline: !status.isConnected || status.isInternetReachable === false,
    checkConnection,
  };
}
```

### 5. Create React Query Persister (Optional)

For automatic React Query persistence with MMKV:

```typescript
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { storage } from './mmkv';

const mmkvStorage = {
  getItem: (key: string) => storage.getString(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
};

export const queryPersister = createSyncStoragePersister({
  storage: mmkvStorage,
});
```

### 6. Pattern: Offline-Aware Query Hook

Apply this pattern to hooks that need offline support:

```typescript
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { offlineCache } from '@/services/storage/offline-cache';

type UseOfflineQueryOptions<T> = {
  queryKey: string[];
  queryFn: () => Promise<T>;
  cacheKey: string;
  userId: string;
  getCached: (userId: string) => T | null;
  setCached: (userId: string, data: T) => void;
};

export function useOfflineQuery<T>({
  queryKey,
  queryFn,
  userId,
  getCached,
  setCached,
}: UseOfflineQueryOptions<T>) {
  const { isOffline } = useNetworkStatus();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey,
    queryFn: async () => {
      if (isOffline) {
        const cached = getCached(userId);
        if (cached) return cached;
        throw new Error('No cached data available offline');
      }

      const data = await queryFn();
      setCached(userId, data); // Persist to MMKV
      return data;
    },
    // Use cached data as placeholder while fetching
    placeholderData: () => getCached(userId) ?? undefined,
    // Don't retry when offline
    retry: isOffline ? false : 3,
    // Keep stale data available
    staleTime: isOffline ? Infinity : 5 * 60 * 1000,
  });
}
```

### 7. Pattern: Auto-Revalidation on Reconnect

Add to your app's root or context provider:

```typescript
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export function useRevalidateOnReconnect(queryKeys: string[][]) {
  const { isOffline } = useNetworkStatus();
  const queryClient = useQueryClient();
  const wasOffline = useRef(false);

  useEffect(() => {
    if (wasOffline.current && !isOffline) {
      // Just came back online - invalidate queries to refetch
      queryKeys.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
    }
    wasOffline.current = isOffline;
  }, [isOffline, queryClient, queryKeys]);
}
```

## Usage Examples

### Modifying an Existing Hook (useUserRefresh pattern)

```typescript
// Before: Online-only
export function useUserData() {
  return useQuery({
    queryKey: ['user', 'me'],
    queryFn: () => api.get('/me'),
  });
}

// After: Offline-aware
export function useUserData(userId: string) {
  const { isOffline } = useNetworkStatus();

  return useQuery({
    queryKey: ['user', 'me'],
    queryFn: async () => {
      if (isOffline) {
        const cached = offlineCache.getUserData(userId);
        if (cached) return cached;
        throw new Error('Offline - no cached data');
      }

      const data = await api.get('/me');
      offlineCache.setUserData(userId, data);
      return data;
    },
    placeholderData: () => offlineCache.getUserData(userId) ?? undefined,
    retry: isOffline ? false : 3,
  });
}
```

### Modifying Contract/Service Hook

```typescript
export function useCurrentContract(userId: string) {
  const { isOffline } = useNetworkStatus();

  return useQuery({
    queryKey: ['contracts', 'current'],
    queryFn: async () => {
      if (isOffline) {
        const cached = offlineCache.getCurrentContract(userId);
        if (cached) return cached;
        throw new Error('Offline - no cached contract');
      }

      const data = await api.get('/services/current');
      offlineCache.setCurrentContract(userId, data);
      return data;
    },
    placeholderData: () => offlineCache.getCurrentContract(userId) ?? undefined,
  });
}
```

## Cache Cleanup

### On Logout

```typescript
function handleLogout(userId: string) {
  offlineCache.clearUserCache(userId);
  queryClient.clear();
}
```

### On Contract Completion

```typescript
function handleContractCompleted(userId: string) {
  offlineCache.clearContractCache(userId);
  queryClient.invalidateQueries({ queryKey: ['contracts'] });
}
```

## Visual Indicators

Show users when viewing cached data:

```typescript
function OfflineIndicator() {
  const { isOffline } = useNetworkStatus();

  if (!isOffline) return null;

  return (
    <View style={styles.banner}>
      <Text>Viewing cached data - updates when online</Text>
    </View>
  );
}
```

## Checklist

Before completing implementation, verify:

- [ ] MMKV installed and pod install executed
- [ ] Storage layer created with typed keys
- [ ] Network status hook implemented
- [ ] Target hooks modified with offline fallback
- [ ] Auto-revalidation on reconnect configured
- [ ] Cache cleanup on logout implemented
- [ ] Cache cleanup on relevant state changes (e.g., contract completion)
- [ ] Offline indicator component added (optional)
- [ ] Tested: view data offline after initial online fetch
- [ ] Tested: automatic refresh when coming back online

## Common Issues

1. **MMKV not working with Expo Go**: Requires dev-client with native modules
2. **Stale data after reconnect**: Ensure `invalidateQueries` is called on reconnect
3. **Memory issues with large data**: Consider pagination or partial caching
4. **User ID conflicts**: Always prefix cache keys with user ID
