import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { VetStatusBadge } from "./VetStatusBadge";
import { CreateInvoiceFromVaccination } from "./CreateInvoiceFromVaccination";
import type { HorseVaccination } from "@/hooks/vet/useHorseVaccinations";
import { useBillingLinks } from "@/hooks/billing/useBillingLinks";
import { useFinancialEntries } from "@/hooks/finance/useFinancialEntries";
import { useSupplierPayableForSource } from "@/hooks/billing/useSupplierPayableForSource";
import { recordAsStableCost } from "@/lib/finance/recordAsStableCost";
import { createSupplierPayableForExternal } from "@/lib/finance/createSupplierPayableForExternal";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";
import { isPast, isToday, isTomorrow } from "date-fns";
import { formatStandardDate } from "@/lib/displayHelpers";
import { formatCurrency } from "@/lib/formatters";
import { Calendar, CheckCircle, XCircle, Syringe, AlertTriangle, Receipt, FileText, Landmark, Loader2, Truck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ViewSwitcher, getGridClass } from "@/components/ui/ViewSwitcher";
import { useViewPreference } from "@/hooks/useViewPreference";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { BilingualName } from "@/components/ui/BilingualName";
import { InvoiceDetailsSheet } from "@/components/finance/InvoiceDetailsSheet";
import { useI18n } from "@/i18n";
import { tScope } from "@/i18n/labels";

interface VaccinationsListProps {
  vaccinations: HorseVaccination[];
  loading?: boolean;
  onMarkAdministered?: (id: string) => void;
  onCancel?: (id: string) => void;
  emptyMessage?: string;
  showBilling?: boolean;
}

