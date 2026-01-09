import { useState } from "react";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { CalendarIcon, Loader2 } from "lucide-react";
import { useI18n } from "@/i18n";
import { useHorses } from "@/hooks/useHorses";
import { cn } from "@/lib/utils";
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

  const handleFormSubmit = async (data: FormData) => {
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t("vetVisits.scheduleVisit")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="flex-1 overflow-hidden flex flex-col">
          <ScrollArea className="flex-1 px-1">
            <div className="space-y-4 pb-4">
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
              <div className="grid grid-cols-2 gap-4">
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
                        {selectedDate ? format(selectedDate, "PPP") : t("vetVisits.placeholders.pickDate")}
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
              <div className="grid grid-cols-2 gap-4">
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
                <div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                  {horses.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("vetVisits.noHorsesAvailable")}</p>
                  ) : (
                    horses.map((horse) => (
                      <div key={horse.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`horse-${horse.id}`}
                          checked={selectedHorses?.includes(horse.id)}
                          onCheckedChange={() => toggleHorse(horse.id)}
                        />
                        <label
                          htmlFor={`horse-${horse.id}`}
                          className="text-sm cursor-pointer flex-1"
                        >
                          {horse.name}
                        </label>
                      </div>
                    ))
                  )}
                </div>
                {selectedHorses?.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {t("vetVisits.horsesSelected", { count: selectedHorses.length })}
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
          </ScrollArea>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
              {t("vetVisits.scheduleVisit")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
