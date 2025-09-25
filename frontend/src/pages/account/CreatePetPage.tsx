import React from 'react'
import { useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/FormField'
import { FileInput } from '@/components/ui/FileInput'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCreatePetForm } from '@/hooks/useCreatePetForm'

const CreatePetPage: React.FC = () => {
  const { id: petId } = useParams<{ id: string }>()
  const isEditMode = Boolean(petId)
  
  const { 
    formData, 
    petTypes, 
    loadingPetTypes, 
    errors, 
    error, 
    isSubmitting, 
    isLoadingPet, 
    updateField, 
    handleSubmit, 
    handleCancel 
  } = useCreatePetForm(petId)

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-2xl p-8 space-y-8 bg-card rounded-lg shadow-lg border">
        <h1 className="text-3xl font-bold text-center text-card-foreground mb-6">
          {isEditMode ? 'Edit Pet' : 'Add a New Pet'}
        </h1>
        {isLoadingPet ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-muted-foreground">Loading pet data...</p>
          </div>
        ) : (
        <form
          onSubmit={(e) => {
            void handleSubmit(e)
          }}
          className="space-y-6"
          noValidate
        >
          <div className="space-y-2">
            <label htmlFor="pet_type_id" className="text-sm font-medium">
              Pet Type
            </label>
            {loadingPetTypes ? (
              <div className="text-sm text-muted-foreground">Loading pet types...</div>
            ) : (
              <Select
                value={formData.pet_type_id ? String(formData.pet_type_id) : ''}
                onValueChange={(value) => {
                  updateField('pet_type_id')(Number(value))
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a pet type..." />
                </SelectTrigger>
                <SelectContent>
                  {petTypes.map((petType) => (
                    <SelectItem key={petType.id} value={String(petType.id)}>
                      {petType.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {errors.pet_type_id && (
              <p className="text-sm text-destructive">{errors.pet_type_id}</p>
            )}
          </div>

          <FormField
            id="name"
            label="Name"
            value={formData.name}
            onChange={updateField('name')}
            error={errors.name}
            placeholder="Enter pet's name"
          />

          <FormField
            id="breed"
            label="Breed"
            value={formData.breed}
            onChange={updateField('breed')}
            error={errors.breed}
            placeholder="Enter pet's breed"
          />

          <FormField
            id="birthday"
            label="Birthday"
            type="date"
            value={formData.birthday}
            onChange={updateField('birthday')}
            error={errors.birthday}
          />

          <FormField
            id="location"
            label="Location"
            value={formData.location}
            onChange={updateField('location')}
            error={errors.location}
            placeholder="Enter pet's location"
          />

          <FormField
            id="description"
            label="Description"
            type="textarea"
            value={formData.description}
            onChange={updateField('description')}
            error={errors.description}
            placeholder="Describe the pet's personality and characteristics"
          />

          <FileInput
            id="photos"
            label="Photos"
            onChange={updateField('photos')}
            multiple
          />

          {error && (
            <p className="text-destructive" data-testid="form-error">
              {error}
            </p>
          )}

          <div className="flex gap-4">
            <Button type="submit" aria-label={isEditMode ? 'Update Pet' : 'Create Pet'} disabled={isSubmitting || loadingPetTypes}>
              {isSubmitting ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Pet' : 'Create Pet')}
            </Button>
            <Button type="button" variant="outline" onClick={handleCancel} disabled={isSubmitting}>
              Cancel
            </Button>
          </div>
        </form>
        )}
      </div>
    </div>
  )
}

export default CreatePetPage