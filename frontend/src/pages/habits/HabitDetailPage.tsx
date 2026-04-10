import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
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
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { addDays, addWeeks, format, startOfWeek, subWeeks } from "date-fns";
import { useTranslation } from "react-i18next";
import { CircleHelp, Link2, Pencil } from "lucide-react";
import { toast } from "@/lib/i18n-toast";

const toDateInput = (date: Date) => format(date, "yyyy-MM-dd");
const GRID_ROWS = 7;
const MAX_HEATMAP_WEEKS = 104;
const MIN_VISIBLE_WEEKS = 1;
const DAY_CELL_SIZE = 30;
const DAY_LABEL_WIDTH = 40;
const GRID_HEADER_HEIGHT = 40;
const GRID_COLUMN_GAP = 4;
const GRID_CONTAINER_PADDING = 96;
const MAX_CONTAINER_WIDTH = 1536;

const WEEKDAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

interface GridDay {
  date: Date;
  dateKey: string;
  summary: HabitDaySummary | undefined;
}

interface GridWeek {
  start: Date;
  days: GridDay[];
}

function heatColor(day: HabitDaySummary | undefined) {
  if (!day?.entry_count) return "border-zinc-800 bg-zinc-900/80 text-transparent";
  if ((day.normalized_intensity ?? 0) <= 0) return "border-zinc-300 bg-zinc-200 text-zinc-950";
  if ((day.normalized_intensity ?? 0) < 0.25) return "border-sky-200 bg-sky-100 text-slate-950";
  if ((day.normalized_intensity ?? 0) < 0.5) return "border-sky-300 bg-sky-300 text-slate-950";
  if ((day.normalized_intensity ?? 0) < 0.75) return "border-cyan-300 bg-cyan-300 text-slate-950";
  return "border-teal-300 bg-teal-300 text-slate-950";
}

