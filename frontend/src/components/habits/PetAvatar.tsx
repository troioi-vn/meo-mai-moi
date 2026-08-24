import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface PetAvatarProps {
  name?: string | null
  photoUrl?: string | null
}

export function PetAvatar({ name, photoUrl }: PetAvatarProps) {
  const displayName = name ?? ''
  return (
    <Avatar className="h-8 w-8 shrink-0">
      <AvatarImage src={photoUrl ?? undefined} alt={displayName} />
      <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
        {displayName.slice(0, 2).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  )
}
