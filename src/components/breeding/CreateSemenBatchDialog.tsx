import { useState, useMemo } from "react";
import { format } from "date-fns";
import { CalendarIcon, ChevronDown, ChevronUp } from "lucide-react";
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
import { useSemenInventory, CreateSemenBatchData } from "@/hooks/breeding/useSemenInventory";
import { useI18n } from "@/i18n";
import { getHorseTypeLabel, getHorseTypeBadgeProps } from "@/lib/horseClassification";
import type { SourceMode } from "@/hooks/breeding/useBreedingAttempts";

interface CreateSemenBatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateSemenBatchDialog({
  open,
  onOpenChange,
}: CreateSemenBatchDialogProps) {
  const { horses } = useHorses();
  const { tanks, createBatch } = useSemenInventory();
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [stallionId, setStallionId] = useState("");
  const [tankId, setTankId] = useState("");
  const [collectionDate, setCollectionDate] = useState<Date | undefined>(new Date());
  const [type, setType] = useState<CreateSemenBatchData["type"]>("frozen");
  const [dosesTotal, setDosesTotal] = useState("1");
  const [dosesAvailable, setDosesAvailable] = useState("1");
  const [qualityNotes, setQualityNotes] = useState("");
  const [sourceMode, setSourceMode] = useState<SourceMode>("internal");
  const [sourceExternalName, setSourceExternalName] = useState("");
  const [motilityPercent, setMotilityPercent] = useState("");
  const [concentration, setConcentration] = useState("");

  // Exclude geldings from stallion picker
  const stallions = useMemo(() => {
    return horses.filter(h => {
      const horseType = getHorseTypeLabel({
        gender: h.gender, birth_date: h.birth_date, birth_at: h.birth_at,
        is_gelded: h.is_gelded, breeding_role: h.breeding_role,
      });
      return horseType === 'stallion' || horseType === 'colt';
    });
  }, [horses]);

  const resetForm = () => {
    setStallionId(""); setTankId(""); setCollectionDate(new Date());
    setType("frozen"); setDosesTotal("1"); setDosesAvailable("1");
    setQualityNotes(""); setSourceMode("internal"); setSourceExternalName("");
    setMotilityPercent(""); setConcentration(""); setShowAdvanced(false);
  };

  const handleDosesTotalChange = (value: string) => {
    setDosesTotal(value);
    setDosesAvailable(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stallionId || !collectionDate) return;

    setLoading(true);
    try {
      await createBatch({
        stallion_id: stallionId,
        tank_id: tankId || null,
        collection_date: format(collectionDate, "yyyy-MM-dd"),
        type,
        doses_total: parseInt(dosesTotal) || 1,
        doses_available: parseInt(dosesAvailable) || 1,
        quality_notes: qualityNotes || null,
        source_mode: sourceMode,
        source_external_name: sourceMode === "external" ? sourceExternalName || null : null,
        motility_percent: motilityPercent ? parseFloat(motilityPercent) : null,
        concentration_million_per_ml: concentration ? parseFloat(concentration) : null,
      });
      resetForm();
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-display">{t("breeding.addSemenBatch")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Source Mode */}
          <div className="space-y-2">
            <Label>{t("breeding.semen.sourceProvenance")}</Label>
            <Select value={sourceMode} onValueChange={(v) => setSourceMode(v as SourceMode)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="z-[200]">
                <SelectItem value="internal">{t("breeding.sourceMode.internal")}</SelectItem>
                <SelectItem value="connected">{t("breeding.sourceMode.connected")}</SelectItem>
                <SelectItem value="external">{t("breeding.sourceMode.external")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {sourceMode === "external" && (
            <div className="space-y-2">
              <Label>{t("breeding.externalProvider")}</Label>
              <Input value={sourceExternalName} onChange={(e) => setSourceExternalName(e.target.value)} placeholder={t("breeding.providerName")} />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t("breeding.detail.stallion")} *</Label>
                <Select value={stallionId} onValueChange={setStallionId}>
                  <SelectTrigger><SelectValue placeholder={t("common.select")} /></SelectTrigger>
                  <SelectContent className="z-[200]">
                    {stallions.map((s) => {
                      const type = getHorseTypeLabel({ gender: s.gender, birth_date: s.birth_date, birth_at: s.birth_at, is_gelded: s.is_gelded, breeding_role: s.breeding_role });
                      const badge = type ? getHorseTypeBadgeProps(type) : null;
                      return (
                        <SelectItem key={s.id} value={s.id}>
                          <span className="flex items-center gap-2">
                            {s.name}
                            {badge && <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", badge.className)}>{badge.label}</Badge>}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("breeding.semen.collected")} *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !collectionDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {collectionDate ? format(collectionDate, "PPP") : t("common.select")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[200]" align="start">
                    <Calendar mode="single" selected={collectionDate} onSelect={setCollectionDate} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>{t("breeding.semen.type")} *</Label>
                <Select value={type} onValueChange={(v) => setType(v as CreateSemenBatchData["type"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="z-[200]">
                    <SelectItem value="fresh">{t("breeding.semen.fresh")}</SelectItem>
                    <SelectItem value="frozen">{t("breeding.semen.frozen")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Storage Tank</Label>
                <Select value={tankId} onValueChange={setTankId}>
                  <SelectTrigger><SelectValue placeholder={t("common.select")} /></SelectTrigger>
                  <SelectContent className="z-[200]">
                    <SelectItem value="">—</SelectItem>
                    {tanks.map((tank) => (
                      <SelectItem key={tank.id} value={tank.id}>
                        {tank.name} {tank.location && `(${tank.location})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("breeding.semen.dosesAvailable")} *</Label>
                  <Input type="number" min="1" value={dosesTotal} onChange={(e) => handleDosesTotalChange(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{t("breeding.semen.dosesAvailable")}</Label>
                  <Input type="number" min="0" max={dosesTotal} value={dosesAvailable} onChange={(e) => setDosesAvailable(e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          {/* Progressive disclosure for quality fields */}
          <div>
            <Button type="button" variant="ghost" size="sm" className="gap-1 text-muted-foreground" onClick={() => setShowAdvanced(!showAdvanced)}>
              {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {t("breeding.semen.qualityNotes")} & {t("breeding.semen.motility")}
            </Button>
            {showAdvanced && (
              <div className="mt-3 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("breeding.semen.motility")}</Label>
                    <Input type="number" min="0" max="100" step="0.1" value={motilityPercent} onChange={(e) => setMotilityPercent(e.target.value)} placeholder="e.g. 85" />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("breeding.semen.concentration")}</Label>
                    <Input type="number" min="0" step="0.1" value={concentration} onChange={(e) => setConcentration(e.target.value)} placeholder="e.g. 500" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t("breeding.semen.qualityNotes")}</Label>
                  <Textarea value={qualityNotes} onChange={(e) => setQualityNotes(e.target.value)} rows={3} />
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
            <Button type="submit" className="flex-1" disabled={loading || !stallionId || !collectionDate}>
              {loading ? t("common.loading") : t("common.create")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
