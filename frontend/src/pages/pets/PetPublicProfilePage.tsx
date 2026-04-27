import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { Info, Eye, Mars, Venus, LogOut, Images } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { api } from '@/api/axios'
import { toast } from '@/lib/i18n-toast'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { PublicPlacementRequestSection } from '@/components/placement/public-profile/PublicPlacementRequestSection'
import { PetPhotoCarouselModal } from '@/components/pets/PetPhotoGallery'
import { useGetPetsIdView, getGetPetsIdViewQueryKey } from '@/api/generated/pets/pets'
import { useQueryClient } from '@tanstack/react-query'
import type { PublicPetResponse as PublicPet } from '@/api/generated/model'
import axios from 'axios'
import type { ErrorType } from '@/api/orval-mutator'
import placeholderImage from '@/assets/images/default-avatar.webp'
import type { PetPhoto } from '@/types/pet'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const getPublicPhotoUrl = (photo: unknown): string | undefined => {
  if (!isRecord(photo)) return undefined
  return typeof photo.url === 'string' && photo.url ? photo.url : undefined
}

const getPublicPetTypeName = (petType: unknown): string | undefined => {
  if (!isRecord(petType)) return undefined
  return typeof petType.name === 'string' && petType.name ? petType.name : undefined
}

const getPublicCategory = (category: unknown): { id: React.Key; name: string } | null => {
  if (!isRecord(category) || typeof category.name !== 'string' || !category.name) {
    return null
  }

  const categoryId =
    typeof category.id === 'string' || typeof category.id === 'number' ? category.id : category.name

  return {
    id: categoryId,
    name: category.name,
  }
}

// Helper function to format pet age from public pet data
const formatPublicPetAge = (
  pet: PublicPet,
  t: (key: string, options?: Record<string, unknown>) => string
): string => {
  const precision = pet.birthday_precision ?? 'unknown'
  const today = new Date()

  switch (precision) {
    case 'day': {
      if (pet.birthday_year && pet.birthday_month && pet.birthday_day) {
        const birthDate = new Date(pet.birthday_year, pet.birthday_month - 1, pet.birthday_day)
        let years = today.getFullYear() - birthDate.getFullYear()
        const monthDiff = today.getMonth() - birthDate.getMonth()
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          years--
        }
        return t('pets:age.year', { count: years })
      }
      return t('pets:age.unknown')
    }
    case 'month': {
      if (!pet.birthday_year || !pet.birthday_month) return t('pets:age.unknown')
      const years =
        today.getFullYear() -
        pet.birthday_year -
        (today.getMonth() + 1 < pet.birthday_month ? 1 : 0)
      if (years <= 0) {
        const monthsDiff =
          (today.getFullYear() - pet.birthday_year) * 12 +
          (today.getMonth() + 1 - pet.birthday_month)
        const monthText = t('pets:age.month', { count: monthsDiff })
        return t('pets:age.approx', { text: monthText })
      }
      const yearText = t('pets:age.year', { count: years })
      return t('pets:age.approxSymbol', { text: yearText })
    }
    case 'year': {
      if (!pet.birthday_year) return t('pets:age.unknown')
      const years = today.getFullYear() - pet.birthday_year
      if (years <= 0) {
        return t('pets:age.lessThanYearApprox')
      }
      const yearText = t('pets:age.year', { count: years })
      return t('pets:age.approxSymbol', { text: yearText })
    }
    case 'unknown':
    default:
      return t('pets:age.unknown')
  }
}

// Helper function to derive image URL from public pet data
const derivePublicPetImageUrl = (pet: PublicPet): string => {
  if (Array.isArray(pet.photos) && pet.photos.length > 0) {
    const photoUrl = getPublicPhotoUrl(pet.photos[0])
    if (photoUrl) return photoUrl
  }
  return pet.photo_url ?? placeholderImage
}

