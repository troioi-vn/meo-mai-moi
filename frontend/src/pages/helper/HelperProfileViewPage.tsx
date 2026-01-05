import { useMutation, useQuery } from '@tanstack/react-query'
import { getHelperProfile } from '@/api/helper-profiles'
import { confirmTransfer } from '@/api/placement'
import { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useParams, useNavigate, Link } from 'react-router-dom'
import type { Pet } from '@/types/pet'
import {
  PlacementResponseStatusLabels,
  PlacementRequestStatusLabels,
  PlacementRequestTypeLabels,
  TransferRequestStatusLabels,
} from '@/types/placement'
import type { TransferRequest } from '@/types/placement'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel'
import {
  ChevronLeft,
  MapPin,
  PawPrint,
  Baby,
  Home,
  Heart,
  User,
  ArrowRightLeft,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react'
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
  const { user } = useAuth()

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [selectedTransferId, setSelectedTransferId] = useState<number | null>(null)
  const [selectedPetName, setSelectedPetName] = useState<string>('')

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['helper-profile', id],
    queryFn: () => getHelperProfile(id ?? ''),
    enabled: Boolean(id),
  })

  const confirmTransferMutation = useMutation({
    mutationFn: (transferId: number) => confirmTransfer(transferId),
    onSuccess: () => {
      setConfirmDialogOpen(false)
      setSelectedTransferId(null)
      setSelectedPetName('')
      void refetch()
    },
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
  const isHelperViewingOwnProfile = Boolean(user?.id) && profile.user_id === user?.id

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

  // Normalize pet/placement data from placement responses
  const petPlacements = placementResponses
    .map((response) => {
      const placement = response.placement_request
      const pet = response.pet ?? placement?.pet
      if (!pet) return null

      const petPhoto =
        (Array.isArray((pet as { photos?: { url?: string }[] }).photos)
          ? (pet as { photos?: { url?: string }[] }).photos?.[0]?.url
          : undefined) ??
        pet.photo_url ??
        placeholderAvatar

      const placementStatus = placement?.status ?? ''
      const responseStatus = response.status
      const requestType = placement?.request_type ?? ''
      const transferRequests = placement?.transfer_requests ?? []

      return {
        id: `${String(response.id)}-${String(pet.id)}`,
        pet,
        petPhoto,
        placementStatus,
        responseStatus,
        requestType,
        message: response.message,
        respondedAt: response.responded_at,
        transferRequests,
      }
    })
    .filter(Boolean) as {
    id: string
    pet: Pet
    petPhoto: string
    placementStatus: string
    responseStatus: string
    requestType: string
    message?: string | null
    respondedAt?: string
    transferRequests: TransferRequest[]
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

          {/* Placement Responses */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold">Placement Responses</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {petPlacements.length === 0 && (
                <p className="text-sm text-muted-foreground">No placement responses yet.</p>
              )}
              {petPlacements.map((item) => (
                <Link
                  key={item.id}
                  to={`/pets/${String(item.pet.id)}`}
                  className="flex flex-col gap-3 rounded-lg border p-3 hover:bg-accent/60 transition-colors"
                >
                  <div className="flex items-center gap-3">
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
                          Request:{' '}
                          {PlacementRequestTypeLabels[item.requestType] ??
                            formatLabel(item.requestType)}
                        </Badge>
                        <Badge variant="default" className="rounded-full">
                          Placement:{' '}
                          {PlacementRequestStatusLabels[item.placementStatus] ??
                            formatLabel(item.placementStatus)}
                        </Badge>
                        <Badge variant="outline" className="rounded-full">
                          Response:{' '}
                          {PlacementResponseStatusLabels[item.responseStatus] ??
                            formatLabel(item.responseStatus)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  {item.message && (
                    <div className="text-sm text-muted-foreground bg-muted/30 p-2 rounded border-l-2 border-primary/30 italic">
                      &ldquo;{item.message}&rdquo;
                    </div>
                  )}
                  {item.respondedAt && (
                    <div className="text-[10px] text-muted-foreground text-right">
                      Responded on {new Date(item.respondedAt).toLocaleDateString()}
                    </div>
                  )}

                  {/* Transfer Requests */}
                  {item.transferRequests.length > 0 && (
                    <div className="mt-2 pt-2 border-t space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <ArrowRightLeft className="h-3 w-3" />
                        Transfers
                      </p>
                      <div className="grid gap-2">
                        {item.transferRequests.map((transfer) => {
                          const isToHelper = transfer.to_user_id === profile.user_id
                          const canConfirmReceived =
                            Boolean(profile.user_id) &&
                            isHelperViewingOwnProfile &&
                            isToHelper &&
                            transfer.status === 'pending' &&
                            !confirmTransferMutation.isPending

                          return (
                            <div
                              key={transfer.id}
                              className="flex items-center justify-between text-xs bg-muted/50 p-2 rounded"
                            >
                              <div className="flex items-center gap-2">
                                {isToHelper ? (
                                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                ) : (
                                  <ArrowLeft className="h-3 w-3 text-muted-foreground" />
                                )}
                                <span className="font-medium">
                                  {isToHelper ? 'Handover to Helper' : 'Return to Owner'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant={transfer.status === 'confirmed' ? 'default' : 'outline'}
                                  className="text-[10px] h-5"
                                >
                                  {TransferRequestStatusLabels[transfer.status] ?? transfer.status}
                                </Badge>

                                {canConfirmReceived && (
                                  <Button
                                    size="sm"
                                    variant="default"
                                    className="h-7 px-2 text-[10px]"
                                    onClick={(e) => {
                                      e.preventDefault()
                                      e.stopPropagation()
                                      setSelectedTransferId(transfer.id)
                                      setSelectedPetName(item.pet.name)
                                      setConfirmDialogOpen(true)
                                    }}
                                  >
                                    Confirm
                                  </Button>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </Link>
              ))}
            </CardContent>
          </Card>

          <AlertDialog
            open={confirmDialogOpen}
            onOpenChange={(open) => {
              if (confirmTransferMutation.isPending) return
              setConfirmDialogOpen(open)
              if (!open) {
                setSelectedTransferId(null)
                setSelectedPetName('')
              }
            }}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Are you sure you have received the pet {selectedPetName}?
                </AlertDialogTitle>
                <AlertDialogDescription />
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={confirmTransferMutation.isPending}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  disabled={selectedTransferId == null || confirmTransferMutation.isPending}
                  onClick={(e) => {
                    e.preventDefault()
                    if (selectedTransferId == null) return
                    confirmTransferMutation.mutate(selectedTransferId)
                  }}
                >
                  Confirm
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

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
