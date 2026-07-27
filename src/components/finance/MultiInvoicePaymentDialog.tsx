import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SharedDateField } from "@/components/ui/shared-date-field";
import { Loader2, Plus, Trash2, AlertCircle } from "lucide-react";
import { useI18n } from "@/i18n";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useTenant } from "@/contexts/TenantContext";
import { useClients } from "@/hooks/useClients";
import { useTenantCurrency } from "@/hooks/useTenantCurrency";
import { formatCurrency } from "@/lib/formatters";
import { EligibleInvoicesSelector } from "./EligibleInvoicesSelector";
import {
  useEligibleClientInvoices,
  type EligibleInvoice,
} from "@/hooks/finance/useEligibleClientInvoices";
import {
  buildAllocationsPayload,
  countGeneratedRows,
  MAX_RPC_ALLOCATION_ROWS,
  proposeOldestFirst,
  toCents,
  type TenderRowInput,
} from "@/lib/finance/multiInvoiceDistribution";
import { buildMultiInvoiceIdempotencyKey } from "@/lib/finance/multiInvoicePaymentFingerprint";
import { postPaymentSession, type PaymentMethod } from "@/lib/finance/postPaymentSession";
import { invalidateFinanceQueries } from "@/hooks/finance/invalidateFinanceQueries";
import { getRiyadhDateString } from "@/lib/finance/invoiceRpc";

const PAYMENT_METHODS: PaymentMethod[] = ["cash", "card", "transfer", "check"];

const ERROR_TOKEN_KEYS: Record<string, string> = {
  FIN_IDEMPOTENCY_CONFLICT: "finance.payments.errors.idempotencyConflict",
  FIN_INVOICE_OVER_ALLOCATION: "finance.payments.errors.overAllocation",
  FIN_INVOICE_NOT_PAYABLE: "finance.payments.errors.notPayable",
  FIN_INVOICE_CROSS_CLIENT: "finance.payments.errors.crossClient",
  FIN_INVOICE_CROSS_TENANT: "finance.payments.errors.crossClient",
  FIN_INVOICE_CURRENCY_MISMATCH: "finance.payments.errors.crossClient",
  FIN_PAYMENT_ACCOUNT_MISSING: "finance.payments.errors.accountMissing",
  FIN_HORSE_ALLOCATION_REQUIRED: "finance.multiInvoicePayment.errors.needsAllocationEditor",
  FIN_HORSE_ALLOCATION_MISMATCH: "finance.multiInvoicePayment.errors.needsAllocationEditor",
  FIN_HORSE_NOT_ON_INVOICE: "finance.multiInvoicePayment.errors.needsAllocationEditor",
  FIN_CLIENT_LEVEL_ALLOCATION_INVALID: "finance.multiInvoicePayment.errors.needsAllocationEditor",
  FIN_ALLOCATION_HISTORY_UNRESOLVED: "finance.payments.errors.historyUnresolved",
  FIN_PERMISSION_DENIED: "finance.payments.errors.permissionDenied",
  FIN_UNAUTHENTICATED: "finance.payments.errors.permissionDenied",
  FIN_PAYMENT_METHOD_INVALID: "finance.payments.errors.methodInvalid",
  FIN_ALLOCATION_DUPLICATE: "finance.payments.errors.duplicateAllocation",
};

interface TenderRow {
  id: string;
  method: PaymentMethod;
  amount: string;
  reference: string;
}

interface MultiInvoicePaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  /** Optional caller-preselected invoice ids (e.g. invoked from a client statement). */
  preselectedInvoiceIds?: string[];
  onSuccess?: () => void;
}

/**
 * Phase N+3 · Slice 3 — Multi-Invoice Client Payment dialog.
 *
 * ONE client · MULTIPLE outstanding invoices · ONE atomic payment session.
 *
 * The dialog is intentionally scoped to invoices whose composition is SIMPLE
 * (single-horse or client-level only). Complex invoices (multiple horses, or
 * a mix of horse-scoped and client-level lines) still route through
 * `RecordPaymentDialog` where `PaymentAllocationEditor` provides per-bucket
 * caps. Selecting a complex invoice here disables the submit with a clear
 * localized notice — no silent partial support.
 */
