import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Heart, Loader2, MailCheck, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
  /** Disables the button while the response is in flight. */
  submitting?: boolean
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
  submitting = false,
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
      <section className="grid gap-5 px-5 py-6 sm:px-7 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:px-8">
        <div className="flex gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-background text-foreground ring-1 ring-foreground/10">
            <MailCheck />
          </div>
          <div>
            <h2 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">
              {t('placement:respondCta.verifyTitle')}
            </h2>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
              {t('placement:respondCta.verifyDescription', { email: email ?? '', name: petName })}
            </p>
          </div>
        </div>
      </section>
    )
  }

  if (variant === 'profileRequired' || variant === 'guestProfile') {
    return (
      <section className="grid gap-5 px-5 py-6 sm:px-7 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:px-8">
        <div className="flex gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-background text-foreground ring-1 ring-foreground/10">
            <UserPlus />
          </div>
          <div>
            <h2 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">
              {variant === 'guestProfile' ? title : t('placement:respondCta.profileRequiredTitle')}
            </h2>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
              {t('placement:respondCta.profileRequiredDescription')}
            </p>
          </div>
        </div>
        {variant === 'guestProfile' ? (
          <Button asChild size="lg" className="w-full md:min-w-52">
            <Link to={signInHref}>{t('placement:respondCta.guestSignIn')}</Link>
          </Button>
        ) : (
          <Button onClick={onCreateHelperProfile} size="lg" className="w-full md:min-w-52">
            <UserPlus className="mr-2 h-4 w-4" />
            {t('placement:respondCta.profileRequiredAction')}
          </Button>
        )}
      </section>
    )
  }

  // Guests and signed-in visitors share the same prominent offer shape.
  const isGuest = variant === 'guestQuick'

  return (
    <section className="grid gap-5 px-5 py-6 sm:px-7 md:grid-cols-[minmax(0,1fr)_minmax(15rem,20rem)] md:items-center md:px-8">
      <div className="flex gap-4">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-background text-foreground ring-1 ring-foreground/10">
          <Heart />
        </div>
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">{title}</h2>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
            {isGuest
              ? t('placement:respondCta.guestDescription', { name: petName })
              : t('placement:respondCta.quickDescription')}
          </p>
        </div>
      </div>

      <div className="flex w-full flex-col items-stretch gap-1">
        {/* One button for everyone. A guest is sent to sign-in first and the
            offer completes when they land back here; a signed-in user sends it
            outright. Neither is asked to fill in a form to reach an auth wall. */}
        <Button size="lg" className="w-full" onClick={onQuickRespond} disabled={submitting}>
          {submitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Heart className="mr-2 h-4 w-4" />
          )}
          {quickActionLabel}
        </Button>
        {!isGuest && (
          <Button variant="link" size="sm" onClick={onCreateHelperProfile}>
            {t('placement:respondCta.buildFullProfile')}
          </Button>
        )}
      </div>
    </section>
  )
}
