import { useState, useEffect } from 'react'
import { getCat } from '@/api/cats'
import type { Cat } from '@/types/cat'

interface UseCatProfileResult {
  cat: Cat | null
  loading: boolean
  error: string | null
  refresh: () => void
}

export const useCatProfile = (id: string | undefined): UseCatProfileResult => {
  const [cat, setCat] = useState<Cat | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    void (async () => {
      if (!id) {
        setError('No cat ID provided')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        const catData = await getCat(id)
        setCat(catData)
      } catch (err: unknown) {
        if (err && typeof err === 'object' && 'response' in err) {
          const axiosErr = err as { response?: { status?: number } }
          if (axiosErr.response?.status === 404) {
            setError('Cat not found')
          } else {
            setError('Failed to load cat information')
          }
        } else {
          setError('Failed to load cat information')
        }
        console.error('Error fetching cat:', err)
      } finally {
        setLoading(false)
      }
    })()
  }, [id, version])

  const refresh = () => {
    setVersion((v) => v + 1)
  }

  return { cat, loading, error, refresh }
}
