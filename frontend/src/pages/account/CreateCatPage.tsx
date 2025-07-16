import React from 'react'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/FormField'
import { useCreateCatForm } from '@/hooks/useCreateCatForm'

const CreateCatPage: React.FC = () => {
  const { formData, errors, error, isSubmitting, updateField, handleSubmit, handleCancel } =
    useCreateCatForm()

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-2xl p-8 space-y-8 bg-card rounded-lg shadow-lg border">
        <h1 className="text-3xl font-bold text-center text-card-foreground mb-6">Add a New Cat</h1>
        <form
          onSubmit={(e) => {
            void handleSubmit(e)
          }}
          className="space-y-6"
          noValidate
        >
          <FormField
            id="name"
            label="Name"
            value={formData.name}
            onChange={updateField('name')}
            error={errors.name}
            placeholder="Enter cat's name"
          />

          <FormField
            id="breed"
            label="Breed"
            value={formData.breed}
            onChange={updateField('breed')}
            error={errors.breed}
            placeholder="Enter cat's breed"
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
            placeholder="Enter cat's location"
          />

          <FormField
            id="description"
            label="Description"
            type="textarea"
            value={formData.description}
            onChange={updateField('description')}
            error={errors.description}
            placeholder="Describe the cat's personality and characteristics"
          />

          {error && (
            <p className="text-destructive" data-testid="form-error">
              {error}
            </p>
          )}

          <div className="flex gap-4">
            <Button type="submit" aria-label="Create Cat" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Cat'}
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

export default CreateCatPage
