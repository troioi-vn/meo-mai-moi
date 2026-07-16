import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Pencil, PlusCircle } from 'lucide-react'
import { useGroup } from '@/api/groups'
import { PetCardCompact } from '@/components/pets/PetCardCompact'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AppBreadcrumbs, PageContainer, PageHeader } from '@/components/layout/PageLayout'
import { LoadingState } from '@/components/ui/LoadingState'

export default function GroupDetailPage() {
  const { groupId: groupIdParam } = useParams<{ groupId: string }>()
  const groupId = Number(groupIdParam)
  const { t } = useTranslation(['groups', 'common'])
  const {
    data: group,
    isLoading,
    isError,
  } = useGroup(Number.isFinite(groupId) ? groupId : undefined)

  if (isLoading) {
    return <LoadingState message={t('groups:detail.title')} />
  }

  if (isError || !group) {
    return (
      <PageContainer width="wide">
        <p className="text-destructive">{t('groups:messages.error')}</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link to="/groups">{t('groups:list.title')}</Link>
        </Button>
      </PageContainer>
    )
  }

  return (
    <PageContainer width="wide">
      <AppBreadcrumbs
        items={[
          { label: t('common:nav.home'), to: '/' },
          { label: t('groups:list.title'), to: '/groups' },
          { label: group.name },
        ]}
      />

      <PageHeader
        className="mb-6"
        title={group.name}
        description={
          <>
            {t('groups:list.members', { count: group.member_count })} ·{' '}
            {t('groups:list.pets', { count: group.pet_count })}
            {group.viewer_role ? ` · ${t(`groups:detail.role.${group.viewer_role}`)}` : ''}
          </>
        }
        actions={
          <>
            {group.viewer_role === 'admin' && (
              <Button asChild>
                <Link to={`/pets/create?group_id=${String(group.id)}`}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  {t('groups:detail.createPet')}
                </Link>
              </Button>
            )}
            <Button
              variant="outline"
              size="icon"
              aria-label={t('groups:detail.settings')}
              title={t('groups:detail.settings')}
              asChild
            >
              <Link to={`/groups/${String(group.id)}/settings`}>
                <Pencil className="h-4 w-4" />
              </Link>
            </Button>
          </>
        }
      />

      <section className="mb-10">
        {group.pets.length === 0 ? (
          <p className="text-muted-foreground">{t('groups:detail.noPets')}</p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
            {group.pets.map((pet) =>
              pet.id == null || pet.name == null ? null : (
                <PetCardCompact key={pet.id} pet={{ ...pet, id: pet.id, name: pet.name }} />
              )
            )}
          </div>
        )}
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>{t('groups:detail.members')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {group.members.map((member) => (
              <div
                key={member.user_id}
                className="flex items-center justify-between gap-3 rounded-md border p-3"
              >
                <span className="font-medium">
                  {member.user?.name ?? `#${String(member.user_id)}`}
                </span>
                {member.role && (
                  <Badge variant="secondary">{t(`groups:detail.role.${member.role}`)}</Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </PageContainer>
  )
}
