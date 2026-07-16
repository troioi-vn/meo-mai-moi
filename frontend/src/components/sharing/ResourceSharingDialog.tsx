import { useCallback, useEffect, useRef, useState, type ComponentType } from 'react'
import QRCode from 'qrcode'
import { Check, Copy, Link as LinkIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
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
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCountdown } from '@/hooks/useCountdown'
import { toast } from '@/lib/i18n-toast'

export interface SharingSuggestion {
  id: number
  name: string
}

export interface SharingRole {
  value: string
  label: string
  description?: string
  Icon?: ComponentType<{ className?: string }>
}

export interface SharingInvitation {
  id: number
  invitationUrl: string
  expiresAt: string
  role?: string
}

interface ResourceSharingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  targetName: string
  description: string
  roles?: SharingRole[]
  defaultRole?: string
  initialInvitation?: SharingInvitation | null
  loadSuggestions: () => Promise<SharingSuggestion[]>
  createInvitation: (role?: string) => Promise<SharingInvitation>
  addSuggested: (userId: number, role?: string) => Promise<void>
  onChanged?: () => void
}

function InvitationCountdown({ expiresAt }: { expiresAt: string }) {
  const { t } = useTranslation('common')
  const { formatted, isExpired } = useCountdown(expiresAt)
  return (
    <span
      className={isExpired ? 'text-sm text-destructive' : 'text-sm text-muted-foreground font-mono'}
    >
      {isExpired ? t('sharing.expired') : formatted}
    </span>
  )
}

