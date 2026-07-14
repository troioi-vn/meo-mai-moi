import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PlusCircle, Settings2 } from 'lucide-react'
import { useGroup } from '@/api/groups'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingState } from '@/components/ui/LoadingState'
import { MediaImage } from '@/components/ui/MediaImage'

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
      <div className="container mx-auto px-4 py-8">
        <p className="text-destructive">{t('groups:messages.error')}</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link to="/groups">{t('groups:list.title')}</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{group.name}</h1>
          <p className="text-sm text-muted-foreground">
            {t('groups:list.members', { count: group.member_count })} ·{' '}
            {t('groups:list.pets', { count: group.pet_count })}
            {group.viewer_role ? ` · ${t(`groups:detail.role.${group.viewer_role}`)}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {group.viewer_role === 'admin' && (
            <Button asChild>
              <Link to={`/pets/create?group_id=${String(group.id)}`}>
                <PlusCircle className="mr-2 h-4 w-4" />
                {t('groups:detail.createPet')}
              </Link>
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link to={`/groups/${String(group.id)}/settings`}>
              <Settings2 className="mr-2 h-4 w-4" />
              {t('groups:detail.settings')}
            </Link>
          </Button>
        </div>
      </div>

      <section className="mb-10">
        <h2 className="mb-3 text-xl font-semibold">{t('groups:detail.pets')}</h2>
        {group.pets.length === 0 ? (
          <p className="text-muted-foreground">{t('groups:detail.noPets')}</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {group.pets.map((pet) =>
              pet.id == null ? null : (
                <Link key={pet.id} to={`/pets/${String(pet.id)}`} className="block">
                  <Card className="overflow-hidden pt-0">
                    <MediaImage
                      src={pet.photo_url ?? ''}
                      alt={pet.name ?? ''}
                      aspect="square"
                      className="aspect-square w-full object-cover"
                    />
                    <CardContent className="p-3">
                      <p className="truncate font-medium">{pet.name}</p>
                      {pet.pet_type?.name && (
                        <p className="text-xs text-muted-foreground">{pet.pet_type.name}</p>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              )
            )}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">{t('groups:detail.members')}</h2>
        <div className="space-y-2">
          {group.members.map((member) => (
            <Card key={member.user_id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 py-3">
                <CardTitle className="text-base font-medium">
                  {member.user?.name ?? `#${String(member.user_id)}`}
                </CardTitle>
                {member.role && (
                  <Badge variant="secondary">{t(`groups:detail.role.${member.role}`)}</Badge>
                )}
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
