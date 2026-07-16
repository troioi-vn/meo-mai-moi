import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Copy, Clock, QrCode, ShieldCheck, User } from 'lucide-react'
import {
  listGroupMemberSuggestions,
  useAddGroupMember,
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
import { LoadingState } from '@/components/ui/LoadingState'
import { AppBreadcrumbs, PageContainer, PageHeader } from '@/components/layout/PageLayout'
import { toast } from '@/lib/i18n-toast'
import { useCountdown } from '@/hooks/useCountdown'
import { useAuth } from '@/hooks/use-auth'
import {
  ResourceSharingDialog,
  type SharingInvitation,
} from '@/components/sharing/ResourceSharingDialog'
import { RevokeInvitationDialog } from '@/components/sharing/RevokeInvitationDialog'

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
    refetch: groupQueryRefetch,
  } = useGroup(Number.isFinite(groupId) ? groupId : undefined)
  const invitationsQuery = useGroupInvitations(Number.isFinite(groupId) ? groupId : undefined)
  const updateGroup = useUpdateGroup(groupId)
  const deleteGroup = useDeleteGroup()
  const leaveGroup = useLeaveGroup()
  const removePet = useRemoveGroupPet(groupId)
  const updateMember = useUpdateGroupMember(groupId)
  const addMember = useAddGroupMember(groupId)
  const removeMember = useRemoveGroupMember(groupId)
  const createInvitation = useCreateGroupInvitation(groupId)
  const revokeInvitation = useRevokeGroupInvitation(groupId)

  const [name, setName] = useState('')
  const [inviteOpen, setInviteOpen] = useState(false)
  const [initialInvitation, setInitialInvitation] = useState<SharingInvitation | null>(null)
  const [revokeInvitationId, setRevokeInvitationId] = useState<number | null>(null)
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

  const handleLeave = async () => {
    try {
      await leaveGroup.mutateAsync(groupId)
      toast.success('groups:messages.left')
      setLeaveOpen(false)
      resetToAllPets()
    } catch {
      toast.error('groups:messages.error')
    }
  }

  const handleDelete = async () => {
    try {
      await deleteGroup.mutateAsync(groupId)
      toast.success('groups:messages.deleted')
      setDeleteOpen(false)
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
      <PageContainer width="compact">
        <p className="text-destructive">{t('groups:messages.error')}</p>
      </PageContainer>
    )
  }

  return (
    <PageContainer width="compact">
      <AppBreadcrumbs
        items={[
          { label: t('common:nav.home'), to: '/' },
          { label: t('groups:list.title'), to: '/groups' },
          { label: group.name, to: `/groups/${String(group.id)}` },
          { label: t('groups:settings.title') },
        ]}
      />
      <PageHeader
        className="mb-6"
        title={t('groups:settings.title')}
        actions={
          <Button variant="outline" asChild>
            <Link to={`/groups/${String(group.id)}`}>{t('groups:settings.back')}</Link>
          </Button>
        }
      />

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
                setInitialInvitation(null)
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
                    size="icon"
                    aria-label={t('groups:settings.showQr')}
                    onClick={() => {
                      setInitialInvitation({
                        id: inv.id,
                        invitationUrl: inv.invitation_url,
                        expiresAt: inv.expires_at,
                        role: inv.role,
                      })
                      setInviteOpen(true)
                    }}
                  >
                    <QrCode className="h-3.5 w-3.5" />
                  </Button>
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
                      setRevokeInvitationId(inv.id)
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

      <ResourceSharingDialog
        open={inviteOpen}
        onOpenChange={(open) => {
          setInviteOpen(open)
          if (!open) setInitialInvitation(null)
        }}
        targetName={group.name}
        description={t('groups:settings.shareDescription', { name: group.name })}
        roles={[
          {
            value: 'admin',
            label: t('groups:detail.role.admin'),
            description: t('groups:settings.adminRoleDescription'),
            Icon: ShieldCheck,
          },
          {
            value: 'member',
            label: t('groups:detail.role.member'),
            description: t('groups:settings.memberRoleDescription'),
            Icon: User,
          },
        ]}
        defaultRole="admin"
        initialInvitation={initialInvitation}
        loadSuggestions={() => listGroupMemberSuggestions(group.id)}
        createInvitation={async (role) => {
          const result = await createInvitation.mutateAsync(role as GroupRole)
          return {
            id: result.invitation.id,
            invitationUrl: result.invitation_url,
            expiresAt: result.invitation.expires_at,
            role: result.invitation.role,
          }
        }}
        addSuggested={async (userId, role) => {
          await addMember.mutateAsync({ userId, role: role as GroupRole })
        }}
        onChanged={() => {
          void groupQueryRefetch()
          void invitationsQuery.refetch()
        }}
      />

      <RevokeInvitationDialog
        open={revokeInvitationId !== null}
        onOpenChange={(open) => {
          if (!open) setRevokeInvitationId(null)
        }}
        pending={revokeInvitation.isPending}
        onConfirm={async () => {
          if (revokeInvitationId === null) return
          try {
            await revokeInvitation.mutateAsync(revokeInvitationId)
            toast.success('groups:messages.inviteRevoked')
            setRevokeInvitationId(null)
          } catch {
            toast.error('groups:messages.error')
          }
        }}
      />

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
    </PageContainer>
  )
}
