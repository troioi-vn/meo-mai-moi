import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Pencil } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FormField } from '@/components/ui/FormField'
import { YearMonthDatePicker } from '@/components/ui/YearMonthDatePicker'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PetPhoto } from '@/components/pets/PetPhoto'
import { PetTypeSelect } from '@/components/pets/PetTypeSelect'
import { CategorySelect } from '@/components/pets/CategorySelect'
import { PetStatusControls } from '@/components/pets/PetStatusControls'
import { PetDangerZone } from '@/components/pets/PetDangerZone'
import { CountrySelect } from '@/components/ui/CountrySelect'
import { CitySelect } from '@/components/location/CitySelect'
import { VaccinationStatusBadge } from '@/components/pet-health/vaccinations/VaccinationStatusBadge'
import { useVaccinations } from '@/hooks/useVaccinations'
import { calculateVaccinationStatus } from '@/utils/vaccinationStatus'
import { useCreatePetForm } from '@/hooks/useCreatePetForm'
import {
  deletePetsId as deletePet,
  putPetsIdStatus as updatePetStatus,
} from '@/api/generated/pets/pets'
import { toast } from '@/lib/i18n-toast'
import { formatPetAge, petSupportsCapability } from '@/types/pet'
import type { Pet } from '@/types/pet'

type EditTab = 'general' | 'details' | 'status'

interface PetInfoCardProps {
  pet: Pet
  canEdit: boolean
  onPetUpdate: (pet: Pet) => void
  vaccinationVersion: number
  onAvatarClick?: () => void
}

export function PetInfoCard({
  pet,
  canEdit,
  onPetUpdate,
  vaccinationVersion,
  onAvatarClick,
}: PetInfoCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  if (isEditing) {
    return (
      <PetInfoCardEditor
        pet={pet}
        onPetUpdate={onPetUpdate}
        onDone={() => {
          setIsEditing(false)
        }}
        onAvatarClick={onAvatarClick}
      />
    )
  }

  return (
    <PetInfoCardView
      pet={pet}
      canEdit={canEdit}
      onPetUpdate={onPetUpdate}
      vaccinationVersion={vaccinationVersion}
      onAvatarClick={onAvatarClick}
      onEdit={() => {
        setIsEditing(true)
      }}
    />
  )
}

