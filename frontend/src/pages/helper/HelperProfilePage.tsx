import { useQuery } from '@tanstack/react-query'
import { getHelperProfiles } from '@/api/helper-profiles'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  PlusCircle,
  MapPin,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Home,
  Heart,
} from 'lucide-react'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'

interface HelperProfile {
  id: number
  city?: string
  state?: string
  country?: string
  is_public?: boolean
  can_foster?: boolean
  can_adopt?: boolean
  user?: {
    name?: string
  }
}

export default function HelperProfilePage() {
  const navigate = useNavigate()
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['helper-profiles'],
    queryFn: getHelperProfiles,
  })

  const handleBack = () => {
    void navigate(-1)
  }

  if (isLoading) {
    return <LoadingState message="Loading helper profiles..." />
  }

  if (isError) {
    return (
      <ErrorState
        error="Failed to load helper profiles"
        onRetry={() => {
          void refetch()
        }}
      />
    )
  }

  const profiles = (data?.data as HelperProfile[] | undefined) ?? []

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <div className="px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <Button
            variant="ghost"
            size="default"
            onClick={handleBack}
            className="flex items-center gap-1 -ml-2 text-base"
          >
            <ChevronLeft className="h-6 w-6" />
            Back
          </Button>
          <Button
            size="default"
            onClick={() => {
              void navigate('/helper/create')
            }}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            New Profile
          </Button>
        </div>
      </div>

      <main className="px-4 pb-8">
        <div className="max-w-lg mx-auto space-y-6">
          {/* Header */}
          <section>
            <h1 className="text-2xl font-bold text-foreground">My Helper Profiles</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your profiles for fostering and adoption
            </p>
          </section>

          {/* Profiles List */}
          {profiles.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center space-y-4">
                <div className="flex justify-center">
                  <div className="p-4 rounded-full bg-muted">
                    <Home className="h-8 w-8 text-muted-foreground" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h2 className="text-lg font-semibold text-foreground">No helper profiles yet</h2>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    Create a helper profile to let pet owners know you're available to foster or
                    adopt pets.
                  </p>
                </div>
                <Button
                  onClick={() => {
                    void navigate('/helper/create')
                  }}
                  className="mt-4"
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create Your First Profile
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold">Your Profiles</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {profiles.map((profile) => (
                  <HelperProfileListItem key={profile.id} profile={profile} />
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}

function HelperProfileListItem({ profile }: { profile: HelperProfile }) {
  const locationParts = [profile.city, profile.state, profile.country].filter(Boolean)
  const location = locationParts.join(', ') || 'No location set'

  return (
    <Link
      to={`/helper/${String(profile.id)}`}
      className="block rounded-lg border bg-card hover:bg-accent/50 transition-colors"
    >
      <div className="p-4 flex items-center gap-4">
        <div className="flex-1 min-w-0">
          {/* Location */}
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="font-medium text-foreground truncate">{location}</span>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            <Badge variant={profile.is_public ? 'default' : 'secondary'} className="text-xs">
              {profile.is_public ? (
                <span className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  Public
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <EyeOff className="h-3 w-3" />
                  Private
                </span>
              )}
            </Badge>
            {profile.can_foster && (
              <Badge variant="outline" className="text-xs">
                <Home className="h-3 w-3 mr-1" />
                Foster
              </Badge>
            )}
            {profile.can_adopt && (
              <Badge variant="outline" className="text-xs">
                <Heart className="h-3 w-3 mr-1" />
                Adopt
              </Badge>
            )}
          </div>
        </div>

        {/* Arrow indicator */}
        <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
      </div>
    </Link>
  )
}
