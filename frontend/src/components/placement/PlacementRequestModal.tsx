import { useCreatePlacementRequest } from '@/hooks/useCreatePlacementRequest'
import React, { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { format, addMonths, startOfDay, isBefore } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PlacementTermsLink } from './PlacementTermsDialog'
import { useTranslation } from 'react-i18next'

interface PlacementRequestModalProps {
  petId: number
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  initialValues?: {
    request_type?: string
    start_date?: Date
    end_date?: Date
    notes?: string
  }
}

export const PlacementRequestModal: React.FC<PlacementRequestModalProps> = ({
  petId,
  isOpen,
  onClose,
  onSuccess,
  initialValues,
}) => {
  const { t } = useTranslation(['placement', 'common'])
  const [requestType, setRequestType] = useState(initialValues?.request_type ?? '')
  const [notes, setNotes] = useState(initialValues?.notes ?? '')
  const [startDate, setStartDate] = useState<Date | undefined>(
    initialValues?.start_date ?? undefined
  )
  const [endDate, setEndDate] = useState<Date | undefined>(initialValues?.end_date ?? undefined)
  const [startDatePickerOpen, setStartDatePickerOpen] = useState(false)
  const [endDatePickerOpen, setEndDatePickerOpen] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [publicProfileAccepted, setPublicProfileAccepted] = useState(false)
  const createPlacementRequestMutation = useCreatePlacementRequest()

  // Date validation
  const today = useMemo(() => startOfDay(new Date()), [])

  const expiresAt = useMemo(() => {
    if (requestType === 'permanent') {
      return addMonths(new Date(), 6)
    }
    return startDate
  }, [requestType, startDate])

  const isStartDateValid = useMemo(() => {
    if (!startDate) return true // No date selected yet, no error
    return !isBefore(startOfDay(startDate), today)
  }, [startDate, today])

  const isEndDateValid = useMemo(() => {
    if (!endDate || !startDate) return true // No dates to compare
    if (requestType === 'permanent') return true // End date not used for permanent
    return !isBefore(startOfDay(endDate), startOfDay(startDate))
  }, [endDate, startDate, requestType])

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    // Basic client-side validation to align with backend (start_date required)
    if (!requestType || !startDate) {
      return
    }
    createPlacementRequestMutation.mutate(
      {
        pet_id: petId,
        request_type: requestType,
        notes,
        expires_at: expiresAt ? format(expiresAt, 'yyyy-MM-dd') : undefined,
        start_date: format(startDate, 'yyyy-MM-dd'),
        end_date:
          requestType !== 'permanent' && endDate ? format(endDate, 'yyyy-MM-dd') : undefined,
      },
      {
        onSuccess: () => {
          onSuccess?.()
          onClose()
        },
      }
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle>{t('placement:createModal.title')}</DialogTitle>
          <DialogDescription>{t('placement:createModal.description')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="request-type" className="text-right">
                {t('placement:createModal.labels.type')}
              </Label>
              <Select onValueChange={setRequestType} value={requestType}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder={t('placement:createModal.labels.typePlaceholder')} />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  <SelectItem value="foster_paid">
                    {t('placement:requestTypes.foster_paid')}
                  </SelectItem>
                  <SelectItem value="foster_free">
                    {t('placement:requestTypes.foster_free')}
                  </SelectItem>
                  <SelectItem value="permanent">{t('placement:requestTypes.permanent')}</SelectItem>
                  <SelectItem value="pet_sitting">
                    {t('placement:requestTypes.pet_sitting')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="notes" className="text-right">
                {t('placement:createModal.labels.notes')}
              </Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value)
                }}
                className="col-span-3"
                placeholder={t('placement:createModal.labels.notesPlaceholder')}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="start-date" className="text-right">
                {t('placement:createModal.labels.pickupDate')}
              </Label>
              <div className="col-span-3 space-y-1">
                <Popover open={startDatePickerOpen} onOpenChange={setStartDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      id="start-date"
                      variant={'outline'}
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !startDate && 'text-muted-foreground',
                        !isStartDateValid && 'border-destructive'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? (
                        format(startDate, 'PPP')
                      ) : (
                        <span>{t('placement:createModal.labels.datePlaceholder')}</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => {
                        setStartDate(date)
                        if (date) setStartDatePickerOpen(false)
                      }}
                      disabled={(date) => isBefore(startOfDay(date), today)}
                      autoFocus
                    />
                  </PopoverContent>
                </Popover>
                {!isStartDateValid && (
                  <p className="text-xs text-destructive">
                    {t('placement:createModal.errors.pickupInPast')}
                  </p>
                )}
              </div>
            </div>
            {requestType !== 'permanent' && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="end-date" className="text-right">
                  {t('placement:createModal.labels.dropoffDate')}
                </Label>
                <div className="col-span-3 space-y-1">
                  <Popover open={endDatePickerOpen} onOpenChange={setEndDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        id="end-date"
                        variant={'outline'}
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !endDate && 'text-muted-foreground',
                          !isEndDateValid && 'border-destructive'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? (
                          format(endDate, 'PPP')
                        ) : (
                          <span>{t('placement:createModal.labels.datePlaceholder')}</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={(date) => {
                          setEndDate(date)
                          if (date) setEndDatePickerOpen(false)
                        }}
                        disabled={(date) =>
                          startDate ? isBefore(startOfDay(date), startOfDay(startDate)) : false
                        }
                        autoFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {!isEndDateValid && (
                    <p className="text-xs text-destructive">
                      {t('placement:createModal.errors.dropoffBeforePickup')}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Public Profile Warning Checkbox */}
            <div className="flex items-start space-x-3 pt-2 border-t">
              <Checkbox
                id="public-profile-accepted"
                checked={publicProfileAccepted}
                onCheckedChange={(checked) => {
                  setPublicProfileAccepted(checked === true)
                }}
                className="mt-1"
              />
              <Label
                htmlFor="public-profile-accepted"
                className="flex-1 min-w-0 items-start text-sm font-normal leading-relaxed cursor-pointer"
              >
                <span className="leading-relaxed">
                  {t('placement:createModal.labels.publicProfileNotice')}
                </span>
              </Label>
            </div>

            {/* Terms and Conditions Checkbox */}
            <div className="flex items-start space-x-3">
              <Checkbox
                id="terms-accepted"
                checked={termsAccepted}
                onCheckedChange={(checked) => {
                  setTermsAccepted(checked === true)
                }}
                className="mt-1"
              />
              <Label
                htmlFor="terms-accepted"
                className="flex-1 min-w-0 items-start text-sm font-normal leading-relaxed cursor-pointer"
              >
                <span className="leading-relaxed">
                  {t('placement:createModal.labels.termsPrefix')}
                  <PlacementTermsLink className="text-sm" />.
                </span>
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t('placement:createModal.labels.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={
                createPlacementRequestMutation.isPending ||
                !requestType ||
                !startDate ||
                !isStartDateValid ||
                !isEndDateValid ||
                !publicProfileAccepted ||
                !termsAccepted
              }
            >
              {createPlacementRequestMutation.isPending
                ? t('placement:createModal.labels.creating')
                : t('placement:createModal.labels.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
