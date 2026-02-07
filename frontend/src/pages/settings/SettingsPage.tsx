import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { AxiosError } from 'axios'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { NotificationPreferences } from '@/components/notifications/NotificationPreferences'
import { UserAvatar } from '@/components/user/UserAvatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { ChangePasswordDialog } from '@/components/auth/ChangePasswordDialog'
import { SetPasswordComponent } from '@/components/auth/SetPasswordComponent'
import { DeleteAccountDialog } from '@/components/auth/DeleteAccountDialog'
import { useCreateChat } from '@/hooks/useMessaging'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { usePutUsersMe } from '@/api/generated/user-profile/user-profile'
import { toast } from '@/components/ui/use-toast'
import { MessageCircle, User, Lock, LogOut, AlertTriangle, Bell, Info, Pencil, Check, X } from 'lucide-react'

const TAB_VALUES = ['account', 'notifications', 'contact-us'] as const
type TabValue = (typeof TAB_VALUES)[number]

function isTabValue(value: string): value is TabValue {
  return TAB_VALUES.includes(value as TabValue)
}

interface ApiError {
  message: string
  errors?: Record<string, string[]>
}

function AccountTabContent() {
  const { t } = useTranslation('settings')
  const { user, isLoading, logout, loadUser } = useAuth()
  const navigate = useNavigate()
  const [isEditingName, setIsEditingName] = useState(false)
  const { mutateAsync: updateProfile } = usePutUsersMe()

  const nameSchema = z.object({
    name: z
      .string()
      .min(1, { message: t('profile.nameRequired') })
      .max(255, { message: t('profile.nameMaxLength') }),
  })

  type NameFormValues = z.infer<typeof nameSchema>

  const nameForm = useForm<NameFormValues>({
    resolver: zodResolver(nameSchema),
    defaultValues: { name: user?.name ?? '' },
  })

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

  const handleStartEditName = useCallback(() => {
    nameForm.reset({ name: user?.name ?? '' })
    setIsEditingName(true)
  }, [nameForm, user?.name])

  const handleCancelEditName = useCallback(() => {
    setIsEditingName(false)
    nameForm.reset({ name: user?.name ?? '' })
  }, [nameForm, user?.name])

  const handleSaveName = useCallback(
    async (values: NameFormValues) => {
      try {
        await updateProfile({ data: { name: values.name, email: user?.email ?? '' } })
        await loadUser()
        setIsEditingName(false)
        toast({
          title: t('profile.saved'),
        })
      } catch (error: unknown) {
        let errorMessage = t('profile.error')
        if (error instanceof AxiosError) {
          const axiosError = error as AxiosError<ApiError>
          errorMessage = axiosError.response?.data.message ?? axiosError.message
          if (axiosError.response?.data.errors) {
            const serverErrors = axiosError.response.data.errors
            for (const key in serverErrors) {
              if (Object.prototype.hasOwnProperty.call(serverErrors, key) && key === 'name') {
                nameForm.setError('name', {
                  type: 'server',
                  message: serverErrors[key]?.[0] ?? '',
                })
              }
            }
          }
        } else if (error instanceof Error) {
          errorMessage = error.message
        }
        toast({
          title: t('profile.error'),
          description: errorMessage,
          variant: 'destructive',
        })
      }
    },
    [updateProfile, user?.email, loadUser, t, nameForm]
  )

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
        <CardContent className="space-y-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-start">
            <Skeleton className="h-24 w-24 rounded-full" />
            <div className="flex-1 space-y-3 pt-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-5 w-64" />
            </div>
          </div>
          <Separator />
          <div className="space-y-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Separator />
          <div className="space-y-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-10 w-full" />
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
      {/* Main Account Settings Card */}
      <Card>
        <CardContent className="space-y-8 pt-6">
          {/* Profile Section */}
          <div className="flex flex-col items-center gap-6 md:flex-row md:items-start">
            <UserAvatar size="xl" showUploadControls={true} />
            <div className="flex-1 grid gap-4 pt-2 text-center md:text-left">
              <div className="grid gap-1">
                <p className="text-sm font-medium leading-none text-muted-foreground">
                  {t('profile.name')}
                </p>
                {isEditingName ? (
                  <form
                    onSubmit={(e) => void nameForm.handleSubmit(handleSaveName)(e)}
                    className="flex items-center justify-center md:justify-start gap-2"
                  >
                    <Input
                      {...nameForm.register('name')}
                      autoFocus
                      className="h-9 max-w-xs"
                    />
                    <Button
                      type="submit"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      disabled={nameForm.formState.isSubmitting}
                      aria-label={t('profile.saveChanges')}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={handleCancelEditName}
                      aria-label={t('common:actions.cancel', 'Cancel')}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    {nameForm.formState.errors.name && (
                      <p className="text-sm text-destructive">
                        {nameForm.formState.errors.name.message}
                      </p>
                    )}
                  </form>
                ) : (
                  <div className="flex items-center justify-center md:justify-start gap-2">
                    <p className="text-lg font-semibold">{user.name}</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={handleStartEditName}
                      aria-label={t('profile.editName')}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
              <div className="grid gap-1">
                <p className="text-sm font-medium leading-none text-muted-foreground">
                  {t('profile.email')}
                </p>
                <p className="text-lg font-semibold">{user.email}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Password Section */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-base font-semibold">{t('security.passwordTitle')}</h4>
            </div>
            {user.has_password ? <ChangePasswordDialog /> : <SetPasswordComponent />}
          </div>

          <Separator />

          {/* Language Preference Section */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <h4 className="text-base font-semibold">{t('preferences.language.title')}</h4>
            </div>
            <LanguageSwitcher />
          </div>

          <Separator />

          {/* Session Section */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <LogOut className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-base font-semibold">{t('security.sessions.title')}</h4>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                {t('security.sessions.logout')}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground max-w-md">
              {t('security.sessions.description')}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone - Kept separate for emphasis */}
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
    <div className="container mx-auto max-w-4xl px-4 py-6 md:py-10">
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
