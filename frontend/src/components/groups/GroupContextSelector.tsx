import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Settings2, Users } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import type { GroupSummary } from '@/api/groups'
import type { GroupContextSelection } from '@/lib/group-context'
import { cn } from '@/lib/utils'

interface GroupContextSelectorProps {
  groups: GroupSummary[]
  selection: GroupContextSelection
  onSelectionChange: (selection: GroupContextSelection) => void
  disabled?: boolean
  className?: string
}

export function GroupContextSelector({
  groups,
  selection,
  onSelectionChange,
  disabled = false,
  className,
}: GroupContextSelectorProps) {
  const { t } = useTranslation('groups')

  if (groups.length === 0) {
    return null
  }

  const value = selection === 'all' ? 'all' : String(selection)
  const activeGroupId = selection === 'all' ? null : selection

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <Select
        value={value}
        disabled={disabled}
        onValueChange={(next) => {
          onSelectionChange(next === 'all' ? 'all' : Number(next))
        }}
      >
        <SelectTrigger
          className="h-9 w-[min(100%,14rem)] bg-background"
          aria-label={t('title')}
          data-testid="group-context-selector"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('allPets')}</SelectItem>
          {groups.map((group) => (
            <SelectItem key={group.id} value={String(group.id)}>
              {group.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {activeGroupId != null && (
        <>
          <Button variant="outline" size="sm" asChild>
            <Link to={`/groups/${String(activeGroupId)}`} aria-label={t('detail.overview')}>
              <Users className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link
              to={`/groups/${String(activeGroupId)}/settings`}
              aria-label={t('detail.settings')}
            >
              <Settings2 className="h-4 w-4" />
            </Link>
          </Button>
        </>
      )}

      <Button variant="ghost" size="sm" asChild>
        <Link to="/groups">
          <Users className="mr-1.5 h-4 w-4" />
          {t('manageGroups')}
        </Link>
      </Button>
    </div>
  )
}
