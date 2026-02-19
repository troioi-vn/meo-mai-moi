import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Switch } from '@/components/ui/switch'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { useTheme } from '@/hooks/use-theme'
import { usePwaInstall } from '@/hooks/use-pwa-install'
import { useTranslation } from 'react-i18next'
import { Moon } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import defaultAvatar from '@/assets/images/default-avatar.webp'
import { useEffect, useState } from 'react'
import { getInitials } from '@/utils/initials'

function InstallDesktopIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className="mr-2 h-4 w-4"
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M20 17H4V5h8V3H4C2.89 3 2 3.89 2 5v12c0 1.1.89 2 2 2h4v2h8v-2h4c1.1 0 2-.9 2-2v-3h-2v3Z"
      />
      <path fill="currentColor" d="m17 14 5-5-1.41-1.41L18 10.17V3h-2v7.17l-2.59-2.58L12 9l5 5Z" />
    </svg>
  )
}

export function UserMenu() {
  const { t } = useTranslation('common')
  const { user, logout, isLoading } = useAuth()
  const { theme, setTheme } = useTheme()
  const { canInstall, triggerInstall } = usePwaInstall(Boolean(user))
  const navigate = useNavigate()
  const isVerified = Boolean(user?.email_verified_at)
  const [avatarSrc, setAvatarSrc] = useState<string>(user?.avatar_url ?? defaultAvatar)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [prevAvatarUrl, setPrevAvatarUrl] = useState(user?.avatar_url)

  // Reset avatarSrc when user.avatar_url changes to empty/null
  if (user?.avatar_url !== prevAvatarUrl) {
    setPrevAvatarUrl(user?.avatar_url)
    if (!user?.avatar_url || user.avatar_url.trim() === '') {
      setAvatarSrc(defaultAvatar)
    }
  }

  // Preload avatar image to ensure it's available
  useEffect(() => {
    const avatarUrl = user?.avatar_url
    if (avatarUrl && avatarUrl.trim() !== '') {
      const img = new Image()
      img.onload = () => {
        setAvatarSrc(avatarUrl)
      }
      img.onerror = () => {
        setAvatarSrc(defaultAvatar)
      }
      img.src = avatarUrl
    }
  }, [user?.avatar_url])

  if (isLoading) {
    return <Skeleton className="h-9 w-9 rounded-full" />
  }

  if (!user) {
    return null
  }

  return (
    <DropdownMenu data-testid="user-menu">
      <DropdownMenuTrigger asChild>
        <Avatar className="h-9 w-9 cursor-pointer">
          <AvatarImage key={avatarSrc} src={avatarSrc} alt={user.name} />
          <AvatarFallback className="bg-primary text-primary-foreground font-medium text-sm">
            {user.name ? getInitials(user.name) : '?'}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {isVerified && (
          <>
            <DropdownMenuItem className="cursor-pointer" asChild>
              <Link to="/invitations">{t('nav.invitations')}</Link>
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" asChild>
              <Link to="/helper">{t('nav.helperProfiles')}</Link>
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" asChild>
              <Link to="/settings/account">{t('nav.settings')}</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        {canInstall && (
          <>
            <DropdownMenuItem className="cursor-pointer" onClick={() => void triggerInstall()}>
              <InstallDesktopIcon />
              {t('userMenu.installApp')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <div className="flex items-center gap-2 px-2 py-1.5">
          <Switch
            checked={theme === 'dark'}
            onCheckedChange={(checked) => {
              setTheme(checked ? 'dark' : 'light')
            }}
            aria-label="Toggle dark mode"
          />
          <Moon className="h-4 w-4" />
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            setShowLogoutConfirm(true)
          }}
        >
          {t('nav.logout')}
        </DropdownMenuItem>
      </DropdownMenuContent>
      <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('userMenu.logoutConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('userMenu.logoutConfirmDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('actions.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                void logout()
                  .then(() => {
                    void navigate('/login')
                  })
                  .catch((err: unknown) => {
                    console.error('Logout error:', err)
                  })
              }}
            >
              {t('nav.logout')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DropdownMenu>
  )
}
