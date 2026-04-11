import { useState, useMemo, useCallback } from "react";
import { format } from "date-fns";
import { CalendarIcon, Check, ChevronsUpDown, Plus, Search } from "lucide-react";
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { useHorses } from "@/hooks/useHorses";
import { useBreedingAttempts, CreateBreedingAttemptData, SourceMode } from "@/hooks/breeding/useBreedingAttempts";
import { useBreedingContracts } from "@/hooks/breeding/useBreedingContracts";
import { getHorseTypeLabel, getHorseTypeBadgeProps } from "@/lib/horseClassification";
import { filterEligibleMares, filterEligibleStallions } from "@/lib/breedingEligibility";
import { useI18n } from "@/i18n";
import { formatBreedingDate } from "@/lib/displayHelpers";
import { QuickCreateHorseDialog, type QuickCreateHorseDefaults } from "@/components/housing/QuickCreateHorseDialog";

interface CreateBreedingAttemptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateBreedingAttemptDialog({
  open,
  onOpenChange,
}: CreateBreedingAttemptDialogProps) {
  const { horses, refresh: refreshHorses } = useHorses();
  const { createAttempt } = useBreedingAttempts();
  const { contracts } = useBreedingContracts();
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);

  const [mareId, setMareId] = useState("");
  const [stallionId, setStallionId] = useState("");
  const [externalStallionName, setExternalStallionName] = useState("");
  const [attemptType, setAttemptType] = useState("");
  const [attemptDate, setAttemptDate] = useState<Date | undefined>(new Date());
  const [notes, setNotes] = useState("");
  const [sourceMode, setSourceMode] = useState<SourceMode>("internal");
  const [externalProviderName, setExternalProviderName] = useState("");
  const [contractId, setContractId] = useState("");

  // Picker popover states
  const [marePickerOpen, setMarePickerOpen] = useState(false);
  const [stallionPickerOpen, setStallionPickerOpen] = useState(false);

  // Quick-create dialog states
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [quickCreateDefaults, setQuickCreateDefaults] = useState<QuickCreateHorseDefaults | undefined>();
  const [quickCreateTarget, setQuickCreateTarget] = useState<"mare" | "stallion">("mare");

  // Breeding-eligibility-aware filtering
  const { mares, stallions } = useMemo(() => {
    return {
      mares: filterEligibleMares(horses),
      stallions: filterEligibleStallions(horses),
    };
  }, [horses]);

  // Active contracts, optionally filtered by selected mare
  const availableContracts = useMemo(() => {
    let filtered = contracts.filter(c => c.status === "active");
    if (mareId) {
      const mareFiltered = filtered.filter(c => !c.mare_id || c.mare_id === mareId);
      if (mareFiltered.length > 0) filtered = mareFiltered;
    }
    return filtered;
  }, [contracts, mareId]);

  const selectedMare = useMemo(() => mares.find(m => m.id === mareId), [mares, mareId]);
  const selectedStallion = useMemo(() => stallions.find(s => s.id === stallionId), [stallions, stallionId]);

  const resetForm = () => {
    setMareId("");
    setStallionId("");
    setExternalStallionName("");
    setAttemptType("");
    setAttemptDate(new Date());
    setNotes("");
    setSourceMode("internal");
    setExternalProviderName("");
    setContractId("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mareId || !attemptDate || !attemptType) return;

    setLoading(true);
    try {
      await createAttempt({
        mare_id: mareId,
        stallion_id: sourceMode === "external" ? null : stallionId || null,
        external_stallion_name: sourceMode === "external" ? externalStallionName || null : null,
        attempt_type: attemptType as CreateBreedingAttemptData["attempt_type"],
        attempt_date: format(attemptDate, "yyyy-MM-dd"),
        notes: notes || null,
        source_mode: sourceMode,
        external_provider_name: sourceMode === "external" ? externalProviderName || null : null,
        contract_id: contractId || null,
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

  const handleCreateMare = useCallback(() => {
    setQuickCreateDefaults({ gender: "female", age_category: "mare", breeding_role: "broodmare" });
    setQuickCreateTarget("mare");
    setQuickCreateOpen(true);
  }, []);

  const handleCreateStallion = useCallback(() => {
    setQuickCreateDefaults({ gender: "male", age_category: "horse", breeding_role: "breeding_stallion" });
    setQuickCreateTarget("stallion");
    setQuickCreateOpen(true);
  }, []);

  const handleHorseCreated = useCallback(async (horse: { id: string; name: string; name_ar?: string | null; gender: string }) => {
    await refreshHorses();
    if (quickCreateTarget === "mare") {
      setMareId(horse.id);
      setMarePickerOpen(false);
    } else {
      setStallionId(horse.id);
      setStallionPickerOpen(false);
    }
  }, [quickCreateTarget, refreshHorses]);

  const canSubmit = !!mareId && !!attemptDate && !!attemptType;

  return (
    <>
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
                {/* Mare Picker */}
                <div className="space-y-2">
                  <Label>{t("breeding.detail.mare")} *</Label>
                  <Popover open={marePickerOpen} onOpenChange={setMarePickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={marePickerOpen}
                        className="w-full justify-between font-normal"
                      >
                        {selectedMare ? (
                          <span className="flex items-center gap-2 truncate">
                            {selectedMare.name}
                            {selectedMare.name_ar && <span className="text-muted-foreground text-xs">({selectedMare.name_ar})</span>}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">{t("breeding.selectMare")}</span>
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0 z-[200]" align="start">
                      <Command>
                        <CommandInput placeholder={t("breeding.selectMare")} />
                        <CommandList>
                          <CommandEmpty>
                            <div className="py-4 text-center space-y-2">
                              <p className="text-sm text-muted-foreground">{t("breeding.noMaresAvailable")}</p>
                              <Button type="button" variant="outline" size="sm" onClick={handleCreateMare}>
                                <Plus className="w-4 h-4 mr-1" />
                                {t("breeding.createMare")}
                              </Button>
                            </div>
                          </CommandEmpty>
                          <CommandGroup>
                            {mares.map((mare) => {
                              const badge = getHorseBadge(mare);
                              return (
                                <CommandItem
                                  key={mare.id}
                                  value={`${mare.name} ${mare.name_ar || ""}`}
                                  onSelect={() => {
                                    setMareId(mare.id === mareId ? "" : mare.id);
                                    setMarePickerOpen(false);
                                  }}
                                >
                                  <Check className={cn("mr-2 h-4 w-4", mareId === mare.id ? "opacity-100" : "opacity-0")} />
                                  <span className="flex items-center gap-2 truncate">
                                    {mare.name}
                                    {mare.name_ar && <span className="text-muted-foreground text-xs">({mare.name_ar})</span>}
                                    {badge && <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", badge.className)}>{badge.label}</Badge>}
                                  </span>
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </CommandList>
                        {/* Always-visible footer CTA */}
                        <div className="border-t p-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full border-dashed"
                            onClick={handleCreateMare}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            {t("breeding.createMare")}
                          </Button>
                        </div>
                      </Command>
                    </PopoverContent>
                  </Popover>
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
                  /* Stallion Picker */
                  <div className="space-y-2">
                    <Label>{t("breeding.detail.stallion")}</Label>
                    <Popover open={stallionPickerOpen} onOpenChange={setStallionPickerOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={stallionPickerOpen}
                          className="w-full justify-between font-normal"
                        >
                          {selectedStallion ? (
                            <span className="flex items-center gap-2 truncate">
                              {selectedStallion.name}
                              {selectedStallion.name_ar && <span className="text-muted-foreground text-xs">({selectedStallion.name_ar})</span>}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">{t("breeding.selectStallion")}</span>
                          )}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 z-[200]" align="start">
                        <Command>
                          <CommandInput placeholder={t("breeding.selectStallion")} />
                          <CommandList>
                            <CommandEmpty>
                              <div className="py-4 text-center space-y-2">
                                <p className="text-sm text-muted-foreground">{t("breeding.noStallionsAvailable")}</p>
                                <Button type="button" variant="outline" size="sm" onClick={handleCreateStallion}>
                                  <Plus className="w-4 h-4 mr-1" />
                                  {t("breeding.createStallion")}
                                </Button>
                              </div>
                            </CommandEmpty>
                            <CommandGroup>
                              {stallions.map((stallion) => {
                                const badge = getHorseBadge(stallion);
                                return (
                                  <CommandItem
                                    key={stallion.id}
                                    value={`${stallion.name} ${stallion.name_ar || ""}`}
                                    onSelect={() => {
                                      setStallionId(stallion.id === stallionId ? "" : stallion.id);
                                      setStallionPickerOpen(false);
                                    }}
                                  >
                                    <Check className={cn("mr-2 h-4 w-4", stallionId === stallion.id ? "opacity-100" : "opacity-0")} />
                                    <span className="flex items-center gap-2 truncate">
                                      {stallion.name}
                                      {stallion.name_ar && <span className="text-muted-foreground text-xs">({stallion.name_ar})</span>}
                                      {badge && <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", badge.className)}>{badge.label}</Badge>}
                                    </span>
                                  </CommandItem>
                                );
                              })}
                            </CommandGroup>
                          </CommandList>
                          {/* Always-visible footer CTA */}
                          <div className="border-t p-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="w-full border-dashed"
                              onClick={handleCreateStallion}
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              {t("breeding.createStallion")}
                            </Button>
                          </div>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                {/* Method field — neutral default */}
                <div className="space-y-2">
                  <Label>{t("breeding.detail.method")} *</Label>
                  <Select value={attemptType} onValueChange={setAttemptType}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("breeding.selectMethod")} />
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
                        {attemptDate ? formatBreedingDate(attemptDate) : <span>{t("common.select")}</span>}
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

                {/* Contract picker */}
                {availableContracts.length > 0 && (
                  <div className="space-y-2">
                    <Label>{t("breeding.contracts.contract")}</Label>
                    <Select value={contractId} onValueChange={setContractId}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("common.select")} />
                      </SelectTrigger>
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
              <Button type="submit" className="flex-1" disabled={loading || !canSubmit}>
                {loading ? t("common.loading") : t("common.create")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Contextual Quick-Create Horse Dialog */}
      <QuickCreateHorseDialog
        key={quickCreateTarget}
        open={quickCreateOpen}
        onOpenChange={setQuickCreateOpen}
        onCreated={handleHorseCreated}
        defaults={quickCreateDefaults}
      />
    </>
  );
}
