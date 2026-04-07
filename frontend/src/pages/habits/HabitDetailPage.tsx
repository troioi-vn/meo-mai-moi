import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  getGetHabitsQueryKey,
  getGetHabitsHabitHeatmapQueryKey,
  getGetHabitsHabitQueryKey,
  useDeleteHabitsHabit,
  useGetHabitsHabit,
  useGetHabitsHabitHeatmap,
  usePostHabitsHabitArchive,
  usePostHabitsHabitRestore,
  usePutHabitsHabit,
} from "@/api/generated/habits/habits";
import { useGetMyPetsSections } from "@/api/generated/pets/pets";
import type { HabitDaySummary, HabitPetSummary } from "@/api/generated/model";
import { HabitDayDialog } from "@/components/habits/HabitDayDialog";
import { HabitFormDialog } from "@/components/habits/HabitFormDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { format, subWeeks } from "date-fns";
import { useTranslation } from "react-i18next";
import { Link2, Pencil, Trash2 } from "lucide-react";
import { toast } from "@/lib/i18n-toast";

const toDateInput = (date: Date) => format(date, "yyyy-MM-dd");
const GRID_ROWS = 7;
const TOTAL_WEEKS = 52;
const MIN_VISIBLE_WEEKS = 8;
const DAY_CELL_SIZE = 16;
const DAY_GAP = 4;

function heatColor(day: HabitDaySummary | undefined) {
  if (!day?.entry_count) return "bg-muted/50";
  if ((day.normalized_intensity ?? 0) <= 0) return "bg-amber-100 border-amber-300";
  if ((day.normalized_intensity ?? 0) < 0.25) return "bg-emerald-100 border-emerald-200";
  if ((day.normalized_intensity ?? 0) < 0.5) return "bg-emerald-200 border-emerald-300";
  if ((day.normalized_intensity ?? 0) < 0.75) return "bg-emerald-400 border-emerald-500";
  return "bg-emerald-600 border-emerald-700";
}

