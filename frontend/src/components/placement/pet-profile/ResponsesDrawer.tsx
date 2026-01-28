import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import {
  User,
  Eye,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MessageCircle,
} from 'lucide-react'
import type { PlacementRequestResponse } from '@/types/placement'
import { formatRequestType } from '@/types/placement'
import type { HelperProfile } from '@/types/helper-profile'
import { api } from '@/api/axios'
import { toast } from 'sonner'
import { useCreateChat } from '@/hooks/useMessaging'

interface ResponsesDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  responses: PlacementRequestResponse[]
  requestType: string
  placementRequestId: number
  onAccept: (responseId: number) => void | Promise<void>
  onReject: (responseId: number) => void | Promise<void>
  initialResponseId?: number
  openProfileOnOpen?: boolean
  showDecisionActions?: boolean
}

export function ResponsesDrawer({
  open,
  onOpenChange,
  responses,
  requestType,
  placementRequestId,
  onAccept,
  onReject,
  initialResponseId,
  openProfileOnOpen = false,
  showDecisionActions = true,
}: ResponsesDrawerProps) {
  const navigate = useNavigate()
  const { create: createChat, creating: creatingChat } = useCreateChat()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [viewingProfile, setViewingProfile] = useState(false)
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [profileData, setProfileData] = useState<HelperProfile | null>(null)
  const [actionLoading, setActionLoading] = useState<'accept' | 'reject' | null>(null)

  const currentResponse = responses[currentIndex]
  const hasMultiple = responses.length > 1

  const handleViewProfile = useCallback(async () => {
    if (!currentResponse?.helper_profile_id) return
    setLoadingProfile(true)
    try {
      const res = await api.get<HelperProfile>(
        `helper-profiles/${String(currentResponse.helper_profile_id)}`
      )
      setProfileData(res)
      setViewingProfile(true)
    } catch (error) {
      console.error('Failed to load helper profile', error)
      toast.error('Failed to load helper profile')
    } finally {
      setLoadingProfile(false)
    }
  }, [currentResponse?.helper_profile_id])

  // When opening, jump to a specific response if requested.
  useEffect(() => {
    if (!open) return
    if (!initialResponseId) return
    const idx = responses.findIndex((r) => r.id === initialResponseId)
    if (idx >= 0) {
      setCurrentIndex(idx)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialResponseId])

  // Optionally auto-open the helper profile view when the drawer opens.
  useEffect(() => {
    if (!open) return
    if (!openProfileOnOpen) return
    if (!currentResponse?.helper_profile_id) return
    if (viewingProfile) return
    if (loadingProfile) return
    if (profileData) return
    void handleViewProfile()
  }, [
    open,
    openProfileOnOpen,
    currentResponse?.helper_profile_id,
    viewingProfile,
    loadingProfile,
    profileData,
    handleViewProfile,
  ])

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : responses.length - 1))
    setViewingProfile(false)
    setProfileData(null)
  }

  const goToNext = () => {
    setCurrentIndex((prev) => (prev < responses.length - 1 ? prev + 1 : 0))
    setViewingProfile(false)
    setProfileData(null)
  }

  const handleChatWithHelper = useCallback(async () => {
    const helperUserId = currentResponse?.helper_profile?.user?.id
    if (!helperUserId) {
      toast.error('Cannot start chat: helper information not available')
      return
    }
    const chat = await createChat(helperUserId, 'PlacementRequest', placementRequestId)
    if (chat) {
      onOpenChange(false)
      void navigate(`/messages/${String(chat.id)}`)
    }
  }, [
    currentResponse?.helper_profile?.user?.id,
    placementRequestId,
    createChat,
    navigate,
    onOpenChange,
  ])

  const handleAccept = async () => {
    if (!currentResponse) return
    setActionLoading('accept')
    try {
      await onAccept(currentResponse.id)
      // If there are more responses, move to next; otherwise close
      if (responses.length === 1) {
        onOpenChange(false)
      } else if (currentIndex >= responses.length - 1) {
        setCurrentIndex(0)
      }
      setViewingProfile(false)
      setProfileData(null)
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async () => {
    if (!currentResponse) return
    setActionLoading('reject')
    try {
      await onReject(currentResponse.id)
      // If there are more responses, stay at current or adjust index
      if (responses.length === 1) {
        onOpenChange(false)
      } else if (currentIndex >= responses.length - 1) {
        setCurrentIndex(Math.max(0, responses.length - 2))
      }
      setViewingProfile(false)
      setProfileData(null)
    } finally {
      setActionLoading(null)
    }
  }

  // Reset state when drawer closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setCurrentIndex(0)
      setViewingProfile(false)
      setProfileData(null)
    }
    onOpenChange(newOpen)
  }

  if (!currentResponse) return null

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="border-b">
          <div className="flex items-center justify-between">
            <div />
            <Badge variant="secondary">{formatRequestType(requestType)}</Badge>
          </div>
          <DrawerTitle>{viewingProfile ? 'Helper Profile' : 'Responses'}</DrawerTitle>
          <DrawerDescription>
            {viewingProfile
              ? `Viewing ${profileData?.user?.name ?? 'helper'}'s profile`
              : `${String(responses.length)} ${responses.length === 1 ? 'person' : 'people'} responded to your request`}
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex-1 overflow-auto p-4">
          {viewingProfile && profileData ? (
            // Profile view
            <div className="space-y-4">
              {/* Response message from helper */}
              {currentResponse.message && (
                <div className="rounded-lg border p-3 bg-muted/50">
                  <p className="font-semibold mb-2 text-sm">Message from Helper</p>
                  <p className="text-sm whitespace-pre-line">{currentResponse.message}</p>
                </div>
              )}

              {/* Profile details */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p>
                    <span className="text-muted-foreground">Name:</span>{' '}
                    {profileData.user?.name ?? 'N/A'}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Email:</span>{' '}
                    {profileData.user?.email ?? 'N/A'}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Phone:</span>{' '}
                    {profileData.phone_number ?? profileData.phone ?? 'N/A'}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Location:</span>{' '}
                    {[
                      typeof profileData.city === 'object'
                        ? profileData.city.name
                        : profileData.city,
                      profileData.state,
                      profileData.country,
                    ]
                      .filter(Boolean)
                      .join(', ') || 'N/A'}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Has pets:</span>{' '}
                    {profileData.has_pets ? 'Yes' : 'No'}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Has children:</span>{' '}
                    {profileData.has_children ? 'Yes' : 'No'}
                  </p>
                </div>

                {profileData.experience && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Experience</p>
                    <p className="text-sm whitespace-pre-line">{profileData.experience}</p>
                  </div>
                )}

                {profileData.about && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">About</p>
                    <p className="text-sm whitespace-pre-line">{profileData.about}</p>
                  </div>
                )}

                {Array.isArray(profileData.photos) && profileData.photos.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Photos</p>
                    <Carousel className="w-full">
                      <CarouselContent>
                        {profileData.photos.map((ph) => {
                          const photo = ph as { id?: number; path?: string; url?: string }
                          const key = photo.id ? String(photo.id) : (photo.path ?? '')
                          const src = photo.url ?? (photo.path ? `/storage/${photo.path}` : '')
                          return (
                            <CarouselItem key={key}>
                              <div className="aspect-video rounded-lg overflow-hidden border bg-muted">
                                <img
                                  src={src}
                                  alt="Helper"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            </CarouselItem>
                          )
                        })}
                      </CarouselContent>
                      {profileData.photos.length > 1 && (
                        <>
                          <CarouselPrevious className="left-2" />
                          <CarouselNext className="right-2" />
                        </>
                      )}
                    </Carousel>
                  </div>
                )}
              </div>
            </div>
          ) : (
            // Response card view
            <div className="space-y-4">
              {/* Navigation for multiple responses */}
              {hasMultiple && (
                <div className="flex items-center justify-between">
                  <Button variant="outline" size="sm" onClick={goToPrevious}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {currentIndex + 1} of {responses.length}
                  </span>
                  <Button variant="outline" size="sm" onClick={goToNext}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Current response card */}
              <div className="rounded-lg border p-4 bg-background space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                    <User className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold">
                      {currentResponse.helper_profile?.user?.name ?? 'Unknown Helper'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {[currentResponse.helper_profile?.city, currentResponse.helper_profile?.state]
                        .filter(Boolean)
                        .join(', ') || 'Location not specified'}
                    </p>
                  </div>
                </div>

                {/* Response message */}
                {currentResponse.message && (
                  <div className="rounded-md bg-muted/50 p-3">
                    <p className="text-sm text-muted-foreground mb-1">Message:</p>
                    <p className="text-sm whitespace-pre-line">{currentResponse.message}</p>
                  </div>
                )}

                {/* Response timestamp */}
                <p className="text-xs text-muted-foreground">
                  Responded {new Date(currentResponse.responded_at).toLocaleDateString()}
                </p>

                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    variant="outline"
                    className="w-full sm:flex-1"
                    onClick={() => void handleViewProfile()}
                    disabled={loadingProfile}
                  >
                    {loadingProfile ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4 mr-2" />
                        View Profile
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full sm:flex-1"
                    onClick={() => void handleChatWithHelper()}
                    disabled={creatingChat || !currentResponse.helper_profile?.user?.id}
                  >
                    {creatingChat ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Starting...
                      </>
                    ) : (
                      <>
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Chat
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        <DrawerFooter className="border-t">
          {showDecisionActions && (
            <div className="flex flex-col sm:flex-row gap-2 w-full">
              <Button
                variant="default"
                className="w-full sm:flex-1"
                onClick={() => void handleAccept()}
                disabled={actionLoading !== null}
              >
                {actionLoading === 'accept' ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Accept
              </Button>
              <Button
                variant="destructive"
                className="w-full sm:flex-1"
                onClick={() => void handleReject()}
                disabled={actionLoading !== null}
              >
                {actionLoading === 'reject' ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <X className="h-4 w-4 mr-2" />
                )}
                Reject
              </Button>
            </div>
          )}
          <DrawerClose asChild>
            <Button variant="outline">Close</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
