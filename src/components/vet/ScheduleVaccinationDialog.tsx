import { useState } from "react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { CalendarIcon, Loader2 } from "lucide-react";
import { formatStandardDate } from "@/lib/displayHelpers";
import { useHorses } from "@/hooks/useHorses";
import { useVaccinationPrograms } from "@/hooks/vet/useVaccinationPrograms";
import { useHorseVaccinations, type CreateVaccinationData } from "@/hooks/vet/useHorseVaccinations";
import { useTenantCapabilities } from "@/hooks/useTenantCapabilities";
import { useI18n } from "@/i18n";
import { BilingualName } from "@/components/ui/BilingualName";

interface ScheduleVaccinationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ScheduleVaccinationDialog({
  open,
  onOpenChange,
  onSuccess,
}: ScheduleVaccinationDialogProps) {
  const { t } = useI18n();
  const { horses } = useHorses();
  const { programs } = useVaccinationPrograms();
  const { scheduleVaccination } = useHorseVaccinations();
  const { getServiceModeOptions } = useTenantCapabilities();

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<CreateVaccinationData>>({
    horse_id: '',
    program_id: '',
    due_date: '',
    service_mode: 'external',
    notes: '',
  });

  const serviceModeOptions = getServiceModeOptions('veterinary');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.horse_id || !formData.program_id || !formData.due_date) return;

    setLoading(true);
    try {
      await scheduleVaccination(formData as CreateVaccinationData);
      onOpenChange(false);
      onSuccess?.();
      setFormData({ horse_id: '', program_id: '', due_date: '', service_mode: 'external', notes: '' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("vet.scheduleVaccination")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Horse */}
          <div className="space-y-2">
            <Label>{t("vet.vaccination.horse")} *</Label>
            <Select value={formData.horse_id} onValueChange={v => setFormData({ ...formData, horse_id: v })}>
              <SelectTrigger>
                <SelectValue placeholder={t("vet.form.selectHorse")} />
              </SelectTrigger>
              <SelectContent className="z-[200]">
                {horses.map(h => (
                  <SelectItem key={h.id} value={h.id}>
                    <BilingualName name={h.name} nameAr={(h as any).name_ar} layout="inline" />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Vaccine Program */}
          <div className="space-y-2">
            <Label>{t("vet.vaccination.vaccine")} *</Label>
            <Select value={formData.program_id} onValueChange={v => setFormData({ ...formData, program_id: v })}>
              <SelectTrigger>
                <SelectValue placeholder={t("vet.vaccination.selectProgram")} />
              </SelectTrigger>
              <SelectContent className="z-[200]">
                {programs.filter(p => p.is_active).map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    <BilingualName name={p.name} nameAr={p.name_ar} layout="inline" />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label>{t("vet.vaccination.dueDate")} *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-start font-normal", !formData.due_date && "text-muted-foreground")}
                >
                  <CalendarIcon className="me-2 h-4 w-4" />
                  {formData.due_date ? formatStandardDate(new Date(formData.due_date)) : t("vet.form.selectDate")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-[200]" align="start">
                <Calendar
                  mode="single"
                  selected={formData.due_date ? new Date(formData.due_date) : undefined}
                  onSelect={date => setFormData({ ...formData, due_date: date?.toISOString().split('T')[0] })}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Service Mode */}
          <div className="space-y-2">
            <Label>{t("vet.vaccination.serviceMode")}</Label>
            <Select value={formData.service_mode} onValueChange={v => setFormData({ ...formData, service_mode: v as 'internal' | 'external' })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[200]">
                {serviceModeOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>{t("vet.vaccination.notes")}</Label>
            <Textarea
              value={formData.notes || ''}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              placeholder={t("vet.form.notesPlaceholder")}
              rows={2}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" className="flex-1" disabled={loading || !formData.horse_id || !formData.program_id || !formData.due_date}>
              {loading && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
              {t("vet.scheduleVaccination")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
