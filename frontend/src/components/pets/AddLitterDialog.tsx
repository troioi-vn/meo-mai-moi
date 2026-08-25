import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CountrySelect } from '@/components/ui/CountrySelect'
import { CitySelect } from '@/components/location/CitySelect'
import { YearMonthDatePicker } from '@/components/ui/YearMonthDatePicker'
import { useGetPetTypes } from '@/api/generated/pet-types/pet-types'
import { usePostLitters } from '@/api/generated/litters/litters'
import { useGetSettingsPublic } from '@/api/generated/settings/settings'
import { getGetMyPetsSectionsQueryKey } from '@/api/generated/pets/pets'
import { getGetPetTypesQueryKey } from '@/api/generated/pet-types/pet-types'
import type { City, PostLittersBody } from '@/api/generated/model'
import { toast } from '@/lib/i18n-toast'
import { Spinner } from '@/components/ui/spinner'

type SexValue = 'male' | 'female' | 'not_specified'

interface MemberState {
  sex: SexValue
  name: string
  weight_kg: string
}

const DEFAULT_MEMBER_COUNT = 4
const DEFAULT_MIN_MEMBERS = 2
const DEFAULT_MAX_MEMBERS = 12

function getCurrentYearMonth() {
  const today = new Date()
  return {
    year: String(today.getFullYear()),
    month: String(today.getMonth() + 1),
  }
}

function createMembers(count: number): MemberState[] {
  return Array.from({ length: count }, () => ({
    sex: 'not_specified' as SexValue,
    name: '',
    weight_kg: '',
  }))
}

interface AddLitterDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  groupId?: number | null
}