function formatAverageValue(day: HabitDaySummary | undefined) {
  if (!day?.entry_count || day.average_value === null || day.average_value === undefined) {
    return "";
  }

  const value = day.average_value;
  if (!Number.isFinite(value)) {
    return "";
  }

  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function getMonthLabel(date: Date, locale: string, withYear: boolean) {
  return new Intl.DateTimeFormat(
    locale,
    withYear ? { month: "short", year: "numeric" } : { month: "short" },
  ).format(date);
}

export default function HabitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const habitId = Number(id);
  const { t, i18n } = useTranslation(["habits", "common"]);
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [dayDialogDate, setDayDialogDate] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const today = useMemo(() => new Date(`${toDateInput(new Date())}T00:00:00`), []);
  const endDate = toDateInput(today);
  const [gridContainerNode, setGridContainerNode] = useState<HTMLDivElement | null>(null);
  const [visibleWeeks, setVisibleWeeks] = useState(MIN_VISIBLE_WEEKS);

  const habitQuery = useGetHabitsHabit(habitId, {
    query: { enabled: habitId > 0 },
  });
  const heatmapQuery = useGetHabitsHabitHeatmap(
    habitId,
    { end_date: endDate, weeks: MAX_HEATMAP_WEEKS },
    { query: { enabled: habitId > 0 } },
  );
  const { data: myPetsSections } = useGetMyPetsSections();

  const archiveHabit = usePostHabitsHabitArchive({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: getGetHabitsHabitQueryKey(habitId),
        });
        await queryClient.invalidateQueries({
          queryKey: getGetHabitsQueryKey(),
        });
        toast.success("habits:messages.archived");
      },
    },
  });
  const restoreHabit = usePostHabitsHabitRestore({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: getGetHabitsHabitQueryKey(habitId),
        });
        await queryClient.invalidateQueries({
          queryKey: getGetHabitsQueryKey(),
        });
        toast.success("habits:messages.restored");
      },
    },
  });
  const updateHabit = usePutHabitsHabit({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: getGetHabitsHabitQueryKey(habitId),
        });
        await queryClient.invalidateQueries({
          queryKey: getGetHabitsQueryKey(),
        });
        toast.success("habits:messages.updated");
      },
    },
  });
  const deleteHabit = useDeleteHabitsHabit({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: getGetHabitsQueryKey(),
        });
        toast.success("habits:messages.deleted");
        setDeleteDialogOpen(false);
        void navigate("/habits");
      },
    },
  });

  const habit = habitQuery.data;
  const isEditRoute = location.pathname.endsWith("/edit");

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
  const startDate = useMemo(
    () =>
      startOfWeek(subWeeks(today, MAX_HEATMAP_WEEKS - 1), {
        weekStartsOn: 1,
      }),
    [today],
  );
  const weeks = useMemo<GridWeek[]>(() => {
    return Array.from({ length: MAX_HEATMAP_WEEKS }).map((_, weekIndex) => {
      const weekStart = addWeeks(startDate, weekIndex);
      const days = Array.from({ length: GRID_ROWS }).map((__, dayIndex) => {
        const date = addDays(weekStart, dayIndex);
        const dateKey = toDateInput(date);

        return {
          date,
          dateKey,
          summary: dateMap.get(dateKey),
        };
      });

      return { start: weekStart, days };
    });
  }, [dateMap, startDate]);
  const visibleWeeksData = useMemo(
    () => weeks.slice(Math.max(0, weeks.length - visibleWeeks)),
    [visibleWeeks, weeks],
  );
  const locale = i18n.resolvedLanguage ?? i18n.language;
  const monthLabels = useMemo(() => {
    return visibleWeeksData.flatMap((week, index) => {
      const previousWeek = visibleWeeksData[index - 1];
      const firstDay = week.days[0];
      const firstOfMonth = week.days.find((day) => day.date.getDate() === 1)?.date;

      if (index === 0 && firstDay) {
        return [
          {
            column: 1,
            label: getMonthLabel(firstDay.date, locale, firstDay.date.getMonth() === 0),
          },
        ];
      }

      if (
        !firstOfMonth ||
        previousWeek?.days.some((day) => day.date.getMonth() === firstOfMonth.getMonth())
      ) {
        return [];
      }

      return [
        {
          column: index + 1,
          label: getMonthLabel(firstOfMonth, locale, firstOfMonth.getMonth() === 0),
        },
      ];
    });
  }, [locale, visibleWeeksData]);
  const weekdayLabels = useMemo(() => WEEKDAY_KEYS.map((key) => t(`weekdays.${key}`)), [t]);

  useLayoutEffect(() => {
    const node = gridContainerNode;
    if (!node) {
      return;
    }

    let frame = 0;

    const calculateVisibleWeeks = () => {
      const measuredWidth = Math.max(
        node.offsetWidth,
        node.clientWidth,
        Math.floor(node.getBoundingClientRect().width),
      );
      const viewportWidth =
        typeof window === "undefined"
          ? 0
          : Math.max(window.innerWidth, document.documentElement.clientWidth);
      const effectiveViewportWidth = Math.min(viewportWidth, MAX_CONTAINER_WIDTH);
      const fallbackViewportWidth = Math.max(effectiveViewportWidth - GRID_CONTAINER_PADDING, 0);
      const containerWidth =
        measuredWidth > DAY_CELL_SIZE + DAY_LABEL_WIDTH ? measuredWidth : fallbackViewportWidth;
      const visibleWeekCount = Math.floor(
        (containerWidth - DAY_LABEL_WIDTH) / (DAY_CELL_SIZE + GRID_COLUMN_GAP),
      );

      setVisibleWeeks(Math.min(MAX_HEATMAP_WEEKS, Math.max(MIN_VISIBLE_WEEKS, visibleWeekCount)));
    };

    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(calculateVisibleWeeks);
    };

    measure();

    const resizeObserver = new ResizeObserver(() => {
      measure();
    });

    resizeObserver.observe(node);
    window.addEventListener("resize", measure);

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [gridContainerNode, habitQuery.isLoading, heatmapQuery.isLoading]);

  useEffect(() => {
    if (!habit || !isEditRoute) {
      return;
    }

    if (habit.capabilities?.can_edit) {
      setEditOpen(true);
      return;
    }

    void navigate(`/habits/${String(habitId)}`, { replace: true });
  }, [habit, habitId, isEditRoute, navigate]);

  const handleEditDialogOpenChange = (open: boolean) => {
    setEditOpen(open);

    if (open) {
      if (!isEditRoute) {
        void navigate(`/habits/${String(habitId)}/edit`);
      }
      return;
    }

    if (isEditRoute) {
      void navigate(`/habits/${String(habitId)}`, { replace: true });
    }
  };

  if (habitQuery.isLoading || heatmapQuery.isLoading) {
    return <LoadingState message={t("loadingDetail")} />;
  }

  if (!habit) {
    return <ErrorState error={t("errors.notFound")} />;
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="space-y-2">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/">{t("common:nav.home")}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/habits">{t("title")}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{habit.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold">{habit.name}</h1>
              {habit.capabilities?.can_edit && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    handleEditDialogOpenChange(true);
                  }}
                  aria-label={t("edit")}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          {habit.capabilities?.can_archive && habit.archived_at ? (
            <Button
              variant="outline"
              onClick={() => {
                void restoreHabit.mutateAsync({ habit: habitId });
              }}
            >
              {t("restore")}
            </Button>
          ) : null}
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>{t("grid.title")}</CardTitle>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label={t("grid.description")}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  <CircleHelp className="h-4 w-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="max-w-xs text-sm" side="top">
                <p>{t("grid.description")}</p>
              </PopoverContent>
            </Popover>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
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

          <div className="w-full min-w-0" ref={setGridContainerNode}>
            <div className="overflow-hidden">
              <div
                className="grid items-center gap-x-1 gap-y-1.5"
                style={{
                  gridTemplateColumns: `repeat(${String(visibleWeeks)}, ${String(DAY_CELL_SIZE)}px) ${String(DAY_LABEL_WIDTH)}px`,
                  gridTemplateRows: `${String(GRID_HEADER_HEIGHT)}px repeat(${String(GRID_ROWS)}, ${String(DAY_CELL_SIZE)}px)`,
                }}
              >
                {monthLabels.map(({ column, label }) => (
                  <div
                    key={`${label}-${String(column)}`}
                    className="self-end text-sm font-medium text-muted-foreground"
                    style={{
                      gridColumn: `${String(column)} / span 1`,
                      gridRow: "1",
                    }}
                  >
                    {label}
                  </div>
                ))}

                {visibleWeeksData.flatMap((week, weekIndex) =>
                  week.days.flatMap((day, dayIndex) => {
                    if (day.date > today) {
                      return [];
                    }

                    return (
                      <button
                        key={day.dateKey}
                        type="button"
                        className={cn(
                          "flex items-center justify-center rounded-md border text-[11px] font-semibold tracking-tight transition hover:ring-2 hover:ring-primary/40",
                          heatColor(day.summary),
                        )}
                        style={{
                          gridColumn: String(weekIndex + 1),
                          gridRow: String(dayIndex + 2),
                          height: `${String(DAY_CELL_SIZE)}px`,
                          width: `${String(DAY_CELL_SIZE)}px`,
                        }}
                        title={
                          day.summary?.entry_count
                            ? `${day.dateKey}: ${formatAverageValue(day.summary)} (${String(day.summary.entry_count)})`
                            : `${day.dateKey}: ${t("grid.emptyDay")}`
                        }
                        onClick={() => {
                          setDayDialogDate(day.dateKey);
                        }}
                      >
                        {formatAverageValue(day.summary)}
                      </button>
                    );
                  }),
                )}

                {weekdayLabels.map((label, index) => (
                  <div
                    key={label}
                    className="pl-2 text-sm text-muted-foreground"
                    style={{
                      gridColumn: String(visibleWeeks + 1),
                      gridRow: String(index + 2),
                    }}
                  >
                    {label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("details.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <div>
            {t("details.trackingType", {
              type: t(`types.${habit.value_type ?? "yes_no"}`),
              range:
                habit.value_type === "integer_scale"
                  ? ` (${String(habit.scale_min ?? 1)}-${String(habit.scale_max ?? 10)})`
                  : "",
            })}
          </div>
          <div>{t("details.petCount", { count: habit.pet_count ?? 0 })}</div>
          <div>{habit.share_with_coowners ? t("shared") : t("private")}</div>
          <div>
            {habit.reminder_enabled
              ? t("details.reminderOn", {
                  time: habit.reminder_time ?? "--:--",
                })
              : t("details.reminderOff")}
          </div>
          {habit.archived_at && <div>{t("details.archived")}</div>}
        </CardContent>
      </Card>

      <HabitFormDialog
        open={editOpen}
        onOpenChange={handleEditDialogOpenChange}
        initialHabit={habit}
        ownedPets={ownedPets}
        allowPetSelection={Boolean(habit.capabilities?.can_delete)}
        canArchive={Boolean(habit.capabilities?.can_archive && !habit.archived_at)}
        canDelete={Boolean(habit.capabilities?.can_delete)}
        archiveDisabled={archiveHabit.isPending}
        deleteDisabled={deleteHabit.isPending}
        onArchive={async () => {
          handleEditDialogOpenChange(false);
          await archiveHabit.mutateAsync({ habit: habitId });
        }}
        onDelete={() => {
          handleEditDialogOpenChange(false);
          setDeleteDialogOpen(true);
        }}
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
                weeks: MAX_HEATMAP_WEEKS,
              }),
            });
          }}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteConfirm.title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("deleteConfirm.description")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteHabit.isPending}>
              {t("common:actions.cancel")}
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => {
                void deleteHabit.mutateAsync({ habit: habitId });
              }}
              disabled={deleteHabit.isPending}
            >
              {t("delete")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
