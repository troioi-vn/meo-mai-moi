import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Check, Copy, Clock } from 'lucide-react'
import {
  useCreateGroupInvitation,
  useDeleteGroup,
  useGroup,
  useGroupInvitations,
  useLeaveGroup,
  useRemoveGroupMember,
  useRemoveGroupPet,
  useRevokeGroupInvitation,
  useUpdateGroup,
  useUpdateGroupMember,
  type GroupRole,
} from '@/api/groups'
import { clearGroupContextSelection, writeGroupContextSelection } from '@/lib/group-context'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { LoadingState } from '@/components/ui/LoadingState'
import { toast } from '@/lib/i18n-toast'
import { useCountdown } from '@/hooks/useCountdown'
import { useAuth } from '@/hooks/use-auth'
import QRCode from 'qrcode'

function InvitationCountdown({ expiresAt }: { expiresAt: string }) {
  const { formatted, isExpired } = useCountdown(expiresAt)
  const { t } = useTranslation('groups')
  if (isExpired) {
    return <span className="text-xs text-destructive">{t('messages.error')}</span>
  }
  return (
    <span className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
      <Clock className="h-3 w-3" />
      {formatted}
    </span>
  )
}

export default function GroupSettingsPage() {
  const { groupId: groupIdParam } = useParams<{ groupId: string }>()
  const groupId = Number(groupIdParam)
  const { t } = useTranslation(['groups', 'common'])
  const navigate = useNavigate()
  const { user } = useAuth()
  const {
    data: group,
    isLoading,
    isError,
  } = useGroup(Number.isFinite(groupId) ? groupId : undefined)
  const invitationsQuery = useGroupInvitations(Number.isFinite(groupId) ? groupId : undefined)
  const updateGroup = useUpdateGroup(groupId)
  const deleteGroup = useDeleteGroup()
  const leaveGroup = useLeaveGroup()
  const removePet = useRemoveGroupPet(groupId)
  const updateMember = useUpdateGroupMember(groupId)
  const removeMember = useRemoveGroupMember(groupId)
  const createInvitation = useCreateGroupInvitation(groupId)
  const revokeInvitation = useRevokeGroupInvitation(groupId)

  const [name, setName] = useState('')
  const [inviteRole, setInviteRole] = useState<GroupRole>('member')
  const [inviteOpen, setInviteOpen] = useState(false)
  const [createdInviteUrl, setCreatedInviteUrl] = useState<string | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [removePetId, setRemovePetId] = useState<number | null>(null)
  const [removeMemberId, setRemoveMemberId] = useState<number | null>(null)

  useEffect(() => {
    if (group?.name) setName(group.name)
  }, [group?.name])

  const isAdmin = group?.viewer_role === 'admin'
  const removePetTarget = group?.pets.find((p) => p.id === removePetId)
  const removeMemberTarget = group?.members.find((m) => m.user_id === removeMemberId)

  const qrCanvasRef = useCallback(
    (canvas: HTMLCanvasElement | null) => {
      if (!canvas || !createdInviteUrl) return
      void QRCode.toCanvas(canvas, createdInviteUrl, {
        width: 200,
        margin: 2,
        color: { dark: '#000000', light: '#FFFFFF' },
        errorCorrectionLevel: 'M',
      })
    },
    [createdInviteUrl]
  )

  const resetToAllPets = () => {
    clearGroupContextSelection()
    writeGroupContextSelection('all')
    void navigate('/', { replace: true })
  }

  const handleSaveName = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      toast.error('groups:form.nameRequired')
      return
    }
    try {
      await updateGroup.mutateAsync({ name: trimmed })
      toast.success('groups:messages.updated')
    } catch {
      toast.error('groups:messages.error')
    }
  }

  const handleCreateInvite = async () => {
    try {
      const result = await createInvitation.mutateAsync(inviteRole)
      setCreatedInviteUrl(result.invitation_url)
      toast.success('groups:messages.inviteCreated')
    } catch {
      toast.error('groups:messages.error')
    }
  }

  const handleCopyLink = async () => {
    if (!createdInviteUrl) return
    try {
      await navigator.clipboard.writeText(createdInviteUrl)
      setLinkCopied(true)
      toast.success('groups:messages.linkCopied')
      window.setTimeout(() => {
        setLinkCopied(false)
      }, 2000)
    } catch {
      toast.error('groups:messages.error')
    }
  }

  const handleLeave = async () => {
    try {
      await leaveGroup.mutateAsync(groupId)
      toast.success('groups:messages.left')
      resetToAllPets()
    } catch {
      toast.error('groups:messages.error')
    }
  }

  const handleDelete = async () => {
    try {
      await deleteGroup.mutateAsync(groupId)
      toast.success('groups:messages.deleted')
      resetToAllPets()
    } catch {
      toast.error('groups:messages.error')
    }
  }

  if (isLoading) {
    return <LoadingState message={t('groups:settings.title')} />
  }

  if (isError || !group) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-destructive">{t('groups:messages.error')}</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t('groups:settings.title')}</h1>
        <Button variant="outline" asChild>
          <Link to={`/groups/${String(group.id)}`}>{t('groups:settings.back')}</Link>
        </Button>
      </div>

      {!isAdmin && (
        <p className="mb-6 text-sm text-muted-foreground">{t('groups:settings.adminOnly')}</p>
      )}

      {isAdmin && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">{t('groups:settings.name')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value)
              }}
              placeholder={t('groups:settings.namePlaceholder')}
              className="max-w-sm"
            />
            <Button onClick={() => void handleSaveName()} disabled={updateGroup.isPending}>
              {t('groups:settings.saveName')}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">{t('groups:settings.pets')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {group.pets.length === 0 && (
            <p className="text-sm text-muted-foreground">{t('groups:detail.noPets')}</p>
          )}
          {group.pets.map((pet) =>
            pet.id == null ? null : (
              <div key={pet.id} className="flex items-center justify-between gap-2">
                <Link
                  to={`/pets/${String(pet.id)}`}
                  className="font-medium text-primary hover:underline"
                >
                  {pet.name}
                </Link>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setRemovePetId(pet.id ?? null)
                    }}
                  >
                    {t('groups:settings.removePet')}
                  </Button>
                )}
              </div>
            )
          )}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">{t('groups:settings.members')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {group.members.map((member) => (
            <div key={member.user_id} className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {member.user?.name ?? `#${String(member.user_id)}`}
                </span>
                {member.role && (
                  <Badge variant="secondary">{t(`groups:detail.role.${member.role}`)}</Badge>
                )}
              </div>
              {isAdmin && member.user_id !== user?.id && (
                <div className="flex items-center gap-2">
                  <Select
                    value={member.role ?? 'member'}
                    onValueChange={(role) => {
                      void updateMember
                        .mutateAsync({ userId: member.user_id, role: role as GroupRole })
                        .then(() => {
                          toast.success('groups:messages.memberUpdated')
                        })
                        .catch(() => {
                          toast.error('groups:messages.error')
                        })
                    }}
                  >
                    <SelectTrigger
                      className="h-8 w-32"
                      aria-label={t('groups:settings.changeRole')}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">{t('groups:detail.role.admin')}</SelectItem>
                      <SelectItem value="member">{t('groups:detail.role.member')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setRemoveMemberId(member.user_id)
                    }}
                  >
                    {t('groups:settings.removeMember')}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {isAdmin && (
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-lg">{t('groups:settings.invitations')}</CardTitle>
            <Button
              size="sm"
              onClick={() => {
                setCreatedInviteUrl(null)
                setInviteOpen(true)
              }}
            >
              {t('groups:settings.invite')}
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm font-medium">{t('groups:settings.pendingInvites')}</p>
            {(invitationsQuery.data ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">—</p>
            )}
            {(invitationsQuery.data ?? []).map((inv) => (
              <div key={inv.id} className="flex flex-wrap items-center justify-between gap-2">
                <div className="space-y-1">
                  <Badge variant="secondary">{t(`groups:detail.role.${inv.role}`)}</Badge>
                  <InvitationCountdown expiresAt={inv.expires_at} />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      void navigator.clipboard.writeText(inv.invitation_url).then(() => {
                        toast.success('groups:messages.linkCopied')
                      })
                    }}
                  >
                    <Copy className="mr-1 h-3.5 w-3.5" />
                    {t('groups:settings.copyLink')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      void revokeInvitation
                        .mutateAsync(inv.id)
                        .then(() => {
                          toast.success('groups:messages.inviteRevoked')
                        })
                        .catch(() => {
                          toast.error('groups:messages.error')
                        })
                    }}
                  >
                    {t('groups:settings.revoke')}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          onClick={() => {
            setLeaveOpen(true)
          }}
        >
          {t('groups:settings.leave')}
        </Button>
        {isAdmin && (
          <Button
            variant="destructive"
            onClick={() => {
              setDeleteOpen(true)
            }}
          >
            {t('groups:settings.delete')}
          </Button>
        )}
      </div>

      <Dialog
        open={inviteOpen}
        onOpenChange={(open) => {
          setInviteOpen(open)
          if (!open) {
            setCreatedInviteUrl(null)
            setLinkCopied(false)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('groups:settings.invite')}</DialogTitle>
          </DialogHeader>
          {createdInviteUrl ? (
            <div className="space-y-4 text-center">
              <canvas ref={qrCanvasRef} className="mx-auto" />
              <Button variant="outline" onClick={() => void handleCopyLink()}>
                {linkCopied ? (
                  <Check className="mr-2 h-4 w-4" />
                ) : (
                  <Copy className="mr-2 h-4 w-4" />
                )}
                {linkCopied ? t('groups:settings.copied') : t('groups:settings.copyLink')}
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('groups:settings.inviteAs')}</label>
              <Select
                value={inviteRole}
                onValueChange={(v) => {
                  setInviteRole(v as GroupRole)
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">{t('groups:detail.role.admin')}</SelectItem>
                  <SelectItem value="member">{t('groups:detail.role.member')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <DialogFooter>
            {!createdInviteUrl && (
              <Button
                onClick={() => void handleCreateInvite()}
                disabled={createInvitation.isPending}
              >
                {t('groups:settings.createInvite')}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('groups:settings.leaveConfirm.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('groups:settings.leaveConfirm.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common:actions.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleLeave()}>
              {t('groups:settings.leave')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('groups:settings.deleteConfirm.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('groups:settings.deleteConfirm.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common:actions.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDelete()}>
              {t('groups:settings.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={removePetId != null}
        onOpenChange={(open) => {
          if (!open) setRemovePetId(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('groups:settings.removePet')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('groups:settings.removePetConfirm', {
                name: removePetTarget?.name ?? '',
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common:actions.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (removePetId == null) return
                void removePet
                  .mutateAsync(removePetId)
                  .then(() => {
                    toast.success('groups:messages.petRemoved')
                    setRemovePetId(null)
                  })
                  .catch(() => {
                    toast.error('groups:messages.error')
                  })
              }}
            >
              {t('groups:settings.removePet')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={removeMemberId != null}
        onOpenChange={(open) => {
          if (!open) setRemoveMemberId(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('groups:settings.removeMember')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('groups:settings.removeMemberConfirm', {
                name: removeMemberTarget?.user?.name ?? '',
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common:actions.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (removeMemberId == null) return
                void removeMember
                  .mutateAsync(removeMemberId)
                  .then(() => {
                    toast.success('groups:messages.memberRemoved')
                    setRemoveMemberId(null)
                  })
                  .catch(() => {
                    toast.error('groups:messages.error')
                  })
              }}
            >
              {t('groups:settings.removeMember')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
