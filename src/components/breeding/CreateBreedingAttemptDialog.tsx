import { useState, useMemo } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
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
import { cn } from "@/lib/utils";
import { useHorses } from "@/hooks/useHorses";
import { useBreedingAttempts, CreateBreedingAttemptData, SourceMode } from "@/hooks/breeding/useBreedingAttempts";
import { getHorseTypeLabel, getHorseTypeBadgeProps } from "@/lib/horseClassification";
import { filterEligibleMares, filterEligibleStallions } from "@/lib/breedingEligibility";
import { useI18n } from "@/i18n";

interface CreateBreedingAttemptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateBreedingAttemptDialog({
  open,
  onOpenChange,
}: CreateBreedingAttemptDialogProps) {
  const { horses } = useHorses();
  const { createAttempt } = useBreedingAttempts();
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);

  const [mareId, setMareId] = useState("");
  const [stallionId, setStallionId] = useState("");
  const [externalStallionName, setExternalStallionName] = useState("");
  const [attemptType, setAttemptType] = useState<CreateBreedingAttemptData["attempt_type"]>("natural");
  const [attemptDate, setAttemptDate] = useState<Date | undefined>(new Date());
  const [notes, setNotes] = useState("");
  const [sourceMode, setSourceMode] = useState<SourceMode>("internal");
  const [externalProviderName, setExternalProviderName] = useState("");

  // Breeding-eligibility-aware filtering
  const { mares, stallions } = useMemo(() => {
    return {
      mares: filterEligibleMares(horses),
      stallions: filterEligibleStallions(horses),
    };
  }, [horses]);

  const resetForm = () => {
    setMareId("");
    setStallionId("");
    setExternalStallionName("");
    setAttemptType("natural");
    setAttemptDate(new Date());
    setNotes("");
    setSourceMode("internal");
    setExternalProviderName("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mareId || !attemptDate) return;

    setLoading(true);
    try {
      await createAttempt({
        mare_id: mareId,
        stallion_id: sourceMode === "external" ? null : stallionId || null,
        external_stallion_name: sourceMode === "external" ? externalStallionName || null : null,
        attempt_type: attemptType,
        attempt_date: format(attemptDate, "yyyy-MM-dd"),
        notes: notes || null,
        source_mode: sourceMode,
        external_provider_name: sourceMode === "external" ? externalProviderName || null : null,
      });
      resetForm();
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const getHorseBadge = (horse: typeof horses[0]) => {
    const type = getHorseTypeLabel({
      gender: horse.gender,
      birth_date: horse.birth_date,
      birth_at: horse.birth_at,
      is_gelded: horse.is_gelded,
      breeding_role: horse.breeding_role,
    });
    return type ? getHorseTypeBadgeProps(type) : null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-display">{t("breeding.addBreedingRecord")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Source Mode Selector */}
          <div className="space-y-2">
            <Label>{t("breeding.source")}</Label>
            <Select value={sourceMode} onValueChange={(v) => setSourceMode(v as SourceMode)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[200]">
                <SelectItem value="internal">{t("breeding.sourceMode.internal")}</SelectItem>
                <SelectItem value="connected">{t("breeding.sourceMode.connected")}</SelectItem>
                <SelectItem value="external">{t("breeding.sourceMode.external")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t("breeding.detail.mare")} *</Label>
                <Select value={mareId} onValueChange={setMareId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("common.select")} />
                  </SelectTrigger>
                  <SelectContent className="z-[200]">
                    {mares.map((mare) => {
                      const badge = getHorseBadge(mare);
                      return (
                        <SelectItem key={mare.id} value={mare.id}>
                          <span className="flex items-center gap-2">
                            {mare.name}
                            {badge && <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", badge.className)}>{badge.label}</Badge>}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {sourceMode === "external" ? (
                <>
                  <div className="space-y-2">
                    <Label>{t("breeding.externalProvider")}</Label>
                    <Input
                      value={externalProviderName}
                      onChange={(e) => setExternalProviderName(e.target.value)}
                      placeholder={t("breeding.providerName")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("breeding.detail.externalStallion")}</Label>
                    <Input
                      value={externalStallionName}
                      onChange={(e) => setExternalStallionName(e.target.value)}
                      placeholder={t("breeding.unknownStallion")}
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <Label>{t("breeding.detail.stallion")}</Label>
                  <Select value={stallionId} onValueChange={setStallionId}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("common.select")} />
                    </SelectTrigger>
                    <SelectContent className="z-[200]">
                      {stallions.map((stallion) => {
                        const badge = getHorseBadge(stallion);
                        return (
                          <SelectItem key={stallion.id} value={stallion.id}>
                            <span className="flex items-center gap-2">
                              {stallion.name}
                              {badge && <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", badge.className)}>{badge.label}</Badge>}
                            </span>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t("breeding.detail.method")} *</Label>
                <Select value={attemptType} onValueChange={(v) => setAttemptType(v as CreateBreedingAttemptData["attempt_type"])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[200]">
                    <SelectItem value="natural">{t("breeding.methods.natural")}</SelectItem>
                    <SelectItem value="ai_fresh">{t("breeding.methods.ai_fresh")}</SelectItem>
                    <SelectItem value="ai_frozen">{t("breeding.methods.ai_frozen")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t("breeding.detail.date")} *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !attemptDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {attemptDate ? format(attemptDate, "PPP") : <span>{t("common.select")}</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[200]" align="start">
                    <Calendar
                      mode="single"
                      selected={attemptDate}
                      onSelect={setAttemptDate}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* Full Width Notes */}
          <div className="space-y-2">
            <Label>{t("common.notes")}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("breeding.detail.notes")}
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" className="flex-1" disabled={loading || !mareId || !attemptDate}>
              {loading ? t("common.loading") : t("common.create")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
