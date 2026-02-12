import React, { useState, useEffect, useCallback } from 'react'
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
import { User as UserIcon, Calendar, Plus, X, Clock, Copy, Check, LogOut, Share2 } from 'lucide-react'
import type { PetRelationship, RelationshipInvitation } from '@/types/pet'
import { format } from 'date-fns'
import { useTranslation } from 'react-i18next'
import { api } from '@/api/axios'
import { toast } from '@/lib/i18n-toast'
import { useCountdown } from '@/hooks/useCountdown'
import QRCode from 'qrcode'

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

  const fetchPendingInvitations = useCallback(async () => {
    if (!canManagePeople) return
    try {
      const data = await api.get<RelationshipInvitation[]>(`/pets/${String(petId)}/relationship-invitations`)
      setPendingInvitations(data)
    } catch {
      // Silently fail
    }
  }, [petId, canManagePeople])

  useEffect(() => {
    void fetchPendingInvitations()
  }, [fetchPendingInvitations])

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
      setTimeout(() => { setLinkCopied(false) }, 2000)
    } catch {
      // Fallback for older browsers
    }
  }

  const handleRevokeInvitation = async (invitation: RelationshipInvitation) => {
    try {
      await api.delete(
        `/pets/${String(petId)}/relationship-invitations/${String(invitation.id)}`
      )
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

  const renderRelationship = (rel: PetRelationship) => {
    const isSelf = currentUserId !== undefined && rel.user?.id === currentUserId
    const isRelOwner = rel.relationship_type === 'owner'
    const canRemove = canManagePeople && !isRelOwner && !isSelf && !rel.end_at

    return (
      <div key={rel.id} className="flex items-start gap-3 py-3 border-b last:border-0">
        <div className="bg-muted p-2 rounded-full shrink-0">
          <UserIcon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium truncate">
              {rel.user?.name ?? t('pets:relationships.unknownUser')}
              {isSelf && (
                <span className="text-muted-foreground text-xs ml-1">
                  ({t('common:you', 'you')})
                </span>
              )}
            </p>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="capitalize text-[10px] h-5 px-1.5">
                {t(`pets:sharing.relationship.${rel.relationship_type}`)}
              </Badge>
              {canRemove && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => { setRemoveTarget(rel) }}
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
                  onClick={() => { setShowLeaveConfirm(true) }}
                >
                  <LogOut className="h-3 w-3 mr-1" />
                  {t('pets:relationships.leave')}
                </Button>
              )}
              {canManagePeople && (
                <Button variant="outline" size="sm" onClick={() => { setShowAddDialog(true) }}>
                  <Plus className="h-3 w-3 mr-1" />
                  {t('pets:relationships.addPerson')}
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
                        onClick={() => { handleShowInvitation(inv) }}
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
        </CardContent>
      </Card>

      {/* Add Person Dialog */}
      <Dialog open={showAddDialog} onOpenChange={handleCloseAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('pets:relationships.addPerson')}</DialogTitle>
            <DialogDescription>{t('pets:sharing.inviteDescription')}</DialogDescription>
          </DialogHeader>

          {!createdInvitation ? (
            <>
              <div className="space-y-3">
                <label className="text-sm font-medium">{t('pets:relationships.selectRole')}</label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('pets:relationships.selectRole')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owner">
                      <div>
                        <span className="font-medium">{t('pets:relationships.coOwner')}</span>
                        <p className="text-xs text-muted-foreground">
                          {t('pets:relationships.coOwnerDescription')}
                        </p>
                      </div>
                    </SelectItem>
                    <SelectItem value="editor">
                      <div>
                        <span className="font-medium">
                          {t('pets:sharing.relationship.editor')}
                        </span>
                        <p className="text-xs text-muted-foreground">
                          {t('pets:relationships.editorDescription')}
                        </p>
                      </div>
                    </SelectItem>
                    <SelectItem value="viewer">
                      <div>
                        <span className="font-medium">
                          {t('pets:sharing.relationship.viewer')}
                        </span>
                        <p className="text-xs text-muted-foreground">
                          {t('pets:relationships.viewerDescription')}
                        </p>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => void handleCreateInvitation()}
                  disabled={!selectedRole || creating}
                >
                  {creating
                    ? t('pets:invitation.creating')
                    : t('pets:invitation.create')}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                {t('pets:invitation.shareDescription')}
              </div>

              {/* QR Code */}
              <div className="flex justify-center py-4">
                <canvas
                  ref={qrCanvasRef}
                  className="border rounded-lg"
                  width={200}
                  height={200}
                  style={{ display: 'block' }}
                />
              </div>

              {/* Link + copy */}
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={createdInvitation.invitation_url}
                  className="flex-1 text-xs bg-muted rounded-md px-3 py-2 border"
                />
                <Button variant="outline" size="sm" onClick={() => void handleCopyLink()}>
                  {linkCopied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {/* Countdown */}
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <span>{t('pets:invitation.expiresIn')}</span>
                <InvitationCountdown expiresAt={createdInvitation.invitation.expires_at} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Remove User Confirmation */}
      <AlertDialog open={!!removeTarget} onOpenChange={() => { setRemoveTarget(null) }}>
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
