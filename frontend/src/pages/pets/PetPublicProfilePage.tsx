import React, { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { Info, Eye } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { PublicPlacementRequestSection } from '@/components/placement/public-profile/PublicPlacementRequestSection'
import { getPetPublic, type PublicPet } from '@/api/pets'
import placeholderImage from '@/assets/images/default-avatar.webp'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

// Helper function to format pet age from public pet data
const formatPublicPetAge = (pet: PublicPet): string => {
  const precision = pet.birthday_precision ?? 'unknown'
  const today = new Date()

  switch (precision) {
    case 'day': {
      if (pet.birthday_year && pet.birthday_month && pet.birthday_day) {
        const birthDate = new Date(pet.birthday_year, pet.birthday_month - 1, pet.birthday_day)
        let years = today.getFullYear() - birthDate.getFullYear()
        const monthDiff = today.getMonth() - birthDate.getMonth()
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          years--
        }
        return years === 1 ? '1 year old' : `${String(years)} years old`
      }
      return 'Age unknown'
    }
    case 'month': {
      if (!pet.birthday_year || !pet.birthday_month) return 'Age unknown'
      const years =
        today.getFullYear() -
        pet.birthday_year -
        (today.getMonth() + 1 < pet.birthday_month ? 1 : 0)
      if (years <= 0) {
        const monthsDiff =
          (today.getFullYear() - pet.birthday_year) * 12 +
          (today.getMonth() + 1 - pet.birthday_month)
        return monthsDiff <= 1
          ? '1 month old (approx)'
          : `${String(monthsDiff)} months old (approx)`
      }
      return years === 1 ? '≈1 year old' : `≈${String(years)} years old`
    }
    case 'year': {
      if (!pet.birthday_year) return 'Age unknown'
      const years = today.getFullYear() - pet.birthday_year
      return years <= 0
        ? 'Less than 1 year (approx)'
        : years === 1
          ? '≈1 year old'
          : `≈${String(years)} years old`
    }
    case 'unknown':
    default:
      return 'Age unknown'
  }
}

// Helper function to derive image URL from public pet data
const derivePublicPetImageUrl = (pet: PublicPet): string => {
  if (Array.isArray(pet.photos) && pet.photos.length > 0) {
    const photoUrl = pet.photos[0]?.url
    if (photoUrl) return photoUrl
  }
  return pet.photo_url ?? placeholderImage
}

// Helper function to format location
const formatLocation = (pet: PublicPet): string => {
  const cityName = typeof pet.city === 'string' ? pet.city : pet.city?.name
  const parts = [cityName, pet.state, pet.country].filter(Boolean)
  return parts.join(', ') || 'Location not specified'
}

// Sex labels
const SexLabels: Record<string, string> = {
  male: 'Male',
  female: 'Female',
  not_specified: 'Not Specified',
}

const PetPublicProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [pet, setPet] = useState<PublicPet | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    void (async () => {
      if (!id) {
        setError('No pet ID provided')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        const petData = await getPetPublic(id)
        setPet(petData)
      } catch (err: unknown) {
        if (err && typeof err === 'object' && 'response' in err) {
          const axiosErr = err as { response?: { status?: number; data?: { message?: string } } }
          if (axiosErr.response?.status === 403) {
            setError(
              axiosErr.response.data?.message ?? 'This pet profile is not publicly available.'
            )
          } else if (axiosErr.response?.status === 404) {
            setError('Pet not found')
          } else {
            setError('Failed to load pet information')
          }
        } else {
          setError('Failed to load pet information')
        }
        console.error('Error fetching pet:', err)
      } finally {
        setLoading(false)
      }
    })()
  }, [id, version])

  const refresh = () => {
    setVersion((v) => v + 1)
  }

  if (loading) {
    return <LoadingState message="Loading pet profile..." />
  }

  if (error) {
    return (
      <ErrorState
        error={error}
        onRetry={() => {
          void navigate('/')
        }}
      />
    )
  }

  if (!pet) {
    return (
      <ErrorState
        error="Pet not found"
        onRetry={() => {
          void navigate('/')
        }}
      />
    )
  }

  const isOwner = Boolean(pet.viewer_permissions?.is_owner)
  const imageUrl = derivePublicPetImageUrl(pet)
  const ageDisplay = formatPublicPetAge(pet)
  const isLost = pet.status === 'lost'
  const isDeceased = pet.status === 'deceased'
  const hasActivePlacementRequests = (pet.placement_requests ?? []).some(
    (pr) => pr.status === 'open'
  )

  return (
    <div className="min-h-screen">
      {/* Navigation Buttons */}
      <div className="px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/">Home</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{pet.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </div>

      {/* Main Content */}
      <main className="px-4 pb-8">
        <div className="max-w-lg mx-auto space-y-6">
          {/* Owner viewing public profile banner */}
          {isOwner && (
            <Alert variant="info">
              <Eye className="h-4 w-4" />
              <AlertDescription>You are viewing the public profile of your pet.</AlertDescription>
            </Alert>
          )}

          {/* Lost pet banner */}
          {isLost && (
            <Alert variant="warning">
              <Info className="h-4 w-4" />
              <AlertDescription>
                This pet has been reported as lost. If you have any information, please contact the
                owner.
              </AlertDescription>
            </Alert>
          )}

          {/* Pet Profile Header */}
          <section className="flex items-center gap-4">
            <div className="shrink-0">
              <img
                src={imageUrl}
                alt={pet.name}
                className={`w-24 h-24 rounded-full object-cover border-4 border-border ${isDeceased ? 'grayscale' : ''}`}
              />
            </div>
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-bold text-foreground">{pet.name}</h1>
              <p className="text-muted-foreground">{ageDisplay}</p>
              <Badge variant="secondary" className="w-fit">
                {pet.pet_type.name}
              </Badge>
            </div>
          </section>

          {/* Placement Requests Section - first after header for public view */}
          {hasActivePlacementRequests && (
            <PublicPlacementRequestSection pet={pet} onRefresh={refresh} />
          )}

          {/* Pet Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {pet.sex && pet.sex !== 'not_specified' && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Sex</span>
                  <span className="font-medium">{SexLabels[pet.sex] ?? pet.sex}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Location</span>
                <span className="font-medium">{formatLocation(pet)}</span>
              </div>
              {pet.categories && pet.categories.length > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Categories</span>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {pet.categories.map((cat) => (
                      <Badge key={cat.id} variant="outline" className="text-xs">
                        {cat.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Description */}
          {pet.description && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold">About</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {pet.description}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}

export default PetPublicProfilePage
