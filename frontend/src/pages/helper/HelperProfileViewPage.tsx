import { useQuery } from '@tanstack/react-query'
import { getHelperProfile } from '@/api/helper-profiles'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { PlacementResponseStatusLabels } from '@/types/placement'
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
import { ChevronLeft, ChevronRight, MapPin, PawPrint, Baby, Home, Heart, User } from 'lucide-react'
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
  const placementResponses = profile.placement_responses ?? []

  // Get location string
  const cityNames =
    profile.cities && profile.cities.length > 0
      ? profile.cities.map((c) => c.name).join(', ')
      : typeof profile.city === 'string'
        ? profile.city
        : profile.city?.name
  const locationParts = [cityNames, profile.state, profile.country].filter(Boolean)
  const location = locationParts.join(', ') || 'Location not specified'

  // Get first photo URL for avatar
  const firstPhoto = photos[0]
  const avatarUrl = firstPhoto
    ? (firstPhoto.url ?? `/storage/${firstPhoto.path}`)
    : placeholderAvatar

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Active</Badge>
      case 'archived':
        return <Badge variant="secondary">Archived</Badge>
      case 'deleted':
        return <Badge variant="destructive">Deleted</Badge>
      default:
        return null
    }
  }

  const placementRequests = placementResponses
    .map((response) => {
      const placementRequest = response.placement_request
      const placementRequestId = placementRequest?.id ?? response.placement_request_id
      if (!placementRequestId) return null

      const petName = response.pet?.name ?? placementRequest?.pet?.name ?? 'Unknown'
      const ownerName =
        (placementRequest as { owner?: { name?: string } } | undefined)?.owner?.name ??
        (placementRequest as { user?: { name?: string } } | undefined)?.user?.name ??
        response.pet?.user?.name ??
        'Unknown'

      const placementRequestStatus = placementRequest?.status
      const ownerUserId = placementRequest?.user_id
      const helperUserId = profile.user_id
      const transferRequests = Array.isArray(placementRequest?.transfer_requests)
        ? placementRequest?.transfer_requests
        : []

      const isActionRequired =
        placementRequestStatus === 'pending_transfer' &&
        Boolean(ownerUserId) &&
        Boolean(helperUserId) &&
        transferRequests.some(
          (t) =>
            t.status === 'pending' &&
            t.from_user_id === ownerUserId &&
            t.to_user_id === helperUserId
        )

      return {
        id: placementRequestId,
        ownerName,
        petName,
        respondedAt: response.responded_at,
        status: response.status,
        isActionRequired,
      }
    })
    .filter(Boolean)
    .sort((a, b) => {
      const aTime = a.respondedAt ? new Date(a.respondedAt).getTime() : 0
      const bTime = b.respondedAt ? new Date(b.respondedAt).getTime() : 0
      return bTime - aTime
    }) as {
    id: number
    ownerName: string
    petName: string
    respondedAt?: string
    status: string
    isActionRequired: boolean
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
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-foreground">
                  {profile.user?.name ?? 'Helper'}
                </h1>
                {getStatusBadge(profile.status)}
              </div>
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

          {/* Placement Requests */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold">Placement Requests</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {placementRequests.length === 0 && (
                <p className="text-sm text-muted-foreground">No placement requests yet.</p>
              )}
              {placementRequests.map((item) => (
                <Link
                  key={item.id}
                  to={`/requests/${String(item.id)}`}
                  aria-label={`Open placement request ${String(item.id)} for ${item.petName}`}
                  className="block rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="p-4 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Owner
                          </p>
                          <p className="text-sm font-medium truncate">{item.ownerName}</p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Pet
                          </p>
                          <p className="text-sm font-medium truncate">{item.petName}</p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Responded
                          </p>
                          <p className="text-sm font-medium">
                            {item.respondedAt
                              ? new Date(item.respondedAt).toLocaleDateString('en-US')
                              : '—'}
                          </p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Status
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <Badge variant="outline">
                              {PlacementResponseStatusLabels[item.status] ??
                                formatLabel(item.status)}
                            </Badge>
                            <Badge
                              className={
                                item.isActionRequired
                                  ? 'bg-amber-500 text-white hover:bg-amber-500'
                                  : 'bg-muted text-foreground hover:bg-muted'
                              }
                            >
                              {item.isActionRequired ? 'Action required' : 'Waiting'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>

                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
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
                {profile.request_types?.includes('foster_paid') && (
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
                {profile.request_types?.includes('pet_sitting') && (
                  <Badge variant="default" className="text-sm">
                    <Heart className="h-3 w-3 mr-1" />
                    Pet Sitting
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
