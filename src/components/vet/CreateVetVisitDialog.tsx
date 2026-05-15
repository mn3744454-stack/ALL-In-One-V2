import { useState, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { formatStandardDate } from "@/lib/displayHelpers";
import {
  DialogClose,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SafeFormDialog } from "@/components/ui/safe-form-dialog";
import { useDirtyForm } from "@/hooks/useDirtyForm";
import { MissingRequirementsBar } from "@/components/ui/missing-requirements-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarIcon, Loader2 } from "lucide-react";
import { useI18n } from "@/i18n";
import { useHorses } from "@/hooks/useHorses";
import { cn } from "@/lib/utils";
import { BilingualName } from "@/components/ui/BilingualName";
import type { CreateVetVisitData, VetVisitType } from "@/hooks/vet/useVetVisits";

interface CreateVetVisitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateVetVisitData) => Promise<unknown>;
}

type FormData = {
  title: string;
  visit_type: VetVisitType;
  scheduled_date: Date;
  scheduled_time: string;
  vet_name: string;
  vet_phone: string;
  notes: string;
  estimated_cost: string;
  horse_ids: string[];
};

const visitTypes: VetVisitType[] = ["routine", "emergency", "follow_up", "inspection"];

export function CreateVetVisitDialog({
  open,
  onOpenChange,
  onSubmit,
}: CreateVetVisitDialogProps) {
  const { t } = useI18n();
  const { horses } = useHorses();
  const [submitting, setSubmitting] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      title: "",
      visit_type: "routine",
      scheduled_date: new Date(),
      scheduled_time: "09:00",
      vet_name: "",
      vet_phone: "",
      notes: "",
      estimated_cost: "",
      horse_ids: [],
    },
  });

  const selectedDate = watch("scheduled_date");
  const selectedTime = watch("scheduled_time");
  const selectedHorses = watch("horse_ids");
  const visitType = watch("visit_type");
  const watchedTitle = watch("title");

  // Normalize Date to ISO string for dirty-form snapshot (raw Date objects are non-serializable)
  const dirtySnapshot = {
    title: watchedTitle || "",
    visit_type: visitType,
    scheduled_date: selectedDate?.toISOString?.() ?? null,
    scheduled_time: selectedTime,
    vet_name: watch("vet_name") || "",
    vet_phone: watch("vet_phone") || "",
    notes: watch("notes") || "",
    estimated_cost: watch("estimated_cost") || "",
    horse_ids: selectedHorses || [],
  };

  const { isDirty } = useDirtyForm(dirtySnapshot, open);

  useEffect(() => {
    if (!open) setAttemptedSubmit(false);
  }, [open]);

  useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open, reset]);

  const missingIssues = useMemo(() => {
    const issues: string[] = [];
    if (!watchedTitle?.trim()) issues.push(t("common.validation.enterTreatmentDetails"));
    if (!selectedHorses || selectedHorses.length === 0) issues.push(t("common.validation.selectHorsePatient"));
    if (!selectedDate) issues.push(t("common.validation.selectScheduledDate"));
    return issues;
  }, [watchedTitle, selectedHorses, selectedDate, t]);

  const handleFormSubmit = async (data: FormData) => {
    setAttemptedSubmit(true);
    if (missingIssues.length > 0) {
      return;
    }
    setSubmitting(true);
    try {
      const [hours, minutes] = data.scheduled_time.split(":").map(Number);
      const scheduledDate = new Date(data.scheduled_date);
      scheduledDate.setHours(hours, minutes, 0, 0);

      await onSubmit({
        title: data.title,
        visit_type: data.visit_type,
        scheduled_date: scheduledDate.toISOString(),
        vet_name: data.vet_name || null,
        vet_phone: data.vet_phone || null,
        notes: data.notes || null,
        estimated_cost: data.estimated_cost ? parseFloat(data.estimated_cost) : null,
        horse_ids: data.horse_ids,
      });
      reset();
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleHorse = (horseId: string) => {
    const current = selectedHorses || [];
    if (current.includes(horseId)) {
      setValue("horse_ids", current.filter((id) => id !== horseId));
    } else {
      setValue("horse_ids", [...current, horseId]);
    }
  };

  return (
    <SafeFormDialog
      open={open}
      onOpenChange={onOpenChange}
      isDirty={isDirty}
      contentClassName="!grid-rows-none !grid-cols-none !flex !flex-col sm:max-w-5xl max-h-[90vh] p-0 gap-0"
    >
      <div className="shrink-0 border-b px-6 py-4">
        <DialogHeader>
          <DialogTitle>{t("vetVisits.scheduleVisit")}</DialogTitle>
        </DialogHeader>
      </div>

      <form onSubmit={handleSubmit(handleFormSubmit)} className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
          <div className="space-y-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">{t("vetVisits.fields.title")} *</Label>
              <Input
                id="title"
                {...register("title", { required: true })}
                placeholder="e.g., Annual checkup, Emergency call..."
              />
              {errors.title && (
                <p className="text-sm text-destructive">{t("common.required")}</p>
              )}
            </div>

            {/* Visit Type */}
            <div className="space-y-2">
              <Label>{t("vetVisits.fields.visitType")}</Label>
              <Select value={visitType} onValueChange={(v) => setValue("visit_type", v as VetVisitType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {visitTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {t(`vetVisits.types.${type}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("vetVisits.fields.scheduledDate")} *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="me-2 h-4 w-4" />
                      {selectedDate ? formatStandardDate(selectedDate) : t("vetVisits.placeholders.pickDate")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => date && setValue("scheduled_date", date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>{t("vetVisits.fields.time")}</Label>
                <Input
                  type="time"
                  value={selectedTime}
                  onChange={(e) => setValue("scheduled_time", e.target.value)}
                />
              </div>
            </div>

            {/* Vet Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vet_name">{t("vetVisits.fields.vetName")}</Label>
                <Input
                  id="vet_name"
                  {...register("vet_name")}
                  placeholder={t("vetVisits.placeholders.vetName")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vet_phone">{t("vetVisits.fields.vetPhone")}</Label>
                <Input
                  id="vet_phone"
                  {...register("vet_phone")}
                  placeholder={t("vetVisits.placeholders.phone")}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t("vetVisits.fields.horses")}</Label>
              <div className="border rounded-lg p-3 max-h-56 overflow-y-auto space-y-2">
                {horses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("vetVisits.noHorsesAvailable")}</p>
                ) : (
                  horses.map((horse) => (
                    <div key={horse.id} className="flex items-start gap-2">
                      <Checkbox
                        id={`horse-${horse.id}`}
                        checked={selectedHorses?.includes(horse.id)}
                        onCheckedChange={() => toggleHorse(horse.id)}
                        className="mt-1"
                      />
                      <label
                        htmlFor={`horse-${horse.id}`}
                        className="text-sm cursor-pointer flex-1 min-w-0"
                      >
                        <BilingualName name={horse.name} nameAr={(horse as any).name_ar} />
                      </label>
                    </div>
                  ))
                )}
              </div>
              {selectedHorses?.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {selectedHorses.length} {t("vetVisits.horsesSelected")}
                </p>
              )}
            </div>

            {/* Estimated Cost */}
            <div className="space-y-2">
              <Label htmlFor="estimated_cost">{t("vetVisits.fields.estimatedCost")}</Label>
              <Input
                id="estimated_cost"
                type="number"
                step="0.01"
                {...register("estimated_cost")}
                placeholder="0.00"
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">{t("vetVisits.fields.notes")}</Label>
              <Textarea
                id="notes"
                {...register("notes")}
                placeholder={t("vetVisits.placeholders.notes")}
                rows={3}
              />
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t px-6 py-3 space-y-3">
          <MissingRequirementsBar
            issues={attemptedSubmit ? missingIssues : []}
            attempted={attemptedSubmit}
          />
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                {t("common.cancel")}
              </Button>
            </DialogClose>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
              {t("vetVisits.scheduleVisit")}
            </Button>
          </div>
        </div>
      </form>
    </SafeFormDialog>
  );
}
