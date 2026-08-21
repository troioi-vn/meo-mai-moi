import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { PhoneNumberField } from '@/components/ui/PhoneNumberField'

interface QuickRespondSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  petName: string
  /** ISO code from the pet, used to preselect the dialling prefix. */
  petCountry?: string | null
  initialMessage?: string
  initialPhone?: string
  submitting: boolean
  onSubmit: (values: { message: string; phone: string }) => void | Promise<void>
}

/**
 * The short form behind "Adopt now" / "Foster now".
 *
 * Deliberately two fields. Anything longer is the helper profile form we are
 * trying to get out of the way, and this is meant to be completable standing in
 * a rescue holding a cat.
 */
export function QuickRespondSheet({
  open,
  onOpenChange,
  petName,
  petCountry,
  initialMessage = '',
  initialPhone = '',
  submitting,
  onSubmit,
}: QuickRespondSheetProps) {
  const { t } = useTranslation(['placement', 'common'])
  const [message, setMessage] = useState(initialMessage)
  const [phone, setPhone] = useState(initialPhone)
  const [phoneError, setPhoneError] = useState<string | null>(null)

  const handleSubmit = () => {
    if (!phone.trim()) {
      setPhoneError(t('placement:respondCta.sheetPhoneRequired'))
      return
    }

    setPhoneError(null)
    void onSubmit({ message: message.trim(), phone: phone.trim() })
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-md">
          <DrawerHeader>
            <DrawerTitle>{t('placement:respondCta.sheetTitle', { name: petName })}</DrawerTitle>
            <DrawerDescription>{t('placement:respondCta.sheetOwnerNote')}</DrawerDescription>
          </DrawerHeader>

          <div className="space-y-4 px-4">
            <div className="space-y-1">
              <PhoneNumberField
                id="quick-respond-phone"
                label={t('placement:respondCta.sheetPhoneLabel')}
                value={phone}
                onChange={(next) => {
                  setPhone(next)
                  if (phoneError) setPhoneError(null)
                }}
                defaultCountry={petCountry}
                error={phoneError ?? undefined}
                describedBy="quick-respond-phone-hint"
                required
              />
              <p id="quick-respond-phone-hint" className="text-xs text-muted-foreground">
                {t('placement:respondCta.sheetPhoneHint')}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quick-respond-message">
                {t('placement:respondCta.sheetMessageLabel')}
              </Label>
              <Textarea
                id="quick-respond-message"
                value={message}
                onChange={(event) => {
                  setMessage(event.target.value)
                }}
                maxLength={1000}
                rows={4}
                placeholder={t('placement:respondCta.sheetMessagePlaceholder')}
              />
            </div>

            {/* Said out loud on purpose. Creating a record the user never asked
                for is only acceptable if they are told it is happening. */}
            <p className="text-xs text-muted-foreground">
              {t('placement:respondCta.sheetProfileNotice')}
            </p>
          </div>

          <DrawerFooter>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              {t('placement:respondCta.sheetSubmit')}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false)
              }}
              disabled={submitting}
            >
              {t('placement:respondCta.sheetCancel')}
            </Button>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
