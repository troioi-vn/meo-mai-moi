import { useState } from 'react'
import { Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useVaccinations } from '@/hooks/useVaccinations'
import { VaccinationForm, type VaccinationFormValues } from './VaccinationForm'
import { getUpcomingVaccinations } from '@/utils/vaccinationStatus'
import { format, parseISO } from 'date-fns'

interface UpcomingVaccinationsSectionProps {
  petId: number
  canEdit: boolean
  onVaccinationChange?: () => void
}

export function UpcomingVaccinationsSection({
  petId,
  canEdit,
  onVaccinationChange,
}: UpcomingVaccinationsSectionProps) {
  const { items, loading, create } = useVaccinations(petId)
  const [adding, setAdding] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const upcomingVaccinations = getUpcomingVaccinations(items)

  const handleCreate = async (values: VaccinationFormValues) => {
    setServerError(null)
    try {
      await create(values)
      setAdding(false)
      onVaccinationChange?.()
    } catch {
      setServerError('Failed to save vaccination')
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Upcoming Vaccinations</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">Upcoming Vaccinations</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {adding ? (
          <div className="rounded-md border p-4">
            <VaccinationForm
              onSubmit={handleCreate}
              onCancel={() => {
                setAdding(false)
                setServerError(null)
              }}
              serverError={serverError}
            />
          </div>
        ) : (
          <>
            {upcomingVaccinations.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                No upcoming vaccinations scheduled.
              </p>
            ) : (
              <ul className="space-y-2">
                {upcomingVaccinations.map((v) => {
                  const dueDate = v.due_at ? parseISO(v.due_at) : null
                  const isPast = dueDate && dueDate < new Date()

                  return (
                    <li
                      key={v.id}
                      className="flex items-center justify-between rounded-lg border p-3 bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                        <span className="font-medium">{v.vaccine_name}</span>
                      </div>
                      {dueDate && (
                        <span
                          className={`text-sm ${isPast ? 'text-destructive font-medium' : 'text-muted-foreground'}`}
                        >
                          {isPast ? 'Overdue: ' : 'Due: '}
                          {format(dueDate, 'yyyy-MM-dd')}
                        </span>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}

            {canEdit && (
              <Button
                variant="outline"
                className="w-full mt-3"
                onClick={() => setAdding(true)}
              >
                + Add New Vaccination Entry
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

