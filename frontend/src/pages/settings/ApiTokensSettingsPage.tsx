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

function formatDateTime(value: string | null): string {
  if (!value) {
    return 'Never'
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return 'Never'
  }

  return parsed.toLocaleString()
}

export default function ApiTokensSettingsPage() {
  const { t } = useTranslation('settings')
  const [tokens, setTokens] = useState<ApiTokenItem[]>([])
  const [availablePermissions, setAvailablePermissions] = useState<string[]>([])
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
      setSelectedPermissions(data.default_permissions)
    } catch (error: unknown) {
      const message =
        error instanceof AxiosError
          ? ((error.response?.data as ApiErrorPayload | undefined)?.message ?? error.message)
          : 'Failed to load API tokens'

      toast({ title: 'Failed to load API tokens', description: message, variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }, [])

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

      toast({ title: 'API token created' })
    } catch (error: unknown) {
      const payload =
        error instanceof AxiosError
          ? (error.response?.data as ApiErrorPayload | undefined)
          : undefined
      const nameError = payload?.errors?.name?.[0] ?? null
      if (nameError) {
        setCreateNameError(nameError)
      }

      const message = getApiErrorMessage(error, 'Failed to create API token')

      toast({ title: 'Failed to create API token', description: message, variant: 'destructive' })
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
      toast({ title: 'Token permissions updated' })
    } catch (error: unknown) {
      const message =
        error instanceof AxiosError
          ? ((error.response?.data as ApiErrorPayload | undefined)?.message ?? error.message)
          : 'Failed to update permissions'

      toast({ title: 'Failed to update permissions', description: message, variant: 'destructive' })
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
      toast({ title: 'Token revoked' })
    } catch (error: unknown) {
      const message =
        error instanceof AxiosError
          ? ((error.response?.data as ApiErrorPayload | undefined)?.message ?? error.message)
          : 'Failed to revoke token'

      toast({ title: 'Failed to revoke token', description: message, variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const openCreate = () => {
    setSelectedPermissions(availablePermissions)
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
      toast({ title: 'Token copied to clipboard' })
    } catch {
      toast({ title: 'Unable to copy token', variant: 'destructive' })
    }
  }

  const downloadPlaintextToken = () => {
    if (!createdPlaintextToken) {
      return
    }

    const safeTokenName = (createdTokenName ?? 'api-token')
      .trim()
      .replace(/[^a-z0-9_-]+/gi, '-')
      .toLowerCase()
    const fileName = `${safeTokenName || 'api-token'}.key`
    const fileContents = createdPlaintextToken
    const blob = new Blob([fileContents], { type: 'text/plain;charset=utf-8' })
    const objectUrl = window.URL.createObjectURL(blob)
    const anchor = document.createElement('a')

    anchor.href = objectUrl
    anchor.download = fileName
    anchor.click()

    window.URL.revokeObjectURL(objectUrl)
    toast({ title: 'Token downloaded' })
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
            <CardTitle>API Tokens</CardTitle>
            <CardDescription>
              Use personal API tokens for server-to-server integrations. Token plaintext is shown
              only once on creation.
            </CardDescription>
          </div>
          <Button onClick={openCreate} className="w-full sm:w-auto">
            Create token
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading tokens...</p>
          ) : tokens.length === 0 ? (
            <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
              No API tokens yet.
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
                        aria-label="Edit permissions"
                        title="Edit permissions"
                        onClick={() => {
                          openEdit(token)
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon-sm"
                        aria-label="Revoke token"
                        title="Revoke token"
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
                          Permissions: {token.abilities.join(', ') || 'None'}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded bg-muted px-2 py-1">
                        <div className="text-muted-foreground">Created</div>
                        <div>{formatDateTime(token.created_at)}</div>
                      </div>
                      <div className="rounded bg-muted px-2 py-1">
                        <div className="text-muted-foreground">Last used</div>
                        <div>{formatDateTime(token.last_used_at)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="px-2 py-2 font-medium">Name</th>
                      <th className="px-2 py-2 font-medium">Permissions</th>
                      <th className="px-2 py-2 font-medium">Created</th>
                      <th className="px-2 py-2 font-medium">Last used</th>
                      <th className="px-2 py-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tokens.map((token) => (
                      <tr key={token.id} className="border-b">
                        <td className="px-2 py-2">{token.name}</td>
                        <td className="px-2 py-2">{token.abilities.join(', ') || 'None'}</td>
                        <td className="px-2 py-2">{formatDateTime(token.created_at)}</td>
                        <td className="px-2 py-2">{formatDateTime(token.last_used_at)}</td>
                        <td className="px-2 py-2">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon-sm"
                              aria-label="Edit permissions"
                              title="Edit permissions"
                              onClick={() => {
                                openEdit(token)
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="icon-sm"
                              aria-label="Revoke token"
                              title="Revoke token"
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
            <DialogTitle>Create token</DialogTitle>
            <DialogDescription>Select a name and allowed permissions.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="token-name">Name</Label>
              <Input
                id="token-name"
                value={newTokenName}
                onChange={(event) => {
                  setNewTokenName(event.target.value)
                  if (createNameError !== null) {
                    setCreateNameError(null)
                  }
                }}
                placeholder="Integration token"
              />
              {createNameError ? (
                <p className="text-sm text-destructive">{createNameError}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label>Permissions</Label>
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
              Cancel
            </Button>
            <Button
              onClick={() => {
                void handleCreate()
              }}
              disabled={!canCreate}
            >
              Create
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Token created</DialogTitle>
            <DialogDescription>
              Save this token now. You will not be able to see it again after closing this dialog.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-md border bg-muted/40 p-3">
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {createdTokenName ?? 'API token'}
              </div>
              <code className="block overflow-x-auto text-xs">{createdPlaintextToken}</code>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                variant="outline"
                onClick={() => {
                  void copyPlaintextToken()
                }}
              >
                Copy token
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  downloadPlaintextToken()
                }}
              >
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
              <Button
                onClick={() => {
                  clearCreatedToken()
                }}
              >
                I saved this token
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit token permissions</DialogTitle>
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
              Cancel
            </Button>
            <Button
              onClick={() => {
                void handleUpdatePermissions()
              }}
              disabled={isSubmitting}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRevokeOpen} onOpenChange={setIsRevokeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke token?</DialogTitle>
            <DialogDescription>
              This token will stop working immediately and cannot be restored.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsRevokeOpen(false)
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                void handleRevoke()
              }}
              disabled={isSubmitting}
            >
              Revoke
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
