import { useState, useEffect } from 'react'
import { getPet } from '@/api/pets'
import type { Pet } from '@/types/pet'

interface UsePetProfileResult {
  pet: Pet | null
  loading: boolean
  error: string | null
  refresh: () => void
}

export const usePetProfile = (id: string | undefined): UsePetProfileResult => {
  const [pet, setPet] = useState<Pet | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    void (async () => {
      if (!id) {
        setError('No pet ID provided')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        const petData = await getPet(id)
        setPet(petData)
      } catch (err: unknown) {
        if (err && typeof err === 'object' && 'response' in err) {
          const axiosErr = err as { response?: { status?: number } }
          if (axiosErr.response?.status === 404) {
            setError('Pet not found')
          } else {
            setError('Failed to load pet information')
          }
        } else {
          setError('Failed to load pet information')
        }
        console.error('Error fetching pet:', err)
      } finally {
        setLoading(false)
      }
    })()
  }, [id, version])

  const refresh = () => {
    setVersion((v) => v + 1)
  }

  return { pet, loading, error, refresh }
}
