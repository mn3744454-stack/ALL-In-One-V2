import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useI18n } from "@/i18n";
import { useTenant } from "@/contexts/TenantContext";
import { useHorseMasterData } from "@/hooks/useHorseMasterData";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Heart, Info, Loader2 } from "lucide-react";

export interface QuickCreateHorseDefaults {
  gender?: "male" | "female";
  age_category?: string;
  breeding_role?: string;
}

interface QuickCreateHorseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (horse: { id: string; name: string; name_ar?: string | null; gender: string }) => void;
  defaults?: QuickCreateHorseDefaults;
}

export function QuickCreateHorseDialog({ open, onOpenChange, onCreated, defaults }: QuickCreateHorseDialogProps) {
  const { t } = useI18n();
  const { activeTenant } = useTenant();
  const { colors, breeds } = useHorseMasterData();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    name_ar: "",
    gender: (defaults?.gender || "") as "" | "male" | "female",
    birth_date: "",
    breed_id: "",
    color_id: "",
  });

  const genderLocked = !!defaults?.gender;

  const canSubmit = form.name.trim() && form.gender;

  const handleClose = () => {
    if (saving) return;
    setForm({ name: "", name_ar: "", gender: defaults?.gender || "", birth_date: "", breed_id: "", color_id: "" });
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!canSubmit || !activeTenant?.tenant_id) return;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("horses")
        .insert({
          name: form.name.trim(),
          name_ar: form.name_ar.trim() || null,
          gender: form.gender,
          birth_date: form.birth_date || null,
          breed_id: form.breed_id || null,
          color_id: form.color_id || null,
          status: "intake_draft",
          tenant_id: activeTenant.tenant_id,
          ...(defaults?.age_category ? { age_category: defaults.age_category } : {}),
          ...(defaults?.breeding_role ? { breeding_role: defaults.breeding_role } : {}),
        })
        .select("id, name, name_ar, gender")
        .single();

      if (error) throw error;

      toast.success(t('horses.addSuccess').replace('{{name}}', data.name));
      setForm({ name: "", name_ar: "", gender: "", birth_date: "", breed_id: "", color_id: "" });
      onOpenChange(false);
      onCreated(data);
    } catch (err: any) {
      console.error("Quick-create horse failed:", err);
      toast.error(t('horses.addError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-primary" />
            {t('horses.wizard.addTitle')}
          </DialogTitle>
          <DialogDescription>
            {t('housing.quickCreate.desc')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Row 1: Names */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="qc-name">{t('horses.wizard.name')} *</Label>
              <Input
                id="qc-name"
                dir="ltr"
                placeholder="Enter horse name"
                value={form.name}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qc-name-ar">{t('horses.wizard.nameAr')}</Label>
              <Input
                id="qc-name-ar"
                dir="rtl"
                placeholder="أدخل اسم الخيل"
                value={form.name_ar}
                onChange={(e) => setForm(f => ({ ...f, name_ar: e.target.value }))}
              />
            </div>
          </div>

          {/* Row 2: Gender + DOB */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('horses.wizard.gender')} *</Label>
              <Select
                value={form.gender}
                onValueChange={(v) => setForm(f => ({ ...f, gender: v as "male" | "female" }))}
                disabled={genderLocked}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('horses.wizard.gender')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">{t('horses.gender.male')}</SelectItem>
                  <SelectItem value="female">{t('horses.gender.female')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="qc-dob">{t('horses.wizard.birthDate')}</Label>
              <Input
                id="qc-dob"
                type="date"
                value={form.birth_date}
                onChange={(e) => setForm(f => ({ ...f, birth_date: e.target.value }))}
              />
            </div>
          </div>

          {/* Row 3: Breed + Color */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('horses.wizard.breed')}</Label>
              <Select
                value={form.breed_id}
                onValueChange={(v) => setForm(f => ({ ...f, breed_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('horses.wizard.selectBreed')} />
                </SelectTrigger>
                <SelectContent>
                  {breeds.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('horses.wizard.color')}</Label>
              <Select
                value={form.color_id}
                onValueChange={(v) => setForm(f => ({ ...f, color_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('horses.wizard.selectColor')} />
                </SelectTrigger>
                <SelectContent>
                  {colors.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Amber hint */}
          <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/30">
            <Info className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-700 dark:text-amber-400 text-xs">
              {t('housing.quickCreate.completeHint')}
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
