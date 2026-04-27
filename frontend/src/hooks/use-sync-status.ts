import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { postPetsPetPhotos } from '@/api/generated/pet-photos/pet-photos'
import type { Pet } from '@/api/generated/model'
import { useNetworkStatus } from '@/hooks/use-network-status'
import { toast } from '@/lib/i18n-toast'
import { consumeDeferredPetPhoto, getDeferredPetPhotoCount } from '@/lib/offline-photo-queue'
import { OFFLINE_PET_MUTATION_KEYS, resumeOfflinePetMutations } from '@/lib/offline-mutations'

const OFFLINE_MUTATION_KEY_SET = new Set<string>([
  OFFLINE_PET_MUTATION_KEYS.postPets[0],
  OFFLINE_PET_MUTATION_KEYS.putPetsId[0],
  OFFLINE_PET_MUTATION_KEYS.deletePetsId[0],
  OFFLINE_PET_MUTATION_KEYS.putPetsIdStatus[0],
])

export function useSyncStatus() {
  const isOnline = useNetworkStatus()
  const queryClient = useQueryClient()
  const prevOnline = useRef(isOnline)
  const wasSyncing = useRef(false)
  const handledMutationIds = useRef(new Set<number>())
  const reportedErrorIds = useRef(new Set<number>())

  useEffect(() => {
    if (isOnline && !prevOnline.current) {
      void resumeOfflinePetMutations(queryClient)

      const pendingCount = queryClient
        .getMutationCache()
        .getAll()
        .filter((mutation) => mutation.state.status === 'pending').length

      if (pendingCount > 0) {
        wasSyncing.current = true
        toast.info('common:status.syncing')
      }
    }

    prevOnline.current = isOnline
  }, [isOnline, queryClient])

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (getDeferredPetPhotoCount() === 0) return
      event.preventDefault()
    }

    window.addEventListener('beforeunload', handler)
    return () => {
      window.removeEventListener('beforeunload', handler)
    }
  }, [])

  useEffect(() => {
    const mutationCache = queryClient.getMutationCache()

    const processState = () => {
      const mutations = mutationCache.getAll()
      const pendingCount = mutations.filter(
        (mutation) => mutation.state.status === 'pending'
      ).length

      if (wasSyncing.current && pendingCount === 0) {
        wasSyncing.current = false
        toast.success('common:status.syncComplete')
      }

      for (const mutation of mutations) {
        const mutationKey = mutation.options.mutationKey?.[0]
        if (typeof mutationKey !== 'string' || !OFFLINE_MUTATION_KEY_SET.has(mutationKey)) {
          continue
        }

        if (
          mutation.state.status === 'error' &&
          !reportedErrorIds.current.has(mutation.mutationId)
        ) {
          reportedErrorIds.current.add(mutation.mutationId)
          toast.error('common:status.syncFailed')
        }

        if (
          mutationKey === OFFLINE_PET_MUTATION_KEYS.postPets[0] &&
          mutation.state.status === 'success' &&
          !handledMutationIds.current.has(mutation.mutationId)
        ) {
          handledMutationIds.current.add(mutation.mutationId)

          const deferredPhoto = consumeDeferredPetPhoto()
          const pet = mutation.state.data as Pet | undefined

          if (deferredPhoto && pet?.id) {
            void postPetsPetPhotos(pet.id, { photo: deferredPhoto }).catch(() => {
              toast.error('common:status.syncFailed')
            })
          }
        }
      }
    }

    processState()
    return mutationCache.subscribe(processState)
  }, [queryClient])
}