function PetInfoCardView({
  pet,
  canEdit,
  onPetUpdate,
  vaccinationVersion,
  onAvatarClick,
  onEdit,
}: {
  pet: Pet
  canEdit: boolean
  onPetUpdate: (pet: Pet) => void
  vaccinationVersion: number
  onAvatarClick?: () => void
  onEdit: () => void
}) {
  const { t } = useTranslation(['pets', 'common'])
  const isDeceased = pet.status === 'deceased'
  const supportsVaccinations = petSupportsCapability(pet.pet_type, 'vaccinations')
  const ageDisplay = formatPetAge(pet, t)

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="relative">
          {canEdit && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-0 right-0 h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={onEdit}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}

          <div className="flex flex-col items-center gap-4">
            <PetPhoto
              pet={pet}
              onPhotoUpdate={(updatedPet: Pet) => {
                onPetUpdate(updatedPet)
              }}
              showUploadControls={false}
              className={`w-24 h-24 rounded-full object-cover border-4 border-border ${isDeceased ? 'grayscale' : ''}`}
              onClick={pet.photos && pet.photos.length > 0 ? onAvatarClick : undefined}
            />
            <div className="flex flex-col items-center gap-1">
              <h1 className="text-2xl font-bold text-foreground">{pet.name}</h1>
              <p className="text-muted-foreground">{ageDisplay}</p>
              {supportsVaccinations && (
                <PetVaccinationStatusBadge key={vaccinationVersion} petId={pet.id} />
              )}
            </div>
          </div>

          {pet.description && (
            <>
              <Separator className="my-4" />
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{pet.description}</p>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function PetInfoCardEditor({
  pet,
  onPetUpdate,
  onDone,
  onAvatarClick,
}: {
  pet: Pet
  onPetUpdate: (pet: Pet) => void
  onDone: () => void
  onAvatarClick?: () => void
}) {
  const { t } = useTranslation(['pets', 'common'])
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<EditTab>('general')

  const [currentStatus, setCurrentStatus] = useState<'active' | 'lost' | 'deceased' | 'deleted' | ''>(
    pet.status
  )
  const [newStatus, setNewStatus] = useState<'active' | 'lost' | 'deceased' | ''>(
    pet.status === 'deleted' ? 'active' : pet.status
  )
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const {
    formData,
    petTypes,
    loadingPetTypes,
    errors,
    error,
    isSubmitting,
    isLoadingPet,
    updateField,
    updateCategories,
    updateCity,
    handleSubmit,
  } = useCreatePetForm(String(pet.id), undefined, () => {
    onDone()
    onPetUpdate(pet)
  })

  const handleUpdateStatusClick = async (password: string) => {
    if (!newStatus) {
      toast.error(t('pets:messages.selectStatus'))
      return
    }
    if (!password.trim()) {
      toast.error(t('pets:messages.passwordRequired'))
      return
    }
    try {
      setIsUpdatingStatus(true)
      await updatePetStatus(pet.id, { status: newStatus, password })
      setCurrentStatus(newStatus)
      toast.success(t('pets:messages.statusUpdated'))
      onDone()
      onPetUpdate({ ...pet, status: newStatus })
    } catch {
      toast.error(t('pets:messages.updateStatusError'))
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const handleDeletePetClick = async (password: string) => {
    if (!password.trim()) {
      toast.error(t('pets:messages.passwordRequired'))
      return
    }
    try {
      setIsDeleting(true)
      await deletePet(pet.id, { password })
      toast.success(t('pets:messages.removed'))
      void navigate('/', { replace: true })
    } catch {
      toast.error(t('pets:messages.removeError'))
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        {isLoadingPet ? (
          <p className="text-sm text-muted-foreground py-4">{t('common:messages.loading')}</p>
        ) : (
          <form
            onSubmit={(e) => {
              void handleSubmit(e)
            }}
            className="space-y-6"
            noValidate
          >
            <Tabs
              value={activeTab}
              onValueChange={(v) => {
                setActiveTab(v as EditTab)
              }}
              className="space-y-4"
            >
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="general">{t('pets:tabs.general')}</TabsTrigger>
                <TabsTrigger value="details">
                  {t('pets:tabs.details', { defaultValue: 'Details' })}
                </TabsTrigger>
                <TabsTrigger value="status">{t('pets:tabs.status')}</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-4">
                <PetPhoto
                  pet={pet}
                  onPhotoUpdate={(updatedPet: Pet) => {
                    onPetUpdate(updatedPet)
                  }}
                  showUploadControls={true}
                  className="h-32 w-32 object-cover rounded-full border mx-auto cursor-pointer"
                  onClick={pet.photos && pet.photos.length > 0 ? onAvatarClick : undefined}
                />

                <FormField
                  id="name"
                  label={t('pets:form.nameLabel')}
                  value={formData.name}
                  onChange={updateField('name')}
                  error={errors.name}
                  placeholder={t('pets:form.namePlaceholder')}
                />

                <div className="space-y-2">
                  <Label htmlFor="birthday_precision">{t('pets:form.birthdayPrecision')}</Label>
                  <Select
                    value={formData.birthday_precision}
                    onValueChange={(value) => {
                      updateField('birthday_precision')(value)
                    }}
                  >
                    <SelectTrigger id="birthday_precision">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unknown">
                        {t('pets:form.birthdayPrecisionOptions.unknown')}
                      </SelectItem>
                      <SelectItem value="year">{t('pets:form.birthdayPrecisionOptions.year')}</SelectItem>
                      <SelectItem value="month">{t('pets:form.birthdayPrecisionOptions.month')}</SelectItem>
                      <SelectItem value="day">{t('pets:form.birthdayPrecisionOptions.day')}</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.birthday_precision && (
                    <p className="text-xs text-destructive mt-1">{errors.birthday_precision}</p>
                  )}
                </div>

                {formData.birthday_precision === 'day' && (
                  <div className="space-y-2">
                    <Label htmlFor="birthday" className={errors.birthday ? 'text-destructive' : ''}>
                      {t('pets:form.birthday')}
                    </Label>
                    <YearMonthDatePicker
                      id="birthday"
                      value={formData.birthday}
                      onChange={updateField('birthday')}
                      error={errors.birthday}
                      placeholder={t('pets:form.birthdayPlaceholder')}
                    />
                    {errors.birthday && (
                      <p className="text-sm font-medium text-destructive">{errors.birthday}</p>
                    )}
                  </div>
                )}
                {formData.birthday_precision === 'month' && (
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      id="birthday_year"
                      label={t('pets:form.birthYear')}
                      type="number"
                      value={formData.birthday_year}
                      onChange={updateField('birthday_year')}
                      error={errors.birthday_year}
                      placeholder="YYYY"
                    />
                    <FormField
                      id="birthday_month"
                      label={t('pets:form.birthMonth')}
                      type="number"
                      value={formData.birthday_month}
                      onChange={updateField('birthday_month')}
                      error={errors.birthday_month}
                      placeholder="MM"
                    />
                  </div>
                )}
                {formData.birthday_precision === 'year' && (
                  <FormField
                    id="birthday_year"
                    label={t('pets:form.birthYear')}
                    type="number"
                    value={formData.birthday_year}
                    onChange={updateField('birthday_year')}
                    error={errors.birthday_year}
                    placeholder="YYYY"
                  />
                )}

                <FormField
                  id="description"
                  label={t('pets:form.description')}
                  type="textarea"
                  value={formData.description}
                  onChange={updateField('description')}
                  error={errors.description}
                  placeholder={t('pets:form.descriptionPlaceholder')}
                />
              </TabsContent>

              <TabsContent value="details" className="space-y-4">
                <PetTypeSelect
                  petTypes={petTypes}
                  loading={loadingPetTypes}
                  value={formData.pet_type_id ?? ''}
                  onChange={(id) => {
                    updateField('pet_type_id')(id)
                  }}
                  error={errors.pet_type_id}
                />

                <CategorySelect
                  petTypeId={formData.pet_type_id}
                  selectedCategories={formData.categories}
                  onChange={updateCategories}
                />

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="sex">{t('pets:form.gender')}</Label>
                  <Select
                    value={formData.sex}
                    onValueChange={(value) => {
                      updateField('sex')(value)
                    }}
                  >
                    <SelectTrigger id="sex">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not_specified">
                        {t('pets:form.genderOptions.not_specified')}
                      </SelectItem>
                      <SelectItem value="male">{t('pets:form.genderOptions.male')}</SelectItem>
                      <SelectItem value="female">{t('pets:form.genderOptions.female')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="country" className={errors.country ? 'text-destructive' : ''}>
                    {t('pets:form.country')}
                  </Label>
                  <CountrySelect
                    value={formData.country}
                    onValueChange={(value) => {
                      updateField('country')(value)
                    }}
                  />
                  {errors.country && (
                    <p className="text-sm font-medium text-destructive">{errors.country}</p>
                  )}
                </div>

                <CitySelect
                  country={formData.country || null}
                  value={formData.city_selected ?? null}
                  onChange={updateCity}
                  disabled={false}
                  error={errors.city}
                />

                <FormField
                  id="address"
                  label={t('pets:form.address')}
                  value={formData.address}
                  onChange={updateField('address')}
                  error={errors.address}
                  placeholder={t('pets:form.addressPlaceholder')}
                />
              </TabsContent>

              <TabsContent value="status" className="space-y-4">
                <PetStatusControls
                  currentStatus={currentStatus || 'active'}
                  newStatus={newStatus || 'active'}
                  setNewStatus={setNewStatus}
                  onUpdateStatus={(password) => {
                    void handleUpdateStatusClick(password)
                  }}
                  isUpdating={isUpdatingStatus}
                />

                <PetDangerZone
                  isDeleting={isDeleting}
                  onDelete={(password) => {
                    void handleDeletePetClick(password)
                  }}
                />
              </TabsContent>
            </Tabs>

            {activeTab !== 'status' && (
              <>
                {error && <p className="text-destructive text-sm">{error}</p>}
                <div className="flex gap-3 pt-2">
                  <Button type="submit" disabled={isSubmitting || loadingPetTypes}>
                    {isSubmitting ? t('pets:messages.updating') : t('pets:updatePet')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onDone}
                    disabled={isSubmitting}
                  >
                    {t('common:actions.cancel')}
                  </Button>
                </div>
              </>
            )}
          </form>
        )}
      </CardContent>
    </Card>
  )
}

// Helper component to fetch vaccination status for a pet
function PetVaccinationStatusBadge({ petId }: { petId: number }) {
  const { items, loading } = useVaccinations(petId)

  if (loading) {
    return null
  }

  const status = calculateVaccinationStatus(items)
  return <VaccinationStatusBadge status={status} />
}
