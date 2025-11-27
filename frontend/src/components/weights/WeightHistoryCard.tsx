import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useWeights } from '@/hooks/useWeights'
import { WeightChart } from './WeightChart'
import { WeightForm } from './WeightForm'
import { toast } from 'sonner'

interface WeightHistoryCardProps {
  petId: number
  canEdit: boolean
}

export function WeightHistoryCard({ petId, canEdit }: WeightHistoryCardProps) {
  const { items, loading, create } = useWeights(petId)
  const [adding, setAdding] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleCreate = async (values: { weight_kg: number; record_date: string }) => {
    setSubmitting(true)
    setServerError(null)
    try {
      await create(values)
      setAdding(false)
      toast.success('Weight added')
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } }).response?.status
      const message = (err as { response?: { data?: { message?: string } } }).response?.data
        ?.message
      if (status === 422) {
        setServerError(message ?? 'Validation error')
      } else {
        toast.error('Failed to add weight')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Weight History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">Weight History</CardTitle>
      </CardHeader>
      <CardContent>
        {adding ? (
          <div className="mb-4 rounded-md border p-3">
            <WeightForm
              onSubmit={(vals) => handleCreate(vals)}
              onCancel={() => {
                setAdding(false)
                setServerError(null)
              }}
              submitting={submitting}
              serverError={serverError}
            />
          </div>
        ) : (
          <>
            <WeightChart weights={items} />
            
            {canEdit && (
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => setAdding(true)}
              >
                + Add New Weight Entry
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

