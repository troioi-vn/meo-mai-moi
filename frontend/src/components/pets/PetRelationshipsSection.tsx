import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  User as UserIcon,
  Calendar,
  X,
  Clock,
  LogOut,
  Share2,
  Plus,
  MessageSquare,
  ShieldCheck,
  Pencil,
  Eye,
} from 'lucide-react'
import type { PetRelationship, RelationshipSuggestionUser } from '@/types/pet'
import type {
  CreatePetResourceInvitationPayload,
  ManagedPetResourceInvitation,
} from '@/api/generated/model'
import { format } from 'date-fns'
import { useTranslation } from 'react-i18next'
import { api } from '@/api/axios'
import {
  deletePetsPetInvitationsInvitation,
  getPetsPetInvitations,
  postPetsPetInvitations,
} from '@/api/generated/resource-invitations/resource-invitations'
import { getPetsPetRelationshipSuggestions, postPetsPetUsers } from '@/api/generated/pets/pets'
import { toast } from '@/lib/i18n-toast'
import { useCountdown } from '@/hooks/useCountdown'
import { useCreateChat } from '@/hooks/useMessaging'
import { forgetLeftPet } from '@/lib/pet-cache'
import { useQueryClient } from '@tanstack/react-query'
import {
  ResourceSharingDialog,
  type SharingInvitation,
} from '@/components/sharing/ResourceSharingDialog'
import { RevokeInvitationDialog } from '@/components/sharing/RevokeInvitationDialog'

const INVITATIONS_REFRESH_INTERVAL_MS = 10000

interface PetRelationshipsSectionProps {
  relationships: PetRelationship[]
  petId: number
  petName: string
  viewerPermissions?: {
    can_edit?: boolean
    is_owner?: boolean
    is_editor?: boolean
    is_viewer?: boolean
    can_manage_people?: boolean
  }
  currentUserId?: number
  onRelationshipsChanged?: () => void
}

const InvitationCountdown: React.FC<{ expiresAt: string; onExpired?: () => void }> = ({
  expiresAt,
  onExpired,
}) => {
  const { formatted, isExpired } = useCountdown(expiresAt, onExpired)
  const { t } = useTranslation(['pets'])

  if (isExpired) {
    return (
      <span className="text-xs text-destructive font-medium">{t('pets:invitation.expired')}</span>
    )
  }

  return (
    <span className="text-xs text-muted-foreground font-mono flex items-center gap-1">
      <Clock className="h-3 w-3" />
      {formatted}
    </span>
  )
}