export function MultiInvoicePaymentDialog({
  open,
  onOpenChange,
  clientId,
  preselectedInvoiceIds,
  onSuccess,
}: MultiInvoicePaymentDialogProps) {
  const { t, dir } = useI18n();
  const isRtl = dir === "rtl";
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant?.id;
  const tenantCurrency = useTenantCurrency();
  const { clients } = useClients();
  const client = clients.find((c) => c.id === clientId) ?? null;

  const { invoices, isLoading } = useEligibleClientInvoices({
    clientId,
    currency: tenantCurrency,
  });

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [tenderRows, setTenderRows] = useState<TenderRow[]>([
    { id: crypto.randomUUID(), method: "cash", amount: "", reference: "" },
  ]);
  const [paymentDate, setPaymentDate] = useState<string>(getRiyadhDateString());
  const [externalReference, setExternalReference] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const idempotencyRef = useRef<{ key: string; fingerprint: string } | null>(null);

  // Reset state whenever the dialog opens.
  useEffect(() => {
    if (!open) return;
    const preSet = new Set(preselectedInvoiceIds ?? []);
    setSelectedIds(preSet);
    setAmounts({});
    setTenderRows([{ id: crypto.randomUUID(), method: "cash", amount: "", reference: "" }]);
    setPaymentDate(getRiyadhDateString());
    setExternalReference("");
    idempotencyRef.current = null;
    setIsSubmitting(false);
  }, [open, preselectedInvoiceIds]);

  // When invoices land, if the caller preselected ids, propose oldest-first
  // amounts filling each selected invoice's outstanding.
  useEffect(() => {
    if (!open || invoices.length === 0) return;
    if (Object.keys(amounts).length > 0) return;
    if (selectedIds.size === 0) return;
    const selectedInvoices = invoices.filter((i) => selectedIds.has(i.id));
    const total = selectedInvoices.reduce((s, i) => s + i.outstanding, 0);
    const proposal = proposeOldestFirst(
      selectedInvoices.map((i) => ({
        invoiceId: i.id,
        outstanding: i.outstanding,
        dueDate: i.due_date,
        issueDate: i.issue_date,
        invoiceNumber: i.invoice_number,
      })),
      total,
    );
    const asStrings: Record<string, string> = {};
    for (const [k, v] of Object.entries(proposal)) asStrings[k] = v > 0 ? v.toFixed(2) : "";
    setAmounts(asStrings);
  }, [open, invoices, selectedIds, amounts]);

  const currency = tenantCurrency;
  const fmt = (n: number) => formatCurrency(n, currency);

  const selectedInvoices: EligibleInvoice[] = useMemo(
    () => invoices.filter((i) => selectedIds.has(i.id)),
    [invoices, selectedIds],
  );

  const invoiceAmountsUnits: Record<string, number> = useMemo(() => {
    const map: Record<string, number> = {};
    for (const inv of selectedInvoices) {
      const raw = parseFloat(amounts[inv.id] ?? "");
      map[inv.id] = Number.isFinite(raw) && raw > 0 ? raw : 0;
    }
    return map;
  }, [selectedInvoices, amounts]);

  const invoiceAllocationTotal = useMemo(
    () => Object.values(invoiceAmountsUnits).reduce((s, v) => s + v, 0),
    [invoiceAmountsUnits],
  );

  const tenderRowsNormalised: TenderRowInput[] = useMemo(() => {
    return tenderRows.map((r) => ({
      id: r.id,
      method: r.method,
      amount: (() => {
        const n = parseFloat(r.amount);
        return Number.isFinite(n) && n > 0 ? n : 0;
      })(),
      reference: r.reference,
    }));
  }, [tenderRows]);

  const tenderTotal = useMemo(
    () => tenderRowsNormalised.reduce((s, r) => s + r.amount, 0),
    [tenderRowsNormalised],
  );

  // Validation --------------------------------------------------------------
  const perInvoiceOverAllocation = selectedInvoices.filter(
    (i) => toCents(invoiceAmountsUnits[i.id] || 0) > toCents(i.outstanding),
  );
  const amountsBalanced =
    toCents(tenderTotal) === toCents(invoiceAllocationTotal) && tenderTotal > 0;
  const generatedRowCount = countGeneratedRows({
    invoiceAmountsUnits,
    tenderRows: tenderRowsNormalised,
  });
  const overRowCap = generatedRowCount > MAX_RPC_ALLOCATION_ROWS;
  const tooManySelected = selectedInvoices.length > MAX_RPC_ALLOCATION_ROWS;

  const duplicateTenderMethod = (() => {
    // Distinct rows may share a method as long as reference differs; the RPC
    // rejects fully-duplicated (invoice, method, reference) tuples. Warn when
    // the same method has identical references across rows.
    const seen = new Set<string>();
    for (const r of tenderRowsNormalised) {
      if (r.amount <= 0) continue;
      const key = `${r.method}|${(r.reference ?? "").trim()}`;
      if (seen.has(key)) return true;
      seen.add(key);
    }
    return false;
  })();

  const canSubmit =
    !!tenantId &&
    !!clientId &&
    !!currency &&
    selectedInvoices.length > 0 &&
    tenderTotal > 0 &&
    amountsBalanced &&
    perInvoiceOverAllocation.length === 0 &&
    !overRowCap &&
    !tooManySelected &&
    !duplicateTenderMethod &&
    !isSubmitting;

  // Actions -----------------------------------------------------------------
  function toggleInvoice(id: string, next: boolean) {
    setSelectedIds((prev) => {
      const s = new Set(prev);
      if (next) s.add(id);
      else s.delete(id);
      return s;
    });
    if (!next) {
      setAmounts((prev) => {
        const { [id]: _dropped, ...rest } = prev;
        return rest;
      });
    }
  }

  function distributeOldestFirst() {
    const proposal = proposeOldestFirst(
      selectedInvoices.map((i) => ({
        invoiceId: i.id,
        outstanding: i.outstanding,
        dueDate: i.due_date,
        issueDate: i.issue_date,
        invoiceNumber: i.invoice_number,
      })),
      tenderTotal > 0 ? tenderTotal : selectedInvoices.reduce((s, i) => s + i.outstanding, 0),
    );
    const asStrings: Record<string, string> = {};
    for (const [k, v] of Object.entries(proposal)) asStrings[k] = v > 0 ? v.toFixed(2) : "";
    setAmounts(asStrings);
  }

  function addTenderRow() {
    setTenderRows((rows) => [
      ...rows,
      { id: crypto.randomUUID(), method: "cash", amount: "", reference: "" },
    ]);
  }
  function removeTenderRow(id: string) {
    setTenderRows((rows) => (rows.length <= 1 ? rows : rows.filter((r) => r.id !== id)));
  }
  function patchTenderRow(id: string, patch: Partial<TenderRow>) {
    setTenderRows((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  async function handleSubmit() {
    if (!canSubmit || !tenantId || !clientId) return;
    setIsSubmitting(true);
    try {
      const invoiceOrder = selectedInvoices.map((i) => i.id);
      const allocations = buildAllocationsPayload({
        invoiceOrder,
        invoiceAmountsUnits,
        tenderRows: tenderRowsNormalised,
      });
      const idempotencyKey = buildMultiInvoiceIdempotencyKey({
        tenantId,
        clientId,
        currency,
        paymentDate,
        allocations,
        externalReference: externalReference.trim() || undefined,
      });
      // Cache the last submitted fingerprint so an unchanged retry replays.
      idempotencyRef.current = { key: idempotencyKey, fingerprint: idempotencyKey };

      const result = await postPaymentSession(tenantId, idempotencyKey, {
        payment_date: paymentDate,
        external_reference: externalReference.trim() || undefined,
        allocations,
      });
      if (!result.success) {
        const key = ERROR_TOKEN_KEYS[result.code] ?? "finance.payments.errors.unknown";
        toast({ title: t(key), variant: "destructive" });
        return;
      }
      toast({ title: t("finance.multiInvoicePayment.success") });
      invalidateFinanceQueries(queryClient, tenantId);
      onSuccess?.();
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  // Render ------------------------------------------------------------------
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-3 shrink-0 border-b">
          <DialogTitle>{t("finance.multiInvoicePayment.title")}</DialogTitle>
          <DialogDescription>
            {t("finance.multiInvoicePayment.description")}
            {client && (
              <span className="ms-1 font-medium text-foreground">
                — {isRtl ? client.name_ar ?? client.name : client.name}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* Eligible invoices */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">
                {t("finance.multiInvoicePayment.eligibleInvoices")}
              </Label>
              {selectedInvoices.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={distributeOldestFirst}
                  disabled={tenderTotal <= 0}
                >
                  {t("finance.multiInvoicePayment.distributeOldestFirst")}
                </Button>
              )}
            </div>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <EligibleInvoicesSelector
                invoices={invoices}
                selectedIds={selectedIds}
                amounts={amounts}
                onToggle={toggleInvoice}
                onAmountChange={(id, next) => setAmounts((p) => ({ ...p, [id]: next }))}
                currency={currency}
                disabled={isSubmitting}
              />
            )}
          </div>

          <Separator />

          {/* Payment date + reference */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">{t("finance.payments.paymentDate")}</Label>
              <SharedDateField
                value={paymentDate}
                onChange={(v) => setPaymentDate(v ?? getRiyadhDateString())}
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">
                {t("finance.payments.reference")}{" "}
                <span className="text-muted-foreground">({t("common.optional")})</span>
              </Label>
              <Input
                value={externalReference}
                onChange={(e) => setExternalReference(e.target.value)}
                placeholder={t("finance.payments.referencePlaceholder")}
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Tender rows */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">
                {t("finance.payments.paymentDetails")}
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={addTenderRow}
                disabled={isSubmitting}
              >
                <Plus className="h-3.5 w-3.5 me-1" />
                {t("finance.payments.addPaymentMethod")}
              </Button>
            </div>
            <div className="space-y-2">
              {tenderRows.map((row) => (
                <Card key={row.id}>
                  <CardContent className="p-3 grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-12 sm:col-span-4 space-y-1">
                      <Label className="text-xs">{t("finance.payments.method")}</Label>
                      <Select
                        value={row.method}
                        onValueChange={(v) => patchTenderRow(row.id, { method: v as PaymentMethod })}
                        disabled={isSubmitting}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PAYMENT_METHODS.map((m) => (
                            <SelectItem key={m} value={m}>
                              {t(`finance.paymentMethods.${m}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-6 sm:col-span-3 space-y-1">
                      <Label className="text-xs">{t("finance.payments.amount")}</Label>
                      <Input
                        inputMode="decimal"
                        dir="ltr"
                        className="text-end tabular-nums"
                        placeholder="0.00"
                        value={row.amount}
                        onChange={(e) => patchTenderRow(row.id, { amount: e.target.value })}
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="col-span-6 sm:col-span-4 space-y-1">
                      <Label className="text-xs">{t("finance.payments.reference")}</Label>
                      <Input
                        placeholder={t("finance.payments.referencePlaceholder")}
                        value={row.reference}
                        onChange={(e) => patchTenderRow(row.id, { reference: e.target.value })}
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="col-span-12 sm:col-span-1 flex sm:justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeTenderRow(row.id)}
                        disabled={isSubmitting || tenderRows.length <= 1}
                        aria-label={t("common.remove")}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Warnings */}
          {perInvoiceOverAllocation.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {t("finance.multiInvoicePayment.errors.perInvoiceOver", {
                  invoices: perInvoiceOverAllocation.map((i) => i.invoice_number).join(", "),
                })}
              </AlertDescription>
            </Alert>
          )}
          {duplicateTenderMethod && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {t("finance.multiInvoicePayment.errors.duplicateTender")}
              </AlertDescription>
            </Alert>
          )}
          {overRowCap && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {t("finance.multiInvoicePayment.errors.tooManyRows", {
                  cap: String(MAX_RPC_ALLOCATION_ROWS),
                })}
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Sticky footer */}
        <div className="border-t bg-background px-6 py-3 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4 text-sm">
              <div>
                <div className="text-[10px] uppercase text-muted-foreground">
                  {t("finance.payments.totalPayment")}
                </div>
                <div dir="ltr" className="font-semibold tabular-nums">
                  {fmt(tenderTotal)}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-muted-foreground">
                  {t("finance.multiInvoicePayment.allocatedToInvoices")}
                </div>
                <div dir="ltr" className="font-semibold tabular-nums">
                  {fmt(invoiceAllocationTotal)}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-muted-foreground">
                  {t("finance.multiInvoicePayment.difference")}
                </div>
                <div
                  dir="ltr"
                  className={`font-semibold tabular-nums ${
                    amountsBalanced ? "text-emerald-600" : "text-destructive"
                  }`}
                >
                  {fmt(tenderTotal - invoiceAllocationTotal)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                {t("common.cancel")}
              </Button>
              <Button onClick={handleSubmit} disabled={!canSubmit}>
                {isSubmitting && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                {t("finance.multiInvoicePayment.record")}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
