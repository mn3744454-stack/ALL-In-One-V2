import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { useHorseMasterData } from "@/hooks/useHorseMasterData";
import { BreedPickerSheet } from "./BreedPickerSheet";
import { ColorPickerSheet } from "./ColorPickerSheet";
import { BilingualName } from "@/components/ui/BilingualName";
import type { HorseWizardData } from "../HorseWizard";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";

interface StepDetailsProps {
  data: HorseWizardData;
  onChange: (updates: Partial<HorseWizardData>) => void;
}

export const StepDetails = ({ data, onChange }: StepDetailsProps) => {
  const { t, dir } = useI18n();
  const isRTL = dir === 'rtl';
  const { colors, breeds, createBreed, createColor, deleteBreed, deleteColor } = useHorseMasterData();
  const [breedPickerOpen, setBreedPickerOpen] = useState(false);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);

  const selectedBreed = breeds.find((b) => b.id === data.breed_id) || null;
  const selectedColor = colors.find((c) => c.id === data.color_id) || null;

  return (
    <div className="space-y-6">
      {/* Breed & Color Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {isRTL ? 'السلالة واللون' : 'Breed & Color'}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t('horses.wizard.breed')}</Label>
            <button
              type="button"
              onClick={() => setBreedPickerOpen(true)}
              className={cn(
                "w-full min-h-10 px-3 py-2 rounded-md border bg-background text-sm flex items-center justify-between gap-2",
                "hover:bg-muted/40 transition-colors text-start"
              )}
            >
              {selectedBreed ? (
                <BilingualName name={selectedBreed.name} nameAr={selectedBreed.name_ar} inline primaryClassName="text-sm" />
              ) : (
                <span className="text-muted-foreground">{t('horses.wizard.chooseBreed')}</span>
              )}
              <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>
          </div>
          <div className="space-y-2">
            <Label>{t('horses.wizard.color')}</Label>
            <button
              type="button"
              onClick={() => setColorPickerOpen(true)}
              className={cn(
                "w-full min-h-10 px-3 py-2 rounded-md border bg-background text-sm flex items-center justify-between gap-2",
                "hover:bg-muted/40 transition-colors text-start"
              )}
            >
              {selectedColor ? (
                <BilingualName name={selectedColor.name} nameAr={selectedColor.name_ar} inline primaryClassName="text-sm" />
              ) : (
                <span className="text-muted-foreground">{t('horses.wizard.chooseColor')}</span>
              )}
              <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>
          </div>
        </div>
      </div>

      {/* Identification Numbers */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {isRTL ? 'أرقام التعريف' : 'Identification Numbers'}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="microchip">{t('horses.wizard.microchip')}</Label>
            <Input id="microchip" value={data.microchip_number} onChange={(e) => onChange({ microchip_number: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="passport">{t('horses.wizard.passport')}</Label>
            <Input id="passport" value={data.passport_number} onChange={(e) => onChange({ passport_number: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ueln">{t('horses.wizard.ueln')}</Label>
            <Input id="ueln" value={data.ueln} onChange={(e) => onChange({ ueln: e.target.value })} />
          </div>
        </div>
      </div>

      <BreedPickerSheet
        open={breedPickerOpen}
        onOpenChange={setBreedPickerOpen}
        selectedBreedId={data.breed_id}
        onBreedSelect={(id) => onChange({ breed_id: id })}
        breeds={breeds}
        createBreed={createBreed}
        deleteBreed={deleteBreed}
        onBreedDeleted={(id) => { if (data.breed_id === id) onChange({ breed_id: null }); }}
      />
      <ColorPickerSheet
        open={colorPickerOpen}
        onOpenChange={setColorPickerOpen}
        selectedColorId={data.color_id}
        onColorSelect={(id) => onChange({ color_id: id })}
        colors={colors}
        createColor={createColor}
        deleteColor={deleteColor}
        onColorDeleted={(id) => { if (data.color_id === id) onChange({ color_id: null }); }}
      />
    </div>
  );
};
