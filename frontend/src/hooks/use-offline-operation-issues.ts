import { useEffect, useState } from 'react'
import { getOperationIssuesSnapshot, subscribe, type OfflineOperation } from '@/offline/operations'

export function useOfflineOperationIssues(): OfflineOperation[] {
  const [issues, setIssues] = useState(getOperationIssuesSnapshot)

  useEffect(() => {
    setIssues(getOperationIssuesSnapshot())

    return subscribe(() => {
      setIssues(getOperationIssuesSnapshot())
    })
  }, [])

  return issues
}
