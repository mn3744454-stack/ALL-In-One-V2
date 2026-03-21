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
import { useClients } from "@/hooks/useClients";
import { useServicesByKind } from "@/hooks/useServices";
import { useBreedingContracts, ContractType, PricingMode, CreateBreedingContractData } from "@/hooks/breeding/useBreedingContracts";
import { useI18n } from "@/i18n";
import { filterEligibleMares, filterEligibleStallions } from "@/lib/breedingEligibility";
import { displayServiceName } from "@/lib/displayHelpers";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editContract?: any | null;
}

export function CreateBreedingContractDialog({ open, onOpenChange, editContract }: Props) {
  const { horses } = useHorses();
  const { clients } = useClients();
  const { data: breedingServices = [] } = useServicesByKind("breeding");
  const { createContract, updateContract, generateContractNumber } = useBreedingContracts();
  const { t, lang } = useI18n();
  const [loading, setLoading] = useState(false);

  const isEdit = !!editContract;

  const [contractNumber, setContractNumber] = useState(editContract?.contract_number || "");
  const [contractType, setContractType] = useState<ContractType>(editContract?.contract_type || "natural_cover");
  const [clientId, setClientId] = useState(editContract?.client_id || "");
  const [clientName, setClientName] = useState(editContract?.client_name || "");
  const [mareId, setMareId] = useState(editContract?.mare_id || "");
  const [stallionId, setStallionId] = useState(editContract?.stallion_id || "");
  const [externalPartyName, setExternalPartyName] = useState(editContract?.external_party_name || "");
  const [serviceId, setServiceId] = useState(editContract?.service_id || "");
  const [pricingMode, setPricingMode] = useState<PricingMode>(editContract?.pricing_mode || "fixed");
  const [unitPrice, setUnitPrice] = useState(editContract?.unit_price?.toString() || "");
  const [totalPrice, setTotalPrice] = useState(editContract?.total_price?.toString() || "");
  const [startDate, setStartDate] = useState<Date | undefined>(editContract?.start_date ? new Date(editContract.start_date) : undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(editContract?.end_date ? new Date(editContract.end_date) : undefined);
  const [notes, setNotes] = useState(editContract?.notes || "");

  const mares = useMemo(() => filterEligibleMares(horses), [horses]);
  const stallions = useMemo(() => filterEligibleStallions(horses), [horses]);
  const activeClients = useMemo(() => clients.filter(c => c.status === "active"), [clients]);
  const activeServices = useMemo(() => breedingServices.filter(s => s.is_active), [breedingServices]);

  // Auto-generate contract number for new contracts
  useState(() => {
    if (!isEdit && !contractNumber) {
      setContractNumber(generateContractNumber());
    }
  });

  const handleServiceChange = (svcId: string) => {
    setServiceId(svcId);
    const svc = breedingServices.find(s => s.id === svcId);
    if (svc?.unit_price != null && !unitPrice) {
      setUnitPrice(svc.unit_price.toString());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data: CreateBreedingContractData = {
        contract_number: contractNumber || generateContractNumber(),
        contract_type: contractType,
        client_id: clientId || null,
        client_name: clientName || null,
        mare_id: mareId || null,
        stallion_id: stallionId || null,
        external_party_name: externalPartyName || null,
        service_id: serviceId || null,
        pricing_mode: pricingMode,
        unit_price: unitPrice ? parseFloat(unitPrice) : null,
        total_price: totalPrice ? parseFloat(totalPrice) : null,
        start_date: startDate ? format(startDate, "yyyy-MM-dd") : null,
        end_date: endDate ? format(endDate, "yyyy-MM-dd") : null,
        notes: notes || null,
      };

      if (isEdit) {
        await updateContract(editContract.id, data);
      } else {
        await createContract(data);
      }
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-display">
            {isEdit ? t("breeding.contracts.editTitle") : t("breeding.contracts.createTitle")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left column */}
            <div className="space-y-4">
              {/* Contract Number */}
              <div className="space-y-2">
                <Label>{t("breeding.contracts.contractNumber")}</Label>
                <Input value={contractNumber} onChange={e => setContractNumber(e.target.value)} placeholder="BC-XXXXXX" />
              </div>

              {/* Contract Type */}
              <div className="space-y-2">
                <Label>{t("breeding.contracts.type")} *</Label>
                <Select value={contractType} onValueChange={v => setContractType(v as ContractType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="z-[200]">
                    <SelectItem value="natural_cover">{t("breeding.contracts.types.natural_cover")}</SelectItem>
                    <SelectItem value="pregnancy_exam">{t("breeding.contracts.types.pregnancy_exam")}</SelectItem>
                    <SelectItem value="foaling_assistance">{t("breeding.contracts.types.foaling_assistance")}</SelectItem>
                    <SelectItem value="embryo_transfer">{t("breeding.contracts.types.embryo_transfer")}</SelectItem>
                    <SelectItem value="custom">{t("breeding.contracts.types.custom")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Client */}
              <div className="space-y-2">
                <Label>{t("breeding.billing.client")}</Label>
                <Select value={clientId} onValueChange={v => { setClientId(v); const c = activeClients.find(c => c.id === v); if (c) setClientName(c.name); }}>
                  <SelectTrigger><SelectValue placeholder={t("breeding.billing.selectClient")} /></SelectTrigger>
                  <SelectContent className="z-[200]">
                    {activeClients.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {!clientId && (
                <div className="space-y-2">
                  <Label>{t("breeding.contracts.externalParty")}</Label>
                  <Input value={externalPartyName} onChange={e => setExternalPartyName(e.target.value)} />
                </div>
              )}

              {/* Mare & Stallion */}
              <div className="space-y-2">
                <Label>{t("breeding.detail.mare")}</Label>
                <Select value={mareId} onValueChange={setMareId}>
                  <SelectTrigger><SelectValue placeholder={t("common.select")} /></SelectTrigger>
                  <SelectContent className="z-[200]">
                    {mares.map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t("breeding.detail.stallion")}</Label>
                <Select value={stallionId} onValueChange={setStallionId}>
                  <SelectTrigger><SelectValue placeholder={t("common.select")} /></SelectTrigger>
                  <SelectContent className="z-[200]">
                    {stallions.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-4">
              {/* Service */}
              <div className="space-y-2">
                <Label>{t("breeding.billing.service")}</Label>
                <Select value={serviceId} onValueChange={handleServiceChange}>
                  <SelectTrigger><SelectValue placeholder={t("breeding.billing.selectService")} /></SelectTrigger>
                  <SelectContent className="z-[200]">
                    {activeServices.map(svc => (
                      <SelectItem key={svc.id} value={svc.id}>
                        {displayServiceName(svc.name, svc.name_ar, lang)}
                        {svc.unit_price != null && ` — ${svc.unit_price} SAR`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Pricing */}
              <div className="space-y-2">
                <Label>{t("breeding.contracts.pricingMode")}</Label>
                <Select value={pricingMode} onValueChange={v => setPricingMode(v as PricingMode)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="z-[200]">
                    <SelectItem value="fixed">{t("breeding.contracts.pricingModes.fixed")}</SelectItem>
                    <SelectItem value="per_event">{t("breeding.contracts.pricingModes.per_event")}</SelectItem>
                    <SelectItem value="package">{t("breeding.contracts.pricingModes.package")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>{t("breeding.contracts.unitPrice")}</Label>
                  <Input type="number" step="0.01" value={unitPrice} onChange={e => setUnitPrice(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{t("breeding.contracts.totalPrice")}</Label>
                  <Input type="number" step="0.01" value={totalPrice} onChange={e => setTotalPrice(e.target.value)} />
                </div>
              </div>

              {/* Dates */}
              <div className="space-y-2">
                <Label>{t("breeding.contracts.startDate")}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : t("common.select")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[200]" align="start">
                    <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>{t("breeding.contracts.endDate")}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : t("common.select")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[200]" align="start">
                    <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>{t("common.notes")}</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? t("common.loading") : isEdit ? t("common.update") : t("common.create")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
