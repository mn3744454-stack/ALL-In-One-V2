import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { HorseWizardData } from "../HorseWizard";
import { useI18n } from "@/i18n";

interface StepPhysicalProps {
  data: HorseWizardData;
  onChange: (updates: Partial<HorseWizardData>) => void;
  mode?: "create" | "edit";
}

export const StepPhysical = ({ data, onChange, mode = "create" }: StepPhysicalProps) => {
  const { t, dir } = useI18n();
  const isRTL = dir === "rtl";
  const isEdit = mode === "edit";

  // Phase 1.e.f.8.1.4.d.3.fix — height and weight are NOT persisted by
  // update_horse_identity. In edit mode we render them as read-only so the
  // user cannot type values that would silently not be saved. Growth /
  // measurements history will be managed from its own future section.
  const nonIdentityNote = isRTL
    ? "هذه البيانات ستُدار لاحقًا من قسم مخصص، ولا يتم حفظها ضمن تعديل هوية الخيل."
    : "These details will be managed from a dedicated section later and are not saved as part of horse identity editing.";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t('horses.wizard.height')}</Label>
          <Input
            type="number"
            value={data.height}
            onChange={(e) => onChange({ height: e.target.value })}
            placeholder={t('horses.wizard.heightPlaceholder')}
            disabled={isEdit}
            readOnly={isEdit}
          />
        </div>
        <div className="space-y-2">
          <Label>{t('horses.wizard.weight')}</Label>
          <Input
            type="number"
            value={data.weight}
            onChange={(e) => onChange({ weight: e.target.value })}
            placeholder={t('horses.wizard.weightPlaceholder')}
            disabled={isEdit}
            readOnly={isEdit}
          />
        </div>
      </div>
      {isEdit && (
        <p className="text-xs text-muted-foreground -mt-1">{nonIdentityNote}</p>
      )}

      <div className="space-y-2">
        <Label>{t('horses.wizard.maneMarks')}</Label>
        <Textarea value={data.mane_marks} onChange={(e) => onChange({ mane_marks: e.target.value })} placeholder={t('horses.wizard.maneMarksPlaceholder')} />
      </div>

      <div className="space-y-2">
        <Label>{t('horses.wizard.bodyMarks')}</Label>
        <Textarea value={data.body_marks} onChange={(e) => onChange({ body_marks: e.target.value })} placeholder={t('horses.wizard.bodyMarksPlaceholder')} />
      </div>

      <div className="space-y-2">
        <Label>{t('horses.wizard.legsMarks')}</Label>
        <Textarea value={data.legs_marks} onChange={(e) => onChange({ legs_marks: e.target.value })} placeholder={t('horses.wizard.legsMarksPlaceholder')} />
      </div>

      <div className="space-y-2">
        <Label>{t('horses.wizard.distinctiveMarks')}</Label>
        <Textarea value={data.distinctive_marks_notes} onChange={(e) => onChange({ distinctive_marks_notes: e.target.value })} placeholder={t('horses.wizard.additionalNotesPlaceholder')} />
      </div>
    </div>
  );
};