// Helper function to format location
const formatLocation = (pet: PublicPet, fallback: string): string => {
  // In PublicPetResponse, city is a string (not a City object)
  const cityName = pet.city ?? undefined
  const parts = [cityName, pet.state, pet.country].filter(Boolean)
  return parts.join(', ') || fallback
}

const getPublicPetErrorMessage = (id: string | undefined, queryError: ErrorType<void>): string => {
  if (!id) return 'No pet ID provided'

  if (axios.isAxiosError<{ message?: string }>(queryError)) {
    if (queryError.response?.status === 403) {
      return queryError.response.data.message ?? 'This pet profile is not publicly available.'
    }

    if (queryError.response?.status === 404) {
      return 'Pet not found'
    }
  }

  return 'Failed to load pet information'
}

const PetPublicProfilePage: React.FC = () => {
  const { t } = useTranslation(['common', 'pets'])
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const petId = id ? Number(id) : 0
  const {
    data: pet,
    isLoading: loading,
    isError,
    error: queryError,
  } = useGetPetsIdView(petId, {
    query: { enabled: petId > 0 },
  })
  const error = isError ? getPublicPetErrorMessage(id, queryError) : null
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [leaveLoading, setLeaveLoading] = useState(false)

  const handleLeave = async () => {
    if (!id) return
    setLeaveLoading(true)
    try {
      await api.post(`/pets/${id}/leave`)
      toast.success(t('pets:relationships.leaveSuccess'))
      setShowLeaveConfirm(false)
      void navigate('/', { replace: true })
    } catch {
      toast.error(t('pets:relationships.leaveError'))
    } finally {
      setLeaveLoading(false)
    }
  }

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: getGetPetsIdViewQueryKey(petId) })
  }

  if (loading) {
    return <LoadingState message={t('common:petPublicProfile.loading')} />
  }

  if (error) {
    return (
      <ErrorState
        error={error}
        onRetry={() => {
          void navigate('/')
        }}
      />
    )
  }

  if (!pet) {
    return (
      <ErrorState
        error="Pet not found"
        onRetry={() => {
          void navigate('/')
        }}
      />
    )
  }

  const viewerPermissions = (pet.viewer_permissions ?? {}) as {
    is_owner?: boolean
    is_viewer?: boolean
    has_active_relationship?: boolean
  }
  const petTypeName = getPublicPetTypeName(pet.pet_type) ?? ''
  const categories = (pet.categories ?? []).flatMap((category) => {
    const normalized = getPublicCategory(category)
    return normalized ? [normalized] : []
  })
  const photos: PetPhoto[] = (pet.photos ?? []).flatMap((photo, index) => {
    const url = getPublicPhotoUrl(photo)
    if (!url) return []
    return [
      {
        id: index,
        url,
        thumb_url: url,
        is_primary: index === 0,
      },
    ]
  })

  const isOwner = Boolean(viewerPermissions.is_owner)
  const isViewer = Boolean(viewerPermissions.is_viewer)
  const hasActiveRelationship = Boolean(viewerPermissions.has_active_relationship)
  const showViewerBanner = hasActiveRelationship && isViewer && !isOwner
  const imageUrl = derivePublicPetImageUrl(pet)
  const ageDisplay = formatPublicPetAge(pet, t)
  const isLost = pet.status === 'lost'
  const isDeceased = pet.status === 'deceased'
  const hasActivePlacementRequests = (pet.placement_requests ?? []).some(
    (pr) => pr.status === 'open'
  )

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* Navigation Buttons */}
      <div className="px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/">{t('common:petPublicProfile.home')}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{pet.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </div>

      {/* Main Content */}
      <main className="px-4 pb-8">
        <div className="max-w-lg mx-auto space-y-6">
          {/* Owner viewing public profile banner */}
          {isOwner && (
            <Alert variant="default">
              <Eye className="h-4 w-4" />
              <AlertDescription>{t('common:petPublicProfile.viewingOwnPet')}</AlertDescription>
            </Alert>
          )}

          {/* Viewer access banner with Leave option */}
          {showViewerBanner && (
            <Alert variant="default">
              <Eye className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>{t('pets:relationships.viewerBanner')}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowLeaveConfirm(true)
                  }}
                >
                  <LogOut className="h-3 w-3 mr-1" />
                  {t('pets:relationships.leave')}
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Lost pet banner */}
          {isLost && (
            <Alert
              variant="default"
              className="border-yellow-500/50 bg-yellow-500/10 text-yellow-700"
            >
              <Info className="h-4 w-4" />
              <AlertDescription className="text-yellow-700">
                {t('common:petPublicProfile.lostPetAlert')}
              </AlertDescription>
            </Alert>
          )}

          {/* Pet Profile Header */}
          <section className="flex items-center gap-4">
            <div className="shrink-0 relative">
              <button
                type="button"
                onClick={() => {
                  if (pet.photos && pet.photos.length > 0) {
                    setGalleryOpen(true)
                  }
                }}
                className={`w-24 h-24 rounded-full overflow-hidden border-4 border-border transition-opacity ${pet.photos && pet.photos.length > 0 ? 'cursor-pointer hover:opacity-90' : ''}`}
              >
                <img
                  src={imageUrl}
                  alt={pet.name}
                  className={`w-full h-full object-cover ${isDeceased ? 'grayscale' : ''}`}
                />
              </button>
              {pet.photos && pet.photos.length >= 2 && (
                <div
                  className="absolute bottom-1 right-1 bg-black/60 text-white px-1.5 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 pointer-events-none"
                  aria-label={t('pets:photos.photoCount', { count: pet.photos.length })}
                >
                  <Images className="h-3 w-3" />
                  {pet.photos.length}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-bold text-foreground">{pet.name}</h1>
              <p className="text-muted-foreground">{ageDisplay}</p>
              {petTypeName && (
                <Badge variant="secondary" className="w-fit">
                  {petTypeName}
                </Badge>
              )}
            </div>
          </section>

          {/* Placement Requests Section - first after header for public view */}
          {hasActivePlacementRequests && (
            <PublicPlacementRequestSection pet={pet} onRefresh={refresh} />
          )}

          {/* Pet Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold">
                {t('common:petPublicProfile.details')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {pet.sex && pet.sex !== 'not_specified' && (
                <div className="flex justify-between text-sm items-center">
                  <span className="text-muted-foreground">{t('common:petPublicProfile.sex')}</span>
                  <span className="font-medium">
                    {pet.sex === 'male' ? (
                      <Mars className="h-4 w-4 text-blue-500" />
                    ) : (
                      <Venus className="h-4 w-4 text-pink-500" />
                    )}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {t('common:petPublicProfile.location')}
                </span>
                <span className="font-medium">
                  {formatLocation(pet, t('common:petPublicProfile.locationNotSpecified'))}
                </span>
              </div>
              {categories.length > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {t('common:petPublicProfile.categories')}
                  </span>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {categories.map((cat) => (
                      <Badge key={cat.id} variant="outline" className="text-xs">
                        {cat.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Description */}
          {pet.description && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold">
                  {t('common:petPublicProfile.about')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {pet.description}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {photos.length > 0 && (
        <PetPhotoCarouselModal
          photos={photos}
          open={galleryOpen}
          onOpenChange={setGalleryOpen}
          onPetUpdate={() => {
            void queryClient.invalidateQueries({ queryKey: getGetPetsIdViewQueryKey(petId) })
          }}
          initialIndex={0}
        />
      )}

      {/* Leave Confirmation Dialog */}
      <AlertDialog open={showLeaveConfirm} onOpenChange={setShowLeaveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('pets:relationships.leaveConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('pets:relationships.leaveConfirmDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={leaveLoading}>
              {t('common:actions.cancel', 'Cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleLeave()}
              disabled={leaveLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('pets:relationships.leave')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default PetPublicProfilePage
