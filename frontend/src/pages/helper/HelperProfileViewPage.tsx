import { useQuery } from '@tanstack/react-query'
import { getHelperProfile } from '@/api/helper-profiles'
import { useParams, useNavigate, Link } from 'react-router-dom'
import type { Pet } from '@/types/pet'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel'
import { ChevronLeft, MapPin, PawPrint, Baby, Home, Heart, User } from 'lucide-react'
import placeholderAvatar from '@/assets/images/default-avatar.webp'

const formatLabel = (value: string, fallback = 'Unknown') =>
  value ? value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : fallback

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
    queryFn: () => getHelperProfile(id ?? ''),
    enabled: Boolean(id),
  })

  const handleBack = () => {
    void navigate(-1)
  }

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

  const profile = data.data
  const photos = (profile.photos as Photo[] | undefined) ?? []
  const petTypes = profile.pet_types ?? []
  const transferRequests = profile.transfer_requests ?? []

  // Get location string
  const cityName = typeof profile.city === 'string' ? profile.city : profile.city?.name
  const locationParts = [cityName, profile.state, profile.country].filter(Boolean)
  const location = locationParts.join(', ') || 'Location not specified'

  // Get first photo URL for avatar
  const firstPhoto = photos[0]
  const avatarUrl = firstPhoto
    ? (firstPhoto.url ?? `/storage/${firstPhoto.path}`)
    : placeholderAvatar

  // Normalize pet/placement data from transfer requests
  const petPlacements = transferRequests
    .map((tr) => {
      const placement = tr.placement_request
      const pet = tr.pet ?? placement?.pet
      if (!pet) return null

      const petPhoto =
        (Array.isArray((pet as { photos?: { url?: string }[] }).photos)
          ? (pet as { photos?: { url?: string }[] }).photos?.[0]?.url
          : undefined) ??
        pet.photo_url ??
        placeholderAvatar

      const placementStatus = placement?.status ?? ''
      const transferStatus = tr.status ?? ''
      const requestType = placement?.request_type ?? ''

      return {
        id: `${String(tr.id)}-${String(pet.id)}`,
        pet,
        petPhoto,
        placementStatus,
        transferStatus,
        requestType,
      }
    })
    .filter(Boolean) as {
    id: string
    pet: Pet
    petPhoto: string
    placementStatus: string
    transferStatus: string
    requestType: string
  }[]

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <div className="px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <Button
            variant="ghost"
            size="default"
            onClick={handleBack}
            className="flex items-center gap-1 -ml-2 text-base"
          >
            <ChevronLeft className="h-6 w-6" />
            Back
          </Button>
          <Button variant="ghost" size="default" onClick={handleEdit} className="text-base">
            Edit
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <main className="px-4 pb-8">
        <div className="max-w-lg mx-auto space-y-6">
          {/* Profile Header */}
          <section className="flex items-center gap-4">
            <div className="shrink-0">
              <img
                src={avatarUrl}
                alt={`${profile.user?.name ?? 'Helper'}'s profile`}
                className="w-24 h-24 rounded-full object-cover border-4 border-border"
              />
            </div>
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-bold text-foreground">
                {profile.user?.name ?? 'Helper'}
              </h1>
              <div className="flex items-center gap-1 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span className="text-sm">{location}</span>
              </div>
            </div>
          </section>

          {/* Photo Gallery */}
          {photos.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold">Photos</CardTitle>
              </CardHeader>
              <CardContent>
                <Carousel className="w-full">
                  <CarouselContent>
                    {photos.map((photo) => (
                      <CarouselItem key={photo.id}>
                        <div className="aspect-video rounded-lg overflow-hidden">
                          <img
                            src={photo.url ?? `/storage/${photo.path}`}
                            alt="Helper profile photo"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  {photos.length > 1 && (
                    <>
                      <CarouselPrevious className="left-2" />
                      <CarouselNext className="right-2" />
                    </>
                  )}
                </Carousel>
              </CardContent>
            </Card>
          )}

          {/* Pets via placement requests */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold">Pets</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {petPlacements.length === 0 && (
                <p className="text-sm text-muted-foreground">No pets linked to this profile yet.</p>
              )}
              {petPlacements.map((item) => (
                <Link
                  key={item.id}
                  to={`/pets/${String(item.pet.id)}`}
                  className="flex items-center gap-3 rounded-lg border p-3 hover:bg-accent/60 transition-colors"
                >
                  <img
                    src={item.petPhoto}
                    alt={item.pet.name}
                    className="h-12 w-12 rounded-md object-cover border"
                  />
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-foreground truncate">{item.pet.name}</p>
                      <Badge variant="outline" className="shrink-0">
                        {item.pet.pet_type.name}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <Badge variant="secondary" className="rounded-full">
                        Request: {formatLabel(item.requestType, 'N/A')}
                      </Badge>
                      <Badge variant="default" className="rounded-full">
                        Placement: {formatLabel(item.placementStatus, 'Unknown')}
                      </Badge>
                      <Badge variant="outline" className="rounded-full">
                        Transfer: {formatLabel(item.transferStatus, 'Unknown')}
                      </Badge>
                    </div>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>

          {/* Request Types */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold">Request Types</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {profile.request_types?.includes('foster_payed') && (
                  <Badge variant="default" className="text-sm">
                    <Home className="h-3 w-3 mr-1" />
                    Foster (Paid)
                  </Badge>
                )}
                {profile.request_types?.includes('foster_free') && (
                  <Badge variant="default" className="text-sm">
                    <Home className="h-3 w-3 mr-1" />
                    Foster (Free)
                  </Badge>
                )}
                {profile.request_types?.includes('permanent') && (
                  <Badge variant="default" className="text-sm">
                    <Heart className="h-3 w-3 mr-1" />
                    Permanent Adoption
                  </Badge>
                )}
                {(!profile.request_types || profile.request_types.length === 0) && (
                  <span className="text-sm text-muted-foreground">No request types specified</span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Pet Types */}
          {petTypes.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold">Pet Types</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {petTypes.map((pt) => (
                    <Badge key={pt.id} variant="outline" className="text-sm">
                      {pt.name}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <PawPrint className="h-4 w-4" />
                  Has Pets
                </span>
                <span className="font-medium">{profile.has_pets ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Baby className="h-4 w-4" />
                  Has Children
                </span>
                <span className="font-medium">{profile.has_children ? 'Yes' : 'No'}</span>
              </div>
            </CardContent>
          </Card>

          {/* Experience */}
          {profile.experience && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Experience
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {profile.experience}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Contact Info */}
          {profile.contact_info && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold">Contact Info</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {profile.contact_info}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
