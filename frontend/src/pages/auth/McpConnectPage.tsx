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
        setError(errorText(cause, 'This authorization request is invalid or expired.'))
      })
  }, [requestRef, validRequest])

  const redirectFrom = async (action: () => Promise<{ redirect_url: string }>) => {
    setSubmitting(true)
    setError(null)
    try {
      const response = await action()
      window.location.assign(response.redirect_url)
    } catch (cause: unknown) {
      setError(errorText(cause, 'Unable to complete authorization.'))
      setSubmitting(false)
    }
  }

  const switchAccount = async () => {
    setSubmitting(true)
    setError(null)
    try {
      await logout()
    } catch (cause: unknown) {
      setError(errorText(cause, 'Unable to sign out. Please try again.'))
    } finally {
      setSubmitting(false)
    }
  }

  if (!validRequest || (error && session === null)) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12">
        <Card>
          <CardHeader>
            <CardTitle>Invalid authorization request</CardTitle>
            <CardDescription>
              {error ?? 'The authorization link is missing its request reference.'}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (isLoading || session === null) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        Loading authorization request…
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12">
        <Card>
          <CardHeader>
            <CardTitle>Sign in to Meo Mai Moi</CardTitle>
            <CardDescription>
              {session.client_name} is requesting access. Sign in with your verified Meo Mai Moi
              account to continue.
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
                    setError(errorText(cause, 'Unable to sign in.'))
                  })
                  .finally(() => {
                    setSubmitting(false)
                  })
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="mcp-email">Email</Label>
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
                <Label htmlFor="mcp-password">Password</Label>
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
                Sign in
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
          <CardTitle>Authorize {session.client_name}?</CardTitle>
          <CardDescription>This client is asking Meo Mai Moi for delegated access.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            <p className="font-medium">Signed in as {user?.name ?? 'Meo Mai Moi user'}</p>
            {user?.email && <p className="text-muted-foreground">{user.email}</p>}
          </div>
          <div>
            <p className="text-sm font-medium">Requested permissions</p>
            <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">
              {session.scopes.map((scope) => (
                <li key={scope}>{mcpScopeDescription(scope)}</li>
              ))}
            </ul>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-3">
            <Button
              disabled={submitting}
              onClick={() => void redirectFrom(() => confirmMcpConnect(requestRef))}
            >
              Allow
            </Button>
            <Button
              variant="outline"
              disabled={submitting}
              onClick={() => void redirectFrom(() => denyMcpConnect(requestRef))}
            >
              Deny
            </Button>
            <Button variant="ghost" disabled={submitting} onClick={() => void switchAccount()}>
              Use another account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
