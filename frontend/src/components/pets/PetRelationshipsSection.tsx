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
  Copy,
  Check,
  LogOut,
  Share2,
  Plus,
  MessageSquare,
  ShieldCheck,
  Pencil,
  Eye,
  QrCode,
  Link as LinkIcon,
} from 'lucide-react'
import type { PetRelationship, RelationshipInvitation } from '@/types/pet'
import { format } from 'date-fns'
import { useTranslation } from 'react-i18next'
import { api } from '@/api/axios'
import { toast } from '@/lib/i18n-toast'
import { useCountdown } from '@/hooks/useCountdown'
import { useCreateChat } from '@/hooks/useMessaging'
import QRCode from 'qrcode'

const INVITATIONS_REFRESH_INTERVAL_MS = 10000

interface PetRelationshipsSectionProps {
  relationships: PetRelationship[]
  petId: number
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
  viewerPermissions,
  currentUserId,
  onRelationshipsChanged,
}) => {
  const { t } = useTranslation(['pets', 'common'])
  const navigate = useNavigate()
  const { create: createChat, creating: creatingChat } = useCreateChat()
  const canManagePeople = viewerPermissions?.can_manage_people ?? false
  const isOwner = viewerPermissions?.is_owner ?? false

  // Invitation state
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [selectedRole, setSelectedRole] = useState<string>('')
  const [creating, setCreating] = useState(false)
  const [createdInvitation, setCreatedInvitation] = useState<{
    invitation: RelationshipInvitation
    invitation_url: string
  } | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)

  // Callback ref: draws QR whenever the canvas mounts into the DOM
  const qrCanvasRef = useCallback(
    (canvas: HTMLCanvasElement | null) => {
      if (!canvas || !createdInvitation) return
      void QRCode.toCanvas(canvas, createdInvitation.invitation_url, {
        width: 200,
        margin: 2,
        color: { dark: '#000000', light: '#FFFFFF' },
        errorCorrectionLevel: 'M',
      })
    },
    [createdInvitation]
  )

  // Pending invitations
  const [pendingInvitations, setPendingInvitations] = useState<RelationshipInvitation[]>([])

  // Confirmation dialogs
  const [removeTarget, setRemoveTarget] = useState<PetRelationship | null>(null)
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const fetchPendingInvitations = useCallback(async (): Promise<RelationshipInvitation[]> => {
    if (!canManagePeople) return []
    try {
      const data = await api.get<RelationshipInvitation[]>(
        `/pets/${String(petId)}/relationship-invitations`
      )
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

  useEffect(() => {
    if (!createdInvitation) return

    const isStillPending = pendingInvitations.some(
      (inv) => inv.id === createdInvitation.invitation.id
    )
    if (!isStillPending) {
      setCreatedInvitation(null)
      setLinkCopied(false)
    }
  }, [createdInvitation, pendingInvitations])

  // Filter relationships for display
  const relevantRelationships = relationships.filter(
    (r) => r.relationship_type !== 'viewer' || !r.end_at
  )
  const activeRelationships = relevantRelationships.filter((r) => !r.end_at)
  const pastRelationships = relevantRelationships
    .filter((r): r is PetRelationship & { end_at: string } => !!r.end_at)
    .sort((a, b) => new Date(b.end_at).getTime() - new Date(a.end_at).getTime())

  const handleCreateInvitation = async () => {
    if (!selectedRole) return
    setCreating(true)
    try {
      const data = await api.post<{ invitation: RelationshipInvitation; invitation_url: string }>(
        `/pets/${String(petId)}/relationship-invitations`,
        { relationship_type: selectedRole }
      )
      setCreatedInvitation(data)
      setPendingInvitations((prev) => {
        const withoutCurrent = prev.filter((inv) => inv.id !== data.invitation.id)
        return [data.invitation, ...withoutCurrent]
      })
      toast.success(t('pets:invitation.created'))
      void fetchPendingInvitations()
    } catch {
      toast.error(t('pets:invitation.createError'))
    } finally {
      setCreating(false)
    }
  }

  const handleCopyLink = async () => {
    if (!createdInvitation) return
    try {
      await navigator.clipboard.writeText(createdInvitation.invitation_url)
      setLinkCopied(true)
      toast.success(t('pets:invitation.linkCopied'))
      setTimeout(() => {
        setLinkCopied(false)
      }, 2000)
    } catch {
      // Fallback for older browsers
    }
  }

  const handleRevokeInvitation = async (invitation: RelationshipInvitation) => {
    try {
      await api.delete(`/pets/${String(petId)}/relationship-invitations/${String(invitation.id)}`)
      toast.success(t('pets:invitation.revokeSuccess'))
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

  const handleLeave = async () => {
    setActionLoading(true)
    try {
      await api.post(`/pets/${String(petId)}/leave`)
      toast.success(t('pets:relationships.leaveSuccess'))
      setShowLeaveConfirm(false)
      onRelationshipsChanged?.()
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

  const handleShowInvitation = (inv: RelationshipInvitation) => {
    const url = `${window.location.origin}/pets/invite/${inv.token}`
    setCreatedInvitation({ invitation: inv, invitation_url: url })
    setShowAddDialog(true)
  }

  const handleCloseAddDialog = () => {
    setShowAddDialog(false)
    setSelectedRole('')
    setCreatedInvitation(null)
    setLinkCopied(false)
  }

  const handleStartChat = async (recipientId: number) => {
    const chat = await createChat(recipientId)
    if (chat) {
      void navigate(`/messages/${String(chat.id)}`)
    }
  }

  const renderRelationship = (rel: PetRelationship) => {
    const isSelf = currentUserId !== undefined && rel.user?.id === currentUserId
    const isRelOwner = rel.relationship_type === 'owner'
    const canRemove = canManagePeople && !isRelOwner && !isSelf && !rel.end_at
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
              <Badge variant="outline" className="capitalize text-[10px] h-5 px-1.5">
                {t(`pets:sharing.relationship.${rel.relationship_type}`)}
              </Badge>
              {canRemove && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => {
                    setRemoveTarget(rel)
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
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
      Icon: ShieldCheck,
    },
    {
      value: 'editor',
      label: t('pets:sharing.relationship.editor'),
      Icon: Pencil,
    },
    {
      value: 'viewer',
      label: t('pets:sharing.relationship.viewer'),
      Icon: Eye,
    },
  ]
  const selectedRoleDescription =
    selectedRole === 'owner'
      ? t('pets:relationships.coOwnerDescription')
      : selectedRole === 'editor'
        ? t('pets:relationships.editorDescription')
        : selectedRole === 'viewer'
          ? t('pets:relationships.viewerDescription')
          : ''

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
                        onClick={() => void handleRevokeInvitation(inv)}
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

      {/* Add Person Dialog */}
      <Dialog open={showAddDialog} onOpenChange={handleCloseAddDialog}>
        <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="text-xl">{t('pets:relationships.addPerson')}</DialogTitle>
            <DialogDescription className="pt-1">
              {t('pets:sharing.inviteDescription')}
            </DialogDescription>
          </DialogHeader>

          {!createdInvitation ? (
            <>
              <div className="px-6 py-5 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('pets:relationships.selectRole')}</label>
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
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

                {selectedRoleDescription && (
                  <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                    {selectedRoleDescription}
                  </div>
                )}
              </div>
              <DialogFooter className="px-6 pb-6 pt-0 sm:justify-between gap-2">
                <Button variant="ghost" onClick={handleCloseAddDialog}>
                  {t('common:actions.cancel', 'Cancel')}
                </Button>
                <Button
                  onClick={() => void handleCreateInvitation()}
                  disabled={!selectedRole || creating}
                >
                  {creating ? t('pets:invitation.creating') : t('pets:invitation.create')}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <div className="px-6 py-5 space-y-5">
              <div className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
                {t('pets:invitation.shareDescription')}
              </div>

              <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center rounded-xl border p-4">
                <div className="flex justify-center">
                  <canvas
                    ref={qrCanvasRef}
                    className="border rounded-lg"
                    width={200}
                    height={200}
                    style={{ display: 'block' }}
                  />
                </div>

                <div className="space-y-4 min-w-0">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <QrCode className="h-4 w-4 text-muted-foreground" />
                    <span>{t('pets:invitation.create')}</span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <LinkIcon className="h-3.5 w-3.5" />
                      <span>{t('pets:invitation.shareDescription')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        readOnly
                        value={createdInvitation.invitation_url}
                        className="flex-1 text-xs bg-muted rounded-md px-3 py-2 border"
                      />
                      <Button variant="outline" size="sm" onClick={() => void handleCopyLink()}>
                        {linkCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{t('pets:invitation.expiresIn')}</span>
                    <InvitationCountdown expiresAt={createdInvitation.invitation.expires_at} />
                  </div>
                </div>
              </div>

              <DialogFooter className="px-0 pb-0 pt-0">
                <Button variant="outline" onClick={handleCloseAddDialog}>
                  {t('common:actions.close', 'Close')}
                </Button>
              </DialogFooter>
            </div>
          )}
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
