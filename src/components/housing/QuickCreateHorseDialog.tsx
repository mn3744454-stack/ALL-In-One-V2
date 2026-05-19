import { useMemo, useState } from "react";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SafeFormDialog } from "@/components/ui/safe-form-dialog";
import { MissingRequirementsBar } from "@/components/ui/missing-requirements-bar";
import { useDirtyForm } from "@/hooks/useDirtyForm";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ChevronDown, Heart, Info, Loader2 } from "lucide-react";
import { BreedPickerSheet } from "@/components/horses/wizard/BreedPickerSheet";
import { ColorPickerSheet } from "@/components/horses/wizard/ColorPickerSheet";
import { BilingualName } from "@/components/ui/BilingualName";
import { useHorseMasterData, type HorseBreed, type HorseColor } from "@/hooks/useHorseMasterData";

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
  /** When true, shows only name + gender fields (breed/color/DOB hidden) */
  minimal?: boolean;
}

const emptyForm = (gender: "" | "male" | "female" = "") => ({
  name: "",
  name_ar: "",
  gender,
  birth_date: "",
  breed_id: "",
  color_id: "",
});

export function QuickCreateHorseDialog({ open, onOpenChange, onCreated, defaults, minimal }: QuickCreateHorseDialogProps) {
  const { t, dir } = useI18n();
  const { activeTenant } = useTenant();
  const [saving, setSaving] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [form, setForm] = useState(() => emptyForm(defaults?.gender || ""));
  const [breedPickerOpen, setBreedPickerOpen] = useState(false);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [selectedBreed, setSelectedBreed] = useState<HorseBreed | null>(null);
  const [selectedColor, setSelectedColor] = useState<HorseColor | null>(null);
  const { breeds, colors, createBreed, createColor, deleteBreed, deleteColor } = useHorseMasterData();

  const genderLocked = !!defaults?.gender;

  const dirtyState = useMemo(
    () => ({
      name: form.name,
      name_ar: form.name_ar,
      gender: genderLocked ? "" : form.gender,
      birth_date: form.birth_date,
      breed_id: form.breed_id,
      color_id: form.color_id,
    }),
    [form, genderLocked],
  );
  const { isDirty, resetBaseline } = useDirtyForm(dirtyState, open);

  const missingIssues = useMemo(() => {
    const issues: string[] = [];
    if (!form.name.trim()) issues.push(t("common.validation.enterHorseName"));
    if (!genderLocked && !form.gender) issues.push(t("common.validation.selectGender"));
    return issues;
  }, [form.name, form.gender, genderLocked, t]);

  const canSubmit = !!form.name.trim() && !!form.gender;

  const resetForm = () => {
    setForm(emptyForm(defaults?.gender || ""));
    setSelectedBreed(null);
    setSelectedColor(null);
    setAttemptedSubmit(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (next) {
      onOpenChange(true);
      return;
    }
    if (saving) return;
    onOpenChange(false);
    setTimeout(resetForm, 0);
  };

  const handleBreedSelect = (breedId: string, breed?: HorseBreed) => {
    setForm((f) => ({ ...f, breed_id: breedId }));
    if (breed) setSelectedBreed(breed);
  };

  const handleColorSelect = (colorId: string, color?: HorseColor) => {
    setForm((f) => ({ ...f, color_id: colorId }));
    if (color) setSelectedColor(color);
  };

  const handleSubmit = async () => {
    setAttemptedSubmit(true);
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
      resetBaseline(emptyForm(defaults?.gender || ""));
      resetForm();
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
    <SafeFormDialog
      open={open}
      onOpenChange={handleOpenChange}
      isDirty={isDirty && !saving}
      className={minimal ? "sm:max-w-lg" : "sm:max-w-2xl"}
      dir={dir}
    >
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

          {/* Gender row — always visible */}
          <div className={minimal ? "" : "grid grid-cols-1 sm:grid-cols-2 gap-4"}>
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
            {/* DOB — only in full mode */}
            {!minimal && (
              <div className="space-y-2">
                <Label htmlFor="qc-dob">{t('horses.wizard.birthDate')}</Label>
                <Input
                  id="qc-dob"
                  type="date"
                  value={form.birth_date}
                  onChange={(e) => setForm(f => ({ ...f, birth_date: e.target.value }))}
                />
              </div>
            )}
          </div>

          {/* Breed + Color — only in full mode */}
          {!minimal && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('horses.wizard.breed')}</Label>
                <button
                  type="button"
                  onClick={() => setBreedPickerOpen(true)}
                  className="flex h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background hover:bg-accent/40 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <span className={`min-w-0 truncate text-start ${selectedBreed ? "" : "text-muted-foreground"}`}>
                    {selectedBreed ? (
                      <BilingualName name={selectedBreed.name} nameAr={selectedBreed.name_ar} inline />
                    ) : (
                      t('horses.wizard.chooseBreed')
                    )}
                  </span>
                  <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
                </button>
              </div>
              <div className="space-y-2">
                <Label>{t('horses.wizard.color')}</Label>
                <button
                  type="button"
                  onClick={() => setColorPickerOpen(true)}
                  className="flex h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background hover:bg-accent/40 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <span className={`min-w-0 truncate text-start ${selectedColor ? "" : "text-muted-foreground"}`}>
                    {selectedColor ? (
                      <BilingualName name={selectedColor.name} nameAr={selectedColor.name_ar} inline />
                    ) : (
                      t('horses.wizard.chooseColor')
                    )}
                  </span>
                  <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
                </button>
              </div>
            </div>
          )}

          {/* Amber hint */}
          <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/30">
            <Info className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-700 dark:text-amber-400 text-xs">
              {t('housing.quickCreate.completeHint')}
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="gap-2 flex-col sm:flex-row">
          <MissingRequirementsBar
            issues={attemptedSubmit ? missingIssues : []}
            attempted={attemptedSubmit}
            className="flex-1 w-full sm:w-auto"
          />
          <div className="flex gap-2 sm:ms-auto">
            <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={saving}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t('common.save')}
            </Button>
          </div>
        </DialogFooter>

        {!minimal && (
          <>
            <BreedPickerSheet
              open={breedPickerOpen}
              onOpenChange={setBreedPickerOpen}
              selectedBreedId={form.breed_id || null}
              onBreedSelect={handleBreedSelect}
              breeds={breeds}
              createBreed={createBreed}
              deleteBreed={deleteBreed}
              onBreedDeleted={(id) => { if (form.breed_id === id) setForm((f) => ({ ...f, breed_id: "" })); }}
            />
            <ColorPickerSheet
              open={colorPickerOpen}
              onOpenChange={setColorPickerOpen}
              selectedColorId={form.color_id || null}
              onColorSelect={handleColorSelect}
              colors={colors}
              createColor={createColor}
              deleteColor={deleteColor}
              onColorDeleted={(id) => { if (form.color_id === id) setForm((f) => ({ ...f, color_id: "" })); }}
            />
          </>
        )}
    </SafeFormDialog>
  );
}
