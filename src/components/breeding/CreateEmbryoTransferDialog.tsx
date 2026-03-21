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
import { useEmbryoTransfers, CreateEmbryoTransferData } from "@/hooks/breeding/useEmbryoTransfers";
import { useBreedingContracts } from "@/hooks/breeding/useBreedingContracts";
import { useI18n } from "@/i18n";
import { filterEligibleMares } from "@/lib/breedingEligibility";
import { formatBreedingDate } from "@/lib/displayHelpers";
import type { SourceMode } from "@/hooks/breeding/useBreedingAttempts";

interface CreateEmbryoTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateEmbryoTransferDialog({
  open,
  onOpenChange,
}: CreateEmbryoTransferDialogProps) {
  const { horses } = useHorses();
  const { createTransfer } = useEmbryoTransfers();
  const { contracts } = useBreedingContracts();
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);

  const [donorMareId, setDonorMareId] = useState("");
  const [recipientMareId, setRecipientMareId] = useState("");
  const [flushDate, setFlushDate] = useState<Date | undefined>();
  const [transferDate, setTransferDate] = useState<Date | undefined>();
  const [embryoGrade, setEmbryoGrade] = useState("");
  const [embryoCount, setEmbryoCount] = useState("1");
  const [notes, setNotes] = useState("");
  const [sourceMode, setSourceMode] = useState<SourceMode>("internal");
  const [externalProviderName, setExternalProviderName] = useState("");
  const [contractId, setContractId] = useState("");

  const mares = useMemo(() => filterEligibleMares(horses), [horses]);

  const availableContracts = useMemo(() => {
    let filtered = contracts.filter(c => c.status === "active");
    if (donorMareId) {
      const mareFiltered = filtered.filter(c => !c.mare_id || c.mare_id === donorMareId);
      if (mareFiltered.length > 0) filtered = mareFiltered;
    }
    return filtered;
  }, [contracts, donorMareId]);

  const resetForm = () => {
    setDonorMareId(""); setRecipientMareId("");
    setFlushDate(undefined); setTransferDate(undefined);
    setEmbryoGrade(""); setEmbryoCount("1"); setNotes("");
    setSourceMode("internal"); setExternalProviderName("");
    setContractId("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!donorMareId || !recipientMareId) return;

    setLoading(true);
    try {
      await createTransfer({
        donor_mare_id: donorMareId,
        recipient_mare_id: recipientMareId,
        flush_date: flushDate ? format(flushDate, "yyyy-MM-dd") : null,
        transfer_date: transferDate ? format(transferDate, "yyyy-MM-dd") : null,
        embryo_grade: embryoGrade || null,
        embryo_count: parseInt(embryoCount) || 1,
        notes: notes || null,
        source_mode: sourceMode,
        external_provider_name: sourceMode === "external" ? externalProviderName || null : null,
        contract_id: contractId && contractId !== "none" ? contractId : null,
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
          <DialogTitle className="text-xl font-display">{t("breeding.addEmbryoTransfer")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Source Mode */}
          <div className="space-y-2">
            <Label>{t("breeding.source")}</Label>
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
              <Input value={externalProviderName} onChange={(e) => setExternalProviderName(e.target.value)} placeholder={t("breeding.providerName")} />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t("breeding.embryoTransfer.donorMare")} *</Label>
                <Select value={donorMareId} onValueChange={setDonorMareId}>
                  <SelectTrigger><SelectValue placeholder={t("common.select")} /></SelectTrigger>
                  <SelectContent className="z-[200]">
                    {mares.map((mare) => (
                      <SelectItem key={mare.id} value={mare.id}>{mare.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("breeding.embryoTransfer.recipientMare")} *</Label>
                <Select value={recipientMareId} onValueChange={setRecipientMareId}>
                  <SelectTrigger><SelectValue placeholder={t("common.select")} /></SelectTrigger>
                  <SelectContent className="z-[200]">
                    {mares.filter(m => m.id !== donorMareId).map((mare) => (
                      <SelectItem key={mare.id} value={mare.id}>{mare.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t("breeding.embryoTransfer.flushDate")}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !flushDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {flushDate ? formatBreedingDate(flushDate) : t("common.select")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[200]" align="start">
                    <Calendar mode="single" selected={flushDate} onSelect={setFlushDate} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>{t("breeding.embryoTransfer.transferDate")}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !transferDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {transferDate ? formatBreedingDate(transferDate) : t("common.select")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[200]" align="start">
                    <Calendar mode="single" selected={transferDate} onSelect={setTransferDate} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>{t("breeding.embryoTransfer.embryoGrade")}</Label>
              <Select value={embryoGrade} onValueChange={setEmbryoGrade}>
                <SelectTrigger><SelectValue placeholder={t("common.select")} /></SelectTrigger>
                <SelectContent className="z-[200]">
                  <SelectItem value="excellent">{t("breeding.embryoTransfer.grades.excellent")}</SelectItem>
                  <SelectItem value="good">{t("breeding.embryoTransfer.grades.good")}</SelectItem>
                  <SelectItem value="fair">{t("breeding.embryoTransfer.grades.fair")}</SelectItem>
                  <SelectItem value="poor">{t("breeding.embryoTransfer.grades.poor")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("breeding.embryoTransfer.embryoCount")}</Label>
              <Input type="number" min="1" value={embryoCount} onChange={(e) => setEmbryoCount(e.target.value)} />
            </div>
          </div>

          {/* Contract picker */}
          {availableContracts.length > 0 && (
            <div className="space-y-2">
              <Label>{t("breeding.contracts.contract")}</Label>
              <Select value={contractId} onValueChange={setContractId}>
                <SelectTrigger><SelectValue placeholder={t("common.select")} /></SelectTrigger>
                <SelectContent className="z-[200]">
                  <SelectItem value="none">{t("common.none")}</SelectItem>
                  {availableContracts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.contract_number} — {t(`breeding.contracts.types.${c.contract_type}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>{t("common.notes")}</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
            <Button type="submit" className="flex-1" disabled={loading || !donorMareId || !recipientMareId}>
              {loading ? t("common.loading") : t("common.create")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}