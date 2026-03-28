import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/i18n";
import { useFinancialEntries, type FinancialEntry } from "@/hooks/finance/useFinancialEntries";
import { formatCurrency } from "@/lib/formatters";
import { formatStandardDate } from "@/lib/displayHelpers";
import { Landmark, Search, TrendingDown, DollarSign, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// Lazy source detail sheet imports
import { TreatmentDetailSheet } from "@/components/vet/TreatmentDetailSheet";

export function InternalCostsTab() {
  const { t, lang } = useI18n();
  const { entries, loading } = useFinancialEntries();
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState<string>("all");

  // Source drill-through state
  const [sourceSheet, setSourceSheet] = useState<{
    type: string;
    data: any;
  } | null>(null);

  // Filter to internal (non-income) cost entries only
  const internalCosts = useMemo(() => {
    return entries.filter((e) => e.is_income === false);
  }, [entries]);

  // Batch-fetch horse names for all entries
  const entityIds = useMemo(() => internalCosts.map(e => e.entity_id), [internalCosts]);
  const entityTypes = useMemo(() => internalCosts.map(e => e.entity_type), [internalCosts]);

  // Horse name lookup map
  const [horseNames, setHorseNames] = useState<Record<string, string>>({});
  
  useMemo(() => {
    if (internalCosts.length === 0) return;
    const fetchHorseNames = async () => {
      const map: Record<string, string> = {};
      
      // Group entity IDs by type for efficient queries
      const vetIds = internalCosts.filter(e => e.entity_type === "vet_treatment").map(e => e.entity_id);
      const vaccIds = internalCosts.filter(e => e.entity_type === "vaccination").map(e => e.entity_id);
      const breedIds = internalCosts.filter(e => e.entity_type === "breeding_attempt").map(e => e.entity_id);
      const foalIds = internalCosts.filter(e => e.entity_type === "foaling").map(e => e.entity_id);

      const promises: Promise<void>[] = [];

      if (vetIds.length > 0) {
        promises.push(
          supabase.from("vet_treatments").select("id, horse:horses!vet_treatments_horse_id_fkey(name, name_ar)").in("id", vetIds)
            .then(({ data }) => { (data || []).forEach((d: any) => { if (d.horse) map[d.id] = lang === "ar" ? (d.horse.name_ar || d.horse.name) : d.horse.name; }); })
        );
      }
      if (vaccIds.length > 0) {
        promises.push(
          supabase.from("horse_vaccinations").select("id, horse:horses!horse_vaccinations_horse_id_fkey(name, name_ar)").in("id", vaccIds)
            .then(({ data }) => { (data || []).forEach((d: any) => { if (d.horse) map[d.id] = lang === "ar" ? (d.horse.name_ar || d.horse.name) : d.horse.name; }); })
        );
      }
      if (breedIds.length > 0) {
        promises.push(
          supabase.from("breeding_attempts").select("id, mare:horses!breeding_attempts_mare_id_fkey(name, name_ar)").in("id", breedIds)
            .then(({ data }) => { (data || []).forEach((d: any) => { if (d.mare) map[d.id] = lang === "ar" ? (d.mare.name_ar || d.mare.name) : d.mare.name; }); })
        );
      }
      if (foalIds.length > 0) {
        promises.push(
          supabase.from("foalings").select("id, mare:horses!foalings_mare_id_fkey(name, name_ar)").in("id", foalIds)
            .then(({ data }) => { (data || []).forEach((d: any) => { if (d.mare) map[d.id] = lang === "ar" ? (d.mare.name_ar || d.mare.name) : d.mare.name; }); })
        );
      }

      await Promise.all(promises);
      setHorseNames(map);
    };
    fetchHorseNames();
  }, [internalCosts.length, lang]);

  const filtered = useMemo(() => {
    return internalCosts.filter((e) => {
      if (entityFilter !== "all" && e.entity_type !== entityFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          (e.notes || "").toLowerCase().includes(q) ||
          e.entity_type.toLowerCase().includes(q) ||
          e.entity_id.toLowerCase().includes(q) ||
          (horseNames[e.entity_id] || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [internalCosts, entityFilter, search, horseNames]);

  const stats = useMemo(() => {
    const totalCost = internalCosts.reduce((sum, e) => sum + (e.actual_cost || 0), 0);
    const entityTypesSet = new Set(internalCosts.map((e) => e.entity_type));
    return { totalCost, count: internalCosts.length, entityTypes: Array.from(entityTypesSet) };
  }, [internalCosts]);

  const getEntityLabel = (entityType: string) => {
    const key = `finance.traceability.sourceLabel.${entityType}`;
    const translated = t(key as any);
    return translated !== key ? translated : entityType;
  };

  const getServiceModeLabel = (mode: string) => {
    switch (mode) {
      case "internal": return t("finance.internalCosts.modeInternal");
      case "external": return t("finance.internalCosts.modeExternal");
      default: return mode;
    }
  };

  const handleOpenSource = async (entry: FinancialEntry) => {
    try {
      if (entry.entity_type === "vet_treatment") {
        const { data } = await supabase
          .from("vet_treatments")
          .select("*, horse:horses!vet_treatments_horse_id_fkey(id, name, name_ar, avatar_url), assignee:profiles!vet_treatments_assigned_to_fkey(id, full_name), provider:service_providers!vet_treatments_external_provider_id_fkey(id, name, name_ar)")
          .eq("id", entry.entity_id)
          .maybeSingle();
        if (data) {
          setSourceSheet({ type: "vet_treatment", data });
        } else {
          toast.error(t("common.notFound"));
        }
      } else if (entry.entity_type === "vaccination") {
        const { data } = await supabase
          .from("horse_vaccinations")
          .select("*, horse:horses!horse_vaccinations_horse_id_fkey(id, name, name_ar, avatar_url), program:vaccination_programs!horse_vaccinations_program_id_fkey(id, name, name_ar)")
          .eq("id", entry.entity_id)
          .maybeSingle();
        if (data) {
          setSourceSheet({ type: "vaccination", data });
        } else {
          toast.error(t("common.notFound"));
        }
      } else if (entry.entity_type === "breeding_attempt") {
        const { data } = await supabase
          .from("breeding_attempts")
          .select("*, mare:horses!breeding_attempts_mare_id_fkey(id, name, name_ar, avatar_url), stallion:horses!breeding_attempts_stallion_id_fkey(id, name, name_ar)")
          .eq("id", entry.entity_id)
          .maybeSingle();
        if (data) {
          setSourceSheet({ type: "breeding_attempt", data });
        } else {
          toast.error(t("common.notFound"));
        }
      } else if (entry.entity_type === "foaling") {
        const { data } = await supabase
          .from("foalings")
          .select("*, mare:horses!foalings_mare_id_fkey(id, name, name_ar, avatar_url)")
          .eq("id", entry.entity_id)
          .maybeSingle();
        if (data) {
          setSourceSheet({ type: "foaling", data });
        } else {
          toast.error(t("common.notFound"));
        }
      }
    } catch {
      toast.error(t("common.error"));
    }
  };

  const isNavigableType = (type: string) => 
    ["vet_treatment", "vaccination", "breeding_attempt", "foaling"].includes(type);

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Landmark className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">{t("finance.internalCosts.stats.totalRecords")}</p>
            </div>
            <p className="text-lg font-bold mt-1">{stats.count}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-destructive" />
              <p className="text-xs text-muted-foreground">{t("finance.internalCosts.stats.totalCost")}</p>
            </div>
            <p className="text-lg font-bold font-mono tabular-nums text-destructive mt-1" dir="ltr">
              {formatCurrency(stats.totalCost)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">{t("finance.internalCosts.stats.categories")}</p>
            </div>
            <p className="text-lg font-bold mt-1">{stats.entityTypes.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("finance.internalCosts.searchPlaceholder")}
            className="ps-9"
          />
        </div>
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.all")}</SelectItem>
            <SelectItem value="vet_treatment">{getEntityLabel("vet_treatment")}</SelectItem>
            <SelectItem value="vaccination">{getEntityLabel("vaccination")}</SelectItem>
            <SelectItem value="breeding_attempt">{getEntityLabel("breeding_attempt")}</SelectItem>
            <SelectItem value="foaling">{getEntityLabel("foaling")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Landmark className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>{t("finance.internalCosts.noRecords")}</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("common.date")}</TableHead>
                      <TableHead>{t("finance.internalCosts.source")}</TableHead>
                      <TableHead>{t("finance.traceability.horseName")}</TableHead>
                      <TableHead>{t("finance.internalCosts.serviceMode")}</TableHead>
                      <TableHead className="text-center">{t("finance.internalCosts.cost")}</TableHead>
                      <TableHead>{t("common.notes")}</TableHead>
                      <TableHead className="w-[40px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((entry) => (
                      <TableRow key={entry.id} className="group">
                        <TableCell className="font-mono text-sm" dir="ltr">
                          {formatStandardDate(entry.created_at)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {getEntityLabel(entry.entity_type)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {horseNames[entry.entity_id] || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {getServiceModeLabel(entry.service_mode)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-mono tabular-nums font-medium" dir="ltr">
                          {formatCurrency(entry.actual_cost || 0, entry.currency)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                          {entry.notes || "—"}
                        </TableCell>
                        <TableCell>
                          {isNavigableType(entry.entity_type) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleOpenSource(entry)}
                              title={t("finance.traceability.viewSource")}
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile cards */}
              <div className="sm:hidden divide-y border rounded-md">
                {filtered.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-3 space-y-2"
                    onClick={() => isNavigableType(entry.entity_type) ? handleOpenSource(entry) : undefined}
                    role={isNavigableType(entry.entity_type) ? "button" : undefined}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline" className="text-xs">
                        {getEntityLabel(entry.entity_type)}
                      </Badge>
                      <span className="font-mono text-xs text-muted-foreground" dir="ltr">
                        {formatStandardDate(entry.created_at)}
                      </span>
                    </div>
                    {horseNames[entry.entity_id] && (
                      <p className="text-sm font-medium">{horseNames[entry.entity_id]}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="text-xs">
                        {getServiceModeLabel(entry.service_mode)}
                      </Badge>
                      <span className="font-mono tabular-nums font-medium text-destructive" dir="ltr">
                        {formatCurrency(entry.actual_cost || 0, entry.currency)}
                      </span>
                    </div>
                    {entry.notes && (
                      <p className="text-xs text-muted-foreground">{entry.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Source detail sheets for drill-through */}
      {sourceSheet?.type === "vet_treatment" && (
        <TreatmentDetailSheet
          treatment={sourceSheet.data}
          open={true}
          onOpenChange={(open) => !open && setSourceSheet(null)}
        />
      )}

      {/* Vaccination - show simple info toast since no dedicated detail sheet */}
      {/* Breeding attempt and foaling similarly use inline navigation */}
    </div>
  );
}
