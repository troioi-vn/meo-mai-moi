import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createCat } from '@/api/cats'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface FormErrors {
  name?: string
  breed?: string
  birthday?: string
  location?: string
  description?: string
}

const CreateCatPage: React.FC = () => {
  const [name, setName] = useState('')
  const [breed, setBreed] = useState('')
  const [birthday, setBirthday] = useState('')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!name.trim()) {
      newErrors.name = 'Name is required'
    }
    if (!breed.trim()) {
      newErrors.breed = 'Breed is required'
    }
    if (!birthday.trim()) {
      newErrors.birthday = 'Birthday is required'
    }
    if (!location.trim()) {
      newErrors.location = 'Location is required'
    }
    if (!description.trim()) {
      newErrors.description = 'Description is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!validateForm()) {
      return
    }

    void (async () => {
      try {
        await createCat({
          name,
          breed,
          birthday,
          location,
          description,
        })
        void toast.success('Cat created successfully!')
        void navigate('/account/cats')
      } catch (err: unknown) {
        setError('Failed to create cat.')
        console.error(err)
        void toast.error('Failed to create cat.')
      }
    })()
  }

  const handleCancel = () => {
    navigate('/account/cats')
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-2xl p-8 space-y-8 bg-card rounded-lg shadow-lg border">
        <h1 className="text-3xl font-bold text-center text-card-foreground mb-6">Add a New Cat</h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name" id="name-label" className="block">
              Name
            </Label>
            <Input
              id="name"
              name="name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
              }}
              required
              aria-labelledby="name-label"
            />
            {errors.name && <p className="text-destructive text-sm">{errors.name}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="breed" id="breed-label" className="block">
              Breed
            </Label>
            <Input
              id="breed"
              name="breed"
              type="text"
              value={breed}
              onChange={(e) => {
                setBreed(e.target.value)
              }}
              required
              aria-labelledby="breed-label"
            />
            {errors.breed && <p className="text-destructive text-sm">{errors.breed}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="birthday" id="birthday-label" className="block">
              Birthday
            </Label>
            <Input
              id="birthday"
              name="birthday"
              type="date"
              value={birthday}
              onChange={(e) => {
                setBirthday(e.target.value)
              }}
              required
              aria-labelledby="birthday-label"
            />
            {errors.birthday && <p className="text-destructive text-sm">{errors.birthday}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="location" id="location-label" className="block">
              Location
            </Label>
            <Input
              id="location"
              name="location"
              type="text"
              value={location}
              onChange={(e) => {
                setLocation(e.target.value)
              }}
              required
              aria-labelledby="location-label"
            />
            {errors.location && <p className="text-destructive text-sm">{errors.location}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description" id="description-label" className="block">
              Description
            </Label>
            <Textarea
              id="description"
              name="description"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value)
              }}
              required
              aria-labelledby="description-label"
            />
            {errors.description && <p className="text-destructive text-sm">{errors.description}</p>}
          </div>
          {error && <p className="text-destructive">{error}</p>}
          <div className="flex gap-4">
            <Button type="submit" aria-label="Create Cat">
              Create Cat
            </Button>
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateCatPage
