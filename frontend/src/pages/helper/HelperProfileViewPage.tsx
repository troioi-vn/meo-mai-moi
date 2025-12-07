import { useQuery } from '@tanstack/react-query'
import { getHelperProfile } from '@/api/helper-profiles'
import { useParams, useNavigate } from 'react-router-dom'
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
import { ChevronLeft, MapPin, Eye, EyeOff, PawPrint, Baby, Home, Heart, User } from 'lucide-react'
import placeholderAvatar from '@/assets/images/default-avatar.webp'

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

  // Get location string
  const locationParts = [profile.city, profile.state, profile.country].filter(Boolean)
  const location = locationParts.join(', ') || 'Location not specified'

  // Get first photo URL for avatar
  const firstPhoto = photos[0]
  const avatarUrl = firstPhoto
    ? (firstPhoto.url ?? `/storage/${firstPhoto.path}`)
    : placeholderAvatar

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
              <Badge
                variant={profile.is_public ? 'default' : 'secondary'}
                className="w-fit text-xs mt-1"
              >
                {profile.is_public ? (
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    Public Profile
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <EyeOff className="h-3 w-3" />
                    Private Profile
                  </span>
                )}
              </Badge>
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

          {/* Availability */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold">Availability</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Home className="h-4 w-4" />
                  Can Foster
                </span>
                <Badge variant={profile.can_foster ? 'success' : 'secondary'}>
                  {profile.can_foster ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Heart className="h-4 w-4" />
                  Can Adopt
                </span>
                <Badge variant={profile.can_adopt ? 'success' : 'secondary'}>
                  {profile.can_adopt ? 'Yes' : 'No'}
                </Badge>
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