export const PetRelationshipsSection: React.FC<PetRelationshipsSectionProps> = ({
  relationships,
  petId,
  petName,
  viewerPermissions,
  currentUserId,
  onRelationshipsChanged,
}) => {
  const { t } = useTranslation(['pets', 'common'])
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { create: createChat, creating: creatingChat } = useCreateChat()
  const canManagePeople = viewerPermissions?.can_manage_people ?? false
  const isOwner = viewerPermissions?.is_owner ?? false

  // Invitation state
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [initialInvitation, setInitialInvitation] = useState<SharingInvitation | null>(null)
  const [revokeTarget, setRevokeTarget] = useState<ManagedPetResourceInvitation | null>(null)
  const [manageTarget, setManageTarget] = useState<PetRelationship | null>(null)
  const [manageRole, setManageRole] = useState('')
  const [manageLoading, setManageLoading] = useState(false)

  // Pending invitations
  const [pendingInvitations, setPendingInvitations] = useState<ManagedPetResourceInvitation[]>([])

  // Confirmation dialogs
  const [removeTarget, setRemoveTarget] = useState<PetRelationship | null>(null)
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const fetchPendingInvitations = useCallback(async (): Promise<ManagedPetResourceInvitation[]> => {
    if (!canManagePeople) return []
    try {
      const data = await getPetsPetInvitations(petId)
      setPendingInvitations(data)
      return data
    } catch {
      // Silently fail
      return []
    }
  }, [petId, canManagePeople])

  useEffect(() => {
    void fetchPendingInvitations()
  }, [fetchPendingInvitations])

  useEffect(() => {
    if (!canManagePeople) return

    const interval = window.setInterval(() => {
      void fetchPendingInvitations()
    }, INVITATIONS_REFRESH_INTERVAL_MS)

    return () => {
      window.clearInterval(interval)
    }
  }, [canManagePeople, fetchPendingInvitations])

  const fetchSuggestions = useCallback(async (): Promise<RelationshipSuggestionUser[]> => {
    if (!canManagePeople) return []
    try {
      return await getPetsPetRelationshipSuggestions(petId)
    } catch {
      throw new Error('Failed to load sharing suggestions')
    }
  }, [petId, canManagePeople])

  // Filter relationships for display
  const relevantRelationships = relationships.filter(
    (r) => r.relationship_type !== 'viewer' || !r.end_at
  )
  const activeRelationships = relevantRelationships.filter((r) => !r.end_at)
  const pastRelationships = relevantRelationships
    .filter((r): r is PetRelationship & { end_at: string } => !!r.end_at)
    .sort((a, b) => new Date(b.end_at).getTime() - new Date(a.end_at).getTime())

  const handleRevokeInvitation = async () => {
    if (!revokeTarget) return
    try {
      await deletePetsPetInvitationsInvitation(petId, revokeTarget.id)
      toast.success(t('pets:invitation.revokeSuccess'))
      setRevokeTarget(null)
      void fetchPendingInvitations()
    } catch {
      toast.error(t('pets:invitation.revokeError'))
    }
  }

  const handleRemoveUser = async () => {
    if (!removeTarget?.user) return
    setActionLoading(true)
    try {
      await api.delete(`/pets/${String(petId)}/users/${String(removeTarget.user.id)}`)
      toast.success(t('pets:relationships.removeSuccess', { name: removeTarget.user.name }))
      setRemoveTarget(null)
      onRelationshipsChanged?.()
    } catch {
      toast.error(t('pets:relationships.removeError'))
    } finally {
      setActionLoading(false)
    }
  }

  const handleUpdateRole = async () => {
    if (!manageTarget?.user || !manageRole) return
    setManageLoading(true)
    try {
      await api.put(`/pets/${String(petId)}/users/${String(manageTarget.user.id)}`, {
        relationship_type: manageRole,
      })
      toast.success(t('pets:relationships.updateSuccess', { name: manageTarget.user.name }))
      setManageTarget(null)
      setManageRole('')
      onRelationshipsChanged?.()
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } }).response?.status
      if (status === 409) {
        toast.error(t('pets:relationships.lastOwnerError'))
      } else {
        toast.error(t('pets:relationships.updateError'))
      }
    } finally {
      setManageLoading(false)
    }
  }

  const handleRemoveManagedUser = async () => {
    if (!manageTarget?.user) return
    setManageLoading(true)
    try {
      await api.delete(`/pets/${String(petId)}/users/${String(manageTarget.user.id)}`)
      toast.success(t('pets:relationships.removeSuccess', { name: manageTarget.user.name }))
      setManageTarget(null)
      setManageRole('')
      onRelationshipsChanged?.()
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } }).response?.status
      if (status === 409) {
        toast.error(t('pets:relationships.lastOwnerError'))
      } else {
        toast.error(t('pets:relationships.removeError'))
      }
    } finally {
      setManageLoading(false)
    }
  }

  const handleLeave = async () => {
    setActionLoading(true)
    try {
      await api.post(`/pets/${String(petId)}/leave`)
      toast.success(t('pets:relationships.leaveSuccess'))
      setShowLeaveConfirm(false)
      await forgetLeftPet(queryClient, petId)
      onRelationshipsChanged?.()
      void navigate('/', { replace: true })
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } }).response?.status
      if (status === 409) {
        toast.error(t('pets:relationships.lastOwnerError'))
      } else {
        toast.error(t('pets:relationships.leaveError'))
      }
    } finally {
      setActionLoading(false)
    }
  }

  const handleShowInvitation = (inv: ManagedPetResourceInvitation) => {
    setInitialInvitation({
      id: inv.id,
      invitationUrl: inv.invitation_url,
      expiresAt: inv.expires_at,
      role: inv.relationship_type,
    })
    setShowAddDialog(true)
  }

  const handleCloseAddDialog = () => {
    setShowAddDialog(false)
    setInitialInvitation(null)
  }

  const handleStartChat = async (recipientId: number) => {
    const chat = await createChat(recipientId)
    if (chat) {
      void navigate(`/messages/${String(chat.id)}`)
    }
  }

  const renderRelationship = (rel: PetRelationship) => {
    const isSelf = currentUserId !== undefined && rel.user?.id === currentUserId
    const isEditableSharingRole = ['owner', 'editor', 'viewer'].includes(rel.relationship_type)
    const canManageRelationship = canManagePeople && isEditableSharingRole && !isSelf && !rel.end_at
    const userId = rel.user?.id

    return (
      <div key={rel.id} className="flex items-start gap-3 py-3 border-b last:border-0">
        <div className="bg-muted p-2 rounded-full shrink-0">
          <UserIcon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium truncate">
                {rel.user?.name ?? t('pets:relationships.unknownUser')}
                {isSelf && (
                  <span className="text-muted-foreground text-xs ml-1">
                    ({t('common:you', 'you')})
                  </span>
                )}
              </p>
              {!isSelf && userId && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={() => void handleStartChat(userId)}
                  disabled={creatingChat}
                  title={t('pets:relationships.sendMessage')}
                >
                  <MessageSquare className="h-3 w-3" />
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {canManageRelationship ? (
                <button
                  type="button"
                  className="inline-flex h-5 items-center rounded-md border px-1.5 text-[10px] capitalize transition-colors hover:bg-muted"
                  onClick={() => {
                    setManageTarget(rel)
                    setManageRole(rel.relationship_type)
                  }}
                >
                  {t(`pets:sharing.relationship.${rel.relationship_type}`)}
                </button>
              ) : (
                <Badge variant="outline" className="capitalize text-[10px] h-5 px-1.5">
                  {t(`pets:sharing.relationship.${rel.relationship_type}`)}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
            <Calendar className="h-3 w-3" />
            <span>
              {format(new Date(rel.start_at), 'MMM d, yyyy')}
              {rel.end_at
                ? ` - ${format(new Date(rel.end_at), 'MMM d, yyyy')}`
                : ` - ${t('pets:relationships.present')}`}
            </span>
          </div>
        </div>
      </div>
    )
  }

  const ownerCount = activeRelationships.filter((r) => r.relationship_type === 'owner').length
  const showLeaveButton =
    currentUserId !== undefined &&
    activeRelationships.some((r) => r.user?.id === currentUserId) &&
    (!isOwner || ownerCount > 1)

  const roleOptions = [
    {
      value: 'owner',
      label: t('pets:relationships.coOwner'),
      description: t('pets:relationships.coOwnerDescription'),
      Icon: ShieldCheck,
    },
    {
      value: 'editor',
      label: t('pets:sharing.relationship.editor'),
      description: t('pets:relationships.editorDescription'),
      Icon: Pencil,
    },
    {
      value: 'viewer',
      label: t('pets:sharing.relationship.viewer'),
      description: t('pets:relationships.viewerDescription'),
      Icon: Eye,
    },
  ]
  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-foreground">
              {t('pets:relationships.title')}
            </CardTitle>
            <div className="flex items-center gap-2">
              {showLeaveButton && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowLeaveConfirm(true)
                  }}
                >
                  <LogOut className="h-3 w-3 mr-1" />
                  {t('pets:relationships.leave')}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Pending invitations (owner only) */}
          {canManagePeople && pendingInvitations.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {t('pets:invitation.pending')}
              </h3>
              <div className="space-y-1">
                {pendingInvitations.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="capitalize text-[10px] h-5 px-1.5">
                        {t(`pets:sharing.relationship.${inv.relationship_type}`)}
                      </Badge>
                      <InvitationCountdown
                        expiresAt={inv.expires_at}
                        onExpired={() => void fetchPendingInvitations()}
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => {
                          handleShowInvitation(inv)
                        }}
                      >
                        <Share2 className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => {
                          setRevokeTarget(inv)
                        }}
                        aria-label={t('pets:invitation.revoke')}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Current relationships */}
          {activeRelationships.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {t('pets:relationships.current')}
              </h3>
              <div className="space-y-1">{activeRelationships.map(renderRelationship)}</div>
            </div>
          )}

          {/* History */}
          {pastRelationships.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {t('pets:relationships.history')}
              </h3>
              <div className="space-y-1">{pastRelationships.map(renderRelationship)}</div>
            </div>
          )}

          {canManagePeople && (
            <Button
              variant="outline"
              className="w-full mt-3"
              onClick={() => {
                setShowAddDialog(true)
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t('pets:relationships.addPerson')}
            </Button>
          )}
        </CardContent>
      </Card>

      <ResourceSharingDialog
        open={showAddDialog}
        onOpenChange={(open) => {
          if (open) setShowAddDialog(true)
          else handleCloseAddDialog()
        }}
        targetName={petName}
        description={t('pets:sharing.inviteDescription')}
        roles={roleOptions}
        defaultRole="owner"
        initialInvitation={initialInvitation}
        loadSuggestions={fetchSuggestions}
        createInvitation={async (role) => {
          const data: CreatePetResourceInvitationPayload = await postPetsPetInvitations(petId, {
            relationship_type: role as 'owner' | 'editor' | 'viewer',
          })
          setPendingInvitations((previous) => [
            data.invitation,
            ...previous.filter((item) => item.id !== data.invitation.id),
          ])
          return {
            id: data.invitation.id,
            invitationUrl: data.invitation_url,
            expiresAt: data.invitation.expires_at,
            role: data.invitation.relationship_type,
          }
        }}
        addSuggested={async (userId, role) => {
          await postPetsPetUsers(petId, {
            user_id: userId,
            relationship_type: role as 'owner' | 'editor' | 'viewer',
          })
        }}
        onChanged={() => {
          void fetchPendingInvitations()
          onRelationshipsChanged?.()
        }}
      />

      <RevokeInvitationDialog
        open={revokeTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRevokeTarget(null)
        }}
        onConfirm={handleRevokeInvitation}
      />

      {/* Manage User Dialog */}
      <Dialog
        open={!!manageTarget}
        onOpenChange={(open) => {
          if (!open) {
            setManageTarget(null)
            setManageRole('')
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t('pets:relationships.managePerson', {
                name: manageTarget?.user?.name ?? t('pets:relationships.unknownUser'),
              })}
            </DialogTitle>
            <DialogDescription>{t('pets:relationships.managePersonDescription')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <label className="text-sm font-medium">{t('pets:relationships.selectRole')}</label>
            <Select value={manageRole} onValueChange={setManageRole}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder={t('pets:relationships.selectRole')} />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map(({ value, label, Icon }) => (
                  <SelectItem key={value} value={value} textValue={label}>
                    <div className="flex items-center gap-2 py-0.5">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              variant="destructive"
              onClick={() => void handleRemoveManagedUser()}
              disabled={manageLoading}
            >
              {t('pets:relationships.remove')}
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setManageTarget(null)
                  setManageRole('')
                }}
                disabled={manageLoading}
              >
                {t('common:actions.cancel', 'Cancel')}
              </Button>
              <Button
                onClick={() => void handleUpdateRole()}
                disabled={
                  !manageRole || manageLoading || manageRole === manageTarget?.relationship_type
                }
              >
                {manageLoading ? t('common:actions.loading') : t('common:actions.save', 'Save')}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove User Confirmation */}
      <AlertDialog
        open={!!removeTarget}
        onOpenChange={() => {
          setRemoveTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('pets:relationships.removeConfirmTitle', {
                name: removeTarget?.user?.name ?? '',
              })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('pets:relationships.removeConfirmDescription', {
                name: removeTarget?.user?.name ?? '',
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>
              {t('common:actions.cancel', 'Cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleRemoveUser()}
              disabled={actionLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('pets:relationships.remove')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Leave Confirmation */}
      <AlertDialog open={showLeaveConfirm} onOpenChange={setShowLeaveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('pets:relationships.leaveConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('pets:relationships.leaveConfirmDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>
              {t('common:actions.cancel', 'Cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleLeave()}
              disabled={actionLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('pets:relationships.leave')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
