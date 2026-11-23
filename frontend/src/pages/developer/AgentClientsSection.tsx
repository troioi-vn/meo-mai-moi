import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { Bot, Copy, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  createMcpAgentClient,
  listMcpAgentClients,
  revokeMcpAgentClient,
  type CreateMcpAgentClientResponse,
  type McpAgentClientItem,
  EVERYDAY_CARE_SCOPES,
} from '@/api/mcp-agent-clients'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { mcpScopeDescription } from '@/pages/auth/mcpScopeDescription'

const QUERY_KEY = ['mcp-agent-clients'] as const

const EXPIRY_OPTIONS = ['never', '30', '90', '365'] as const
type Expiry = (typeof EXPIRY_OPTIONS)[number]

function formatDate(value: string | null, fallback: string): string {
  if (!value) return fallback
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.toLocaleString()
}

export default function AgentClientsSection() {
  const { t } = useTranslation(['settings', 'common'])
  const queryClient = useQueryClient()
  const { data } = useQuery({ queryKey: QUERY_KEY, queryFn: listMcpAgentClients })

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [scopes, setScopes] = useState<string[]>(EVERYDAY_CARE_SCOPES)
  const [expiry, setExpiry] = useState<Expiry>('never')
  const [created, setCreated] = useState<CreateMcpAgentClientResponse | null>(null)
  const [revoking, setRevoking] = useState<McpAgentClientItem | null>(null)

  const createMutation = useMutation({
    mutationFn: createMcpAgentClient,
    onSuccess: (response) => {
      setCreated(response)
      setIsCreateOpen(false)
      setName('')
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
    onError: (error: unknown) => {
      const message =
        error instanceof AxiosError
          ? ((error.response?.data as { message?: string } | undefined)?.message ?? error.message)
          : undefined
      toast.error(t('developer.agentClients.messages.createError'), { description: message })
    },
  })

  const revokeMutation = useMutation({
    mutationFn: revokeMcpAgentClient,
    onSuccess: () => {
      setRevoking(null)
      toast(t('developer.agentClients.messages.revokeSuccess'))
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
    onError: () => {
      toast.error(t('developer.agentClients.messages.revokeError'))
    },
  })

  if (!data?.enabled) {
    return null
  }

  const available = data.available_scopes
  const everyday = EVERYDAY_CARE_SCOPES.filter((scope) => available.includes(scope))
  const isBroad = scopes.some((scope) => !EVERYDAY_CARE_SCOPES.includes(scope))

  const toggleScope = (scope: string) => {
    setScopes((prev) =>
      prev.includes(scope) ? prev.filter((item) => item !== scope) : [...prev, scope]
    )
  }

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      toast(t('developer.mcp.copySuccess'))
    } catch {
      toast.error(t('developer.mcp.copyError'))
    }
  }

  const submit = () => {
    createMutation.mutate({
      name: name.trim(),
      scopes,
      expires_in_days: expiry === 'never' ? null : Number(expiry),
    })
  }

  return (
    <Card>
      <CardHeader className="flex flex-col items-start justify-between gap-4 sm:flex-row">
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            {t('developer.agentClients.title')}
          </CardTitle>
          <CardDescription>{t('developer.agentClients.description')}</CardDescription>
        </div>
        <Button
          className="w-full sm:w-auto"
          onClick={() => {
            setScopes(everyday)
            setExpiry('never')
            setIsCreateOpen(true)
          }}
        >
          {t('developer.agentClients.createAction')}
        </Button>
      </CardHeader>
      <CardContent>
        {data.clients.length === 0 ? (
          <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
            {t('developer.agentClients.empty')}
          </div>
        ) : (
          <ul className="space-y-3">
            {data.clients.map((client) => (
              <li key={client.id} className="relative rounded-md border p-3 text-sm">
                <Button
                  variant="destructive"
                  size="icon-sm"
                  className="absolute right-3 top-3"
                  aria-label={t('developer.agentClients.revokeAction')}
                  title={t('developer.agentClients.revokeAction')}
                  onClick={() => {
                    setRevoking(client)
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <div className="pr-12">
                  <div className="truncate font-medium">{client.name}</div>
                  <code className="block truncate text-xs text-muted-foreground">
                    {client.client_id}
                  </code>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {client.scopes.join(', ')}
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                  <div className="rounded bg-muted px-2 py-1">
                    <div className="text-muted-foreground">
                      {t('developer.agentClients.fields.lastUsed')}
                    </div>
                    <div>{formatDate(client.last_used_at, t('developer.agentClients.never'))}</div>
                  </div>
                  <div className="rounded bg-muted px-2 py-1">
                    <div className="text-muted-foreground">
                      {t('developer.agentClients.fields.expires')}
                    </div>
                    <div>{formatDate(client.expires_at, t('developer.agentClients.noExpiry'))}</div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('developer.agentClients.createDialog.title')}</DialogTitle>
            <DialogDescription>
              {t('developer.agentClients.createDialog.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="agent-client-name">{t('developer.agentClients.fields.name')}</Label>
              <Input
                id="agent-client-name"
                maxLength={80}
                value={name}
                onChange={(event) => {
                  setName(event.target.value)
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('developer.agentClients.fields.expires')}</Label>
              <Select
                value={expiry}
                onValueChange={(value) => {
                  setExpiry(value as Expiry)
                }}
              >
                <SelectTrigger aria-label={t('developer.agentClients.fields.expires')}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPIRY_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {t(`developer.agentClients.expiry.${option}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label>{t('developer.agentClients.fields.scopes')}</Label>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto p-0"
                    onClick={() => {
                      setScopes(everyday)
                    }}
                  >
                    {t('developer.agentClients.presets.everyday')}
                  </Button>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto p-0"
                    onClick={() => {
                      setScopes([...available])
                    }}
                  >
                    {t('developer.agentClients.presets.full')}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                {available.map((scope) => (
                  <label key={scope} className="flex items-start gap-2 text-sm">
                    <Checkbox
                      className="mt-0.5"
                      checked={scopes.includes(scope)}
                      onCheckedChange={() => {
                        toggleScope(scope)
                      }}
                    />
                    <span>
                      <code className="text-xs">{scope}</code>
                      <span className="block text-xs text-muted-foreground">
                        {mcpScopeDescription(scope, t)}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
            {isBroad && (
              <Alert>
                <AlertDescription>{t('developer.agentClients.broadWarning')}</AlertDescription>
              </Alert>
            )}
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
              onClick={submit}
              disabled={name.trim() === '' || scopes.length === 0 || createMutation.isPending}
            >
              {t('developer.agentClients.createAction')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={created !== null}
        onOpenChange={(open) => {
          if (!open) setCreated(null)
        }}
      >
        <DialogContent className="max-w-[calc(100vw-1rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('developer.agentClients.createdDialog.title')}</DialogTitle>
            <DialogDescription>
              {t('developer.agentClients.createdDialog.description')}
            </DialogDescription>
          </DialogHeader>
          {created && (
            <div className="space-y-3">
              {(
                [
                  ['clientId', created.client.client_id],
                  ['clientSecret', created.client_secret],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="rounded-md border bg-muted/40 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {t(`developer.agentClients.createdDialog.${label}`)}
                    </span>
                    <Button
                      variant="outline"
                      size="icon-sm"
                      aria-label={t(`developer.agentClients.createdDialog.copy_${label}`)}
                      onClick={() => {
                        void copy(value)
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <code className="block break-all text-xs">{value}</code>
                </div>
              ))}
              <Button
                className="w-full"
                onClick={() => {
                  setCreated(null)
                }}
              >
                {t('developer.agentClients.createdDialog.confirmSaved')}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={revoking !== null}
        onOpenChange={(open) => {
          if (!open) setRevoking(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('developer.agentClients.revokeDialog.title')}</DialogTitle>
            <DialogDescription>
              {t('developer.agentClients.revokeDialog.description', {
                name: revoking?.name ?? '',
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRevoking(null)
              }}
            >
              {t('common:actions.cancel')}
            </Button>
            <Button
              variant="destructive"
              disabled={revokeMutation.isPending}
              onClick={() => {
                if (revoking) revokeMutation.mutate(revoking.id)
              }}
            >
              {t('developer.agentClients.revokeAction')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
