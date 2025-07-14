import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createCat } from '@/api/cats'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

const CreateCatPage: React.FC = () => {
  const [name, setName] = useState('')
  const [breed, setBreed] = useState('')
  const [age, setAge] = useState('')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      await createCat({
        name,
        breed,
        age: parseInt(age, 10),
        location,
        description,
      })
      toast.success('Cat created successfully!')
      navigate('/account/cats')
    } catch (err) {
      setError('Failed to create cat.')
      console.error(err)
      toast.error('Failed to create cat.')
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-neutral-100 dark:bg-neutral-900 py-8">
      <div className="w-full max-w-2xl p-8 space-y-8 bg-neutral-50 rounded-lg shadow-lg dark:bg-neutral-800">
        <h1 className="text-3xl font-bold text-center text-neutral-900 dark:text-neutral-100 mb-6">
          Add a New Cat
        </h1>
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
          </div>
          <div className="space-y-2">
            <Label htmlFor="age" id="age-label" className="block">
              Age
            </Label>
            <Input
              id="age"
              name="age"
              type="number"
              value={age}
              onChange={(e) => {
                setAge(e.target.value)
              }}
              required
              aria-labelledby="age-label"
            />
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
          </div>
          {error && <p className="text-red-500">{error}</p>}
          <Button type="submit" aria-label="Create Cat">
            Create Cat
          </Button>
        </form>
      </div>
    </div>
  )
}

export default CreateCatPage
