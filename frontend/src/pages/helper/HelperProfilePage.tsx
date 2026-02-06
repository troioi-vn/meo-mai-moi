import { useTranslation } from 'react-i18next'
import { useGetHelperProfiles } from '@/api/generated/helper-profiles/helper-profiles'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { HelperProfilesHeader } from '@/components/helper/profile-list/HelperProfilesHeader'
import { HelperProfilesEmptyStateCard } from '@/components/helper/profile-list/HelperProfilesEmptyStateCard'
import { HelperProfileListItem } from '@/components/helper/profile-list/HelperProfileListItem'
import type { HelperProfile } from '@/types/helper-profile'

export default function HelperProfilePage() {
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const { data, isLoading, isError, refetch } = useGetHelperProfiles()

  if (isLoading) {
    return <LoadingState message={t('helperProfiles.loading')} />
  }

  if (isError) {
    return (
      <ErrorState
        error={t('helperProfiles.loadError')}
        onRetry={() => {
          void refetch()
        }}
      />
    )
  }

  // Cast to local HelperProfile type which has all needed fields
  const profiles = (data ?? []) as unknown as HelperProfile[]
  const activeProfiles = profiles.filter((p) => p.status === 'active' || !p.status)
  const archivedProfiles = profiles.filter((p) => p.status === 'archived')

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <main className="px-4 py-8">
        <div className="max-w-lg mx-auto space-y-6">
          <HelperProfilesHeader
            onCreate={() => {
              void navigate('/helper/create')
            }}
            showCreateButton={profiles.length > 0}
          />

          {/* Profiles List */}
          {profiles.length === 0 ? (
            <HelperProfilesEmptyStateCard
              onCreate={() => {
                void navigate('/helper/create')
              }}
            />
          ) : (
            <div className="space-y-6">
              {activeProfiles.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-semibold">
                      {t('helperProfiles.activeProfiles')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {activeProfiles.map((profile) => (
                      <HelperProfileListItem key={profile.id} profile={profile} />
                    ))}
                  </CardContent>
                </Card>
              )}

              {archivedProfiles.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-semibold">
                      {t('helperProfiles.archivedProfiles')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {archivedProfiles.map((profile) => (
                      <HelperProfileListItem key={profile.id} profile={profile} />
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