export default function HabitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const habitId = Number(id);
  const { t } = useTranslation("habits");
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [dayDialogDate, setDayDialogDate] = useState<string | null>(null);
  const endDate = toDateInput(new Date());
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const [visibleWeeks, setVisibleWeeks] = useState(MIN_VISIBLE_WEEKS);

  const habitQuery = useGetHabitsHabit(habitId, { query: { enabled: habitId > 0 } });
  const heatmapQuery = useGetHabitsHabitHeatmap(
    habitId,
    { end_date: endDate, weeks: 52 },
    { query: { enabled: habitId > 0 } },
  );
  const { data: myPetsSections } = useGetMyPetsSections();

  const archiveHabit = usePostHabitsHabitArchive({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: getGetHabitsHabitQueryKey(habitId) });
        await queryClient.invalidateQueries({ queryKey: getGetHabitsQueryKey() });
        toast.success("habits:messages.archived");
      },
    },
  });
  const restoreHabit = usePostHabitsHabitRestore({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: getGetHabitsHabitQueryKey(habitId) });
        await queryClient.invalidateQueries({ queryKey: getGetHabitsQueryKey() });
        toast.success("habits:messages.restored");
      },
    },
  });
  const updateHabit = usePutHabitsHabit({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: getGetHabitsHabitQueryKey(habitId) });
        await queryClient.invalidateQueries({ queryKey: getGetHabitsQueryKey() });
        toast.success("habits:messages.updated");
      },
    },
  });
  const deleteHabit = useDeleteHabitsHabit({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: getGetHabitsQueryKey() });
        void navigate("/habits");
      },
    },
  });

  const habit = habitQuery.data;

  const ownedPets = useMemo<HabitPetSummary[]>(
    () =>
      (myPetsSections?.owned ?? []).map((pet) => ({
        id: pet.id,
        name: pet.name,
        photo_url: pet.photo_url,
      })),
    [myPetsSections],
  );

  const dateMap = useMemo(
    () => new Map((heatmapQuery.data ?? []).map((day) => [day.date ?? "", day])),
    [heatmapQuery.data],
  );
  const startDate = subWeeks(new Date(`${endDate}T00:00:00`), TOTAL_WEEKS - 1);
  const days = useMemo(() => {
    return Array.from({ length: TOTAL_WEEKS * GRID_ROWS }).map((_, index) => {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + index);
      const dateKey = toDateInput(date);
      return {
        date: dateKey,
        summary: dateMap.get(dateKey),
      };
    });
  }, [dateMap, startDate]);
  const visibleDays = useMemo(
    () => days.slice(Math.max(0, days.length - visibleWeeks * GRID_ROWS)),
    [days, visibleWeeks],
  );

  useEffect(() => {
    const node = gridContainerRef.current;
    if (!node) {
      return;
    }

    const calculateVisibleWeeks = (width: number) => {
      const availableWidth = Math.max(width, DAY_CELL_SIZE);
      const weekWidth = DAY_CELL_SIZE + DAY_GAP;
      const fittedWeeks = Math.floor((availableWidth + DAY_GAP) / weekWidth);

      setVisibleWeeks(Math.max(MIN_VISIBLE_WEEKS, Math.min(TOTAL_WEEKS, fittedWeeks)));
    };

    calculateVisibleWeeks(node.getBoundingClientRect().width);

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        calculateVisibleWeeks(entry.contentRect.width);
      }
    });

    resizeObserver.observe(node);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  if (habitQuery.isLoading || heatmapQuery.isLoading) {
    return <LoadingState message={t("loadingDetail")} />;
  }

  if (!habit) {
    return <ErrorState error={t("errors.notFound")} />;
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 space-y-6">
      <div className="space-y-2">
        <Link className="text-sm text-muted-foreground hover:text-foreground" to="/habits">
          {t("backToList")}
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">{habit.name}</h1>
            <p className="text-muted-foreground mt-2">
              {t(`types.${habit.value_type ?? "yes_no"}`)}
              {habit.value_type === "integer_scale" &&
                ` (${String(habit.scale_min ?? 1)}-${String(habit.scale_max ?? 10)})`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {habit.capabilities?.can_edit && (
              <Button
                variant="outline"
                onClick={() => {
                  setEditOpen(true);
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                {t("edit")}
              </Button>
            )}
            {habit.capabilities?.can_archive && !habit.archived_at && (
              <Button
                variant="outline"
                onClick={() => {
                  void archiveHabit.mutateAsync({ habit: habitId });
                }}
              >
                {t("archive")}
              </Button>
            )}
            {habit.capabilities?.can_archive && habit.archived_at && (
              <Button
                variant="outline"
                onClick={() => {
                  void restoreHabit.mutateAsync({ habit: habitId });
                }}
              >
                {t("restore")}
              </Button>
            )}
            {habit.capabilities?.can_delete && (
              <Button
                variant="destructive"
                onClick={() => {
                  void deleteHabit.mutateAsync({ habit: habitId });
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {t("delete")}
              </Button>
            )}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("grid.title")}</CardTitle>
          <CardDescription>{t("grid.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Button
              variant="outline"
              onClick={() => {
                setDayDialogDate(endDate);
              }}
            >
              <Link2 className="mr-2 h-4 w-4" />
              {t("logSelectedDay")}
            </Button>
          </div>

          <div className="w-full min-w-0 overflow-hidden space-y-3" ref={gridContainerRef}>
            <div className="text-sm text-muted-foreground">
              {t("grid.visibleRange", { weeks: visibleWeeks })}
            </div>
            <div
              className="grid justify-start gap-1"
              style={{
                gridTemplateColumns: `repeat(${String(visibleWeeks)}, minmax(0, ${String(DAY_CELL_SIZE)}px))`,
                gridTemplateRows: `repeat(${String(GRID_ROWS)}, minmax(0, ${String(DAY_CELL_SIZE)}px))`,
                gridAutoFlow: "column",
              }}
            >
              {visibleDays.map(({ date, summary }) => (
                <button
                  key={date}
                  type="button"
                  className={cn(
                    "h-4 w-4 rounded-sm border transition hover:ring-2 hover:ring-primary/40",
                    heatColor(summary),
                  )}
                  title={
                    summary?.entry_count
                      ? `${date}: ${String(summary.average_value ?? "")} (${String(summary.entry_count)})`
                      : `${date}: ${t("grid.emptyDay")}`
                  }
                  onClick={() => {
                    setDayDialogDate(date);
                  }}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("details.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <div>{t("details.petCount", { count: habit.pet_count ?? 0 })}</div>
          <div>{habit.share_with_coowners ? t("shared") : t("private")}</div>
          <div>
            {habit.reminder_enabled
              ? t("details.reminderOn", { time: habit.reminder_time ?? "--:--" })
              : t("details.reminderOff")}
          </div>
          {habit.archived_at && <div>{t("details.archived")}</div>}
        </CardContent>
      </Card>

      <HabitFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        initialHabit={habit}
        ownedPets={ownedPets}
        allowPetSelection={Boolean(habit.capabilities?.can_delete)}
        onSubmit={async (payload) => {
          await updateHabit.mutateAsync({ habit: habitId, data: payload });
        }}
      />

      {dayDialogDate && (
        <HabitDayDialog
          habit={habit}
          date={dayDialogDate}
          open={Boolean(dayDialogDate)}
          onOpenChange={(open) => {
            if (!open) {
              setDayDialogDate(null);
            }
          }}
          onSaved={() => {
            void queryClient.invalidateQueries({
              queryKey: getGetHabitsHabitHeatmapQueryKey(habitId, {
                end_date: endDate,
                weeks: 52,
              }),
            });
          }}
        />
      )}
    </div>
  );
}
