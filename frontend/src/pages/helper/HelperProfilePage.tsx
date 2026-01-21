import { useQuery } from '@tanstack/react-query'
import { getHelperProfiles } from '@/api/helper-profiles'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { HelperProfilesHeader } from '@/components/helper/profile-list/HelperProfilesHeader'
import { HelperProfilesEmptyStateCard } from '@/components/helper/profile-list/HelperProfilesEmptyStateCard'
import { HelperProfileListItem } from '@/components/helper/profile-list/HelperProfileListItem'

export default function HelperProfilePage() {
  const navigate = useNavigate()
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['helper-profiles'],
    queryFn: getHelperProfiles,
  })

  if (isLoading) {
    return <LoadingState message="Loading helper profiles..." />
  }

  if (isError) {
    return (
      <ErrorState
        error="Failed to load helper profiles"
        onRetry={() => {
          void refetch()
        }}
      />
    )
  }

  const profiles = data?.data ?? []
  const activeProfiles = profiles.filter((p) => p.status === 'active' || !p.status)
  const archivedProfiles = profiles.filter((p) => p.status === 'archived')

  return (
    <div className="min-h-screen">
      <main className="px-4 py-8">
        <div className="max-w-lg mx-auto space-y-6">
          <HelperProfilesHeader
            onCreate={() => {
              void navigate('/helper/create')
            }}
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
                    <CardTitle className="text-lg font-semibold">Active Profiles</CardTitle>
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
                    <CardTitle className="text-lg font-semibold">Archived Profiles</CardTitle>
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
