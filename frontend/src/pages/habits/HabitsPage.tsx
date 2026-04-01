import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  getGetHabitsQueryKey,
  useGetHabits,
  usePostHabits,
} from '@/api/generated/habits/habits'
import { useGetMyPetsSections } from '@/api/generated/pets/pets'
import type { HabitPetSummary } from '@/api/generated/model'
import { HabitFormDialog } from '@/components/habits/HabitFormDialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { LoadingState } from '@/components/ui/LoadingState'
import { Badge } from '@/components/ui/badge'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from '@/lib/i18n-toast'
import { PlusCircle } from 'lucide-react'

export default function HabitsPage() {
  const { t } = useTranslation('habits')
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const { data: habits, isLoading } = useGetHabits()
  const { data: myPetsSections } = useGetMyPetsSections()
  const createHabit = usePostHabits({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: getGetHabitsQueryKey() })
        toast.success('habits:messages.created')
      },
    },
  })

  const ownedPets = useMemo<HabitPetSummary[]>(
    () =>
      (myPetsSections?.owned ?? []).map((pet) => ({
        id: pet.id,
        name: pet.name,
        photo_url: pet.photo_url,
      })),
    [myPetsSections]
  )

  const activeHabits = (habits ?? []).filter((habit) => !habit.archived_at)
  const archivedHabits = (habits ?? []).filter((habit) => Boolean(habit.archived_at))

  if (isLoading) {
    return <LoadingState message={t('loading')} />
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground mt-2">{t('description')}</p>
        </div>
        <Button
          onClick={() => {
            setCreateOpen(true)
          }}
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          {t('addHabit')}
        </Button>
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">{t('active')}</h2>
        </div>
        {activeHabits.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>{t('empty.title')}</EmptyTitle>
              <EmptyDescription>{t('empty.description')}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {activeHabits.map((habit) => (
              <Card key={habit.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle>
                        <Link className="hover:underline" to={`/habits/${String(habit.id ?? '')}`}>
                          {habit.name}
                        </Link>
                      </CardTitle>
                      <CardDescription>{t(`types.${habit.value_type ?? 'yes_no'}`)}</CardDescription>
                    </div>
                    {habit.share_with_coowners && <Badge variant="secondary">{t('shared')}</Badge>}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <div>{t('card.petCount', { count: habit.pet_count ?? 0 })}</div>
                  {habit.value_type === 'integer_scale' && (
                    <div>{t('card.scale', { min: habit.scale_min ?? 1, max: habit.scale_max ?? 10 })}</div>
                  )}
                  <div>
                    {habit.reminder_enabled
                      ? t('card.reminderOn', { time: habit.reminder_time ?? '--:--' })
                      : t('card.reminderOff')}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {archivedHabits.length > 0 && (
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">{t('archived')}</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {archivedHabits.map((habit) => (
              <Card key={habit.id} className="opacity-80">
                <CardHeader>
                  <CardTitle>
                    <Link className="hover:underline" to={`/habits/${String(habit.id ?? '')}`}>
                      {habit.name}
                    </Link>
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {t('card.petCount', { count: habit.pet_count ?? 0 })}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      <HabitFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        ownedPets={ownedPets}
        onSubmit={async (payload) => {
          await createHabit.mutateAsync({ data: payload })
        }}
      />
    </div>
  )
}
