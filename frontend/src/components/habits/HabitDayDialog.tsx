import { useEffect, useState } from "react";
import type { Habit, HabitDayEntry } from "@/api/generated/model";
import { getHabitDayEntries, putHabitDayEntries } from "@/api/habits-day";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingState } from "@/components/ui/LoadingState";
import { toast } from "@/lib/i18n-toast";
import { format, parseISO } from "date-fns";
import { useTranslation } from "react-i18next";

interface HabitDayDialogProps {
  habit: Habit;
  date: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function HabitDayDialog(props: HabitDayDialogProps) {
  const { habit, date, open, onOpenChange, onSaved } = props;
  const { t } = useTranslation("habits");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [entries, setEntries] = useState<HabitDayEntry[]>([]);

  useEffect(() => {
    if (!open || !habit.id) return;

    setLoading(true);
    void getHabitDayEntries(habit.id, date)
      .then((data) => {
        setEntries(data.entries);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [date, habit.id, open]);

  const updateEntry = (petId: number, value: number | null) => {
    setEntries((prev) =>
      prev.map((entry) => (entry.pet_id === petId ? { ...entry, value_int: value } : entry)),
    );
  };

  const handleSave = async () => {
    if (!habit.id) return;
    setSaving(true);
    try {
      await putHabitDayEntries(habit.id, date, {
        entries: entries.map((entry) => ({
          pet_id: entry.pet_id ?? 0,
          value_int: entry.value_int ?? null,
        })),
      });
      toast.success("habits:messages.saved");
      onSaved();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const formattedTitleDate = `${format(parseISO(date), "EEE")}, ${format(parseISO(date), "dd/MM/yyyy")}`;
  const scaleOptions = Array.from(
    {
      length: Math.max(0, (habit.scale_max ?? 10) - (habit.scale_min ?? 1) + 1),
    },
    (_, index) => (habit.scale_min ?? 1) + index,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("dayDialog.title", { date: formattedTitleDate })}</DialogTitle>
          <DialogDescription>{t("dayDialog.description")}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <LoadingState message={t("loadingDay")} />
        ) : (
          <div className="max-h-[60vh] overflow-y-auto pr-2 -mr-2">
            <div className="space-y-1">
              {entries.map((entry) => (
                <div
                  key={entry.pet_id}
                  className="flex items-center justify-between gap-4 py-3 border-b border-border/50 last:border-0"
                >
                  <div className="flex flex-col gap-1 min-w-0">
                    <Label className="truncate text-base">{entry.pet_name}</Label>
                    {!entry.is_current_pet && (
                      <span className="text-xs text-muted-foreground leading-none">
                        {t("dayDialog.historicalPet")}
                      </span>
                    )}
                  </div>
                  <div className="w-32 shrink-0">
                    {habit.value_type === "yes_no" ? (
                      <Select
                        value={entry.value_int === null ? "unset" : String(entry.value_int)}
                        onValueChange={(value) => {
                          updateEntry(entry.pet_id ?? 0, value === "unset" ? null : Number(value));
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unset">{t("dayDialog.unset")}</SelectItem>
                          <SelectItem value="0">{t("dayDialog.no")}</SelectItem>
                          <SelectItem value="1">{t("dayDialog.yes")}</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Select
                        value={entry.value_int === null ? "unset" : String(entry.value_int)}
                        onValueChange={(value) => {
                          updateEntry(entry.pet_id ?? 0, value === "unset" ? null : Number(value));
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={`${String(habit.scale_min ?? 1)}-${String(habit.scale_max ?? 10)}`}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unset">{t("dayDialog.unset")}</SelectItem>
                          {scaleOptions.map((value) => (
                            <SelectItem key={value} value={String(value)}>
                              {String(value)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            onClick={() => {
              void handleSave();
            }}
            disabled={loading || saving}
          >
            {saving ? t("dayDialog.saving") : t("dayDialog.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
