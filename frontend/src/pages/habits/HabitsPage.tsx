import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  getGetHabitsHabitHeatmapQueryKey,
  getGetHabitsHabitHeatmapQueryOptions,
  getGetHabitsQueryKey,
  useGetHabits,
  usePostHabits,
} from "@/api/generated/habits/habits";
import { useGetMyPetsSections } from "@/api/generated/pets/pets";
import type {
  Habit,
  HabitDaySummary,
  HabitPetSummary,
  PostHabitsBody,
} from "@/api/generated/model";
import { HabitDayDialog } from "@/components/habits/HabitDayDialog";
import { HabitFormDialog } from "@/components/habits/HabitFormDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { LoadingState } from "@/components/ui/LoadingState";
import { cn } from "@/lib/utils";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { useTranslation } from "react-i18next";
import { toast } from "@/lib/i18n-toast";
import { Check, PlusCircle, X } from "lucide-react";

const RECENT_DAYS_COUNT = 4;

function formatAverageValue(day: HabitDaySummary | undefined) {
  if (!day?.entry_count || day.average_value === null || day.average_value === undefined) {
    return null;
  }

  const value = day.average_value;
  if (!Number.isFinite(value)) {
    return null;
  }

  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function getTrackingTypeLabel(t: ReturnType<typeof useTranslation>["t"], habit: Habit) {
  const base = t(`types.${habit.value_type ?? "yes_no"}`);

  if (habit.value_type !== "integer_scale") {
    return base;
  }

  return `${base} (${String(habit.scale_min ?? 1)}-${String(habit.scale_max ?? 10)})`;
}

export default function HabitsPage() {
  const { t, i18n } = useTranslation("habits");
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [dayDialogHabit, setDayDialogHabit] = useState<Habit | null>(null);
  const [dayDialogDate, setDayDialogDate] = useState<string | null>(null);
  const { data: habits, isLoading } = useGetHabits();
  const { data: myPetsSections } = useGetMyPetsSections();
  const createHabit = usePostHabits({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: getGetHabitsQueryKey(),
        });
        toast.success("habits:messages.created");
      },
    },
  });

  const ownedPets = useMemo<HabitPetSummary[]>(
    () =>
      (myPetsSections?.owned ?? []).map((pet) => ({
        id: pet.id,
        name: pet.name,
        photo_url: pet.photo_url,
      })),
    [myPetsSections],
  );

  const activeHabits = (habits ?? []).filter((habit) => !habit.archived_at);
  const archivedHabits = (habits ?? []).filter((habit) => Boolean(habit.archived_at));
  const today = useMemo(() => new Date(), []);
  const recentDays = useMemo(
    () => Array.from({ length: RECENT_DAYS_COUNT }, (_, index) => subDays(today, index)),
    [today],
  );
  const endDate = format(today, "yyyy-MM-dd");
  const locale = i18n.resolvedLanguage ?? i18n.language;

  const activeHabitActivityQueries = useQueries({
    queries: activeHabits.map((habit) =>
      getGetHabitsHabitHeatmapQueryOptions(
        habit.id ?? 0,
        { end_date: endDate, weeks: 1 },
        { query: { enabled: Boolean(habit.id) } },
      ),
    ),
  });

  const activityByHabitId = useMemo(() => {
    return new Map(
      activeHabits.map((habit, index) => [
        habit.id ?? 0,
        new Map(
          (activeHabitActivityQueries[index]?.data ?? []).map((day) => [day.date ?? "", day]),
        ),
      ]),
    );
  }, [activeHabitActivityQueries, activeHabits]);

  if (isLoading) {
    return <LoadingState message={t("loading")} />;
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <Button
          onClick={() => {
            setCreateOpen(true);
          }}
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          {t("addHabit")}
        </Button>
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">{t("active")}</h2>
        </div>
        {activeHabits.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>{t("empty.title")}</EmptyTitle>
              <EmptyDescription>{t("empty.description")}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <Card className="py-0">
            <CardHeader className="border-b border-border/60 py-3 md:py-5">
              <div className="grid grid-cols-[minmax(112px,1fr)_repeat(4,minmax(0,44px))] items-end gap-2 md:grid-cols-[minmax(240px,1fr)_repeat(4,88px)] md:gap-4">
                <div aria-hidden="true" />
                {recentDays.map((date) => (
                  <div key={date.toISOString()} className="text-center">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground md:text-xs md:tracking-[0.18em]">
                      {new Intl.DateTimeFormat(locale, { weekday: "short" })
                        .format(date)
                        .replace(".", "")
                        .toUpperCase()}
                    </div>
                    <div className="mt-1 text-lg font-semibold leading-none md:text-2xl">
                      {format(date, "d")}
                    </div>
                  </div>
                ))}
              </div>
            </CardHeader>
            <CardContent className="px-0">
              <div>
                {activeHabits.map((habit, index) => {
                  const activity =
                    activityByHabitId.get(habit.id ?? 0) ?? new Map<string, HabitDaySummary>();
                  const activityLoading = activeHabitActivityQueries[index]?.isLoading;
                  const canTrackHabit = (habit.pet_count ?? 0) > 0;

                  return (
                    <div
                      key={habit.id}
                      className="grid grid-cols-[minmax(112px,1fr)_repeat(4,minmax(0,44px))] items-center gap-2 border-b border-border/60 px-3 py-3 transition-colors hover:bg-muted/30 last:border-b-0 md:grid-cols-[minmax(240px,1fr)_repeat(4,88px)] md:gap-4 md:px-6 md:py-5"
                    >
                      <div className="min-w-0">
                        <Link
                          className="block truncate text-base font-medium text-primary hover:underline md:text-2xl"
                          to={`/habits/${String(habit.id ?? "")}`}
                        >
                          {habit.name}
                        </Link>
                        <div className="mt-2 hidden flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground md:flex">
                          <span>{getTrackingTypeLabel(t, habit)}</span>
                          <span>
                            {t("card.petCount", {
                              count: habit.pet_count ?? 0,
                            })}
                          </span>
                          <span>{habit.share_with_coowners ? t("shared") : t("private")}</span>
                        </div>
                      </div>

                      {recentDays.map((date) => {
                        const dateKey = format(date, "yyyy-MM-dd");
                        const day = activity.get(dateKey);
                        const value = formatAverageValue(day);

                        return (
                          <button
                            key={dateKey}
                            type="button"
                            className="flex min-h-14 flex-col items-center justify-center rounded-md text-center transition-colors hover:bg-muted/60 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent md:min-h-20"
                            disabled={!canTrackHabit}
                            onClick={() => {
                              setDayDialogHabit(habit);
                              setDayDialogDate(dateKey);
                            }}
                            aria-label={t("dayDialog.title", { date: dateKey })}
                          >
                            {activityLoading ? (
                              <div className="text-xs text-muted-foreground md:text-base">...</div>
                            ) : habit.value_type === "yes_no" ? (
                              day?.entry_count ? (
                                day.average_value ? (
                                  <Check className="h-5 w-5 text-amber-400 md:h-8 md:w-8" />
                                ) : (
                                  <X className="h-5 w-5 text-muted-foreground md:h-8 md:w-8" />
                                )
                              ) : (
                                <span className="text-xl leading-none text-muted-foreground/50 md:text-3xl">
                                  -
                                </span>
                              )
                            ) : (
                              <>
                                <div className="text-2xl font-semibold leading-none md:text-4xl">
                                  {value ?? "-"}
                                </div>
                                <div
                                  className={cn(
                                    "mt-1 text-[10px] text-muted-foreground md:text-sm",
                                    value === null && "opacity-50",
                                  )}
                                >
                                  {t("list.scaleValue")}
                                </div>
                              </>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </section>

      {archivedHabits.length > 0 && (
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">{t("archived")}</h2>
          </div>
          <div className="grid gap-4">
            {archivedHabits.map((habit) => (
              <Card key={habit.id} className="py-0 opacity-75">
                <CardContent className="py-5">
                  <Link
                    className="flex flex-wrap items-center justify-between gap-3 hover:underline"
                    to={`/habits/${String(habit.id ?? "")}`}
                  >
                    <div className="space-y-1">
                      <div className="text-lg font-medium">{habit.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {t("card.petCount", { count: habit.pet_count ?? 0 })}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">{t("details.archived")}</div>
                  </Link>
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
          await createHabit.mutateAsync({ data: payload as PostHabitsBody });
        }}
      />

      {dayDialogHabit && dayDialogDate && (
        <HabitDayDialog
          habit={dayDialogHabit}
          date={dayDialogDate}
          open={Boolean(dayDialogDate)}
          onOpenChange={(open) => {
            if (!open) {
              setDayDialogHabit(null);
              setDayDialogDate(null);
            }
          }}
          onSaved={() => {
            if (!dayDialogHabit.id) {
              return;
            }

            void queryClient.invalidateQueries({
              queryKey: getGetHabitsHabitHeatmapQueryKey(dayDialogHabit.id, {
                end_date: endDate,
                weeks: 1,
              }),
            });
          }}
        />
      )}
    </div>
  );
}
