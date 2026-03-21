import { useState } from "react";
import { format } from "date-fns";
import { Baby } from "lucide-react";
import {
  Dialog,
  DialogContent,
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
import { Foaling, useFoalings, CreateFoalHorseData } from "@/hooks/breeding/useFoalings";
import { useI18n } from "@/i18n";

interface RegisterFoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  foaling: Foaling | null;
  onSuccess?: () => void;
}

export function RegisterFoalDialog({
  open,
  onOpenChange,
  foaling,
  onSuccess,
}: RegisterFoalDialogProps) {
  const { t } = useI18n();
  const { createFoalHorse } = useFoalings();
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState(foaling?.foal_name || "");
  const [nameAr, setNameAr] = useState("");
  const [gender, setGender] = useState(foaling?.foal_sex || "");
  const [color, setColor] = useState(foaling?.foal_color || "");

  // Reset form when foaling changes
  if (foaling && name === "" && foaling.foal_name) {
    setName(foaling.foal_name);
    setGender(foaling.foal_sex || "");
    setColor(foaling.foal_color || "");
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foaling || !name || !gender) return;

    setLoading(true);
    try {
      const data: CreateFoalHorseData = {
        name,
        name_ar: nameAr || null,
        gender,
        birth_date: foaling.foaling_date,
        color: color || null,
        mother_id: foaling.mare_id,
        father_id: foaling.stallion_id || null,
        mother_name: foaling.mare?.name || null,
        father_name: foaling.stallion?.name || null,
      };

      const result = await createFoalHorse(foaling.id, data);
      if (result) {
        setName("");
        setNameAr("");
        setGender("");
        setColor("");
        onOpenChange(false);
        onSuccess?.();
      }
    } finally {
      setLoading(false);
    }
  };

  if (!foaling) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-display flex items-center gap-2">
            <Baby className="h-5 w-5 text-primary" />
            {t("breeding.foaling.registerFoalTitle")}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {t("breeding.foaling.registerFoalDesc")}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm">{t("breeding.foaling.foalName")} *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("breeding.foaling.foalNamePlaceholder")}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">{t("breeding.foaling.foalNameAr")}</Label>
            <Input
              value={nameAr}
              onChange={(e) => setNameAr(e.target.value)}
              placeholder={t("breeding.foaling.foalNameArPlaceholder")}
              dir="rtl"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">{t("breeding.foaling.foalSex")} *</Label>
            <Select value={gender} onValueChange={setGender} required>
              <SelectTrigger><SelectValue placeholder={t("breeding.foaling.selectSex")} /></SelectTrigger>
              <SelectContent className="z-[200]">
                <SelectItem value="male">{t("horses.gender.male")}</SelectItem>
                <SelectItem value="female">{t("horses.gender.female")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">{t("breeding.foaling.foalColor")}</Label>
            <Input
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder={t("breeding.foaling.foalColorPlaceholder")}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            {t("breeding.foaling.birthDateAuto")}: {format(new Date(foaling.foaling_date), "PPP")}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("breeding.foaling.pedigreeAutoLinked")}
          </p>

          <div className="flex gap-3 pt-4 border-t">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" className="flex-1" disabled={loading || !name || !gender}>
              {loading ? t("common.saving") : t("breeding.foaling.register")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
