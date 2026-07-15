import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, QrCode } from 'lucide-react'
import {
  listLedgerMemberSuggestions,
  useAddLedgerMember,
  useCreateLedgerInvitation,
  useLedgerInvitations,
  useLeaveLedger,
  useMembers,
  useRemoveLedgerMember,
  useRevokeLedgerInvitation,
  type Ledger,
} from '@/api/finance'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Item, ItemActions, ItemContent, ItemGroup, ItemTitle } from '@/components/ui/item'
import {
  ResourceSharingDialog,
  type SharingInvitation,
} from '@/components/sharing/ResourceSharingDialog'
import { RevokeInvitationDialog } from '@/components/sharing/RevokeInvitationDialog'
import { toast } from '@/lib/i18n-toast'

export function MembersPanel({ ledger }: { ledger: Ledger }) {
  const { t } = useTranslation('finance')
  const { user } = useAuth()
  const { data, refetch: refetchMembers } = useMembers(ledger.id)
  const invitation = useCreateLedgerInvitation(ledger.id)
  const { data: invitations } = useLedgerInvitations(ledger.id)
  const revoke = useRevokeLedgerInvitation(ledger.id)
  const remove = useRemoveLedgerMember(ledger.id)
  const addMember = useAddLedgerMember(ledger.id)
  const leave = useLeaveLedger(ledger.id)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [initialInvitation, setInitialInvitation] = useState<SharingInvitation | null>(null)
  const [revokeInvitationId, setRevokeInvitationId] = useState<number | null>(null)

  return (
    <>
      <Card size="sm">
        <CardHeader>
          <CardTitle>{t('areas.members')}</CardTitle>
          <CardDescription>{t('members.equal')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={() => {
              setInitialInvitation(null)
              setInviteOpen(true)
            }}
          >
            <Plus />
            {t('members.invite')}
          </Button>
          <ItemGroup className="gap-2">
            {invitations
              ?.filter((item) => item.status === 'pending')
              .map((item) => (
                <Item key={item.id} variant="outline" size="sm" className="flex-nowrap">
                  <ItemContent className="min-w-0">
                    <ItemTitle className="line-clamp-none font-normal">
                      {t('members.pendingUntil', {
                        date: new Date(item.expires_at).toLocaleDateString(),
                      })}
                    </ItemTitle>
                  </ItemContent>
                  <ItemActions>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label={t('members.showQr')}
                      onClick={() => {
                        setInitialInvitation({
                          id: item.id,
                          invitationUrl: item.invitation_url,
                          expiresAt: item.expires_at,
                        })
                        setInviteOpen(true)
                      }}
                    >
                      <QrCode />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setRevokeInvitationId(item.id)
                      }}
                    >
                      {t('members.revoke')}
                    </Button>
                  </ItemActions>
                </Item>
              ))}
            {data?.map((member) => (
              <Item className="flex-nowrap" variant="outline" size="sm" key={member.user_id}>
                <ItemContent className="min-w-0">
                  <ItemTitle>{member.name}</ItemTitle>
                </ItemContent>
                {member.user_id !== user?.id && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (window.confirm(t('members.confirmRemove')))
                        void remove.mutateAsync(member.user_id)
                    }}
                  >
                    {t('members.remove')}
                  </Button>
                )}
              </Item>
            ))}
          </ItemGroup>
          <div className="border-t pt-4">
            <Button
              variant="destructive"
              onClick={() => {
                if (window.confirm(t('members.confirmLeave'))) void leave.mutateAsync()
              }}
            >
              {t('members.leave')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <ResourceSharingDialog
        open={inviteOpen}
        onOpenChange={(open) => {
          setInviteOpen(open)
          if (!open) setInitialInvitation(null)
        }}
        targetName={ledger.title}
        description={t('members.shareDescription', { name: ledger.title })}
        initialInvitation={initialInvitation}
        loadSuggestions={() => listLedgerMemberSuggestions(ledger.id)}
        createInvitation={async () => {
          const result = await invitation.mutateAsync()
          return {
            id: result.invitation.id,
            invitationUrl: result.invitation_url,
            expiresAt: result.invitation.expires_at,
          }
        }}
        addSuggested={async (userId) => addMember.mutateAsync(userId)}
        onChanged={() => {
          void refetchMembers()
        }}
      />

      <RevokeInvitationDialog
        open={revokeInvitationId !== null}
        onOpenChange={(open) => {
          if (!open) setRevokeInvitationId(null)
        }}
        pending={revoke.isPending}
        onConfirm={async () => {
          if (revokeInvitationId === null) return
          try {
            await revoke.mutateAsync(revokeInvitationId)
            setRevokeInvitationId(null)
            toast.success('common:messages.invitationRevoked')
          } catch {
            toast.error('common:messages.invitationRevokeFailed')
          }
        }}
      />
    </>
  )
}
