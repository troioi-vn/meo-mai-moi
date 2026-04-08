import { useEffect, useMemo, useState } from "react";
import type {
  Habit,
  HabitPetSummary,
  HabitValueType,
  PostHabitsBody,
  PutHabitsHabitBody,
} from "@/api/generated/model";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useTranslation } from "react-i18next";

interface HabitFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ownedPets: HabitPetSummary[];
  initialHabit?: Habit | null;
  allowPetSelection?: boolean;
  canArchive?: boolean;
  canDelete?: boolean;
  archiveDisabled?: boolean;
  deleteDisabled?: boolean;
  onArchive?: () => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
  onSubmit: (payload: PostHabitsBody | PutHabitsHabitBody) => Promise<void>;
}

interface FormState {
  name: string;
  value_type: HabitValueType;
  scale_min: string;
  scale_max: string;
  share_with_coowners: boolean;
  reminder_enabled: boolean;
  reminder_time: string;
  reminder_weekdays: number[];
  pet_ids: number[];
}

const ALL_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];

export function HabitFormDialog(props: HabitFormDialogProps) {
  const {
    open,
    onOpenChange,
    ownedPets,
    initialHabit,
    allowPetSelection = true,
    canArchive = false,
    canDelete = false,
    archiveDisabled = false,
    deleteDisabled = false,
    onArchive,
    onDelete,
    onSubmit,
  } = props;
  const { t } = useTranslation("habits");
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({
    name: "",
    value_type: "yes_no",
    scale_min: "1",
    scale_max: "10",
    share_with_coowners: false,
    reminder_enabled: false,
    reminder_time: "20:00",
    reminder_weekdays: [...ALL_WEEKDAYS],
    pet_ids: [],
  });

  const isEditing = Boolean(initialHabit?.id);
  const canGoToPetStep = allowPetSelection && !isEditing;

  useEffect(() => {
    if (!open) return;

    setStep(1);
    setError(null);
    setSubmitting(false);
    setForm({
      name: initialHabit?.name ?? "",
      value_type: initialHabit?.value_type ?? "yes_no",
      scale_min: String(initialHabit?.scale_min ?? 1),
      scale_max: String(initialHabit?.scale_max ?? 10),
      share_with_coowners: Boolean(initialHabit?.share_with_coowners),
      reminder_enabled: Boolean(initialHabit?.reminder_enabled),
      reminder_time: initialHabit?.reminder_time ?? "20:00",
      reminder_weekdays: initialHabit?.reminder_weekdays?.length
        ? initialHabit.reminder_weekdays
        : [...ALL_WEEKDAYS],
      pet_ids: (initialHabit?.pets ?? []).map((pet) => pet.id ?? 0).filter(Boolean),
    });
  }, [initialHabit, open]);

  const weekdayLabels = useMemo(
    () => [
      t("weekdays.sun"),
      t("weekdays.mon"),
      t("weekdays.tue"),
      t("weekdays.wed"),
      t("weekdays.thu"),
      t("weekdays.fri"),
      t("weekdays.sat"),
    ],
    [t],
  );

  const toggleWeekday = (weekday: number, checked: boolean) => {
    setForm((prev) => ({
      ...prev,
      reminder_weekdays: checked
        ? [...prev.reminder_weekdays, weekday].sort((a, b) => a - b)
        : prev.reminder_weekdays.filter((item) => item !== weekday),
    }));
  };

  const togglePet = (petId: number, checked: boolean) => {
    setForm((prev) => ({
      ...prev,
      pet_ids: checked ? [...prev.pet_ids, petId] : prev.pet_ids.filter((id) => id !== petId),
    }));
  };

  const handleContinue = () => {
    if (!form.name.trim()) {
      setError(t("form.errors.nameRequired"));
      return;
    }

    if (form.value_type === "integer_scale" && Number(form.scale_min) >= Number(form.scale_max)) {
      setError(t("form.errors.invalidRange"));
      return;
    }

    if (form.reminder_enabled && !form.reminder_time) {
      setError(t("form.errors.reminderTimeRequired"));
      return;
    }

    if (form.reminder_enabled && form.reminder_weekdays.length === 0) {
      setError(t("form.errors.weekdayRequired"));
      return;
    }

    setError(null);
    if (canGoToPetStep) {
      setStep(2);
    }
  };

  const handleSubmit = async () => {
    if ((allowPetSelection || !isEditing) && form.pet_ids.length === 0) {
      setError(t("form.errors.petRequired"));
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const payload: PostHabitsBody | PutHabitsHabitBody = {
        name: form.name.trim(),
        value_type: form.value_type,
        scale_min: form.value_type === "integer_scale" ? Number(form.scale_min) : null,
        scale_max: form.value_type === "integer_scale" ? Number(form.scale_max) : null,
        share_with_coowners: form.share_with_coowners,
        reminder_enabled: form.reminder_enabled,
        reminder_time: form.reminder_enabled ? form.reminder_time : null,
        reminder_weekdays: form.reminder_enabled ? form.reminder_weekdays : [],
        ...(allowPetSelection ? { pet_ids: form.pet_ids } : {}),
      };

      await onSubmit(payload);
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? t("form.editTitle") : t("form.createTitle")}</DialogTitle>
          <DialogDescription>
            {canGoToPetStep ? t("form.stepDescription", { step }) : t("form.editDescription")}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="habit-name">{t("form.name")}</Label>
              <Input
                id="habit-name"
                value={form.name}
                onChange={(event) => {
                  setForm((prev) => ({ ...prev, name: event.target.value }));
                }}
                placeholder={t("form.namePlaceholder")}
              />
            </div>

            <div className="space-y-2">
              <Label>{t("form.type")}</Label>
              <Select
                value={form.value_type}
                onValueChange={(value) => {
                  setForm((prev) => ({ ...prev, value_type: value as HabitValueType }));
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes_no">{t("types.yes_no")}</SelectItem>
                  <SelectItem value="integer_scale">{t("types.integer_scale")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.value_type === "integer_scale" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="scale-min">{t("form.scaleMin")}</Label>
                  <Input
                    id="scale-min"
                    type="number"
                    value={form.scale_min}
                    onChange={(event) => {
                      setForm((prev) => ({ ...prev, scale_min: event.target.value }));
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scale-max">{t("form.scaleMax")}</Label>
                  <Input
                    id="scale-max"
                    type="number"
                    value={form.scale_max}
                    onChange={(event) => {
                      setForm((prev) => ({ ...prev, scale_max: event.target.value }));
                    }}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <div className="font-medium">{t("form.share")}</div>
                <div className="text-sm text-muted-foreground">{t("form.shareHint")}</div>
              </div>
              <Switch
                checked={form.share_with_coowners}
                onCheckedChange={(checked) => {
                  setForm((prev) => ({ ...prev, share_with_coowners: checked }));
                }}
              />
            </div>

            <div className="space-y-3 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{t("form.reminders")}</div>
                  <div className="text-sm text-muted-foreground">{t("form.remindersHint")}</div>
                </div>
                <Switch
                  checked={form.reminder_enabled}
                  onCheckedChange={(checked) => {
                    setForm((prev) => ({ ...prev, reminder_enabled: checked }));
                  }}
                />
              </div>

              {form.reminder_enabled && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="reminder-time">{t("form.reminderTime")}</Label>
                    <Input
                      id="reminder-time"
                      type="time"
                      value={form.reminder_time}
                      onChange={(event) => {
                        setForm((prev) => ({ ...prev, reminder_time: event.target.value }));
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{t("form.reminderDays")}</Label>
                    <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                      {weekdayLabels.map((label, index) => (
                        <label
                          key={label}
                          className="flex items-center gap-2 rounded-md border px-2 py-2 text-sm"
                        >
                          <Checkbox
                            checked={form.reminder_weekdays.includes(index)}
                            onCheckedChange={(checked) => {
                              toggleWeekday(index, checked === true);
                            }}
                          />
                          <span>{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">{t("form.petStepHint")}</div>
            <div className="space-y-2">
              {ownedPets.map((pet) => {
                const petId = pet.id ?? 0;
                return (
                  <label key={petId} className="flex items-center gap-3 rounded-lg border p-3">
                    <Checkbox
                      checked={form.pet_ids.includes(petId)}
                      onCheckedChange={(checked) => {
                        togglePet(petId, checked === true);
                      }}
                    />
                    <span>{pet.name}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter className={isEditing ? "gap-3 sm:justify-between" : undefined}>
          {isEditing && (canArchive || canDelete) ? (
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:mr-auto">
              {canDelete && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => {
                    void onDelete?.();
                  }}
                  disabled={deleteDisabled || submitting}
                >
                  {t("delete")}
                </Button>
              )}
              {canArchive && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    void onArchive?.();
                  }}
                  disabled={archiveDisabled || submitting}
                >
                  {t("archive")}
                </Button>
              )}
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            {step === 2 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setStep(1);
                }}
              >
                {t("common:actions.back")}
              </Button>
            )}
            {step === 1 && canGoToPetStep ? (
              <Button type="button" onClick={handleContinue}>
                {t("common:actions.continue")}
              </Button>
            ) : (
              <Button type="button" onClick={() => void handleSubmit()} disabled={submitting}>
                {submitting ? t("form.saving") : isEditing ? t("form.save") : t("form.create")}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
