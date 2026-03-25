import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

export function usePendingMutationsCount() {
  const queryClient = useQueryClient()
  const mutationCache = queryClient.getMutationCache()
  const [count, setCount] = useState(0)

  useEffect(() => {
    const update = () => {
      const pendingCount = mutationCache
        .getAll()
        .filter((mutation) => mutation.state.status === 'pending').length

      setCount(pendingCount)
    }

    update()

    return mutationCache.subscribe(update)
  }, [mutationCache])

  return count
}
