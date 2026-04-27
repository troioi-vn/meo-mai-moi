import { Gem } from 'lucide-react'
import { AvatarBadge } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'

interface PremiumAvatarBadgeProps {
  size?: 'default' | 'large'
}

export function PremiumAvatarBadge({ size = 'default' }: PremiumAvatarBadgeProps) {
  const { t } = useTranslation('common')
  const premiumLabel = t('userMenu.premiumBadge')

  return (
    <AvatarBadge
      className={cn('premium-avatar-badge', size === 'large' && 'premium-avatar-badge--large')}
      aria-label={premiumLabel}
      title={premiumLabel}
    >
      <Gem className="premium-avatar-badge__icon" />
    </AvatarBadge>
  )
}
