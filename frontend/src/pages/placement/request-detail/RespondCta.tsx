import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Heart, MailCheck, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import type { PlacementRequestType } from '@/types/helper-profile'

export type RespondCtaVariant =
  | 'guestQuick'
  | 'guestProfile'
  | 'quick'
  | 'profileRequired'
  | 'unverified'

interface RespondCtaProps {
  variant: RespondCtaVariant
  petName: string
  requestType: string
  /** Only used by the `unverified` variant. */
  email?: string
  signInHref: string
  onQuickRespond: () => void
  onCreateHelperProfile: () => void
}

/**
 * The call to action a visitor sees on a placement request they have not
 * answered yet.
 *
 * Written for a stranger who just met the animal, often from a QR code in a
 * rescue, so it talks about the pet rather than about the records we keep. It
 * replaces both the old "No Helper Profile Found" dead end and the nothing at
 * all that a logged-out visitor used to get.
 */
export function RespondCta({
  variant,
  petName,
  requestType,
  email,
  signInHref,
  onQuickRespond,
  onCreateHelperProfile,
}: RespondCtaProps) {
  const { t } = useTranslation(['placement', 'common'])

  const title = (() => {
    switch (requestType as PlacementRequestType) {
      case 'permanent':
        return t('placement:respondCta.adoptTitle', { name: petName })
      case 'pet_sitting':
        return t('placement:respondCta.sitTitle', { name: petName })
      default:
        return t('placement:respondCta.fosterTitle', { name: petName })
    }
  })()

  const quickActionLabel =
    requestType === 'permanent'
      ? t('placement:respondCta.adoptAction', { name: petName })
      : t('placement:respondCta.fosterAction', { name: petName })

  if (variant === 'unverified') {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <MailCheck />
          </EmptyMedia>
          <EmptyTitle>{t('placement:respondCta.verifyTitle')}</EmptyTitle>
          <EmptyDescription>
            {t('placement:respondCta.verifyDescription', { email: email ?? '', name: petName })}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  if (variant === 'profileRequired' || variant === 'guestProfile') {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <UserPlus />
          </EmptyMedia>
          <EmptyTitle>
            {variant === 'guestProfile' ? title : t('placement:respondCta.profileRequiredTitle')}
          </EmptyTitle>
          <EmptyDescription>
            {t('placement:respondCta.profileRequiredDescription')}
          </EmptyDescription>
        </EmptyHeader>
        {variant === 'guestProfile' ? (
          <Button asChild>
            <Link to={signInHref}>{t('placement:respondCta.guestSignIn')}</Link>
          </Button>
        ) : (
          <Button onClick={onCreateHelperProfile}>
            <UserPlus className="mr-2 h-4 w-4" />
            {t('placement:respondCta.profileRequiredAction')}
          </Button>
        )}
      </Empty>
    )
  }

  // guestQuick and quick share a shape: one prominent offer, one quiet way out.
  const isGuest = variant === 'guestQuick'

  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Heart />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>
          {isGuest
            ? t('placement:respondCta.guestDescription', { name: petName })
            : t('placement:respondCta.quickDescription')}
        </EmptyDescription>
      </EmptyHeader>

      <div className="flex w-full flex-col items-center gap-2">
        {/* A guest gets the same button as everyone else. They fill the sheet in
            first and sign in on submit, so their words survive the round trip
            instead of being lost to an auth wall they hit before typing. */}
        <Button size="lg" className="w-full max-w-xs" onClick={onQuickRespond}>
          <Heart className="mr-2 h-4 w-4" />
          {quickActionLabel}
        </Button>
        {isGuest ? (
          <Button asChild variant="link" size="sm">
            <Link to={signInHref}>{t('placement:respondCta.guestSignIn')}</Link>
          </Button>
        ) : (
          <Button variant="link" size="sm" onClick={onCreateHelperProfile}>
            {t('placement:respondCta.buildFullProfile')}
          </Button>
        )}
      </div>
    </Empty>
  )
}
