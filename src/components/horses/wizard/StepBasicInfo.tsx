import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Clock } from "lucide-react";
import { useState, useMemo } from "react";
import { useHorseMasterData } from "@/hooks/useHorseMasterData";
import { AddMasterDataDialog, MasterDataType } from "../AddMasterDataDialog";
import type { HorseWizardData } from "../HorseWizard";
import { 
  getCurrentAgeParts, 
  formatCurrentAge, 
  getHorseTypeLabel, 
  getHorseTypeBadgeProps 
} from "@/lib/horseClassification";

interface StepBasicInfoProps {
  data: HorseWizardData;
  onChange: (updates: Partial<HorseWizardData>) => void;
}

export const StepBasicInfo = ({ data, onChange }: StepBasicInfoProps) => {
  const { colors, breeds, createColor, createBreed } = useHorseMasterData();
  const [dialogType, setDialogType] = useState<MasterDataType | null>(null);

  // Calculate live age and classification
  const agePreview = useMemo(() => {
    const ageParts = getCurrentAgeParts({
      gender: data.gender,
      birth_date: data.birth_date,
      birth_at: data.birth_at,
      is_gelded: data.is_gelded,
      breeding_role: data.breeding_role,
    });
    const formattedAge = formatCurrentAge(ageParts, { includeHours: true });
    const horseType = getHorseTypeLabel({
      gender: data.gender,
      birth_date: data.birth_date,
      birth_at: data.birth_at,
      is_gelded: data.is_gelded,
      breeding_role: data.breeding_role,
    });
    const badgeProps = getHorseTypeBadgeProps(horseType);
    return { formattedAge, horseType, badgeProps, hasBirthDate: !!data.birth_date };
  }, [data.gender, data.birth_date, data.birth_at, data.is_gelded, data.breeding_role]);

  // Extract time from birth_at for the time input
  const birthTime = useMemo(() => {
    if (!data.birth_at) return "";
    try {
      const date = new Date(data.birth_at);
      if (isNaN(date.getTime())) return "";
      return date.toISOString().slice(11, 16); // HH:mm format
    } catch {
      return "";
    }
  }, [data.birth_at]);

  // Combine birth_date and time into birth_at ISO timestamp
  const handleTimeChange = (time: string) => {
    if (!data.birth_date) {
      // If no date, just store the time for later
      onChange({ birth_at: time ? `1970-01-01T${time}:00Z` : "" });
      return;
    }
    
    if (time) {
      // Combine date + time into UTC ISO timestamp
      const isoString = `${data.birth_date}T${time}:00Z`;
      onChange({ birth_at: isoString });
    } else {
      onChange({ birth_at: "" });
    }
  };

  // Update birth_at when birth_date changes (if time already set)
  const handleBirthDateChange = (date: string) => {
    onChange({ birth_date: date });
    
    // If we have a time, update birth_at with new date
    if (birthTime && date) {
      const isoString = `${date}T${birthTime}:00Z`;
      onChange({ birth_at: isoString });
    } else if (!date) {
      onChange({ birth_at: "" });
    }
  };

  const handleCreate = async (formData: Record<string, string>) => {
    if (dialogType === "color") {
      return createColor(formData.name, formData.name_ar);
    } else if (dialogType === "breed") {
      return createBreed(formData.name, formData.name_ar);
    }
    return { data: null, error: new Error("Unknown type") };
  };

  const handleSuccess = (result: any) => {
    if (dialogType === "color" && result?.id) {
      onChange({ color_id: result.id });
    } else if (dialogType === "breed" && result?.id) {
      onChange({ breed_id: result.id });
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Horse Name (English) *</Label>
          <Input
            id="name"
            value={data.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="Enter horse name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="name_ar">Horse Name (Arabic)</Label>
          <Input
            id="name_ar"
            value={data.name_ar}
            onChange={(e) => onChange({ name_ar: e.target.value })}
            placeholder="أدخل اسم الحصان"
            dir="rtl"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Gender *</Label>
          <Select 
            value={data.gender} 
            onValueChange={(v: "male" | "female") => {
              // Reset gender-specific fields when gender changes
              const updates: Partial<HorseWizardData> = { gender: v };
              if (v === 'female') {
                updates.is_gelded = false;
              } else {
                updates.breeding_role = '';
              }
              onChange(updates);
            }}
          >
            <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male (Stallion/Colt)</SelectItem>
              <SelectItem value="female">Female (Mare/Filly)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Breed</Label>
          <div className="flex gap-2">
            <Select value={data.breed_id} onValueChange={(v) => onChange({ breed_id: v })}>
              <SelectTrigger className="flex-1"><SelectValue placeholder="Select breed" /></SelectTrigger>
              <SelectContent>
                {breeds.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button type="button" size="icon" variant="outline" onClick={() => setDialogType("breed")}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Color</Label>
          <div className="flex gap-2">
            <Select value={data.color_id} onValueChange={(v) => onChange({ color_id: v })}>
              <SelectTrigger className="flex-1"><SelectValue placeholder="Select color" /></SelectTrigger>
              <SelectContent>
                {colors.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button type="button" size="icon" variant="outline" onClick={() => setDialogType("color")}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Birth Date & Time Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="birth_date">Birth Date</Label>
          <Input 
            id="birth_date" 
            type="date" 
            value={data.birth_date} 
            onChange={(e) => handleBirthDateChange(e.target.value)} 
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="birth_time" className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Birth Time (Optional)
          </Label>
          <Input 
            id="birth_time" 
            type="time" 
            value={birthTime} 
            onChange={(e) => handleTimeChange(e.target.value)}
            disabled={!data.birth_date}
            placeholder="HH:MM"
          />
        </div>
      </div>

      {/* Live Age & Classification Preview */}
      {agePreview.hasBirthDate && (
        <div className="p-3 bg-muted/50 rounded-lg border border-border/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Current Age:</span>
              <span className="font-medium text-foreground">{agePreview.formattedAge}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Type:</span>
              <Badge className={agePreview.badgeProps.className}>
                {agePreview.badgeProps.label}
              </Badge>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="microchip">Microchip Number</Label>
          <Input id="microchip" value={data.microchip_number} onChange={(e) => onChange({ microchip_number: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="passport">Passport Number</Label>
          <Input id="passport" value={data.passport_number} onChange={(e) => onChange({ passport_number: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ueln">UELN</Label>
          <Input id="ueln" value={data.ueln} onChange={(e) => onChange({ ueln: e.target.value })} />
        </div>
      </div>

      {dialogType && (
        <AddMasterDataDialog
          open={!!dialogType}
          onOpenChange={() => setDialogType(null)}
          type={dialogType}
          onCreate={handleCreate}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
};