export function AddLitterDialog({ open, onOpenChange, groupId }: AddLitterDialogProps) {
  const { t } = useTranslation('pets')
  const queryClient = useQueryClient()

  const { data: petTypesRaw, isLoading: loadingPetTypes } = useGetPetTypes()
  const { data: publicSettings } = useGetSettingsPublic()
  const minMembers = publicSettings?.litter_min_members ?? DEFAULT_MIN_MEMBERS
  const maxMembers = publicSettings?.litter_max_members ?? DEFAULT_MAX_MEMBERS
  const initialMemberCount = Math.min(maxMembers, Math.max(minMembers, DEFAULT_MEMBER_COUNT))
  const petTypes = React.useMemo(() => {
    const raw = petTypesRaw ?? []
    return raw.filter((pt) => pt.supports_litters === true)
  }, [petTypesRaw])

  const [litterName, setLitterName] = React.useState('')
  const [petTypeId, setPetTypeId] = React.useState<number | ''>('')
  const [country, setCountry] = React.useState('VN')
  const [stateValue, setStateValue] = React.useState('')
  const [citySelected, setCitySelected] = React.useState<City | null>(null)
  const [address, setAddress] = React.useState('')
  const [birthdayPrecision, setBirthdayPrecision] = React.useState<
    'day' | 'month' | 'year' | 'unknown'
  >('unknown')
  const [birthday, setBirthday] = React.useState('')
  const [birthdayYear, setBirthdayYear] = React.useState(() => getCurrentYearMonth().year)
  const [birthdayMonth, setBirthdayMonth] = React.useState(() => getCurrentYearMonth().month)
  const [birthdayDay, setBirthdayDay] = React.useState('')
  const [memberCount, setMemberCount] = React.useState(DEFAULT_MEMBER_COUNT)
  const [members, setMembers] = React.useState<MemberState[]>(() =>
    createMembers(DEFAULT_MEMBER_COUNT)
  )
  const [errors, setErrors] = React.useState<{
    petTypeId?: string
    memberCount?: string
    general?: string
  }>({})

  const { mutateAsync: postLitters, isPending } = usePostLitters()

  // Keep members length in sync with memberCount
  const handleMemberCountChange = (value: string) => {
    const count = Number(value)
    if (Number.isNaN(count) || count < minMembers || count > maxMembers) return
    setMemberCount(count)
    setMembers((prev) => {
      if (prev.length === count) return prev
      if (prev.length < count) {
        return [...prev, ...createMembers(count - prev.length)]
      }
      return prev.slice(0, count)
    })
    if (errors.memberCount) setErrors((p) => ({ ...p, memberCount: undefined }))
  }

  const updateMember = (index: number, patch: Partial<MemberState>) => {
    setMembers((prev) => prev.map((m, i) => (i === index ? { ...m, ...patch } : m)))
  }

  const resetForm = React.useCallback(() => {
    const currentYearMonth = getCurrentYearMonth()
    setLitterName('')
    setPetTypeId('')
    setCountry('VN')
    setStateValue('')
    setCitySelected(null)
    setAddress('')
    setBirthdayPrecision('unknown')
    setBirthday('')
    setBirthdayYear(currentYearMonth.year)
    setBirthdayMonth(currentYearMonth.month)
    setBirthdayDay('')
    setMemberCount(initialMemberCount)
    setMembers(createMembers(initialMemberCount))
    setErrors({})
  }, [initialMemberCount])

  React.useEffect(() => {
    const nextCount = Math.min(maxMembers, Math.max(minMembers, memberCount))
    if (nextCount === memberCount) return

    setMemberCount(nextCount)
    setMembers((prev) => {
      if (prev.length < nextCount) {
        return [...prev, ...createMembers(nextCount - prev.length)]
      }
      return prev.slice(0, nextCount)
    })
  }, [maxMembers, memberCount, minMembers])

  React.useEffect(() => {
    if (!open) {
      // reset on close after animation
      const id = setTimeout(resetForm, 200)
      return () => {
        clearTimeout(id)
      }
    }
  }, [open, resetForm])

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    const newErrors: typeof errors = {}
    if (petTypeId === '') {
      newErrors.petTypeId = t('pets:litter.validation.petTypeRequired')
    }
    if (memberCount < minMembers || memberCount > maxMembers) {
      newErrors.memberCount = t('pets:litter.validation.memberCountRange', {
        min: minMembers,
        max: maxMembers,
      })
    }
    if (!country.trim()) {
      newErrors.general = t('pets:validation.countryRequired')
    }
    if (Object.keys(newErrors).length > 0 || petTypeId === '') {
      setErrors(newErrors)
      return
    }
    setErrors({})

    // Build members payload omitting blank name/weight
    const payloadMembers = members.map((m) => {
      const entry: { sex: SexValue; name?: string; weight_kg?: number | null } = {
        sex: m.sex,
      }
      const trimmedName = m.name.trim()
      if (trimmedName) entry.name = trimmedName
      const trimmedWeight = m.weight_kg.trim()
      if (trimmedWeight) {
        const num = Number(trimmedWeight)
        if (!Number.isNaN(num)) entry.weight_kg = num
        else entry.weight_kg = null
      }
      return entry
    })

    // Filter out invalid weight? validation: if weight non-numeric, show error
    const invalidWeightIndex = members.findIndex((m) => {
      const w = m.weight_kg.trim()
      if (!w) return false
      const n = Number(w)
      return Number.isNaN(n) || n <= 0
    })
    if (invalidWeightIndex !== -1) {
      setErrors({ general: t('pets:litter.errors.validationFailed') })
      return
    }

    const body: PostLittersBody = {
      pet_type_id: petTypeId,
      country,
      members: payloadMembers,
    }
    if (litterName.trim()) body.name = litterName.trim()
    if (groupId != null) body.group_id = groupId
    if (stateValue.trim()) body.state = stateValue.trim()
    if (citySelected?.id) body.city_id = citySelected.id
    if (address.trim()) body.address = address.trim()

    if (birthdayPrecision !== 'unknown') {
      body.birthday_precision = birthdayPrecision
      if (birthdayPrecision === 'day') {
        if (birthday) body.birthday = birthday
        else if (birthdayYear && birthdayMonth && birthdayDay) {
          body.birthday_year = Number(birthdayYear)
          body.birthday_month = Number(birthdayMonth)
          body.birthday_day = Number(birthdayDay)
        }
      } else if (birthdayPrecision === 'month') {
        if (birthdayYear) body.birthday_year = Number(birthdayYear)
        if (birthdayMonth) body.birthday_month = Number(birthdayMonth)
      } else {
        if (birthdayYear) body.birthday_year = Number(birthdayYear)
      }
    } else {
      body.birthday_precision = 'unknown'
    }

    try {
      await postLitters({ data: body })

      // Invalidate my-pets sections so list refreshes
      await queryClient.invalidateQueries({
        queryKey: getGetMyPetsSectionsQueryKey(),
      })
      // Also invalidate pet types if needed? not needed but safe
      await queryClient.invalidateQueries({
        queryKey: getGetPetTypesQueryKey(),
      })

      toast.success(t('pets:litter.success', { count: memberCount }))
      onOpenChange(false)
    } catch (err: unknown) {
      let message: string | null = null
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as {
          response?: {
            status?: number
            data?: { message?: string; errors?: Record<string, string[]> }
          }
        }
        const data = axiosErr.response?.data
        if (axiosErr.response?.status === 422) {
          if (data?.errors) {
            const firstField = Object.values(data.errors).flat()[0]
            message = firstField ?? data.message ?? null
          } else {
            message = data?.message ?? null
          }
        } else {
          message = data?.message ?? null
        }
      }
      const fallback = t('pets:litter.errors.generic')
      setErrors({ general: message ?? fallback })
      toast.error(message ?? fallback)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"
        aria-describedby="add-litter-description"
      >
        <DialogHeader>
          <DialogTitle>{t('pets:litter.dialogTitle')}</DialogTitle>
          <DialogDescription id="add-litter-description">
            {t('pets:litter.dialogDescription')}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            void handleSubmit(e)
          }}
          className="space-y-6"
        >
          {/* Shared attributes */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="litter-name-input">{t('pets:litter.litterNameLabel')}</Label>
              <Input
                id="litter-name-input"
                data-testid="litter-name-input"
                value={litterName}
                onChange={(e) => {
                  setLitterName(e.target.value)
                }}
                placeholder={t('pets:litter.litterNamePlaceholder')}
                maxLength={255}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="litter-pet-type">{t('pets:litter.petTypeLabel')}</Label>
              {loadingPetTypes ? (
                <div className="text-sm text-muted-foreground">{t('pets:petType.loading')}</div>
              ) : petTypes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t('pets:litter.noPetTypesForLitter')}
                </p>
              ) : (
                <Select
                  value={petTypeId === '' ? undefined : String(petTypeId)}
                  onValueChange={(v) => {
                    setPetTypeId(Number(v))
                    if (errors.petTypeId) setErrors((p) => ({ ...p, petTypeId: undefined }))
                  }}
                >
                  <SelectTrigger id="litter-pet-type" data-testid="litter-pet-type-trigger">
                    <SelectValue placeholder={t('pets:litter.petTypePlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {petTypes.map((pt) => (
                      <SelectItem key={pt.id} value={String(pt.id)}>
                        {pt.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {errors.petTypeId && <p className="text-sm text-destructive">{errors.petTypeId}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('pets:form.country')}</Label>
                <CountrySelect
                  value={country}
                  onValueChange={setCountry}
                  showPhonePrefix={false}
                  data-testid="litter-country-select"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="litter-state">State</Label>
                <Input
                  id="litter-state"
                  value={stateValue}
                  onChange={(e) => {
                    setStateValue(e.target.value)
                  }}
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="space-y-2">
              <CitySelect
                country={country || null}
                value={citySelected}
                onChange={setCitySelected}
                error={undefined}
                label={t('pets:form.city')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="litter-address">{t('pets:form.address')}</Label>
              <Input
                id="litter-address"
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value)
                }}
                placeholder={t('pets:form.addressPlaceholder')}
              />
            </div>

            {/* Birthday precision */}
            <div className="space-y-2">
              <Label htmlFor="litter-birthday-precision">{t('pets:form.birthdayPrecision')}</Label>
              <Select
                value={birthdayPrecision}
                onValueChange={(v) => {
                  setBirthdayPrecision(v as typeof birthdayPrecision)
                }}
              >
                <SelectTrigger
                  id="litter-birthday-precision"
                  data-testid="litter-birthday-precision"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unknown">
                    {t('pets:form.birthdayPrecisionOptions.unknown')}
                  </SelectItem>
                  <SelectItem value="year">
                    {t('pets:form.birthdayPrecisionOptions.year')}
                  </SelectItem>
                  <SelectItem value="month">
                    {t('pets:form.birthdayPrecisionOptions.month')}
                  </SelectItem>
                  <SelectItem value="day">{t('pets:form.birthdayPrecisionOptions.day')}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{t('pets:litter.birthdayHint')}</p>
            </div>

            {birthdayPrecision === 'day' && (
              <div className="space-y-2">
                <Label>{t('pets:form.birthday')}</Label>
                <YearMonthDatePicker
                  value={birthday}
                  onChange={setBirthday}
                  placeholder={t('pets:form.birthdayPlaceholder')}
                />
              </div>
            )}
            {birthdayPrecision === 'month' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="litter-birthday-year-month">{t('pets:form.birthYear')}</Label>
                  <Input
                    id="litter-birthday-year-month"
                    type="number"
                    value={birthdayYear}
                    onChange={(e) => {
                      setBirthdayYear(e.target.value)
                    }}
                    placeholder="YYYY"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="litter-birthday-month-month">{t('pets:form.birthMonth')}</Label>
                  <Input
                    id="litter-birthday-month-month"
                    type="number"
                    value={birthdayMonth}
                    onChange={(e) => {
                      setBirthdayMonth(e.target.value)
                    }}
                    placeholder="MM"
                  />
                </div>
              </div>
            )}
            {birthdayPrecision === 'year' && (
              <div className="space-y-2">
                <Label htmlFor="litter-birthday-year-year">{t('pets:form.birthYear')}</Label>
                <Input
                  id="litter-birthday-year-year"
                  type="number"
                  value={birthdayYear}
                  onChange={(e) => {
                    setBirthdayYear(e.target.value)
                  }}
                  placeholder="YYYY"
                />
              </div>
            )}
          </div>

          {/* Member count */}
          <div className="space-y-2">
            <Label htmlFor="litter-member-count">{t('pets:litter.memberCount')}</Label>
            <Select value={String(memberCount)} onValueChange={handleMemberCountChange}>
              <SelectTrigger id="litter-member-count" data-testid="litter-member-count">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: maxMembers - minMembers + 1 }, (_, i) => i + minMembers).map(
                  (n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {t('pets:litter.memberCountHint', { min: minMembers, max: maxMembers })}
            </p>
            {errors.memberCount && <p className="text-sm text-destructive">{errors.memberCount}</p>}
          </div>

          {/* Members */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">{t('pets:litter.memberRowsTitle')}</h3>
            <div className="space-y-3">
              {members.map((member, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-1 sm:grid-cols-[auto_1fr_1fr] gap-3 items-end rounded-lg border p-3 bg-muted/20"
                  data-testid={`litter-member-row-${idx}`}
                >
                  <div className="space-y-1">
                    <Label className="text-xs">
                      {t('pets:litter.sexLabel')} #{idx + 1}
                    </Label>
                    <div className="flex gap-1" role="group" aria-label={`Member ${idx + 1} sex`}>
                      {(['female', 'male', 'not_specified'] as SexValue[]).map((sex) => (
                        <Button
                          key={sex}
                          type="button"
                          variant={member.sex === sex ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => {
                            updateMember(idx, { sex })
                          }}
                          data-testid={`member-${idx}-sex-${sex}`}
                          aria-pressed={member.sex === sex}
                        >
                          {sex === 'male'
                            ? t('pets:form.sexOptions.male')
                            : sex === 'female'
                              ? t('pets:form.sexOptions.female')
                              : t('pets:form.sexOptions.not_specified')}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`member-${idx}-name`} className="text-xs">
                      {t('pets:litter.nameLabel')}
                    </Label>
                    <Input
                      id={`member-${idx}-name`}
                      value={member.name}
                      onChange={(e) => {
                        updateMember(idx, { name: e.target.value })
                      }}
                      placeholder={t('pets:litter.namePlaceholder')}
                      data-testid={`member-${idx}-name`}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`member-${idx}-weight`} className="text-xs">
                      {t('pets:litter.weightLabel')}
                    </Label>
                    <Input
                      id={`member-${idx}-weight`}
                      type="number"
                      step="0.01"
                      value={member.weight_kg}
                      onChange={(e) => {
                        updateMember(idx, { weight_kg: e.target.value })
                      }}
                      placeholder={t('pets:litter.weightPlaceholder')}
                      data-testid={`member-${idx}-weight`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {errors.general && (
            <p className="text-sm text-destructive" data-testid="litter-error">
              {errors.general}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false)
              }}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending || loadingPetTypes}
              data-testid="litter-submit"
            >
              {isPending ? (
                <>
                  <Spinner className="mr-2" />
                  {t('pets:litter.submitting')}
                </>
              ) : (
                t('pets:litter.submit')
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
