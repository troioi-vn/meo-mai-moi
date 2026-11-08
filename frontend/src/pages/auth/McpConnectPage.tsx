import { useTranslation } from 'react-i18next'
import { useEffect, useMemo, useState } from 'react'
import { AxiosError } from 'axios'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { confirmMcpConnect, denyMcpConnect, getMcpSession, type McpSession } from '@/api/mcp-auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { mcpScopeDescription } from './mcpScopeDescription'

const errorText = (error: unknown, fallback: string) => {
  if (error instanceof AxiosError) {
    const payload = error.response?.data as { message?: string } | undefined
    return payload?.message ?? fallback
  }
  return fallback
}

export default function McpConnectPage() {
  const { t } = useTranslation('auth')
  const [params] = useSearchParams()
  const requestRef = params.get('request_ref') ?? ''
  const { isAuthenticated, isLoading, login, logout, user } = useAuth()
  const [session, setSession] = useState<McpSession | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const validRequest = useMemo(() => requestRef !== '', [requestRef])

  useEffect(() => {
    if (!validRequest) return
    void getMcpSession(requestRef)
      .then(setSession)
      .catch((cause: unknown) => {
        setError(errorText(cause, t('mcp.invalidError')))
      })
  }, [requestRef, validRequest, t])

  const redirectFrom = async (action: () => Promise<{ redirect_url: string }>) => {
    setSubmitting(true)
    setError(null)
    try {
      const response = await action()
      window.location.assign(response.redirect_url)
    } catch (cause: unknown) {
      setError(errorText(cause, t('mcp.completeError')))
      setSubmitting(false)
    }
  }

  const switchAccount = async () => {
    setSubmitting(true)
    setError(null)
    try {
      await logout()
    } catch (cause: unknown) {
      setError(errorText(cause, t('mcp.signOutError')))
    } finally {
      setSubmitting(false)
    }
  }

  if (!validRequest || (error && session === null)) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12">
        <Card>
          <CardHeader>
            <CardTitle>{t('mcp.invalid')}</CardTitle>
            <CardDescription>{error ?? t('mcp.missingReference')}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (isLoading || session === null) {
    return <div className="flex min-h-[60vh] items-center justify-center">{t('mcp.loading')}</div>
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12">
        <Card>
          <CardHeader>
            <CardTitle>{t('mcp.signIn')}</CardTitle>
            <CardDescription>
              {t('mcp.signInDescription', { client: session.client_name })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault()
                setSubmitting(true)
                setError(null)
                void login({ email, password, remember: true })
                  .catch((cause: unknown) => {
                    setError(errorText(cause, t('mcp.signInError')))
                  })
                  .finally(() => {
                    setSubmitting(false)
                  })
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="mcp-email">{t('mcp.email')}</Label>
                <Input
                  id="mcp-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value)
                  }}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mcp-password">{t('mcp.password')}</Label>
                <Input
                  id="mcp-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value)
                  }}
                  required
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={submitting}>
                {t('mcp.submit')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle>{t('mcp.authorize', { client: session.client_name })}</CardTitle>
          <CardDescription>{t('mcp.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            <p className="font-medium">
              {t('mcp.signedIn', { name: user?.name ?? t('mcp.user') })}
            </p>
            {user?.email && <p className="text-muted-foreground">{user.email}</p>}
          </div>
          <div>
            <p className="text-sm font-medium">{t('mcp.permissions')}</p>
            <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">
              {session.scopes.map((scope) => (
                <li key={scope}>{mcpScopeDescription(scope, t)}</li>
              ))}
            </ul>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-3">
            <Button
              disabled={submitting}
              onClick={() => void redirectFrom(() => confirmMcpConnect(requestRef))}
            >
              {t('mcp.allow')}
            </Button>
            <Button
              variant="outline"
              disabled={submitting}
              onClick={() => void redirectFrom(() => denyMcpConnect(requestRef))}
            >
              {t('mcp.deny')}
            </Button>
            <Button variant="ghost" disabled={submitting} onClick={() => void switchAccount()}>
              {t('mcp.switchAccount')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
