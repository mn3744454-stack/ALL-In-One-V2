import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Check, X } from "lucide-react";
import { useI18n } from "@/i18n";
import type { SelectedHorse } from "./HorseSelectionStep";

interface WalkInHorseFormProps {
  onSubmit: (horse: SelectedHorse) => void;
  onCancel: () => void;
}

export function WalkInHorseForm({ onSubmit, onCancel }: WalkInHorseFormProps) {
  const { t } = useI18n();
  const [formData, setFormData] = useState({
    name: "",
    passport_number: "",
    microchip: "",
    breed: "",
    color: "",
  });

  const handleSubmit = () => {
    if (!formData.name.trim()) return;

    const horse: SelectedHorse = {
      horse_type: 'walk_in',
      horse_name: formData.name.trim(),
      horse_data: {
        passport_number: formData.passport_number.trim() || undefined,
        microchip: formData.microchip.trim() || undefined,
        breed: formData.breed.trim() || undefined,
        color: formData.color.trim() || undefined,
      },
    };

    onSubmit(horse);
  };

  const isValid = formData.name.trim().length > 0;

  return (
    <Card className="p-4 space-y-4 border-primary/20">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Name - Required */}
        <div className="space-y-2">
          <Label htmlFor="horse-name">
            {t("laboratory.walkIn.horseName")} *
          </Label>
          <Input
            id="horse-name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder={t("laboratory.walkIn.horseNamePlaceholder")}
            autoFocus
          />
        </div>

        {/* Passport Number */}
        <div className="space-y-2">
          <Label htmlFor="passport">
            {t("laboratory.walkIn.passportNumber")}
          </Label>
          <Input
            id="passport"
            value={formData.passport_number}
            onChange={(e) => setFormData({ ...formData, passport_number: e.target.value })}
            placeholder={t("laboratory.walkIn.passportPlaceholder")}
          />
        </div>

        {/* Microchip */}
        <div className="space-y-2">
          <Label htmlFor="microchip">
            {t("laboratory.walkIn.microchip")}
          </Label>
          <Input
            id="microchip"
            value={formData.microchip}
            onChange={(e) => setFormData({ ...formData, microchip: e.target.value })}
            placeholder={t("laboratory.walkIn.microchipPlaceholder")}
          />
        </div>

        {/* Breed */}
        <div className="space-y-2">
          <Label htmlFor="breed">
            {t("laboratory.walkIn.breed")}
          </Label>
          <Input
            id="breed"
            value={formData.breed}
            onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
            placeholder={t("laboratory.walkIn.breedPlaceholder")}
          />
        </div>

        {/* Color */}
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="color">
            {t("laboratory.walkIn.color")}
          </Label>
          <Input
            id="color"
            value={formData.color}
            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
            placeholder={t("laboratory.walkIn.colorPlaceholder")}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
        >
          <X className="h-4 w-4 me-1" />
          {t("common.cancel")}
        </Button>
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!isValid}
        >
          <Check className="h-4 w-4 me-1" />
          {t("laboratory.walkIn.addHorse")}
        </Button>
      </div>
    </Card>
  );
}
