import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { FileInput } from '@/components/ui/FileInput'
import { CheckboxField } from '@/components/ui/CheckboxField'
import { FormField } from '@/components/ui/FormField'
import useHelperProfileForm from '@/hooks/useHelperProfileForm'
import { getPetTypes } from '@/api/pets'
import type { PetType } from '@/types/pet'
import { toast } from 'sonner'

const CreateHelperProfilePage: React.FC = () => {
  const { formData, errors, isSubmitting, updateField, handleSubmit, handleCancel } =
    useHelperProfileForm(undefined, {})
  
  const [petTypes, setPetTypes] = useState<PetType[]>([])
  const [loadingPetTypes, setLoadingPetTypes] = useState(true)

  // Load pet types on component mount
  useEffect(() => {
    const loadPetTypes = async () => {
      try {
        const types = await getPetTypes()
        setPetTypes(types)
      } catch (err) {
        console.error('Failed to load pet types:', err)
        toast.error('Failed to load pet types. Please try again.')
      } finally {
        setLoadingPetTypes(false)
      }
    }
    void loadPetTypes()
  }, [])

  // Handler for pet type checkbox changes
  const handlePetTypeChange = (petTypeId: number, checked: boolean) => {
    const currentIds = formData.pet_type_ids
    const newIds = checked 
      ? [...currentIds, petTypeId]
      : currentIds.filter(id => id !== petTypeId)
    updateField('pet_type_ids')(newIds)
  }

  // Filter pet types that allow placement requests
  const placementAllowedPetTypes = petTypes.filter(petType => petType.placement_requests_allowed)

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-2xl p-8 space-y-8 bg-card rounded-lg shadow-lg border">
        <h1 className="text-3xl font-bold text-center text-card-foreground mb-6">
          Create Helper Profile
        </h1>
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          <FormField
            id="country"
            label="Country"
            value={formData.country}
            onChange={updateField('country')}
            error={errors.country}
            placeholder="Enter your country"
          />
          <FormField
            id="address"
            label="Address"
            value={formData.address}
            onChange={updateField('address')}
            error={errors.address}
            placeholder="Enter your address"
          />
          <FormField
            id="city"
            label="City"
            value={formData.city}
            onChange={updateField('city')}
            error={errors.city}
            placeholder="Enter your city"
          />
          <FormField
            id="state"
            label="State"
            value={formData.state}
            onChange={updateField('state')}
            error={errors.state}
            placeholder="Enter your state"
          />
          <FormField
            id="phone_number"
            label="Phone Number"
            value={formData.phone_number}
            onChange={updateField('phone_number')}
            error={errors.phone_number}
            placeholder="Enter your phone number"
          />
          <FormField
            id="experience"
            label="Experience"
            type="textarea"
            value={formData.experience}
            onChange={updateField('experience')}
            error={errors.experience}
            placeholder="Describe your experience"
          />
          <CheckboxField
            id="has_pets"
            label="Has Pets"
            checked={formData.has_pets}
            onChange={updateField('has_pets')}
            error={errors.has_pets}
          />
          <CheckboxField
            id="has_children"
            label="Has Children"
            checked={formData.has_children}
            onChange={updateField('has_children')}
            error={errors.has_children}
          />
          <CheckboxField
            id="can_foster"
            label="Can Foster"
            checked={formData.can_foster}
            onChange={updateField('can_foster')}
            error={errors.can_foster}
          />
          <CheckboxField
            id="can_adopt"
            label="Can Adopt"
            checked={formData.can_adopt}
            onChange={updateField('can_adopt')}
            error={errors.can_adopt}
          />
          <CheckboxField
            id="is_public"
            label="Is Public"
            checked={formData.is_public}
            onChange={updateField('is_public')}
            error={errors.is_public}
          />

          {/* Pet Types for Placement Requests */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-card-foreground">
              Pet Types Available for Placement Requests
            </label>
            {loadingPetTypes ? (
              <div className="text-sm text-muted-foreground">Loading pet types...</div>
            ) : placementAllowedPetTypes.length > 0 ? (
              <div className="space-y-2">
                {placementAllowedPetTypes.map((petType) => (
                  <CheckboxField
                    key={petType.id}
                    id={`pet_type_${String(petType.id)}`}
                    label={petType.name}
                    checked={formData.pet_type_ids.includes(petType.id)}
                    onChange={(checked: boolean) => {
                      handlePetTypeChange(petType.id, checked)
                    }}
                    error={errors.pet_type_ids}
                  />
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No pet types available for placement requests.</div>
            )}
          </div>

          <FileInput
            id="photos"
            label="Photos"
            onChange={updateField('photos')}
            error={errors.photos}
            multiple
          />

          <div className="flex gap-4">
            <Button type="submit" aria-label="Create Helper Profile" disabled={isSubmitting || loadingPetTypes}>
              {isSubmitting ? 'Creating...' : 'Create'}
            </Button>
            <Button type="button" variant="outline" onClick={handleCancel} disabled={isSubmitting}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateHelperProfilePage
