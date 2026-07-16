import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PlusCircle, Users } from 'lucide-react'
import { useCreateGroup, useGroups } from '@/api/groups'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { LoadingState } from '@/components/ui/LoadingState'
import { PageContainer, PageHeader } from '@/components/layout/PageLayout'
import { toast } from '@/lib/i18n-toast'
import { writeGroupContextSelection } from '@/lib/group-context'

export default function GroupsListPage() {
  const { t } = useTranslation(['groups', 'common'])
  const navigate = useNavigate()
  const { data: groups, isLoading, isError } = useGroups()
  const createGroup = useCreateGroup()
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('')

  const handleCreate = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      toast.error('groups:form.nameRequired')
      return
    }
    try {
      const group = await createGroup.mutateAsync({ name: trimmed })
      toast.success('groups:messages.created')
      writeGroupContextSelection(group.id)
      setCreateOpen(false)
      setName('')
      void navigate(`/groups/${String(group.id)}`)
    } catch {
      toast.error('groups:messages.error')
    }
  }

  if (isLoading) {
    return <LoadingState message={t('groups:list.title')} />
  }

  return (
    <PageContainer width="wide">
      <PageHeader
        className="mb-6"
        title={t('groups:list.title')}
        actions={
          <Button
            onClick={() => {
              setCreateOpen(true)
            }}
            data-testid="create-empty-group"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            {t('groups:list.createEmpty')}
          </Button>
        }
      />

      {isError && <p className="text-destructive">{t('groups:messages.error')}</p>}

      {!isError && (groups?.length ?? 0) === 0 && (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Users />
            </EmptyMedia>
            <EmptyTitle>{t('groups:list.empty')}</EmptyTitle>
            <EmptyDescription>{t('groups:list.emptyHint')}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(groups ?? []).map((group) => (
          <Link key={group.id} to={`/groups/${String(group.id)}`} className="block">
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardHeader>
                <CardTitle className="text-xl">{group.name}</CardTitle>
                <CardDescription>
                  {t('groups:list.members', { count: group.member_count })} ·{' '}
                  {t('groups:list.pets', { count: group.pet_count })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {group.viewer_role && (
                  <span className="text-sm text-muted-foreground">
                    {t(`groups:detail.role.${group.viewer_role}`)}
                  </span>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('groups:form.createTitle')}</DialogTitle>
          </DialogHeader>
          <Input
            value={name}
            onChange={(e) => {
              setName(e.target.value)
            }}
            placeholder={t('groups:form.namePlaceholder')}
            aria-label={t('groups:form.name')}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateOpen(false)
              }}
            >
              {t('common:actions.cancel')}
            </Button>
            <Button onClick={() => void handleCreate()} disabled={createGroup.isPending}>
              {createGroup.isPending ? t('groups:form.creating') : t('groups:form.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}
