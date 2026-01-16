import { useCallback, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { NotificationPreferences } from '@/components/notifications/NotificationPreferences'
import { UserAvatar } from '@/components/user/UserAvatar'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { ChangePasswordDialog } from '@/components/auth/ChangePasswordDialog'
import { SetPasswordComponent } from '@/components/auth/SetPasswordComponent'
import { DeleteAccountDialog } from '@/components/auth/DeleteAccountDialog'
import { useCreateChat } from '@/hooks/useMessaging'
import { MessageCircle } from 'lucide-react'

const TAB_VALUES = ['account', 'notifications', 'contact-us'] as const
type TabValue = (typeof TAB_VALUES)[number]

function isTabValue(value: string): value is TabValue {
  return TAB_VALUES.includes(value as TabValue)
}

function AccountTabContent() {
  const { user, isLoading, logout } = useAuth()
  const navigate = useNavigate()

  const navigateToLogin = useCallback(() => {
    void navigate('/login')
  }, [navigate])

  const handleLogout = useCallback(() => {
    void (async () => {
      try {
        await logout()
        navigateToLogin()
      } catch (err: unknown) {
        console.error('Logout error:', err)
      }
    })()
  }, [logout, navigateToLogin])

  const handleAccountDeleted = useCallback(() => {
    void (async () => {
      try {
        await logout()
        navigateToLogin()
      } catch (err: unknown) {
        console.error('Logout error:', err)
      }
    })()
  }, [logout, navigateToLogin])

  if (isLoading && !user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Account overview</CardTitle>
          <CardDescription>Loading your account details…</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6 md:flex-row md:items-center">
          <Skeleton className="h-24 w-24 rounded-full" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-5 w-64" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Account overview</CardTitle>
          <CardDescription>We couldn’t load your account details right now.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Please refresh the page or log back in to manage your account settings.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Profile Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            <UserAvatar size="xl" showUploadControls={true} />
            <div className="flex-1 space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="text-lg font-semibold text-card-foreground">{user.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="text-lg font-semibold text-card-foreground">{user.email}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Password Section */}
      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>
            {user.has_password
              ? 'Update your password to keep your account secure.'
              : 'Set a password to sign in directly without third-party authentication.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {user.has_password ? <ChangePasswordDialog /> : <SetPasswordComponent />}
        </CardContent>
      </Card>

      {/* Session Section */}
      <Card>
        <CardHeader>
          <CardTitle>Session</CardTitle>
          <CardDescription>
            Sign out of this session. You can always log back in later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={handleLogout}>
            Log out
          </Button>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Danger zone</CardTitle>
          <CardDescription>
            Permanently delete your account and all associated data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DeleteAccountDialog onAccountDeleted={handleAccountDeleted} />
        </CardContent>
      </Card>
    </div>
  )
}

export default function SettingsPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { create, creating } = useCreateChat()

  useEffect(() => {
    if (location.pathname === '/settings' || location.pathname === '/settings/') {
      void navigate('/settings/account', { replace: true })
    }
  }, [location.pathname, navigate])

  const currentSegment = location.pathname.replace(/^\/settings\/?/, '').split('/')[0] ?? ''
  const activeTab: TabValue = isTabValue(currentSegment) ? currentSegment : 'account'

  const handleTabChange = (nextValue: string) => {
    if (isTabValue(nextValue) && nextValue !== activeTab) {
      void navigate(`/settings/${nextValue}`)
    }
  }

  return (
    <div className="container mx-auto max-w-5xl py-10">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="contact-us">Contact us</TabsTrigger>
        </TabsList>

        <TabsContent value="account">
          <AccountTabContent />
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification settings</CardTitle>
              <CardDescription>Choose how we contact you and manage device alerts.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <NotificationPreferences />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact-us">
          <Card>
            <CardHeader>
              <CardTitle>Contact Support</CardTitle>
              <CardDescription>
                Need help? Start a conversation with our support team.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => {
                  void (async () => {
                    const chat = await create(2)
                    if (chat) {
                      void navigate(`/messages/${String(chat.id)}`)
                    }
                  })()
                }}
                disabled={creating}
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                {creating ? 'Starting...' : 'Chat with Support'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
