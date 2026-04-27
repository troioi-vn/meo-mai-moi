import { QueryClient } from '@tanstack/react-query'
import { get, set, del } from 'idb-keyval'
import type { PersistedClient, Persister } from '@tanstack/query-persist-client-core'
import type { PersistQueryClientProviderProps } from '@tanstack/react-query-persist-client'
import type { Query } from '@tanstack/query-core'
import { getGetCategoriesQueryKey } from '@/api/generated/categories/categories'
import { getGetPetTypesQueryKey } from '@/api/generated/pet-types/pet-types'
import {
  getGetMyPetsQueryKey,
  getGetMyPetsSectionsQueryKey,
  getGetPetsFeaturedQueryKey,
} from '@/api/generated/pets/pets'

// --- IndexedDB persister (async, no size limit, durable) ---

const IDB_KEY = 'meo-query-cache'

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'then' in value &&
    typeof value.then === 'function'
  )
}

function sanitizePersistedClient(client: PersistedClient): PersistedClient {
  const seen = new WeakSet()

  const json = JSON.stringify(client, (_key, value: unknown) => {
    if (isPromiseLike(value) || typeof value === 'function') {
      return undefined
    }

    if (value && typeof value === 'object') {
      if (seen.has(value)) {
        return undefined
      }

      seen.add(value)
    }

    return value
  })

  return JSON.parse(json) as PersistedClient
}

export const persister: Persister = {
  persistClient: async (client: PersistedClient) => {
    await set(IDB_KEY, sanitizePersistedClient(client))
  },
  restoreClient: async () => await get<PersistedClient>(IDB_KEY),
  removeClient: async () => {
    await del(IDB_KEY)
  },
}

// --- QueryClient with offline-first defaults ---

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: 'offlineFirst',
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
    mutations: {
      // Pause writes while offline so they can be persisted and replayed on reconnect.
      networkMode: 'online',
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
    },
  },
})

// --- Persist options (used by PersistQueryClientProvider in main.tsx) ---

const ALLOWED_PREFIXES = [
  getGetMyPetsSectionsQueryKey()[0],
  getGetMyPetsQueryKey()[0],
  getGetPetsFeaturedQueryKey()[0],
  '/pets/',
  getGetPetTypesQueryKey()[0],
  getGetCategoriesQueryKey()[0],
]

export const persistOptions: PersistQueryClientProviderProps['persistOptions'] = {
  persister,
  maxAge: 1000 * 60 * 60 * 24, // discard cache older than 24h
  dehydrateOptions: {
    shouldDehydrateQuery: (query: Query<unknown, Error, unknown>) => {
      const key = query.queryKey[0]
      return typeof key === 'string' && ALLOWED_PREFIXES.some((prefix) => key.startsWith(prefix))
    },
    shouldDehydrateMutation: () => true,
  },
}

// --- Logout cleanup ---

export async function clearOfflineCache() {
  queryClient.clear()
  await persister.removeClient()
}