export function ResourceSharingDialog({
  open,
  onOpenChange,
  targetName,
  description,
  roles = [],
  defaultRole,
  initialInvitation,
  loadSuggestions,
  createInvitation,
  addSuggested,
  onChanged,
}: ResourceSharingDialogProps) {
  const { t } = useTranslation('common')
  const [selectedRole, setSelectedRole] = useState(defaultRole ?? '')
  const [suggestions, setSuggestions] = useState<SharingSuggestion[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [invitation, setInvitation] = useState<SharingInvitation | null>(null)
  const [creating, setCreating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [confirmUser, setConfirmUser] = useState<SharingSuggestion | null>(null)
  const [adding, setAdding] = useState(false)
  const loadSuggestionsRef = useRef(loadSuggestions)

  useEffect(() => {
    loadSuggestionsRef.current = loadSuggestions
  }, [loadSuggestions])

  useEffect(() => {
    if (!open) return
    setSelectedRole(initialInvitation?.role ?? defaultRole ?? '')
    setInvitation(initialInvitation ?? null)
    setCopied(false)
    setConfirmUser(null)
    if (initialInvitation) return
    setLoadingSuggestions(true)
    void loadSuggestionsRef
      .current()
      .then(setSuggestions)
      .catch(() => {
        setSuggestions([])
        toast.error('common:sharing.suggestionsError')
      })
      .finally(() => {
        setLoadingSuggestions(false)
      })
  }, [open, initialInvitation, defaultRole])

  const qrCanvasRef = useCallback(
    (canvas: HTMLCanvasElement | null) => {
      if (!canvas || !invitation) return
      void QRCode.toCanvas(canvas, invitation.invitationUrl, {
        width: 256,
        margin: 2,
        color: { dark: '#000000', light: '#FFFFFF' },
        errorCorrectionLevel: 'M',
      }).catch(() => toast.error('common:sharing.qrError'))
    },
    [invitation]
  )

  const selectedRoleOption = roles.find((role) => role.value === selectedRole)
  const canCreate = roles.length === 0 || Boolean(selectedRole)

  const close = () => {
    onOpenChange(false)
    setInvitation(null)
    setSuggestions([])
  }

  const handleCreate = async () => {
    if (!canCreate) return
    setCreating(true)
    try {
      setInvitation(await createInvitation(selectedRole || undefined))
      toast.success('common:sharing.invitationCreated')
      onChanged?.()
    } catch {
      toast.error('common:sharing.invitationError')
    } finally {
      setCreating(false)
    }
  }

  const handleAdd = async () => {
    if (!confirmUser) return
    setAdding(true)
    try {
      await addSuggested(confirmUser.id, selectedRole || undefined)
      toast.raw.success(t('sharing.personAdded', { name: confirmUser.name }))
      setConfirmUser(null)
      onChanged?.()
      close()
    } catch {
      toast.error('common:sharing.personAddError')
    } finally {
      setAdding(false)
    }
  }

  const handleCopy = async () => {
    if (!invitation) return
    try {
      await navigator.clipboard.writeText(invitation.invitationUrl)
      setCopied(true)
      toast.success('common:sharing.linkCopied')
      window.setTimeout(() => {
        setCopied(false)
      }, 2000)
    } catch {
      toast.error('common:sharing.copyError')
    }
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (next) onOpenChange(true)
          else close()
        }}
      >
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto p-0 sm:max-w-lg">
          <DialogHeader className="border-b px-6 pb-4 pt-6 text-left">
            <DialogTitle className="text-xl">{t('sharing.addPerson')}</DialogTitle>
            <DialogDescription className="pt-1">{description}</DialogDescription>
          </DialogHeader>

          {invitation ? (
            <div className="space-y-5 px-6 py-5">
              <div className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
                {t('sharing.shareDescription')}
              </div>
              <div className="space-y-4 rounded-xl border p-4">
                <div className="flex justify-center">
                  <canvas
                    ref={qrCanvasRef}
                    className="h-auto w-full max-w-64 rounded-lg border bg-white"
                    width={256}
                    height={256}
                    role="img"
                    aria-label={t('sharing.qrCode')}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <LinkIcon className="h-3.5 w-3.5" />
                    <span>{t('sharing.shareDescription')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={invitation.invitationUrl}
                      className="min-w-0 flex-1 rounded-md border bg-muted px-3 py-2 text-xs"
                      aria-label={t('sharing.invitationLink')}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => void handleCopy()}
                      aria-label={t('sharing.copyLink')}
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{t('sharing.expiresIn')}</span>
                  <InvitationCountdown expiresAt={invitation.expiresAt} />
                </div>
              </div>
              <Button variant="outline" className="w-full" onClick={close}>
                {t('actions.close')}
              </Button>
            </div>
          ) : (
            <div className="space-y-5 px-6 py-5">
              {roles.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('sharing.selectRole')}</label>
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map(({ value, label, Icon }) => (
                        <SelectItem key={value} value={value} textValue={label}>
                          <div className="flex items-center gap-2 py-0.5">
                            {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
                            <span className="font-medium">{label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedRoleOption?.description && (
                    <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                      {selectedRoleOption.description}
                    </div>
                  )}
                </div>
              )}

              {loadingSuggestions && (
                <p className="text-sm text-muted-foreground">{t('actions.loading')}</p>
              )}
              {!loadingSuggestions && suggestions.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">{t('sharing.suggested')}</h3>
                  <div className="divide-y rounded-md border">
                    {suggestions.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between gap-3 px-3 py-2.5"
                      >
                        <span className="truncate text-sm font-medium">{user.name}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setConfirmUser(user)
                          }}
                          disabled={adding}
                        >
                          {t('actions.add')}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button
                className="w-full"
                onClick={() => void handleCreate()}
                disabled={!canCreate || creating}
              >
                {creating ? t('sharing.creating') : t('sharing.createInvitation')}
              </Button>
              <Button variant="ghost" className="w-full" onClick={close}>
                {t('actions.cancel')}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={confirmUser !== null}
        onOpenChange={(next) => {
          if (!next && !adding) setConfirmUser(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('sharing.addConfirmTitle', { name: confirmUser?.name })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedRoleOption
                ? t('sharing.addConfirmDescriptionWithRole', {
                    name: confirmUser?.name,
                    target: targetName,
                    role: selectedRoleOption.label,
                  })
                : t('sharing.addConfirmDescription', {
                    name: confirmUser?.name,
                    target: targetName,
                  })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={adding}>{t('actions.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleAdd()} disabled={adding}>
              {adding ? t('actions.loading') : t('actions.add')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
