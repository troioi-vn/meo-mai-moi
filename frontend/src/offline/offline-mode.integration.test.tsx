import { act, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import {
  dehydrate,
  hydrate,
  onlineManager,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
import { clear, createStore, keys } from 'idb-keyval'
import { http, HttpResponse } from 'msw'
import { MemoryRouter } from 'react-router-dom'
import { renderWithRouter } from '@/testing'
import { AuthProvider } from '@/contexts/AuthContext'
import { useAuth } from '@/hooks/use-auth'
import { api } from '@/api/axios'
import { getGetMyPetsSectionsQueryKey, getGetPetsIdQueryKey } from '@/api/generated/pets/pets'
import {
  ACTIVE_AUTH_USER_ID_STORAGE_KEY,
  CACHED_AUTH_USER_STORAGE_KEY,
  setCachedAuthIdentity,
  writeCachedAuthUser,
} from '@/lib/auth-identity-cache'
import { clearAuthenticatedOfflineData } from '@/lib/authenticated-offline-cleanup'
import {
  createPreviewUrl,
  enqueueUpload,
  listUploadsSnapshot,
  resetMediaUploadQueueForTests,
} from '@/lib/media-upload-queue'
import {
  clearOfflineCache,
  persister,
  persistOptions,
  queryClient as sharedQueryClient,
} from '@/lib/query-cache'
import {
  enqueueOperation,
  listOperations,
  resetOperationsStoreForTests,
} from '@/offline/operations'
import { replayPendingOfflineOperations } from '@/offline/sync'
import { mockCatType } from '@/testing/mocks/data/pets'
import { server } from '@/testing/mocks/server'
import type { User } from '@/types/user'
import type { Pet } from '@/types/pet'

vi.mock('@/pwa', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/pwa')>()
  return {
    ...actual,
    isStandalonePwa: vi.fn().mockReturnValue(false),
  }
})

import App from '@/App'

const mediaStore = createStore('meo-media-uploads', 'items')
const operationsStore = createStore('meo-offline-operations', 'items')

const cachedUser: User = {
  id: 1,
  name: 'Offline User',
  email: 'offline@example.com',
  email_verified_at: '2026-01-01T00:00:00Z',
  is_banned: false,
}

const cachedPet: Pet = {
  id: 42,
  name: 'Cached Whiskers',
  birthday: '2020-01-15',
  status: 'active',
  description: 'Previously loaded offline pet',
  country: 'VN',
  user_id: 1,
  pet_type_id: 1,
  pet_type: mockCatType,
  user: {
    id: 1,
    name: 'Offline User',
    email: 'offline@example.com',
  },
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  viewer_permissions: {
    can_edit: true,
    can_view_contact: true,
  },
}

function AuthStatus() {
  const { user, isLoading, isSessionFromCache, loadUser } = useAuth()

  if (isLoading) {
    return <div>loading</div>
  }

  return (
    <div>
      <div>{user ? `user:${user.email}` : 'guest'}</div>
      <div>{isSessionFromCache ? 'cache-session' : 'server-session'}</div>
      <button type="button" onClick={() => void loadUser()}>
        reload-user
      </button>
    </div>
  )
}

async function resetAllOfflineStores() {
  onlineManager.setOnline(true)
  window.localStorage.clear()
  await resetMediaUploadQueueForTests()
  await resetOperationsStoreForTests()
  await clearOfflineCache()
  await clear(mediaStore)
  await clear(operationsStore)
  sharedQueryClient.clear()
  server.resetHandlers()
}

async function persistQuerySnapshot(client: QueryClient) {
  await persister.persistClient({
    timestamp: Date.now(),
    buster: '',
    clientState: dehydrate(client, persistOptions.dehydrateOptions),
  })
}

describe('Offline Mode Integration', () => {
  beforeEach(async () => {
    vi.restoreAllMocks()
    await resetAllOfflineStores()
  })

  it('restores persisted my-pets and pet detail queries for offline browsing', async () => {
    const client = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: Infinity, staleTime: Infinity },
      },
    })

    client.setQueryData(getGetMyPetsSectionsQueryKey(), {
      owned: [cachedPet],
      fostering_active: [],
      fostering_past: [],
      transferred_away: [],
    })
    await client.prefetchQuery({
      queryKey: getGetPetsIdQueryKey(42),
      queryFn: async () => cachedPet,
    })

    await persistQuerySnapshot(client)

    const persisted = await persister.restoreClient()
    const persistedKeys = (persisted?.clientState.queries ?? []).map((query) => query.queryKey[0])
    expect(persistedKeys).toContain('/my-pets/sections')
    expect(persistedKeys).toContain('/pets/42')

    const restoredClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: Infinity, staleTime: Infinity },
      },
    })
    hydrate(restoredClient, persisted!.clientState)

    onlineManager.setOnline(false)

    expect(restoredClient.getQueryData(getGetMyPetsSectionsQueryKey())).toEqual({
      owned: [cachedPet],
      fostering_active: [],
      fostering_past: [],
      transferred_away: [],
    })

    const persistedPetQuery = (persisted?.clientState.queries ?? []).find(
      (query) => query.queryKey[0] === '/pets/42'
    )
    expect(persistedPetQuery).toBeDefined()
  })

  it('replays pending pet, medical record, and habit operations on reconnect', async () => {
    const petId = 123
    const habitId = 456
    const habitDate = '2026-04-10'
    const replayOrder: string[] = []

    await enqueueOperation({
      idempotencyKey: 'integration-pet-create',
      entityType: 'pet',
      entityId: 'integration-pet-create',
      operation: 'create',
      localEntityId: 'integration-pet-create',
      payload: {
        name: 'Offline Cat',
        description: 'Queued offline',
        country: 'VN',
        pet_type_id: 1,
        birthday_precision: 'unknown',
      },
    })

    await enqueueOperation({
      idempotencyKey: 'integration-medical-create',
      entityType: 'medical_record',
      entityId: petId,
      operation: 'create',
      localEntityId: 'integration-medical-create',
      payload: {
        petId,
        record_type: 'vet_visit',
        description: 'Offline checkup',
        record_date: '2026-04-10',
        vet_name: 'Dr. Offline',
      },
    })

    await enqueueOperation({
      idempotencyKey: 'integration-habit-day',
      entityType: 'habit',
      entityId: habitId,
      operation: 'update',
      payload: {
        habitId,
        date: habitDate,
        entries: [{ pet_id: 101, value_int: 1 }],
      },
    })

    server.use(
      http.post('http://localhost:3000/api/pets', () => {
        replayOrder.push('pet')
        return HttpResponse.json({
          data: {
            id: 99,
            name: 'Offline Cat',
            description: 'Queued offline',
            country: 'VN',
            pet_type_id: 1,
            birthday_precision: 'unknown',
            status: 'active',
          },
        })
      }),
      http.post(`http://localhost:3000/api/pets/${petId}/medical-records`, () => {
        replayOrder.push('medical_record')
        return HttpResponse.json({
          data: {
            id: 88,
            record_type: 'vet_visit',
            description: 'Offline checkup',
            record_date: '2026-04-10',
            vet_name: 'Dr. Offline',
            photos: [],
          },
        })
      }),
      http.put(`http://localhost:3000/api/habits/${String(habitId)}/entries/${habitDate}`, () => {
        replayOrder.push('habit_day')
        return HttpResponse.json({
          data: {
            habit: { id: habitId },
            date: habitDate,
            entries: [{ pet_id: 101, value_int: 1 }],
          },
        })
      })
    )

    onlineManager.setOnline(true)
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    await replayPendingOfflineOperations(client)

    expect(replayOrder).toEqual(['pet', 'medical_record', 'habit_day'])
    expect(await listOperations()).toEqual([])
  })

  it('clears private IndexedDB stores when reconnect revalidation returns 401', async () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:integration-preview')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    onlineManager.setOnline(false)

    setCachedAuthIdentity(cachedUser.id)
    writeCachedAuthUser(cachedUser)

    sharedQueryClient.setQueryData(getGetMyPetsSectionsQueryKey(), {
      owned: [cachedPet],
      fostering_active: [],
      fostering_past: [],
      transferred_away: [],
    })
    await persistQuerySnapshot(sharedQueryClient)

    await enqueueUpload({
      target: { kind: 'pet-photo', petId: 42 },
      file: new File(['photo'], 'offline.jpg', { type: 'image/jpeg' }),
    })

    await enqueueOperation({
      idempotencyKey: 'integration-cleanup-weight',
      entityType: 'weight',
      entityId: 42,
      operation: 'create',
      payload: { weight_kg: 4.2, record_date: '2026-04-10' },
    })

    const uploadId = listUploadsSnapshot()[0]?.id
    expect(uploadId).toBeDefined()
    expect(createPreviewUrl(uploadId!)).toBe('blob:integration-preview')
    expect(await listOperations()).toHaveLength(1)

    onlineManager.setOnline(false)

    render(
      <QueryClientProvider client={sharedQueryClient}>
        <MemoryRouter>
          <AuthProvider>
            <AuthStatus />
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('cache-session')).toBeInTheDocument()
    })

    onlineManager.setOnline(true)
    vi.spyOn(api, 'get')
      .mockRejectedValueOnce({ isAxiosError: true, response: { status: 401 } })
      .mockRejectedValueOnce({ isAxiosError: true, response: { status: 401 } })

    await act(async () => {
      screen.getByRole('button', { name: 'reload-user' }).click()
    })

    await waitFor(() => {
      expect(screen.getByText('guest')).toBeInTheDocument()
    })

    expect(window.localStorage.getItem(ACTIVE_AUTH_USER_ID_STORAGE_KEY)).toBeNull()
    expect(window.localStorage.getItem(CACHED_AUTH_USER_STORAGE_KEY)).toBeNull()
    expect(await persister.restoreClient()).toBeUndefined()
    expect(listUploadsSnapshot()).toEqual([])
    expect(await listOperations()).toEqual([])
    expect(await keys(mediaStore)).toEqual([])
    expect(await keys(operationsStore)).toEqual([])
  })

  it('routes anonymous offline visitors to landing instead of pet management', async () => {
    onlineManager.setOnline(false)

    renderWithRouter(<App />, {
      route: '/',
      initialAuthState: { user: null, isAuthenticated: false, isLoading: false },
    })

    await waitFor(() => {
      expect(document.querySelector('a[href="/register"]')).toBeInTheDocument()
    })
    expect(screen.queryByTestId('my-pets-page')).not.toBeInTheDocument()
  })

  it('clears all private stores through the shared logout cleanup helper', async () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:logout-preview')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    onlineManager.setOnline(false)

    setCachedAuthIdentity(cachedUser.id)
    writeCachedAuthUser(cachedUser)
    sharedQueryClient.setQueryData(getGetMyPetsSectionsQueryKey(), {
      owned: [cachedPet],
      fostering_active: [],
      fostering_past: [],
      transferred_away: [],
    })
    await persistQuerySnapshot(sharedQueryClient)

    await enqueueUpload({
      target: { kind: 'pet-photo', petId: 42 },
      file: new File(['photo'], 'logout.jpg', { type: 'image/jpeg' }),
    })
    await enqueueOperation({
      idempotencyKey: 'integration-logout-weight',
      entityType: 'weight',
      entityId: 42,
      operation: 'create',
      payload: { weight_kg: 4.2, record_date: '2026-04-10' },
    })

    await clearAuthenticatedOfflineData()

    expect(window.localStorage.getItem(ACTIVE_AUTH_USER_ID_STORAGE_KEY)).toBeNull()
    expect(window.localStorage.getItem(CACHED_AUTH_USER_STORAGE_KEY)).toBeNull()
    expect(await persister.restoreClient()).toBeUndefined()
    expect(listUploadsSnapshot()).toEqual([])
    expect(await listOperations()).toEqual([])
    expect(await keys(mediaStore)).toEqual([])
    expect(await keys(operationsStore)).toEqual([])
  })
})
