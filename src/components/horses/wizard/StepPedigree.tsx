import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { HorseWizardData } from "../HorseWizard";
import { useI18n } from "@/i18n";

interface StepPedigreeProps {
  data: HorseWizardData;
  onChange: (updates: Partial<HorseWizardData>) => void;
}

export const StepPedigree = ({ data, onChange }: StepPedigreeProps) => {
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      <div className="p-4 border rounded-xl">
        <h4 className="font-semibold text-navy mb-4">{t('horses.wizard.motherSection')}</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t('horses.wizard.motherNameEn')}</Label>
            <Input value={data.mother_name} onChange={(e) => onChange({ mother_name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>{t('horses.wizard.motherNameAr')}</Label>
            <Input value={data.mother_name_ar} onChange={(e) => onChange({ mother_name_ar: e.target.value })} dir="rtl" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="space-y-2">
            <Label>{t('horses.wizard.maternalGrandmother')}</Label>
            <Input value={data.maternal_grandmother} onChange={(e) => onChange({ maternal_grandmother: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>{t('horses.wizard.maternalGrandfather')}</Label>
            <Input value={data.maternal_grandfather} onChange={(e) => onChange({ maternal_grandfather: e.target.value })} />
          </div>
        </div>
      </div>

      <div className="p-4 border rounded-xl">
        <h4 className="font-semibold text-navy mb-4">{t('horses.wizard.fatherSection')}</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t('horses.wizard.fatherNameEn')}</Label>
            <Input value={data.father_name} onChange={(e) => onChange({ father_name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>{t('horses.wizard.fatherNameAr')}</Label>
            <Input value={data.father_name_ar} onChange={(e) => onChange({ father_name_ar: e.target.value })} dir="rtl" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="space-y-2">
            <Label>{t('horses.wizard.paternalGrandmother')}</Label>
            <Input value={data.paternal_grandmother} onChange={(e) => onChange({ paternal_grandmother: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>{t('horses.wizard.paternalGrandfather')}</Label>
            <Input value={data.paternal_grandfather} onChange={(e) => onChange({ paternal_grandfather: e.target.value })} />
          </div>
        </div>
      </div>
    </div>
  );
};
