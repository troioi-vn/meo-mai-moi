import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNetworkStatus } from '@/hooks/use-network-status'
import { useGroups, type GroupSummary } from '@/api/groups'
import {
  readGroupContextSelection,
  writeGroupContextSelection,
  type GroupContextSelection,
} from '@/lib/group-context'
import { useAuth } from '@/hooks/use-auth'

const EMPTY_GROUPS: GroupSummary[] = []

/**
 * Pets-page Group context: All pets vs a named Group.
 * Remembered locally; falls back to All pets when offline or access disappears.
 */
export function useGroupContext() {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const isOnline = useNetworkStatus()
  const [selection, setSelectionState] = useState<GroupContextSelection>(() =>
    readGroupContextSelection()
  )

  const groupsQuery = useGroups({
    enabled: !authLoading && isAuthenticated,
  })

  const groups = groupsQuery.data ?? EMPTY_GROUPS
  const hasGroups = groups.length > 0

  const resolvedSelection: GroupContextSelection = useMemo(() => {
    if (!isOnline) return 'all'
    if (!hasGroups) return 'all'
    if (selection === 'all') return 'all'
    const stillMember = groups.some((g) => g.id === selection)
    return stillMember ? selection : 'all'
  }, [groups, hasGroups, isOnline, selection])

  useEffect(() => {
    if (selection !== resolvedSelection) {
      setSelectionState(resolvedSelection)
      writeGroupContextSelection(resolvedSelection)
    }
  }, [resolvedSelection, selection])

  const setSelection = useCallback(
    (next: GroupContextSelection) => {
      if (!isOnline) return
      setSelectionState(next)
      writeGroupContextSelection(next)
    },
    [isOnline]
  )

  const activeGroupId = resolvedSelection === 'all' ? null : resolvedSelection
  const activeGroup =
    activeGroupId == null ? null : (groups.find((g) => g.id === activeGroupId) ?? null)

  return {
    groups,
    hasGroups,
    isLoadingGroups: groupsQuery.isLoading,
    isOnline,
    selection: resolvedSelection,
    setSelection,
    activeGroupId,
    activeGroup,
    groupsSwitchingDisabled: !isOnline,
  }
}
