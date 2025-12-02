import { useQuery } from '@tanstack/react-query'
import { getHelperProfiles } from '@/api/helper-profiles'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PlusCircle, MapPin, Pencil, Eye, EyeOff } from 'lucide-react'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { ChevronLeft } from 'lucide-react'

interface HelperProfile {
  id: number
  city?: string
  state?: string
  is_public?: boolean
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
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <div className="px-4 py-3">
        <div className="max-w-lg mx-auto">
          <Button
            variant="ghost"
            size="default"
            onClick={handleBack}
            className="flex items-center gap-1 -ml-2 text-base"
          >
            <ChevronLeft className="h-6 w-6" />
            Back
          </Button>
        </div>
      </div>

      <main className="px-4 pb-8">
        <div className="max-w-lg mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-foreground">My Helper Profiles</h1>
            <Button
              size="sm"
              onClick={() => {
                void navigate('/helper/create')
              }}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              New
            </Button>
          </div>

          {/* Profiles List */}
          {profiles.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground mb-4">No helper profiles yet.</p>
                <Button
                  onClick={() => {
                    void navigate('/helper/create')
                  }}
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
                  <div
                    key={profile.id}
                    className="rounded-lg border p-4 bg-muted/50 flex items-center justify-between gap-3"
                  >
                    <div className="flex flex-col gap-2">
                      <Link
                        to={'/helper/' + String(profile.id)}
                        className="flex items-center gap-2 font-medium hover:underline"
                      >
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        {[profile.city, profile.state].filter(Boolean).join(', ') || 'No location'}
                      </Link>
                      <Badge
                        variant={profile.is_public ? 'default' : 'secondary'}
                        className="w-fit text-xs"
                      >
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
                    </div>

                    <Link to={'/helper/' + String(profile.id) + '/edit'}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
