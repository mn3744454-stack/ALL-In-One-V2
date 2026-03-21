import { useState, useMemo } from "react";
import { format } from "date-fns";
import { CalendarIcon, Baby, ChevronDown, ChevronUp } from "lucide-react";
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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Pregnancy } from "@/hooks/breeding/usePregnancies";
import { useFoalings, CreateFoalingData, CreateFoalHorseData } from "@/hooks/breeding/useFoalings";
import { useI18n } from "@/i18n";

interface RecordFoalingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pregnancy: Pregnancy | null;
  onSuccess?: () => void;
}

export function RecordFoalingDialog({
  open,
  onOpenChange,
  pregnancy,
  onSuccess,
}: RecordFoalingDialogProps) {
  const { t } = useI18n();
  const { createFoaling, createFoalHorse } = useFoalings();
  const [loading, setLoading] = useState(false);

  // Core foaling fields
  const [foalingDate, setFoalingDate] = useState<Date>(new Date());
  const [foalingTime, setFoalingTime] = useState("");
  const [outcome, setOutcome] = useState("live");
  const [foalSex, setFoalSex] = useState("");
  const [foalColor, setFoalColor] = useState("");
  const [foalName, setFoalName] = useState("");
  const [notes, setNotes] = useState("");

  // Foal registration option
  const [registerFoal, setRegisterFoal] = useState(false);
  const [foalNameAr, setFoalNameAr] = useState("");

  // Progressive disclosure
  const [showAdvanced, setShowAdvanced] = useState(false);

  const isLive = outcome === "live";

  const resetForm = () => {
    setFoalingDate(new Date());
    setFoalingTime("");
    setOutcome("live");
    setFoalSex("");
    setFoalColor("");
    setFoalName("");
    setFoalNameAr("");
    setNotes("");
    setRegisterFoal(false);
    setShowAdvanced(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pregnancy) return;

    setLoading(true);
    try {
      const foalingData: CreateFoalingData = {
        pregnancy_id: pregnancy.id,
        mare_id: pregnancy.mare_id,
        stallion_id: pregnancy.stallion_id || null,
        foaling_date: format(foalingDate, "yyyy-MM-dd"),
        foaling_time: foalingTime || null,
        outcome,
        foal_sex: foalSex || null,
        foal_color: foalColor || null,
        foal_name: foalName || null,
        notes: notes || null,
      };

      const foaling = await createFoaling(foalingData);
      if (!foaling) return;

      // Optionally register foal as a horse
      if (registerFoal && isLive && foalName && foalSex) {
        const foalHorseData: CreateFoalHorseData = {
          name: foalName,
          name_ar: foalNameAr || null,
          gender: foalSex,
          birth_date: format(foalingDate, "yyyy-MM-dd"),
          color: foalColor || null,
          mother_id: pregnancy.mare_id,
          father_id: pregnancy.stallion_id || null,
          mother_name: pregnancy.mare?.name || null,
          father_name: pregnancy.stallion?.name || null,
        };
        await createFoalHorse(foaling.id, foalHorseData);
      }

      resetForm();
      onOpenChange(false);
      onSuccess?.();
    } finally {
      setLoading(false);
    }
  };

  if (!pregnancy) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-display flex items-center gap-2">
            <Baby className="h-5 w-5 text-primary" />
            {t("breeding.foaling.recordTitle")}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {pregnancy.mare?.name} {pregnancy.stallion ? `× ${pregnancy.stallion.name}` : ""}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Section 1: Essential */}
          <div className="space-y-3">
            {/* Foaling Date */}
            <div className="space-y-1.5">
              <Label className="text-sm">{t("breeding.foaling.date")} *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !foalingDate && "text-muted-foreground")}
                  >
                    <CalendarIcon className="me-2 h-4 w-4" />
                    {foalingDate ? format(foalingDate, "PPP") : t("common.selectDate")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[200]" align="start">
                  <Calendar
                    mode="single"
                    selected={foalingDate}
                    onSelect={(d) => d && setFoalingDate(d)}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Outcome */}
            <div className="space-y-1.5">
              <Label className="text-sm">{t("breeding.foaling.outcome")} *</Label>
              <Select value={outcome} onValueChange={setOutcome}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="z-[200]">
                  <SelectItem value="live">{t("breeding.foaling.outcomes.live")}</SelectItem>
                  <SelectItem value="stillborn">{t("breeding.foaling.outcomes.stillborn")}</SelectItem>
                  <SelectItem value="non_viable">{t("breeding.foaling.outcomes.non_viable")}</SelectItem>
                  <SelectItem value="other">{t("breeding.foaling.outcomes.other")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Foal Sex — only when live */}
            {isLive && (
              <div className="space-y-1.5">
                <Label className="text-sm">{t("breeding.foaling.foalSex")}</Label>
                <Select value={foalSex} onValueChange={setFoalSex}>
                  <SelectTrigger><SelectValue placeholder={t("breeding.foaling.selectSex")} /></SelectTrigger>
                  <SelectContent className="z-[200]">
                    <SelectItem value="male">{t("horses.gender.male")}</SelectItem>
                    <SelectItem value="female">{t("horses.gender.female")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Foal Name */}
            {isLive && (
              <div className="space-y-1.5">
                <Label className="text-sm">{t("breeding.foaling.foalName")}</Label>
                <Input
                  value={foalName}
                  onChange={(e) => setFoalName(e.target.value)}
                  placeholder={t("breeding.foaling.foalNamePlaceholder")}
                />
              </div>
            )}
          </div>

          <Separator />

          {/* Section 2: Register foal as horse */}
          {isLive && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="registerFoal"
                  checked={registerFoal}
                  onCheckedChange={(c) => setRegisterFoal(!!c)}
                />
                <Label htmlFor="registerFoal" className="text-sm font-medium cursor-pointer">
                  {t("breeding.foaling.registerAsHorse")}
                </Label>
              </div>

              {registerFoal && (
                <div className="ps-6 space-y-3 border-s-2 border-primary/20">
                  <div className="space-y-1.5">
                    <Label className="text-sm">{t("breeding.foaling.foalNameAr")}</Label>
                    <Input
                      value={foalNameAr}
                      onChange={(e) => setFoalNameAr(e.target.value)}
                      placeholder={t("breeding.foaling.foalNameArPlaceholder")}
                      dir="rtl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">{t("breeding.foaling.foalColor")}</Label>
                    <Input
                      value={foalColor}
                      onChange={(e) => setFoalColor(e.target.value)}
                      placeholder={t("breeding.foaling.foalColorPlaceholder")}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t("breeding.foaling.pedigreeAutoLinked")}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Section 3: Advanced / Notes */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
          >
            {showAdvanced ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {t("breeding.foaling.additionalDetails")}
          </button>

          {showAdvanced && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-sm">{t("breeding.foaling.time")}</Label>
                <Input
                  type="time"
                  value={foalingTime}
                  onChange={(e) => setFoalingTime(e.target.value)}
                />
              </div>
              {!isLive && (
                <div className="space-y-1.5">
                  <Label className="text-sm">{t("breeding.foaling.foalColor")}</Label>
                  <Input
                    value={foalColor}
                    onChange={(e) => setFoalColor(e.target.value)}
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-sm">{t("breeding.detail.notes")}</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t("breeding.foaling.notesPlaceholder")}
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="flex gap-3 pt-4 border-t">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={loading || !outcome}
            >
              {loading ? t("common.saving") : t("breeding.foaling.save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
