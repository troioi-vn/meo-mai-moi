import { useCallback, useEffect, useMemo, useState } from 'react'
import { AxiosError } from 'axios'
import { Download, Pencil, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  createApiToken,
  listApiTokens,
  revokeApiToken,
  type ApiTokenItem,
  updateApiTokenPermissions,
} from '@/api/api-tokens'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/use-toast'

interface ApiErrorPayload {
  message?: string
  error?: string
  errors?: Record<string, string[]>
}

function formatDateTime(value: string | null, fallback: string): string {
  if (!value) {
    return fallback
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return fallback
  }

  return parsed.toLocaleString()
}

export default function ApiTokensSettingsPage() {
  const { t } = useTranslation('settings')
  const [tokens, setTokens] = useState<ApiTokenItem[]>([])
  const [availablePermissions, setAvailablePermissions] = useState<string[]>([])
  const [defaultPermissions, setDefaultPermissions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isRevokeOpen, setIsRevokeOpen] = useState(false)
  const [newTokenName, setNewTokenName] = useState('')
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])
  const [editingToken, setEditingToken] = useState<ApiTokenItem | null>(null)
  const [revokingToken, setRevokingToken] = useState<ApiTokenItem | null>(null)
  const [createdPlaintextToken, setCreatedPlaintextToken] = useState<string | null>(null)
  const [createdTokenName, setCreatedTokenName] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createNameError, setCreateNameError] = useState<string | null>(null)

  const getApiErrorMessage = (error: unknown, fallback: string): string => {
    if (!(error instanceof AxiosError)) {
      return fallback
    }

    const payload = error.response?.data as ApiErrorPayload | undefined
    if (!payload) {
      return error.message || fallback
    }

    return payload.message ?? payload.error ?? error.message
  }

  const loadData = useCallback(async () => {
    setIsLoading(true)

    try {
      const data = await listApiTokens()
      setTokens(data.tokens)
      setAvailablePermissions(data.available_permissions)
      setDefaultPermissions(data.default_permissions)
      setSelectedPermissions(data.default_permissions)
    } catch (error: unknown) {
      const message =
        error instanceof AxiosError
          ? ((error.response?.data as ApiErrorPayload | undefined)?.message ?? error.message)
          : t('developer.tokens.messages.loadErrorFallback')

      toast({
        title: t('developer.tokens.messages.loadErrorTitle'),
        description: message,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [t])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const canCreate = useMemo(
    () => newTokenName.trim().length > 0 && !isSubmitting,
    [newTokenName, isSubmitting]
  )

  const togglePermission = (permission: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permission) ? prev.filter((item) => item !== permission) : [...prev, permission]
    )
  }

  const handleCreate = async () => {
    if (!canCreate) {
      return
    }

    setIsSubmitting(true)
    setCreateNameError(null)

    try {
      const response = await createApiToken({
        name: newTokenName.trim(),
        permissions: selectedPermissions,
      })

      setTokens((prev) => [response.token, ...prev])
      setCreatedPlaintextToken(response.plain_text_token)
      setCreatedTokenName(response.token.name)
      setNewTokenName('')
      setIsCreateOpen(false)

      toast({ title: t('developer.tokens.messages.createSuccess') })
    } catch (error: unknown) {
      const payload =
        error instanceof AxiosError
          ? (error.response?.data as ApiErrorPayload | undefined)
          : undefined
      const nameError = payload?.errors?.name?.[0] ?? null
      if (nameError) {
        setCreateNameError(nameError)
      }

      const message = getApiErrorMessage(error, t('developer.tokens.messages.createErrorFallback'))

      toast({
        title: t('developer.tokens.messages.createErrorTitle'),
        description: message,
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdatePermissions = async () => {
    if (!editingToken) {
      return
    }

    setIsSubmitting(true)

    try {
      const response = await updateApiTokenPermissions(editingToken.id, {
        permissions: selectedPermissions,
      })

      setTokens((prev) =>
        prev.map((token) => (token.id === editingToken.id ? response.token : token))
      )
      setIsEditOpen(false)
      setEditingToken(null)
      toast({ title: t('developer.tokens.messages.updateSuccess') })
    } catch (error: unknown) {
      const message =
        error instanceof AxiosError
          ? ((error.response?.data as ApiErrorPayload | undefined)?.message ?? error.message)
          : t('developer.tokens.messages.updateErrorFallback')

      toast({
        title: t('developer.tokens.messages.updateErrorTitle'),
        description: message,
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRevoke = async () => {
    if (!revokingToken) {
      return
    }

    setIsSubmitting(true)

    try {
      await revokeApiToken(revokingToken.id)
      setTokens((prev) => prev.filter((token) => token.id !== revokingToken.id))
      setIsRevokeOpen(false)
      setRevokingToken(null)
      toast({ title: t('developer.tokens.messages.revokeSuccess') })
    } catch (error: unknown) {
      const message =
        error instanceof AxiosError
          ? ((error.response?.data as ApiErrorPayload | undefined)?.message ?? error.message)
          : t('developer.tokens.messages.revokeErrorFallback')

      toast({
        title: t('developer.tokens.messages.revokeErrorTitle'),
        description: message,
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const openCreate = () => {
    setSelectedPermissions(defaultPermissions)
    setCreateNameError(null)
    setIsCreateOpen(true)
  }

  const openEdit = (token: ApiTokenItem) => {
    setEditingToken(token)
    setSelectedPermissions(token.abilities)
    setIsEditOpen(true)
  }

  const openRevoke = (token: ApiTokenItem) => {
    setRevokingToken(token)
    setIsRevokeOpen(true)
  }

  const copyPlaintextToken = async () => {
    if (!createdPlaintextToken) {
      return
    }

    try {
      await navigator.clipboard.writeText(createdPlaintextToken)
      toast({ title: t('developer.tokens.createdDialog.copySuccess') })
    } catch {
      toast({ title: t('developer.tokens.createdDialog.copyError'), variant: 'destructive' })
    }
  }

  const downloadPlaintextToken = () => {
    if (!createdPlaintextToken) {
      return
    }

    const safeTokenName = (createdTokenName ?? t('developer.tokens.createdDialog.fallbackName'))
      .trim()
      .replace(/[^a-z0-9_-]+/gi, '-')
      .toLowerCase()
    const fallbackName = t('developer.tokens.createdDialog.fallbackName')
    const fileName = `${safeTokenName || fallbackName}.key`
    const fileContents = createdPlaintextToken
    const blob = new Blob([fileContents], { type: 'text/plain;charset=utf-8' })
    const objectUrl = window.URL.createObjectURL(blob)
    const anchor = document.createElement('a')

    anchor.href = objectUrl
    anchor.download = fileName
    anchor.click()

    window.URL.revokeObjectURL(objectUrl)
    toast({ title: t('developer.tokens.createdDialog.downloadSuccess') })
  }

  const clearCreatedToken = () => {
    setCreatedPlaintextToken(null)
    setCreatedTokenName(null)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col items-start justify-between gap-4 sm:flex-row">
          <div className="min-w-0">
            <CardTitle>{t('developer.tokens.title')}</CardTitle>
            <CardDescription>{t('developer.tokens.description')}</CardDescription>
          </div>
          <Button onClick={openCreate} className="w-full sm:w-auto">
            {t('developer.tokens.createAction')}
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">{t('developer.tokens.loading')}</p>
          ) : tokens.length === 0 ? (
            <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
              {t('developer.tokens.empty')}
            </div>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {tokens.map((token) => (
                  <div key={token.id} className="relative rounded-md border p-3">
                    <div className="absolute right-3 top-3 flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon-sm"
                        aria-label={t('developer.tokens.actions.editPermissions')}
                        title={t('developer.tokens.actions.editPermissions')}
                        onClick={() => {
                          openEdit(token)
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon-sm"
                        aria-label={t('developer.tokens.actions.revoke')}
                        title={t('developer.tokens.actions.revoke')}
                        onClick={() => {
                          openRevoke(token)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-start gap-3 pr-20">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{token.name}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {t('developer.tokens.fields.permissions')}:{' '}
                          {token.abilities.join(', ') || t('developer.tokens.none')}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded bg-muted px-2 py-1">
                        <div className="text-muted-foreground">
                          {t('developer.tokens.fields.created')}
                        </div>
                        <div>{formatDateTime(token.created_at, t('developer.tokens.never'))}</div>
                      </div>
                      <div className="rounded bg-muted px-2 py-1">
                        <div className="text-muted-foreground">
                          {t('developer.tokens.fields.lastUsed')}
                        </div>
                        <div>{formatDateTime(token.last_used_at, t('developer.tokens.never'))}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="px-2 py-2 font-medium">{t('developer.tokens.fields.name')}</th>
                      <th className="px-2 py-2 font-medium">
                        {t('developer.tokens.fields.permissions')}
                      </th>
                      <th className="px-2 py-2 font-medium">
                        {t('developer.tokens.fields.created')}
                      </th>
                      <th className="px-2 py-2 font-medium">
                        {t('developer.tokens.fields.lastUsed')}
                      </th>
                      <th className="px-2 py-2 font-medium">
                        {t('developer.tokens.fields.actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {tokens.map((token) => (
                      <tr key={token.id} className="border-b">
                        <td className="px-2 py-2">{token.name}</td>
                        <td className="px-2 py-2">
                          {token.abilities.join(', ') || t('developer.tokens.none')}
                        </td>
                        <td className="px-2 py-2">
                          {formatDateTime(token.created_at, t('developer.tokens.never'))}
                        </td>
                        <td className="px-2 py-2">
                          {formatDateTime(token.last_used_at, t('developer.tokens.never'))}
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon-sm"
                              aria-label={t('developer.tokens.actions.editPermissions')}
                              title={t('developer.tokens.actions.editPermissions')}
                              onClick={() => {
                                openEdit(token)
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="icon-sm"
                              aria-label={t('developer.tokens.actions.revoke')}
                              title={t('developer.tokens.actions.revoke')}
                              onClick={() => {
                                openRevoke(token)
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('developer.quickStart.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>{t('developer.quickStart.description')}</p>
          <a
            className="block text-primary underline"
            href="/docs/api-integration.html"
            target="_blank"
            rel="noreferrer"
          >
            {t('developer.quickStart.docsLink')}
          </a>
          <p>
            {t('developer.quickStart.supportPrompt')}{' '}
            <Link to="/settings/contact-us" className="text-primary underline">
              {t('developer.quickStart.supportLink')}
            </Link>
          </p>
        </CardContent>
      </Card>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('developer.tokens.createDialog.title')}</DialogTitle>
            <DialogDescription>{t('developer.tokens.createDialog.description')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="token-name">{t('developer.tokens.createDialog.nameLabel')}</Label>
              <Input
                id="token-name"
                value={newTokenName}
                onChange={(event) => {
                  setNewTokenName(event.target.value)
                  if (createNameError !== null) {
                    setCreateNameError(null)
                  }
                }}
                placeholder={t('developer.tokens.createDialog.namePlaceholder')}
              />
              {createNameError ? (
                <p className="text-sm text-destructive">{createNameError}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label>{t('developer.tokens.createDialog.permissionsLabel')}</Label>
              <div className="grid grid-cols-2 gap-2">
                {availablePermissions.map((permission) => (
                  <label key={permission} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={selectedPermissions.includes(permission)}
                      onCheckedChange={() => {
                        togglePermission(permission)
                      }}
                    />
                    {permission}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateOpen(false)
              }}
            >
              {t('common:actions.cancel')}
            </Button>
            <Button
              onClick={() => {
                void handleCreate()
              }}
              disabled={!canCreate}
            >
              {t('common:actions.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={createdPlaintextToken !== null}
        onOpenChange={(open) => {
          if (!open) {
            clearCreatedToken()
          }
        }}
      >
        <DialogContent className="max-w-[calc(100vw-1rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('developer.tokens.createdDialog.title')}</DialogTitle>
            <DialogDescription>{t('developer.tokens.createdDialog.description')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-md border bg-muted/40 p-3">
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {createdTokenName ?? t('developer.tokens.createdDialog.fallbackName')}
              </div>
              <code className="block break-all text-xs">{createdPlaintextToken}</code>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                variant="outline"
                onClick={() => {
                  void copyPlaintextToken()
                }}
              >
                {t('developer.tokens.createdDialog.copyAction')}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  downloadPlaintextToken()
                }}
              >
                <Download className="mr-2 h-4 w-4" />
                {t('developer.tokens.createdDialog.downloadAction')}
              </Button>
              <Button
                onClick={() => {
                  clearCreatedToken()
                }}
              >
                {t('developer.tokens.createdDialog.confirmSavedAction')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('developer.tokens.editDialog.title')}</DialogTitle>
            <DialogDescription>{editingToken ? editingToken.name : ''}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            {availablePermissions.map((permission) => (
              <label key={permission} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={selectedPermissions.includes(permission)}
                  onCheckedChange={() => {
                    togglePermission(permission)
                  }}
                />
                {permission}
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditOpen(false)
              }}
            >
              {t('common:actions.cancel')}
            </Button>
            <Button
              onClick={() => {
                void handleUpdatePermissions()
              }}
              disabled={isSubmitting}
            >
              {t('developer.tokens.editDialog.saveAction')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRevokeOpen} onOpenChange={setIsRevokeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('developer.tokens.revokeDialog.title')}</DialogTitle>
            <DialogDescription>{t('developer.tokens.revokeDialog.description')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsRevokeOpen(false)
              }}
            >
              {t('common:actions.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                void handleRevoke()
              }}
              disabled={isSubmitting}
            >
              {t('developer.tokens.revokeDialog.confirmAction')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
