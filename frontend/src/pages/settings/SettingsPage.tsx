import { useCallback, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import {
  MessageCircle,
  User,
  Lock,
  Languages,
  LogOut,
  AlertTriangle,
  Bell,
  Info,
} from 'lucide-react'

const TAB_VALUES = ['account', 'notifications', 'contact-us'] as const
type TabValue = (typeof TAB_VALUES)[number]

function isTabValue(value: string): value is TabValue {
  return TAB_VALUES.includes(value as TabValue)
}

function AccountTabContent() {
  const { t } = useTranslation('settings')
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
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {t('profile.title')}
          </CardTitle>
          <CardDescription>{t('profile.loading')}</CardDescription>
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
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {t('profile.title')}
          </CardTitle>
          <CardDescription>{t('profile.errorLoading')}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t('profile.errorLoadingDescription')}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {t('profile.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            <UserAvatar size="xl" showUploadControls={true} />
            <div className="flex-1 space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('profile.name')}</p>
                <p className="text-lg font-semibold text-card-foreground">{user.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('profile.email')}</p>
                <p className="text-lg font-semibold text-card-foreground">{user.email}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Password Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            {t('security.passwordTitle')}
          </CardTitle>
          <CardDescription>
            {user.has_password
              ? t('security.passwordDescription')
              : t('security.setPasswordDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {user.has_password ? <ChangePasswordDialog /> : <SetPasswordComponent />}
        </CardContent>
      </Card>

      {/* Language Preference Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Languages className="h-5 w-5" />
            {t('preferences.language.title')}
          </CardTitle>
          <CardDescription>{t('preferences.language.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <p className="text-sm font-medium text-muted-foreground">
              {t('preferences.language.current')}
            </p>
            <LanguageSwitcher />
          </div>
        </CardContent>
      </Card>

      {/* Session Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LogOut className="h-5 w-5" />
            {t('security.sessions.title')}
          </CardTitle>
          <CardDescription>{t('security.sessions.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={handleLogout} className="flex items-center gap-2">
            <LogOut className="h-4 w-4" />
            {t('security.sessions.logout')}
          </Button>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/50 bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            {t('security.deleteAccount.title')}
          </CardTitle>
          <CardDescription>{t('security.deleteAccount.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <DeleteAccountDialog onAccountDeleted={handleAccountDeleted} />
        </CardContent>
      </Card>
    </div>
  )
}

export default function SettingsPage() {
  const { t } = useTranslation('settings')
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
          <TabsTrigger value="account">{t('tabs.account')}</TabsTrigger>
          <TabsTrigger value="notifications">{t('tabs.notifications')}</TabsTrigger>
          <TabsTrigger value="contact-us">{t('tabs.contactUs')}</TabsTrigger>
        </TabsList>

        <TabsContent value="account">
          <AccountTabContent />
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                {t('notifications.title')}
              </CardTitle>
              <CardDescription>{t('notifications.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <NotificationPreferences />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact-us">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                {t('contactUs.title')}
              </CardTitle>
              <CardDescription>{t('contactUs.description')}</CardDescription>
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
                className="flex items-center gap-2"
              >
                <MessageCircle className="h-4 w-4" />
                {creating ? t('contactUs.starting') : t('contactUs.chatWithSupport')}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
