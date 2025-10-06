import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { useTheme } from '@/hooks/use-theme'
import { Moon, Sun } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import defaultAvatar from '@/assets/images/default-avatar.webp'

export function UserMenu() {
  const { user, logout, isLoading } = useAuth()
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()

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
          <AvatarImage
            src={user.avatar_url && user.avatar_url.trim() !== '' ? user.avatar_url : defaultAvatar}
            alt={user.name}
          />
          <AvatarFallback className="bg-blue-500 text-white font-medium text-sm">
            {user.name
              ? user.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()
              : '?'}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem className="cursor-pointer" asChild>
          <Link to="/account">Profile</Link>
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer" asChild>
          <Link to="/account/pets">My Pets</Link>
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer" asChild>
          <Link to="/invitations">Invitations</Link>
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer" asChild>
          <Link to="/helper">Helper Profiles</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={theme}
          onValueChange={(value: string) => {
            if (value === 'light' || value === 'dark' || value === 'system') {
              setTheme(value)
            }
          }}
        >
          <DropdownMenuRadioItem value="light">
            <Sun className="h-[1.2rem] w-[1.2rem] mr-2" />
            Light
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <Moon className="h-[1.2rem] w-[1.2rem] mr-2" />
            Dark
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <div className="h-[1.2rem] w-[1.2rem] mr-2 relative">
              <Sun className="h-[1.2rem] w-[1.2rem] absolute rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="h-[1.2rem] w-[1.2rem] absolute rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </div>
            System
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
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
          Log Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
