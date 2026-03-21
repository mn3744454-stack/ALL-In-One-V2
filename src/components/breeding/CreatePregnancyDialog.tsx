import { useState } from "react";
import { format, addDays } from "date-fns";
import { formatStandardDate } from "@/lib/displayHelpers";
import { CalendarIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { cn } from "@/lib/utils";
import { useHorses } from "@/hooks/useHorses";
import { usePregnancies, CreatePregnancyData } from "@/hooks/breeding/usePregnancies";
import { filterEligibleMares } from "@/lib/breedingEligibility";
import { useI18n } from "@/i18n";

interface CreatePregnancyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EQUINE_GESTATION_DAYS = 340;

export function CreatePregnancyDialog({
  open,
  onOpenChange,
}: CreatePregnancyDialogProps) {
  const { t } = useI18n();
  const { horses } = useHorses();
  const { createPregnancy } = usePregnancies();
  const [loading, setLoading] = useState(false);

  const [mareId, setMareId] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [expectedDueDate, setExpectedDueDate] = useState<Date | undefined>();
  const [notes, setNotes] = useState("");

  const mares = filterEligibleMares(horses);

  const resetForm = () => {
    setMareId("");
    setStartDate(new Date());
    setExpectedDueDate(undefined);
    setNotes("");
  };

  const handleMareSelect = (id: string) => {
    setMareId(id);
    if (startDate) {
      setExpectedDueDate(addDays(startDate, EQUINE_GESTATION_DAYS));
    }
  };

  const handleStartDateChange = (date: Date | undefined) => {
    setStartDate(date);
    if (date) {
      setExpectedDueDate(addDays(date, EQUINE_GESTATION_DAYS));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mareId || !startDate) return;

    setLoading(true);
    try {
      await createPregnancy({
        mare_id: mareId,
        start_date: format(startDate, "yyyy-MM-dd"),
        expected_due_date: expectedDueDate ? format(expectedDueDate, "yyyy-MM-dd") : null,
        notes: notes || null,
      });
      resetForm();
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-display">{t("breeding.addPregnancy")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm">{t("breeding.detail.mare")} *</Label>
            <Select value={mareId} onValueChange={handleMareSelect}>
              <SelectTrigger>
                <SelectValue placeholder={t("breeding.foaling.selectSex")} />
              </SelectTrigger>
              <SelectContent className="z-[200]">
                {mares.map((mare) => (
                  <SelectItem key={mare.id} value={mare.id}>
                    {mare.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">{t("breeding.pregnancyDetail.startDate")} *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}
                >
                  <CalendarIcon className="me-2 h-4 w-4" />
                  {startDate ? format(startDate, "PPP") : t("common.selectDate")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-[200]" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={handleStartDateChange}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">{t("breeding.pregnancyDetail.expectedDue")}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal", !expectedDueDate && "text-muted-foreground")}
                >
                  <CalendarIcon className="me-2 h-4 w-4" />
                  {expectedDueDate ? format(expectedDueDate, "PPP") : t("common.selectDate")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-[200]" align="start">
                <Calendar
                  mode="single"
                  selected={expectedDueDate}
                  onSelect={setExpectedDueDate}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">
              {t("breeding.foaling.pedigreeAutoLinked").replace("Sire and dam will be automatically linked from the breeding record.", `~${EQUINE_GESTATION_DAYS} days from conception`)}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">{t("breeding.detail.notes")}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("breeding.foaling.notesPlaceholder")}
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" className="flex-1" disabled={loading || !mareId || !startDate}>
              {loading ? t("common.saving") : t("common.create")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