export function VaccinationsList({ 
  vaccinations, 
  loading, 
  onMarkAdministered, 
  onCancel,
  emptyMessage,
  showBilling = false,
}: VaccinationsListProps) {
  const { t } = useI18n();
  const { viewMode, gridColumns, setViewMode, setGridColumns } = useViewPreference('vet-vaccinations');
  const [invoiceTarget, setInvoiceTarget] = useState<HorseVaccination | null>(null);

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  if (vaccinations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
          <Syringe className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">{emptyMessage || t("vet.emptyMessages.vaccinations")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="hidden md:flex justify-end">
        <ViewSwitcher
          viewMode={viewMode}
          gridColumns={gridColumns}
          onViewModeChange={setViewMode}
          onGridColumnsChange={setGridColumns}
          showTable={true}
        />
      </div>
      {viewMode === 'table' ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("vet.form.horse")}</TableHead>
              <TableHead>{t("vet.vaccination.vaccine")}</TableHead>
              <TableHead>{t("vet.form.serviceMode")}</TableHead>
              <TableHead>{t("common.status")}</TableHead>
              <TableHead className="whitespace-nowrap">{t("vet.vaccination.dueDate")}</TableHead>
              <TableHead className="whitespace-nowrap">{t("vet.timeLabels.administered")}</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vaccinations.map((vaccination) => {
              const isOverdue = isPast(new Date(vaccination.due_date)) && vaccination.status === 'due';
              return (
                <TableRow key={vaccination.id} className={isOverdue ? "bg-destructive/5" : ""}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={vaccination.horse?.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">{vaccination.horse?.name?.[0] || '?'}</AvatarFallback>
                      </Avatar>
                      <BilingualName name={vaccination.horse?.name} nameAr={(vaccination.horse as any)?.name_ar} inline primaryClassName="text-sm truncate max-w-[120px]" />
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    <BilingualName name={vaccination.program?.name} nameAr={vaccination.program?.name_ar} inline primaryClassName="text-sm" />
                  </TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{tScope(vaccination.service_mode)}</Badge></TableCell>
                  <TableCell><VetStatusBadge status={vaccination.status} /></TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    <span className={isOverdue ? "text-destructive font-medium" : "text-muted-foreground"}>
                      {isOverdue && <AlertTriangle className="h-3 w-3 inline me-1" />}
                      {formatStandardDate(vaccination.due_date)}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground text-sm">{vaccination.administered_date ? formatStandardDate(vaccination.administered_date) : '—'}</TableCell>
                  <TableCell className="w-[100px]">
                    <div className="flex gap-1">
                      {showBilling && vaccination.status === 'done' && (
                        <>
                          <VaccinationBillingAction vaccination={vaccination} onGenerateInvoice={() => setInvoiceTarget(vaccination)} />
                          <VaccinationStableCostAction vaccination={vaccination} />
                        </>
                      )}
                      {vaccination.status === 'due' && (
                        <>
                          {onMarkAdministered && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-success hover:text-success hover:bg-success/10" onClick={() => onMarkAdministered(vaccination.id)}>
                              <CheckCircle className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          {onCancel && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => onCancel(vaccination.id)}>
                              <XCircle className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : (
        <div className={getGridClass(gridColumns, viewMode)}>
          {vaccinations.map((vaccination) => {
            const dueDate = new Date(vaccination.due_date);
            const isOverdue = isPast(dueDate) && vaccination.status === 'due';
            const isDueToday = isToday(dueDate);
            const isDueTomorrow = isTomorrow(dueDate);

            return (
              <Card key={vaccination.id} className={isOverdue ? "border-destructive/50" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <Avatar className="w-10 h-10 rounded-lg">
                        <AvatarImage src={vaccination.horse?.avatar_url || undefined} />
                        <AvatarFallback className="bg-gold/20 text-gold-dark rounded-lg">
                          {vaccination.horse?.name?.[0] || "?"}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-foreground truncate">
                            <BilingualName name={vaccination.program?.name} nameAr={vaccination.program?.name_ar} inline />
                          </h4>
                          <VetStatusBadge status={vaccination.status} />
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-2">
                          <BilingualName name={vaccination.horse?.name} nameAr={(vaccination.horse as any)?.name_ar} inline />
                        </p>

                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {tScope(vaccination.service_mode)}
                          </Badge>
                          
                          <span className={`flex items-center gap-1 text-xs ${
                            isOverdue ? "text-destructive font-medium" : 
                            isDueToday ? "text-amber-600 font-medium" : 
                            isDueTomorrow ? "text-blue-600" : 
                            "text-muted-foreground"
                          }`}>
                            {isOverdue && <AlertTriangle className="w-3 h-3" />}
                            <Calendar className="w-3 h-3" />
                            {isOverdue ? `${t("vet.timeLabels.overdue")}: ` : isDueToday ? `${t("vet.timeLabels.dueToday")}: ` : isDueTomorrow ? `${t("vet.timeLabels.tomorrow")}: ` : `${t("vet.timeLabels.due")}: `}
                            {formatStandardDate(dueDate)}
                          </span>

                          {vaccination.administered_date && (
                            <span className="flex items-center gap-1 text-xs text-success">
                              <CheckCircle className="w-3 h-3" />
                              {t("vet.timeLabels.administered")}: {formatStandardDate(vaccination.administered_date)}
                            </span>
                          )}
                        </div>

                        {vaccination.notes && (
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-1">
                            {vaccination.notes}
                          </p>
                        )}

                        {/* Financial Status — inline for done vaccinations */}
                        {vaccination.status === 'done' && showBilling && (
                          <VaccinationFinancialStatus vaccinationId={vaccination.id} />
                        )}
                      </div>
                    </div>

                    <div className="flex gap-1 shrink-0">
                      {showBilling && vaccination.status === 'done' && (
                        <>
                          <VaccinationBillingAction vaccination={vaccination} onGenerateInvoice={() => setInvoiceTarget(vaccination)} />
                          <VaccinationStableCostAction vaccination={vaccination} />
                        </>
                      )}
                      {vaccination.status === 'due' && (
                        <>
                          {onMarkAdministered && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-success hover:text-success hover:bg-success/10"
                              onClick={() => onMarkAdministered(vaccination.id)}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                          )}
                          {onCancel && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              onClick={() => onCancel(vaccination.id)}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Invoice dialog */}
      {invoiceTarget && (
        <CreateInvoiceFromVaccination
          open={!!invoiceTarget}
          onOpenChange={(open) => { if (!open) setInvoiceTarget(null); }}
          data={{
            vaccination: invoiceTarget,
            horseName: invoiceTarget.horse?.name,
            horseNameAr: (invoiceTarget.horse as any)?.name_ar,
          }}
        />
      )}
    </div>
  );
}

/** Compact inline financial status for a vaccination record */
function VaccinationFinancialStatus({ vaccinationId }: { vaccinationId: string }) {
  const { t } = useI18n();
  const { links } = useBillingLinks("vaccination", vaccinationId);
  const { entries } = useFinancialEntries("vaccination", vaccinationId);
  const { payable } = useSupplierPayableForSource("vaccination", vaccinationId);
  const [viewInvoiceId, setViewInvoiceId] = useState<string | null>(null);

  const hasInvoice = links.length > 0;
  const invoiceLink = links[0];
  const hasCostEntry = entries.some((e) => !e.is_income);
  const costEntry = entries.find((e) => !e.is_income);
  const hasPayable = !!payable;

  if (!hasInvoice && !hasCostEntry && !hasPayable) return null;

  return (
    <>
      <Separator className="my-2" />
      <div className="space-y-1">
        {hasInvoice && (
          <button
            type="button"
            className="flex items-center gap-1.5 text-xs rounded px-1.5 py-0.5 hover:bg-muted/50 transition-colors cursor-pointer"
            onClick={(e) => { e.stopPropagation(); setViewInvoiceId(invoiceLink.invoice_id); }}
          >
            <FileText className="h-3 w-3 text-emerald-600 shrink-0" />
            <span className="text-emerald-700 dark:text-emerald-400 font-medium">{t("finance.traceability.invoiced")}</span>
            {invoiceLink.amount != null && invoiceLink.amount > 0 && (
              <span className="font-mono tabular-nums text-muted-foreground ms-auto" dir="ltr">{formatCurrency(invoiceLink.amount)}</span>
            )}
            {invoiceLink.amount === 0 && (
              <Badge variant="outline" className="text-[10px] ms-auto px-1 py-0">{t("finance.traceability.zeroCharge")}</Badge>
            )}
          </button>
        )}
        {hasCostEntry && (
          <div className="flex items-center gap-1.5 text-xs px-1.5 py-0.5">
            <Landmark className="h-3 w-3 text-amber-600 shrink-0" />
            <span className="text-amber-700 dark:text-amber-400 font-medium">{t("finance.traceability.stableCostRecorded")}</span>
            {costEntry && costEntry.actual_cost != null && costEntry.actual_cost > 0 && (
              <span className="font-mono tabular-nums text-muted-foreground ms-auto" dir="ltr">{formatCurrency(costEntry.actual_cost, costEntry.currency)}</span>
            )}
          </div>
        )}
        {hasPayable && (
          <div className="flex items-center gap-1.5 text-xs px-1.5 py-0.5">
            <Truck className="h-3 w-3 text-blue-600 shrink-0" />
            <span className="text-blue-700 dark:text-blue-400 font-medium">{t("finance.traceability.payableCreated")}</span>
            {payable.amount != null && payable.amount > 0 && (
              <span className="font-mono tabular-nums text-muted-foreground ms-auto" dir="ltr">{formatCurrency(payable.amount)}</span>
            )}
          </div>
        )}
      </div>
      <InvoiceDetailsSheet
        open={!!viewInvoiceId}
        onOpenChange={(open) => !open && setViewInvoiceId(null)}
        invoiceId={viewInvoiceId}
      />
    </>
  );

/** Shows billing status + generate invoice button for a vaccination */
function VaccinationBillingAction({ vaccination, onGenerateInvoice }: { vaccination: HorseVaccination; onGenerateInvoice: () => void }) {
  const { t } = useI18n();
  const { links, isLoading } = useBillingLinks("vaccination", vaccination.id);
  const hasInvoice = links.length > 0;

  if (isLoading) return null;

  if (hasInvoice) {
    return (
      <Badge variant="secondary" className="gap-1 text-xs bg-accent text-accent-foreground">
        <FileText className="w-3 h-3" />
        {t("vet.billing.invoiced")}
      </Badge>
    );
  }

  return (
    <Button variant="ghost" size="icon" className="h-7 w-7 text-primary hover:text-primary hover:bg-primary/10" onClick={onGenerateInvoice} title={t("vet.billing.generateInvoice")}>
      <Receipt className="w-3.5 h-3.5" />
    </Button>
  );
}

/** S3: Record as Stable Cost for vaccination */
function VaccinationStableCostAction({ vaccination }: { vaccination: HorseVaccination }) {
  const { t } = useI18n();
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant?.id;
  const { entries, loading: entriesLoading } = useFinancialEntries("vaccination", vaccination.id);
  const { links } = useBillingLinks("vaccination", vaccination.id);
  const [recording, setRecording] = useState(false);

  const hasCostEntry = entries.some(e => !e.is_income);
  const hasInvoice = links.length > 0;

  if (hasInvoice || hasCostEntry || entriesLoading) return null;

  const handleRecordCost = async () => {
    if (!tenantId) return;
    setRecording(true);
    try {
      if (vaccination.service_mode === 'external' && vaccination.provider?.name) {
        await createSupplierPayableForExternal({
          tenantId,
          sourceType: "vaccination",
          sourceId: vaccination.id,
          supplierName: vaccination.provider.name,
          supplierId: vaccination.external_provider_id,
          description: vaccination.program?.name || "Vaccination",
        });
      }

      const success = await recordAsStableCost({
        tenantId,
        entityType: "vaccination",
        entityId: vaccination.id,
        amount: 0,
        serviceMode: vaccination.service_mode,
        description: vaccination.program?.name || "Vaccination",
      });

      if (success) {
        toast.success(t("vet.billing.stableCostRecorded"));
      } else {
        toast.error(t("common.error"));
      }
    } catch {
      toast.error(t("common.error"));
    } finally {
      setRecording(false);
    }
  };

  return (
    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-muted-foreground hover:bg-muted/50" onClick={handleRecordCost} disabled={recording} title={t("vet.billing.recordStableCost")}>
      {recording ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Landmark className="w-3.5 h-3.5" />}
    </Button>
  );
}
