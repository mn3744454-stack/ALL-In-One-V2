import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useHorses } from "@/hooks/useHorses";
import { useServiceProviders } from "@/hooks/useServiceProviders";
import { useTenantCapabilities } from "@/hooks/useTenantCapabilities";
import { useVetTreatments, type CreateVetTreatmentData, type VetTreatmentCategory, type VetTreatmentPriority } from "@/hooks/vet/useVetTreatments";

interface CreateVetTreatmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedHorseId?: string;
  onSuccess?: () => void;
}

const categories: { value: VetTreatmentCategory; label: string }[] = [
  { value: 'treatment', label: 'Treatment' },
  { value: 'procedure', label: 'Procedure' },
  { value: 'checkup', label: 'Checkup' },
  { value: 'dental', label: 'Dental' },
  { value: 'hoof', label: 'Hoof Care' },
  { value: 'injury', label: 'Injury' },
  { value: 'surgery', label: 'Surgery' },
  { value: 'reproductive', label: 'Reproductive' },
  { value: 'lab', label: 'Lab Work' },
];

const priorities: { value: VetTreatmentPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

export function CreateVetTreatmentDialog({ 
  open, 
  onOpenChange,
  preselectedHorseId,
  onSuccess,
}: CreateVetTreatmentDialogProps) {
  const { horses } = useHorses();
  const { providers } = useServiceProviders();
  const { getServiceModeOptions } = useTenantCapabilities();
  const { createTreatment } = useVetTreatments();

  const [loading, setLoading] = useState(false);
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

  const serviceModeOptions = getServiceModeOptions('veterinary');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.horse_id || !formData.category || !formData.title) return;

    setLoading(true);
    try {
      await createTreatment(formData as CreateVetTreatmentData);
      onOpenChange(false);
      onSuccess?.();
      // Reset form
      setFormData({
        horse_id: '',
        category: 'treatment',
        title: '',
        description: '',
        priority: 'medium',
        service_mode: 'external',
        scheduled_for: undefined,
        notes: '',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Vet Treatment</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              {/* Horse Selection */}
              <div className="space-y-2">
                <Label>Horse *</Label>
                <Select
                  value={formData.horse_id}
                  onValueChange={(value) => setFormData({ ...formData, horse_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select horse" />
                  </SelectTrigger>
                  <SelectContent className="z-[200]">
                    {horses.map((horse) => (
                      <SelectItem key={horse.id} value={horse.id}>
                        {horse.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value as VetTreatmentCategory })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="z-[200]">
                    {categories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Annual vaccination, Dental checkup"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the treatment"
                  rows={3}
                />
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              {/* Priority */}
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value as VetTreatmentPriority })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent className="z-[200]">
                    {priorities.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Service Mode */}
              <div className="space-y-2">
                <Label>Service Mode</Label>
                <Select
                  value={formData.service_mode}
                  onValueChange={(value) => setFormData({ ...formData, service_mode: value as 'internal' | 'external' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select mode" />
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
                  <Label>Veterinarian / Clinic</Label>
                  <Select
                    value={formData.external_provider_id || ''}
                    onValueChange={(value) => setFormData({ ...formData, external_provider_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select provider (optional)" />
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
                      placeholder="Or enter provider name"
                      className="mt-2"
                    />
                  )}
                </div>
              )}

              {/* Scheduled For */}
              <div className="space-y-2">
                <Label>Scheduled For</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.scheduled_for && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.scheduled_for
                        ? format(new Date(formData.scheduled_for), "PPP")
                        : "Select date"}
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
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* Notes - Full Width */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1"
              disabled={loading || !formData.horse_id || !formData.title}
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Treatment
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
