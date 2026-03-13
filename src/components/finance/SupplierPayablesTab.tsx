import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/i18n";
import { useSupplierPayables, type PayableStatus, type SupplierPayable } from "@/hooks/finance/useSupplierPayables";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  Plus,
  TrendingDown,
  DollarSign,
  CheckCircle,
  Clock,
  Search,
} from "lucide-react";

function PayableStatusBadge({ status }: { status: PayableStatus }) {
  const { t } = useI18n();
  const config: Record<PayableStatus, { label: string; className: string }> = {
    received: { label: t("finance.payables.statuses.received"), className: "bg-muted text-muted-foreground" },
    reviewed: { label: t("finance.payables.statuses.reviewed"), className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
    approved: { label: t("finance.payables.statuses.approved"), className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" },
    partially_paid: { label: t("finance.payables.statuses.partiallyPaid"), className: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300" },
    paid: { label: t("finance.payables.statuses.paid"), className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
    cancelled: { label: t("finance.payables.statuses.cancelled"), className: "bg-destructive/10 text-destructive" },
    disputed: { label: t("finance.payables.statuses.disputed"), className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" },
  };
  const c = config[status] || config.received;
  return <Badge variant="outline" className={cn("text-xs border-0", c.className)}>{c.label}</Badge>;
}

function CreatePayableDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { t } = useI18n();
  const { createPayable } = useSupplierPayables();
  const [supplierName, setSupplierName] = useState("");
  const [amount, setAmount] = useState("");
  const [sourceType, setSourceType] = useState("");
  const [sourceReference, setSourceReference] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = async () => {
    if (!supplierName.trim() || !amount) return;
    await createPayable.mutateAsync({
      supplier_name: supplierName.trim(),
      amount: Number(amount),
      source_type: sourceType || undefined,
      source_reference: sourceReference || undefined,
      description: description || undefined,
      due_date: dueDate || null,
      notes: notes || undefined,
    });
    onOpenChange(false);
    setSupplierName("");
    setAmount("");
    setSourceType("");
    setSourceReference("");
    setDescription("");
    setDueDate("");
    setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("finance.payables.create")}</DialogTitle>
          <DialogDescription>{t("finance.payables.createDesc")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-sm font-medium">{t("finance.payables.supplierName")}</label>
            <Input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} placeholder={t("finance.payables.supplierPlaceholder")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">{t("finance.payables.amount")}</label>
              <Input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} dir="ltr" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">{t("finance.payables.dueDate")}</label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">{t("finance.payables.sourceType")}</label>
              <Select value={sourceType} onValueChange={setSourceType}>
                <SelectTrigger><SelectValue placeholder={t("common.select")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="lab_invoice">{t("finance.payables.sources.lab")}</SelectItem>
                  <SelectItem value="clinic">{t("finance.payables.sources.clinic")}</SelectItem>
                  <SelectItem value="transport">{t("finance.payables.sources.transport")}</SelectItem>
                  <SelectItem value="feed">{t("finance.payables.sources.feed")}</SelectItem>
                  <SelectItem value="other">{t("finance.payables.sources.other")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">{t("finance.payables.reference")}</label>
              <Input value={sourceReference} onChange={(e) => setSourceReference(e.target.value)} placeholder={t("finance.payables.referencePlaceholder")} />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">{t("common.description")}</label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">{t("common.notes")}</label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleSubmit} disabled={!supplierName.trim() || !amount || createPayable.isPending}>
              {t("common.create")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function SupplierPayablesTab() {
  const { t, dir } = useI18n();
  const { payables, isLoading, stats, updatePayableStatus, recordPayablePayment, deletePayable } = useSupplierPayables();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [paymentDialog, setPaymentDialog] = useState<SupplierPayable | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");

  const filtered = payables.filter((p) => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        p.supplier_name.toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q) ||
        (p.source_reference || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleRecordPayment = async () => {
    if (!paymentDialog || !paymentAmount) return;
    await recordPayablePayment.mutateAsync({ id: paymentDialog.id, amount: Number(paymentAmount) });
    setPaymentDialog(null);
    setPaymentAmount("");
  };

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">{t("finance.payables.stats.pending")}</p>
            </div>
            <p className="text-lg font-bold mt-1">{stats.receivedCount + stats.approvedCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-destructive" />
              <p className="text-xs text-muted-foreground">{t("finance.payables.stats.outstanding")}</p>
            </div>
            <p className="text-lg font-bold font-mono tabular-nums text-destructive mt-1" dir="ltr">
              {formatCurrency(stats.totalOutstanding)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              <p className="text-xs text-muted-foreground">{t("finance.payables.stats.totalPaid")}</p>
            </div>
            <p className="text-lg font-bold font-mono tabular-nums text-primary mt-1" dir="ltr">
              {formatCurrency(stats.totalPaid)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">{t("finance.payables.stats.settled")}</p>
            </div>
            <p className="text-lg font-bold mt-1">{stats.paidCount}</p>
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
            placeholder={t("finance.payables.searchPlaceholder")}
            className="ps-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.all")}</SelectItem>
            <SelectItem value="received">{t("finance.payables.statuses.received")}</SelectItem>
            <SelectItem value="reviewed">{t("finance.payables.statuses.reviewed")}</SelectItem>
            <SelectItem value="approved">{t("finance.payables.statuses.approved")}</SelectItem>
            <SelectItem value="partially_paid">{t("finance.payables.statuses.partiallyPaid")}</SelectItem>
            <SelectItem value="paid">{t("finance.payables.statuses.paid")}</SelectItem>
            <SelectItem value="cancelled">{t("finance.payables.statuses.cancelled")}</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => setCreateOpen(true)} size="sm">
          <Plus className="h-4 w-4 me-1" />
          {t("finance.payables.create")}
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              {t("finance.payables.noPayables")}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("finance.payables.supplierName")}</TableHead>
                    <TableHead>{t("finance.payables.sourceType")}</TableHead>
                    <TableHead className="text-center">{t("finance.payables.amount")}</TableHead>
                    <TableHead className="text-center">{t("finance.payables.paid")}</TableHead>
                    <TableHead className="text-center">{t("finance.payables.remaining")}</TableHead>
                    <TableHead className="text-center">{t("common.status")}</TableHead>
                    <TableHead className="text-center">{t("finance.payables.dueDate")}</TableHead>
                    <TableHead className="text-center">{t("common.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p) => {
                    const remaining = Number(p.amount) - Number(p.amount_paid);
                    return (
                      <TableRow key={p.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{p.supplier_name}</p>
                            {p.description && <p className="text-xs text-muted-foreground">{p.description}</p>}
                            {p.source_reference && <p className="text-xs text-muted-foreground font-mono" dir="ltr">{p.source_reference}</p>}
                          </div>
                        </TableCell>
                        <TableCell>
                          {p.source_type && (
                            <Badge variant="outline" className="text-xs">
                              {t(`finance.payables.sources.${p.source_type}`) || p.source_type}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center font-mono tabular-nums" dir="ltr">
                          {formatCurrency(p.amount)}
                        </TableCell>
                        <TableCell className="text-center font-mono tabular-nums text-primary" dir="ltr">
                          {Number(p.amount_paid) > 0 ? formatCurrency(p.amount_paid) : "-"}
                        </TableCell>
                        <TableCell className={cn("text-center font-mono tabular-nums", remaining > 0 && "text-destructive")} dir="ltr">
                          {remaining > 0.01 ? formatCurrency(remaining) : "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          <PayableStatusBadge status={p.status} />
                        </TableCell>
                        <TableCell className="text-center font-mono text-sm" dir="ltr">
                          {p.due_date ? format(new Date(p.due_date), "dd/MM/yyyy") : "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex gap-1 justify-center">
                            {p.status === "received" && (
                              <Button size="sm" variant="outline" onClick={() => updatePayableStatus.mutate({ id: p.id, status: "approved" })}>
                                {t("finance.payables.approve")}
                              </Button>
                            )}
                            {["approved", "partially_paid"].includes(p.status) && (
                              <Button size="sm" variant="outline" onClick={() => { setPaymentDialog(p); setPaymentAmount(String(Number(p.amount) - Number(p.amount_paid))); }}>
                                {t("finance.payables.recordPayment")}
                              </Button>
                            )}
                            {["received", "reviewed"].includes(p.status) && (
                              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deletePayable.mutate(p.id)}>
                                {t("common.delete")}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <CreatePayableDialog open={createOpen} onOpenChange={setCreateOpen} />

      {/* Payment Dialog */}
      <Dialog open={!!paymentDialog} onOpenChange={(v) => !v && setPaymentDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("finance.payables.recordPayment")}</DialogTitle>
            <DialogDescription>{paymentDialog?.supplier_name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">{t("finance.payables.paymentAmount")}</label>
              <Input type="number" min="0" step="0.01" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} dir="ltr" />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setPaymentDialog(null)}>{t("common.cancel")}</Button>
              <Button onClick={handleRecordPayment} disabled={!paymentAmount || recordPayablePayment.isPending}>
                {t("common.confirm")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
