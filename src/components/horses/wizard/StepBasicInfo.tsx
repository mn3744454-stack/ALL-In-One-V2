import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Clock, AlertTriangle, Info, ExternalLink } from "lucide-react";
import { useState, useMemo, useCallback, useEffect } from "react";
import type { HorseWizardData } from "../HorseWizard";
import { 
  getCurrentAgeParts, 
  formatCurrentAge, 
  getHorseTypeLabel, 
  getHorseTypeBadgeProps,
  getRecommendedClassification,
  getRecommendedAgeCategory,
  isAdultHorse,
  getPonyBadgeProps,
  HORSE_AGE_THRESHOLD_YEARS,
} from "@/lib/horseClassification";
import type { AgeCategory } from "@/lib/horseClassification";
import { useI18n } from "@/i18n";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface StepBasicInfoProps {
  data: HorseWizardData;
  onChange: (updates: Partial<HorseWizardData>) => void;
}

export const StepBasicInfo = ({ data, onChange }: StepBasicInfoProps) => {
  const { t, dir } = useI18n();
  const isRTL = dir === 'rtl';
  const [geldingConfirmOpen, setGeldingConfirmOpen] = useState(false);
  const [stallionConfirmOpen, setStallionConfirmOpen] = useState(false);
  const [broodmareConfirmOpen, setBroodmareConfirmOpen] = useState(false);
  const [learnMoreOpen, setLearnMoreOpen] = useState(false);

  // Auto-fill age_category from DOB when user hasn't explicitly chosen yet
  const [userExplicitlyChoseAge, setUserExplicitlyChoseAge] = useState(!!data.age_category);

  // Calculate live age and classification
  const classificationInput = useMemo(() => ({
    gender: data.gender,
    birth_date: data.birth_date,
    birth_at: data.birth_at,
    is_gelded: data.is_gelded,
    breeding_role: data.breeding_role,
    is_pony: data.is_pony,
    age_category: data.age_category,
  }), [data.gender, data.birth_date, data.birth_at, data.is_gelded, data.breeding_role, data.is_pony, data.age_category]);

  const classificationInfo = useMemo(() => {
    const ageParts = getCurrentAgeParts(classificationInput);
    const formattedAge = formatCurrentAge(ageParts, { includeHours: true });
    const actualType = getHorseTypeLabel(classificationInput);
    const recommendedType = getRecommendedClassification(classificationInput);
    const recommendedAgeCategory = getRecommendedAgeCategory(classificationInput);
    const actualBadge = getHorseTypeBadgeProps(actualType);
    const recommendedBadge = getHorseTypeBadgeProps(recommendedType);
    const isAdult = isAdultHorse(classificationInput);
    
    // Mismatch: user's age_category differs from DOB recommendation
    const hasAgeMismatch = !!data.birth_date && !!data.age_category && !!recommendedAgeCategory 
      && data.age_category !== recommendedAgeCategory;
    
    // Breeding designation on young horse
    const hasBreedingMismatch = !isAdult && (
      data.breeding_role === 'breeding_stallion' || 
      data.breeding_role === 'broodmare'
    );
    
    const hasMismatch = hasAgeMismatch || hasBreedingMismatch;
    
    return { 
      formattedAge, actualType, recommendedType, recommendedAgeCategory,
      actualBadge, recommendedBadge,
      hasBirthDate: !!data.birth_date, isAdult, hasMismatch, hasAgeMismatch, hasBreedingMismatch, ageParts 
    };
  }, [classificationInput, data.birth_date, data.age_category, data.breeding_role]);

  // Auto-select age_category from DOB when user hasn't explicitly chosen
  useEffect(() => {
    if (!userExplicitlyChoseAge && data.birth_date && data.gender) {
      const recommended = getRecommendedAgeCategory({ gender: data.gender, birth_date: data.birth_date });
      if (recommended && data.age_category !== recommended) {
        onChange({ age_category: recommended });
      }
    }
  }, [data.birth_date, data.gender, userExplicitlyChoseAge]);

  // Extract time from birth_at for the time input
  const birthTime = useMemo(() => {
    if (!data.birth_at) return "";
    try {
      const date = new Date(data.birth_at);
      if (isNaN(date.getTime())) return "";
      return date.toISOString().slice(11, 16);
    } catch {
      return "";
    }
  }, [data.birth_at]);

  const handleTimeChange = (time: string) => {
    if (!data.birth_date) {
      onChange({ birth_at: time ? `1970-01-01T${time}:00Z` : "" });
      return;
    }
    if (time) {
      onChange({ birth_at: `${data.birth_date}T${time}:00Z` });
    } else {
      onChange({ birth_at: "" });
    }
  };

  const handleBirthDateChange = (date: string) => {
    onChange({ birth_date: date });
    if (birthTime && date) {
      onChange({ birth_at: `${date}T${birthTime}:00Z` });
    } else if (!date) {
      onChange({ birth_at: "" });
    }
  };

  const handleGenderChange = useCallback((v: "male" | "female") => {
    const updates: Partial<HorseWizardData> = { gender: v };
    if (v === 'female') {
      updates.is_gelded = false;
      if (data.breeding_role === 'breeding_stallion') {
        updates.breeding_role = '';
      }
    } else {
      if (data.breeding_role === 'broodmare') {
        updates.breeding_role = '';
      }
      updates.is_pregnant = false;
      updates.pregnancy_months = 0;
    }
    // Reset age_category to DOB-recommended value for new gender
    const recommended = getRecommendedAgeCategory({ gender: v, birth_date: data.birth_date });
    updates.age_category = recommended || '';
    setUserExplicitlyChoseAge(false);
    onChange(updates);
  }, [data.breeding_role, data.birth_date, onChange]);

  const handleAgeCategoryChange = (value: string) => {
    if (value) {
      setUserExplicitlyChoseAge(true);
      onChange({ age_category: value as AgeCategory });
    }
  };

  // Gelding toggle with Tier 4 confirmation
  const handleGeldingToggle = (checked: boolean) => {
    if (checked) {
      setGeldingConfirmOpen(true);
    } else {
      // In creation mode, allow unchecking before save
      onChange({ is_gelded: false });
    }
  };

  const confirmGelding = () => {
    onChange({ 
      is_gelded: true, 
      breeding_role: '' // Gelding always removes breeding designation
    });
    setGeldingConfirmOpen(false);
  };

  // Stallion toggle with Tier 3 confirmation
  const handleStallionToggle = (checked: boolean) => {
    if (checked) {
      setStallionConfirmOpen(true);
    } else {
      onChange({ breeding_role: '' });
    }
  };

  const confirmStallion = () => {
    onChange({ breeding_role: 'breeding_stallion' });
    setStallionConfirmOpen(false);
  };

  // Broodmare toggle with Tier 3 confirmation
  const handleBroodmareToggle = (checked: boolean) => {
    if (checked) {
      setBroodmareConfirmOpen(true);
    } else {
      onChange({ breeding_role: '', is_pregnant: false, pregnancy_months: 0 });
    }
  };

  const confirmBroodmare = () => {
    onChange({ breeding_role: 'broodmare' });
    setBroodmareConfirmOpen(false);
  };

  // Determine conditional visibility
  const showGelding = data.gender === 'male';
  const showStallion = data.gender === 'male' && !data.is_gelded;
  const showBroodmare = data.gender === 'female';
  const showPregnancy = data.gender === 'female' && data.breeding_role === 'broodmare';

  return (
    <div className="space-y-6">
      {/* ========== SECTION A: Identity (الهوية) ========== */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {isRTL ? 'الهوية' : 'Identity'}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t('horses.wizard.name')} *</Label>
            <Input
              id="name"
              value={data.name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder={t('horses.wizard.namePlaceholder')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name_ar">{t('horses.wizard.nameAr')}</Label>
            <Input
              id="name_ar"
              value={data.name_ar}
              onChange={(e) => onChange({ name_ar: e.target.value })}
              placeholder={t('horses.wizard.nameArPlaceholder')}
              dir="rtl"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>{isRTL ? 'الجنس' : 'Sex'} *</Label>
          <Select 
            value={data.gender} 
            onValueChange={(v: "male" | "female") => handleGenderChange(v)}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('horses.wizard.selectGender')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">{isRTL ? 'ذكر' : 'Male'}</SelectItem>
              <SelectItem value="female">{isRTL ? 'أنثى' : 'Female'}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Age-Stage Selector — appears after sex */}
        {data.gender && (
          <div className="space-y-2">
            <Label>{isRTL ? 'المرحلة العمرية' : 'Age Stage'} *</Label>
            <ToggleGroup
              type="single"
              value={data.age_category || ''}
              onValueChange={handleAgeCategoryChange}
              className="justify-start gap-0 border rounded-lg p-1 bg-muted/30"
            >
              {data.gender === 'male' ? (
                <>
                  <ToggleGroupItem
                    value="colt"
                    className="flex-1 data-[state=on]:bg-background data-[state=on]:shadow-sm rounded-md text-sm px-4 py-2"
                  >
                    {isRTL ? 'مهر' : 'Colt'}
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="horse"
                    className="flex-1 data-[state=on]:bg-background data-[state=on]:shadow-sm rounded-md text-sm px-4 py-2"
                  >
                    {isRTL ? 'حصان' : 'Horse'}
                  </ToggleGroupItem>
                </>
              ) : (
                <>
                  <ToggleGroupItem
                    value="filly"
                    className="flex-1 data-[state=on]:bg-background data-[state=on]:shadow-sm rounded-md text-sm px-4 py-2"
                  >
                    {isRTL ? 'مهرة' : 'Filly'}
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="mare"
                    className="flex-1 data-[state=on]:bg-background data-[state=on]:shadow-sm rounded-md text-sm px-4 py-2"
                  >
                    {isRTL ? 'فرس' : 'Mare'}
                  </ToggleGroupItem>
                </>
              )}
            </ToggleGroup>
            <p className="text-xs text-muted-foreground">
              {isRTL ? 'يتم التحديد تلقائياً من تاريخ الميلاد — يمكنك التغيير يدوياً' : 'Auto-selected from birth date — you can change manually'}
            </p>
          </div>
        )}
      </div>

      {/* ========== SECTION B: Age & Stage (العمر والمرحلة) ========== */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {isRTL ? 'العمر والمرحلة العمرية' : 'Age & Stage'}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="birth_date">{isRTL ? 'تاريخ الميلاد' : 'Birth Date'}</Label>
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
              {isRTL ? 'وقت الميلاد (اختياري)' : 'Birth Time (Optional)'}
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

        {/* Recommendation Banner */}
        {classificationInfo.hasBirthDate && (
          <div className={`p-3 rounded-lg border transition-colors ${
            classificationInfo.hasMismatch 
              ? 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800' 
              : 'bg-muted/50 border-border/50'
          }`}>
            <div className="flex flex-col gap-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {isRTL ? 'العمر الحالي:' : 'Current Age:'}
                  </span>
                  <span className="font-medium text-foreground">{classificationInfo.formattedAge}</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-muted-foreground">
                    {isRTL ? 'التصنيف:' : 'Classification:'}
                  </span>
                  <Badge className={classificationInfo.actualBadge.className}>
                    {isRTL ? classificationInfo.actualBadge.labelAr : classificationInfo.actualBadge.label}
                  </Badge>
                  {data.is_pony && (
                    <Badge className={getPonyBadgeProps().className}>
                      {isRTL ? 'بوني' : 'Pony'}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Age-stage mismatch warning */}
              {classificationInfo.hasAgeMismatch && classificationInfo.recommendedAgeCategory && (
                <div className="flex items-start gap-2 text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <p className="text-xs">
                    {isRTL 
                      ? `وفقاً لتاريخ الميلاد والمعايير العالمية (FEI, WAHO)، التصنيف الموصى به هو "${getHorseTypeBadgeProps(classificationInfo.recommendedAgeCategory).labelAr}". لقد اخترت "${getHorseTypeBadgeProps(data.age_category as any).labelAr}".`
                      : `Based on birth date and global standards (FEI, WAHO), the recommended classification is "${getHorseTypeBadgeProps(classificationInfo.recommendedAgeCategory).label}". You selected "${getHorseTypeBadgeProps(data.age_category as any).label}".`
                    }
                  </p>
                </div>
              )}
              
              {/* Breeding designation on young horse warning */}
              {classificationInfo.hasBreedingMismatch && !classificationInfo.hasAgeMismatch && (
                <div className="flex items-start gap-2 text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <p className="text-xs">
                    {isRTL 
                      ? `وفقاً للمعايير العالمية المعتمدة (FEI, WAHO)، الخيول التي تقل أعمارها عن ${HORSE_AGE_THRESHOLD_YEARS} سنوات تُصنف كـ ${data.gender === 'male' ? 'مهر' : 'مهرة'}. لقد اخترت تصنيفاً مختلفاً.`
                      : `According to global equine standards (FEI, WAHO), horses under ${HORSE_AGE_THRESHOLD_YEARS} years are classified as ${data.gender === 'male' ? 'Colt' : 'Filly'}. You have chosen a different designation.`
                    }
                  </p>
                </div>
              )}
              
              {/* Learn More */}
              <button 
                type="button"
                onClick={() => setLearnMoreOpen(!learnMoreOpen)}
                className="flex items-center gap-1 text-xs text-primary hover:underline self-start min-h-[44px] py-2"
              >
                <Info className="w-3.5 h-3.5" />
                {isRTL ? 'معرفة المزيد عن معايير التصنيف' : 'Learn more about classification standards'}
              </button>
              
              {learnMoreOpen && (
                <div className="p-3 bg-background/50 rounded-md border border-border/50 space-y-2 text-xs text-muted-foreground">
                  <p>
                    {isRTL 
                      ? `توصية المنصة مبنية على المعايير العالمية المعتمدة. عتبة البلوغ هي ${HORSE_AGE_THRESHOLD_YEARS} سنوات. القرار النهائي يبقى بيدك.`
                      : `Platform recommendation is based on recognized global equine standards. The maturity threshold is ${HORSE_AGE_THRESHOLD_YEARS} years. The final decision remains yours.`
                    }
                  </p>
                  <div className="flex flex-col gap-1">
                    <a href="https://www.waho.org/registrations" target="_blank" rel="noopener noreferrer" 
                       className="flex items-center gap-1 text-primary hover:underline min-h-[44px] py-1">
                      <ExternalLink className="w-3 h-3" />
                      WAHO — World Arabian Horse Organization
                    </a>
                    <a href="https://www.fei.org/fei/regulations/general-rules" target="_blank" rel="noopener noreferrer"
                       className="flex items-center gap-1 text-primary hover:underline min-h-[44px] py-1">
                      <ExternalLink className="w-3 h-3" />
                      FEI — General Regulations
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ========== SECTION C: Status & Designation (الحالة التناسلية وتصنيف الحجم) ========== */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {isRTL ? 'الحالة التناسلية وتصنيف الحجم' : 'Status & Designation'}
        </h3>

        {/* Gelding Toggle — Male only */}
        {showGelding && (
          <div className="p-4 bg-muted/50 rounded-xl border border-border/50">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5 flex-1 pe-4">
                <Label htmlFor="gelded" className="text-sm font-medium">
                  {isRTL ? 'هل هو مخصي؟' : 'Is Gelded?'}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {isRTL ? 'الخصي لا يمكن التراجع عنه وسيستبعد الخيل من التربية' : 'Gelding is irreversible and will exclude from breeding'}
                </p>
              </div>
              <Switch 
                id="gelded" 
                checked={data.is_gelded} 
                onCheckedChange={handleGeldingToggle} 
              />
            </div>
          </div>
        )}

        {/* Stallion Toggle — Male, not gelded */}
        {showStallion && (
          <div className="p-4 bg-muted/50 rounded-xl border border-border/50">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5 flex-1 pe-4">
                <Label htmlFor="stallion" className="text-sm font-medium">
                  {isRTL ? 'هل هو فحل؟' : 'Is Breeding Stallion?'}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {isRTL ? 'تعيين كفحل للتربية — سيظهر في قوائم الفحول' : 'Designate as breeding stallion — will appear in sire pools'}
                </p>
              </div>
              <Switch 
                id="stallion" 
                checked={data.breeding_role === 'breeding_stallion'} 
                onCheckedChange={handleStallionToggle} 
              />
            </div>
          </div>
        )}

        {/* Broodmare Toggle — Female only */}
        {showBroodmare && (
          <div className="p-4 bg-muted/50 rounded-xl border border-border/50">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5 flex-1 pe-4">
                <Label htmlFor="broodmare" className="text-sm font-medium">
                  {isRTL ? 'هل هي فرس تربية (رمكة)؟' : 'Is Broodmare?'}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {isRTL ? 'تعيين كفرس تربية — ستظهر في قوائم الأمهات' : 'Designate as broodmare — will appear in mare pools'}
                </p>
              </div>
              <Switch 
                id="broodmare" 
                checked={data.breeding_role === 'broodmare'} 
                onCheckedChange={handleBroodmareToggle} 
              />
            </div>
          </div>
        )}

        {/* Pregnancy Section — Only for Broodmares */}
        {showPregnancy && (
          <div className="p-4 bg-muted/50 rounded-xl border border-border/50 space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="pregnant">
                {isRTL ? 'هل هي حامل؟' : 'Is Pregnant?'}
              </Label>
              <Switch 
                id="pregnant" 
                checked={data.is_pregnant} 
                onCheckedChange={(c) => onChange({ is_pregnant: c })} 
              />
            </div>
            {data.is_pregnant && (
              <div className="space-y-2">
                <Label>
                  {isRTL ? 'أشهر الحمل' : 'Pregnancy Months'}
                </Label>
                <Input 
                  type="number" 
                  min={1} 
                  max={12} 
                  value={data.pregnancy_months || ""} 
                  onChange={(e) => onChange({ pregnancy_months: parseInt(e.target.value) || 0 })} 
                />
              </div>
            )}
          </div>
        )}

        {/* Pony Toggle — Always visible after sex selection */}
        <div className="p-4 bg-muted/50 rounded-xl border border-border/50">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5 flex-1 pe-4">
              <Label htmlFor="pony" className="text-sm font-medium">
                {isRTL ? 'هل هذا الخيل من فئة البوني؟' : 'Is this horse a pony?'}
              </Label>
              <p className="text-xs text-muted-foreground">
                {isRTL ? 'الخيل التي يقل ارتفاعها عن 148 سم عند الحارك' : 'Horses under 148cm at the withers'}
              </p>
            </div>
            <Switch 
              id="pony" 
              checked={data.is_pony} 
              onCheckedChange={(checked) => onChange({ is_pony: checked })} 
            />
          </div>
        </div>
      </div>

      {/* ========== CONFIRMATION DIALOGS ========== */}
      
      {/* Gelding Confirmation — Tier 4 (Irreversible) */}
      <AlertDialog open={geldingConfirmOpen} onOpenChange={setGeldingConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              {isRTL ? 'تأكيد الخصي' : 'Confirm Gelding'}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                {isRTL 
                  ? 'الخصي لا يمكن التراجع عنه. بمجرد الحفظ:' 
                  : 'Gelding is irreversible. Once saved:'}
              </p>
              <ul className="list-disc ps-5 space-y-1 text-sm">
                <li>
                  {isRTL 
                    ? 'سيتم استبعاد هذا الخيل نهائياً من جميع أسطح التربية'
                    : 'This horse will be permanently excluded from all breeding surfaces'}
                </li>
                <li>
                  {isRTL 
                    ? 'لا يمكن إلغاء هذا التصنيف لاحقاً'
                    : 'This designation cannot be undone later'}
                </li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isRTL ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmGelding} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isRTL ? 'تأكيد — مخصي' : 'Confirm — Gelded'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Stallion Confirmation — Tier 3 (High-impact) */}
      <AlertDialog open={stallionConfirmOpen} onOpenChange={setStallionConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isRTL ? 'تأكيد تعيين فحل' : 'Confirm Stallion Designation'}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                {isRTL 
                  ? 'بتعيين هذا الخيل كفحل:' 
                  : 'By designating this horse as a breeding stallion:'}
              </p>
              <ul className="list-disc ps-5 space-y-1 text-sm">
                <li>
                  {isRTL 
                    ? 'سيظهر في قوائم الفحول في جميع أسطح التربية'
                    : 'It will appear in sire pools across all breeding surfaces'}
                </li>
                <li>
                  {isRTL 
                    ? 'إزالة هذا التعيين لاحقاً قد تكون مقيدة إذا وُجدت سجلات تربية'
                    : 'Removing this designation later may be restricted if breeding records exist'}
                </li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isRTL ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmStallion}>
              {isRTL ? 'تأكيد — فحل' : 'Confirm — Stallion'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Broodmare Confirmation — Tier 3 (High-impact) */}
      <AlertDialog open={broodmareConfirmOpen} onOpenChange={setBroodmareConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isRTL ? 'تأكيد تعيين فرس تربية (رمكة)' : 'Confirm Broodmare Designation'}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                {isRTL 
                  ? 'بتعيين هذه الفرس كفرس تربية (رمكة):' 
                  : 'By designating this mare as a broodmare:'}
              </p>
              <ul className="list-disc ps-5 space-y-1 text-sm">
                <li>
                  {isRTL 
                    ? 'ستظهر في قوائم الأمهات في جميع أسطح التربية'
                    : 'She will appear in mare pools across all breeding surfaces'}
                </li>
                <li>
                  {isRTL 
                    ? 'إزالة هذا التعيين لاحقاً قد تكون مقيدة إذا وُجدت سجلات تربية'
                    : 'Removing this designation later may be restricted if breeding records exist'}
                </li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isRTL ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBroodmare}>
              {isRTL ? 'تأكيد — فرس تربية (رمكة)' : 'Confirm — Broodmare'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
