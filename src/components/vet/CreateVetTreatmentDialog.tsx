import { useState, useEffect, useMemo } from "react";
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
import { formatStandardDate } from "@/lib/displayHelpers";
import { CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useHorses } from "@/hooks/useHorses";
import { useServiceProviders } from "@/hooks/useServiceProviders";
import { useTenantCapabilities } from "@/hooks/useTenantCapabilities";
import { useVetTreatments, type CreateVetTreatmentData, type VetTreatmentCategory, type VetTreatmentPriority } from "@/hooks/vet/useVetTreatments";
import type { VetTreatment } from "@/hooks/vet/useVetTreatments";
import { useI18n } from "@/i18n";
import { tCategory, tSeverity } from "@/i18n/labels";
import { BilingualName } from "@/components/ui/BilingualName";

interface CreateVetTreatmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedHorseId?: string;
  onSuccess?: () => void;
  editTreatment?: VetTreatment | null;
}

const categoryValues: VetTreatmentCategory[] = [
  'treatment', 'procedure', 'checkup', 'dental', 'hoof', 'injury', 'surgery', 'reproductive', 'lab', 'respiratory', 'musculoskeletal',
];

const priorityValues: VetTreatmentPriority[] = ['low', 'medium', 'high', 'urgent'];

export function CreateVetTreatmentDialog({ 
  open, 
  onOpenChange,
  preselectedHorseId,
  onSuccess,
  editTreatment,
}: CreateVetTreatmentDialogProps) {
  const { t } = useI18n();
  const { horses } = useHorses();
  const { providers } = useServiceProviders();
  const { getServiceModeOptions } = useTenantCapabilities();
  const { createTreatment, updateTreatment } = useVetTreatments();

  const isEditing = !!editTreatment;

  const [loading, setLoading] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  const [formData, setFormData] = useState<Partial<CreateVetTreatmentData>>({
    horse_id: preselectedHorseId || '',
    category: 'treatment',
    title: '',
    description: '',
    priority: 'medium',
    service_mode: 'external',
    scheduled_for: undefined,
    notes: '',
  });

  useEffect(() => {
    if (editTreatment) {
      setFormData({
        horse_id: editTreatment.horse_id,
        category: editTreatment.category,
        title: editTreatment.title,
        description: editTreatment.description || '',
        priority: editTreatment.priority,
        service_mode: editTreatment.service_mode,
        external_provider_id: editTreatment.external_provider_id || undefined,
        external_provider_name: editTreatment.external_provider_name || undefined,
        scheduled_for: editTreatment.scheduled_for || undefined,
        notes: editTreatment.notes || '',
      });
    } else {
      setFormData({
        horse_id: preselectedHorseId || '',
        category: 'treatment',
        title: '',
        description: '',
        priority: 'medium',
        service_mode: 'external',
        scheduled_for: undefined,
        notes: '',
      });
    }
  }, [editTreatment, preselectedHorseId]);

  useEffect(() => {
    if (!open) setAttemptedSubmit(false);
  }, [open]);

  const serviceModeOptions = getServiceModeOptions('veterinary');

  // Normalized dirty snapshot — scheduled_for is already an ISO string, so safe to pass as-is
  const dirtySnapshot = useMemo(() => ({
    horse_id: formData.horse_id || '',
    category: formData.category || '',
    title: formData.title || '',
    description: formData.description || '',
    priority: formData.priority || 'medium',
    service_mode: formData.service_mode || 'external',
    external_provider_id: formData.external_provider_id || '',
    external_provider_name: formData.external_provider_name || '',
    scheduled_for: formData.scheduled_for ?? null,
    notes: formData.notes || '',
  }), [formData]);

  const { isDirty } = useDirtyForm(dirtySnapshot, open);

  const missingIssues = useMemo(() => {
    const issues: string[] = [];
    if (!formData.horse_id) issues.push(t("common.validation.selectHorsePatient"));
    if (!formData.category) issues.push(t("common.validation.selectTreatmentCategory"));
    if (!formData.title?.trim()) issues.push(t("common.validation.enterTreatmentDetails"));
    return issues;
  }, [formData, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAttemptedSubmit(true);
    if (missingIssues.length > 0) {
      return;
    }

    setLoading(true);
    try {
      if (isEditing && editTreatment) {
        await updateTreatment(editTreatment.id, formData as Partial<CreateVetTreatmentData>);
      } else {
        await createTreatment(formData as CreateVetTreatmentData);
      }
      onOpenChange(false);
      onSuccess?.();
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeFormDialog open={open} onOpenChange={onOpenChange} isDirty={isDirty}>
      <DialogHeader>
        <DialogTitle>{isEditing ? t("vet.editTreatment") : t("vet.newTreatment")}</DialogTitle>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-4">
            {/* Horse Selection */}
            <div className="space-y-2">
              <Label>{t("vet.form.horse")} *</Label>
              <Select
                value={formData.horse_id}
                onValueChange={(value) => setFormData({ ...formData, horse_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("vet.form.selectHorse")} />
                </SelectTrigger>
                <SelectContent className="z-[200]">
                  {horses.map((horse) => (
                    <SelectItem key={horse.id} value={horse.id}>
                      <BilingualName name={horse.name} nameAr={(horse as any).name_ar} inline />
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label>{t("vet.form.category")} *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value as VetTreatmentCategory })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("vet.form.selectCategory")} />
                </SelectTrigger>
                <SelectContent className="z-[200]">
                  {categoryValues.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {tCategory(cat)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label>{t("vet.form.title")} *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder={t("vet.form.titlePlaceholder")}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>{t("vet.form.description")}</Label>
              <Textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t("vet.form.descriptionPlaceholder")}
                rows={3}
              />
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            {/* Priority */}
            <div className="space-y-2">
              <Label>{t("vet.form.priority")}</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value as VetTreatmentPriority })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("vet.form.selectPriority")} />
                </SelectTrigger>
                <SelectContent className="z-[200]">
                  {priorityValues.map((p) => (
                    <SelectItem key={p} value={p}>
                      {tSeverity(p)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Service Mode */}
            <div className="space-y-2">
              <Label>{t("vet.form.serviceMode")}</Label>
              <Select
                value={formData.service_mode}
                onValueChange={(value) => setFormData({ ...formData, service_mode: value as 'internal' | 'external' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("vet.form.selectMode")} />
                </SelectTrigger>
                <SelectContent className="z-[200]">
                  {serviceModeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* External Provider */}
            {formData.service_mode === 'external' && (
              <div className="space-y-2">
                <Label>{t("vet.form.provider")}</Label>
                <Select
                  value={formData.external_provider_id || ''}
                  onValueChange={(value) => setFormData({ ...formData, external_provider_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("vet.form.providerPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent className="z-[200]">
                    {providers.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {providers.length === 0 && (
                  <Input
                    value={formData.external_provider_name || ''}
                    onChange={(e) => setFormData({ ...formData, external_provider_name: e.target.value })}
                    placeholder={t("vet.form.providerNamePlaceholder")}
                    className="mt-2"
                  />
                )}
              </div>
            )}

            {/* Scheduled For */}
            <div className="space-y-2">
              <Label>{t("vet.form.scheduledFor")}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-start font-normal",
                      !formData.scheduled_for && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="me-2 h-4 w-4" />
                    {formData.scheduled_for
                      ? formatStandardDate(new Date(formData.scheduled_for))
                      : t("vet.form.selectDate")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[200]" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.scheduled_for ? new Date(formData.scheduled_for) : undefined}
                    onSelect={(date) =>
                      setFormData({ ...formData, scheduled_for: date?.toISOString() })
                    }
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        {/* Notes - Full Width */}
        <div className="space-y-2">
          <Label>{t("vet.form.notes")}</Label>
          <Textarea
            value={formData.notes || ''}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder={t("vet.form.notesPlaceholder")}
            rows={3}
          />
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 pt-4 border-t shrink-0">
          <MissingRequirementsBar
            issues={attemptedSubmit ? missingIssues : []}
            attempted={attemptedSubmit}
          />
          <div className="flex gap-3">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="flex-1">
                {t("common.cancel")}
              </Button>
            </DialogClose>
            <Button 
              type="submit" 
              className="flex-1"
              disabled={loading}
            >
              {loading && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
              {isEditing ? t("vet.updateTreatment") : t("vet.createTreatment")}
            </Button>
          </div>
        </div>
      </form>
    </SafeFormDialog>
  );
}
