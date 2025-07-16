import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getCat, updateCat } from '@/api/cats'
import type { Cat } from '@/types/cat'
import { Button } from '@/components/ui/button'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { FormField } from '@/components/ui/FormField'
import { EnhancedCatRemovalModal } from '@/components/EnhancedCatRemovalModal'
import { toast } from 'sonner'

interface FormData {
  name: string
  breed: string
  birthday: string
  location: string
  description: string
  status: 'available' | 'fostered' | 'adopted' | 'dead'
}

interface FormErrors {
  name?: string
  breed?: string
  birthday?: string
  location?: string
  description?: string
  status?: string
}

const EditCatPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [cat, setCat] = useState<Cat | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState<FormData>({
    name: '',
    breed: '',
    birthday: '',
    location: '',
    description: '',
    status: 'available',
  })

  const [errors, setErrors] = useState<FormErrors>({})

  useEffect(() => {
    const fetchCat = async () => {
      if (!id) {
        setError('No cat ID provided')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        const catData = await getCat(id)
        setCat(catData)
        setFormData({
          name: catData.name,
          breed: catData.breed,
          birthday: catData.birthday,
          location: catData.location,
          description: catData.description,
          status: catData.status,
        })
      } catch (err: unknown) {
        if (err && typeof err === 'object' && 'response' in err) {
          const axiosErr = err as { response?: { status?: number } }
          if (axiosErr.response?.status === 404) {
            setError('Cat not found')
          } else {
            setError('Failed to load cat information')
          }
        } else {
          setError('Failed to load cat information')
        }
        console.error('Error fetching cat:', err)
      } finally {
        setLoading(false)
      }
    }

    void fetchCat()
  }, [id])

  const updateField = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }

    if (!formData.breed.trim()) {
      newErrors.breed = 'Breed is required'
    }

    if (!formData.birthday) {
      newErrors.birthday = 'Birthday is required'
    }

    if (!formData.location.trim()) {
      newErrors.location = 'Location is required'
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    if (!id) {
      toast.error('No cat ID provided')
      return
    }

    try {
      setSubmitting(true)
      await updateCat(id, formData)
      toast.success('Cat profile updated successfully!')
      void navigate('/account/cats')
    } catch (error: unknown) {
      console.error('Error updating cat:', error)
      toast.error('Failed to update cat profile. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = () => {
    void navigate('/account/cats')
  }

  const handleRemovalSuccess = () => {
    void navigate('/account/cats')
  }

  if (loading) {
    return <LoadingState message="Loading cat information..." />
  }

  if (error) {
    return (
      <ErrorState
        error={error}
        onRetry={() => {
          void navigate('/account/cats')
        }}
        retryText="Back to Cats"
      />
    )
  }

  if (!cat) {
    return (
      <ErrorState
        error="Cat not found"
        onRetry={() => {
          void navigate('/account/cats')
        }}
        retryText="Back to Cats"
      />
    )
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Edit Cat Profile</h1>
          <p className="text-muted-foreground">Update {cat.name}'s information</p>
        </div>

        <div className="bg-card rounded-lg shadow-lg p-8">
          <form
            onSubmit={(e) => {
              void handleSubmit(e)
            }}
            className="space-y-6"
          >
            <FormField
              label="Name"
              id="name"
              type="text"
              value={formData.name}
              onChange={(value) => {
                updateField('name', value)
              }}
              error={errors.name}
              placeholder="Enter cat's name"
              required
            />

            <FormField
              label="Breed"
              id="breed"
              type="text"
              value={formData.breed}
              onChange={(value) => {
                updateField('breed', value)
              }}
              error={errors.breed}
              placeholder="Enter cat's breed"
              required
            />

            <FormField
              label="Birthday"
              id="birthday"
              type="date"
              value={formData.birthday}
              onChange={(value) => {
                updateField('birthday', value)
              }}
              error={errors.birthday}
              required
            />

            <FormField
              label="Location"
              id="location"
              type="text"
              value={formData.location}
              onChange={(value) => {
                updateField('location', value)
              }}
              error={errors.location}
              placeholder="Enter location"
              required
            />

            <FormField
              label="Status"
              id="status"
              type="select"
              value={formData.status}
              onChange={(value) => {
                updateField('status', value)
              }}
              options={[
                { value: 'available', label: 'Available' },
                { value: 'fostered', label: 'Fostered' },
                { value: 'adopted', label: 'Adopted' },
              ]}
              required
            />

            <FormField
              label="Description"
              id="description"
              type="textarea"
              value={formData.description}
              onChange={(value) => {
                updateField('description', value)
              }}
              error={errors.description}
              placeholder="Describe your cat's personality, habits, and any special needs"
              required
            />

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={submitting} className="flex-1">
                {submitting ? 'Updating...' : 'Update Cat'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={submitting}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </form>

          {/* Enhanced Cat Removal Section */}
          <div className="border-t border-border pt-6 mt-8">
            <h3 className="text-lg font-semibold text-foreground mb-2">Remove Cat Profile</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Permanently delete this cat's profile or mark them as deceased. This action requires
              your password confirmation.
            </p>
            {id && (
              <EnhancedCatRemovalModal
                catId={id}
                catName={cat.name}
                onSuccess={handleRemovalSuccess}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default EditCatPage
