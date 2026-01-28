import { useQuery } from '@tanstack/react-query'
import { getHelperProfilesId } from '@/api/generated/helper-profiles/helper-profiles'
import { useParams, useNavigate } from 'react-router-dom'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import type { HelperProfile } from '@/types/helper-profile'
import { HelperProfileViewHeader } from '@/components/helper/profile-view/HelperProfileViewHeader'
import { HelperProfileSummaryHeader } from '@/components/helper/profile-view/HelperProfileSummaryHeader'
import { HelperProfilePhotoGalleryCard } from '@/components/helper/profile-view/HelperProfilePhotoGalleryCard'
import { HelperProfilePlacementRequestsCard } from '@/components/helper/profile-view/HelperProfilePlacementRequestsCard'
import { HelperProfileRequestTypesCard } from '@/components/helper/profile-view/HelperProfileRequestTypesCard'
import { HelperProfilePetTypesCard } from '@/components/helper/profile-view/HelperProfilePetTypesCard'
import { HelperProfileDetailsCard } from '@/components/helper/profile-view/HelperProfileDetailsCard'
import { HelperProfileExperienceCard } from '@/components/helper/profile-view/HelperProfileExperienceCard'
import { HelperProfileContactInfoCard } from '@/components/helper/profile-view/HelperProfileContactInfoCard'

interface Photo {
  id: number
  path: string
  url?: string
}

export default function HelperProfileViewPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['helper-profile', id],
    queryFn: () => getHelperProfilesId(Number(id)),
    enabled: Boolean(id),
  })

  const handleEdit = () => {
    void navigate(`/helper/${id ?? ''}/edit`)
  }

  if (isLoading) {
    return <LoadingState message="Loading helper profile..." />
  }

  if (isError || !data) {
    return (
      <ErrorState
        error="Failed to load helper profile"
        onRetry={() => {
          void refetch()
        }}
      />
    )
  }

  const profile = data
  const photos = (profile.photos as Photo[] | undefined) ?? []
  const petTypes: NonNullable<HelperProfile['pet_types']> = profile.pet_types ?? []

  return (
    <div className="min-h-screen">
      <HelperProfileViewHeader helperName={profile.user?.name} onEdit={handleEdit} />

      {/* Main Content */}
      <main className="px-4 pb-8">
        <div className="max-w-lg mx-auto space-y-6">
          <HelperProfileSummaryHeader profile={profile} />

          <HelperProfilePhotoGalleryCard photos={photos} />

          <HelperProfilePlacementRequestsCard profile={profile} />

          <HelperProfileRequestTypesCard profile={profile} />

          <HelperProfilePetTypesCard petTypes={petTypes} />

          <HelperProfileDetailsCard profile={profile} />

          <HelperProfileExperienceCard experience={profile.experience} />

          <HelperProfileContactInfoCard contactInfo={profile.contact_info} />
        </div>
      </main>
    </div>
  )
}
