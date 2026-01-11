import { useState, useEffect } from "react";
import { addYears } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Separator } from "@/components/ui/separator";
import { useIsMobile } from "@/hooks/use-mobile";
import { useHorses } from "@/hooks/useHorses";
import { useHorseOrderTypes } from "@/hooks/useHorseOrderTypes";
import { useTenantCapabilities } from "@/hooks/useTenantCapabilities";
import { useI18n } from "@/i18n";
import { ServiceProviderSelector } from "./ServiceProviderSelector";
import { ClientSelector } from "./ClientSelector";
import { FinancialCategorization } from "./FinancialCategorization";
import { AssigneeSelector } from "./AssigneeSelector";
import type { HorseOrder, CreateOrderData } from "@/hooks/useHorseOrders";
import type { FinancialCategorization as FinCategorizationType, OrderCategory } from "@/hooks/useFinancialCategories";
import { ClipboardList, Building2, Users, Wallet, Calendar, FileText, UserCheck } from "lucide-react";

interface CreateOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editOrder?: HorseOrder | null;
  onSubmit: (data: CreateOrderData, isDraft: boolean) => Promise<void>;
  defaultHorseId?: string;
}

export function CreateOrderDialog({
  open,
  onOpenChange,
  editOrder,
  onSubmit,
  defaultHorseId,
}: CreateOrderDialogProps) {
  const isMobile = useIsMobile();
  const { horses } = useHorses();
  const { activeTypes } = useHorseOrderTypes();
  const { getServiceModeOptions } = useTenantCapabilities();
  const { t } = useI18n();

  const [loading, setLoading] = useState(false);
  const [horseId, setHorseId] = useState(defaultHorseId || "");
  const [orderTypeId, setOrderTypeId] = useState("");
  const [serviceMode, setServiceMode] = useState<"internal" | "external">("external");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [scheduledFor, setScheduledFor] = useState<Date | undefined>(undefined);
  const [notes, setNotes] = useState("");
  const [externalProviderName, setExternalProviderName] = useState("");
  const [externalProviderId, setExternalProviderId] = useState<string | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  const [internalResourceLabel, setInternalResourceLabel] = useState("");
  const [estimatedCost, setEstimatedCost] = useState("");
  const [financialCategorization, setFinancialCategorization] = useState<FinCategorizationType>({
    category: "veterinary",
    isIncome: false,
    taxCategory: "vat_standard",
    accountCode: "",
  });

  const selectedType = activeTypes.find((t) => t.id === orderTypeId);
  const serviceModeOptions = getServiceModeOptions(selectedType?.category || null);

  useEffect(() => {
    if (serviceModeOptions.length === 1) {
      setServiceMode(serviceModeOptions[0].value);
    }
  }, [orderTypeId, serviceModeOptions]);

  useEffect(() => {
    if (editOrder) {
      setHorseId(editOrder.horse_id);
      setOrderTypeId(editOrder.order_type_id);
      setServiceMode(editOrder.service_mode);
      setPriority(editOrder.priority);
      setScheduledFor(editOrder.scheduled_for ? new Date(editOrder.scheduled_for) : undefined);
      setNotes(editOrder.notes || "");
      setExternalProviderName(editOrder.external_provider_name || "");
      setExternalProviderId(editOrder.external_provider_id || null);
      setClientId(editOrder.client_id || null);
      setAssignedTo(editOrder.assigned_to || null);
      const ref = editOrder.internal_resource_ref as Record<string, unknown> | null;
      setInternalResourceLabel((ref?.label as string) || "");
      setEstimatedCost(editOrder.estimated_cost?.toString() || "");
      setFinancialCategorization({
        category: (editOrder.financial_category as any) || "veterinary",
        isIncome: editOrder.is_income,
        taxCategory: (editOrder.tax_category as any) || "vat_standard",
        accountCode: editOrder.account_code || "",
      });
    } else {
      setHorseId(defaultHorseId || "");
      setOrderTypeId("");
      setServiceMode("external");
      setPriority("medium");
      setScheduledFor(undefined);
      setNotes("");
      setExternalProviderName("");
      setExternalProviderId(null);
      setClientId(null);
      setAssignedTo(null);
      setInternalResourceLabel("");
      setEstimatedCost("");
      setFinancialCategorization({
        category: "veterinary",
        isIncome: false,
        taxCategory: "vat_standard",
        accountCode: "",
      });
    }
  }, [editOrder, defaultHorseId, open]);

  const handleSubmit = async (isDraft: boolean) => {
    if (!horseId || !orderTypeId) return;

    setLoading(true);
    try {
      const data: CreateOrderData = {
        horse_id: horseId,
        order_type_id: orderTypeId,
        service_mode: serviceMode,
        priority,
        status: isDraft ? "draft" : "pending",
        scheduled_for: scheduledFor ? scheduledFor.toISOString() : null,
        notes: notes || null,
        estimated_cost: estimatedCost ? parseFloat(estimatedCost) : null,
        is_income: financialCategorization.isIncome,
        client_id: clientId,
        external_provider_id: externalProviderId,
        assigned_to: assignedTo,
        financial_category: financialCategorization.category,
        tax_category: financialCategorization.taxCategory,
        account_code: financialCategorization.accountCode,
      };

      if (serviceMode === "external") {
        data.external_provider_name = externalProviderName || null;
      } else {
        data.internal_resource_ref = internalResourceLabel
          ? { label: internalResourceLabel, module: "manual" }
          : null;
      }

      await onSubmit(data, isDraft);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const SectionHeader = ({ icon: Icon, title }: { icon: React.ElementType; title: string }) => (
    <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-3">
      <Icon className="h-4 w-4" />
      <span>{title}</span>
    </div>
  );

  const formContent = (
    <div className="space-y-6 py-4">
      {/* Section 1: Basic Info */}
      <div>
        <SectionHeader icon={ClipboardList} title="Basic Information" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Horse *</Label>
            <Select value={horseId} onValueChange={setHorseId}>
              <SelectTrigger>
                <SelectValue placeholder="Select horse" />
              </SelectTrigger>
              <SelectContent>
                {horses.map((horse) => (
                  <SelectItem key={horse.id} value={horse.id}>
                    {horse.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Order Type *</Label>
            <Select value={orderTypeId} onValueChange={setOrderTypeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select order type" />
              </SelectTrigger>
              <SelectContent>
                {activeTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Separator />

      {/* Section 2: Service Provider */}
      <div>
        <SectionHeader icon={Building2} title="Service Provider" />
        {orderTypeId && serviceModeOptions.length > 1 && (
          <div className="space-y-2 mb-4">
            <Label>Service Type *</Label>
            <Select value={serviceMode} onValueChange={(v) => setServiceMode(v as "internal" | "external")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {serviceModeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.value === "internal" ? t("scope.internal") : t("scope.external")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {serviceMode === "external" ? (
          <div className="space-y-2">
            <Label>External Provider</Label>
            <ServiceProviderSelector
              selectedProviderId={externalProviderId}
              onProviderSelect={(id, provider) => {
                setExternalProviderId(id);
                setExternalProviderName(provider?.name || "");
              }}
              filterByType={selectedType?.category as any}
            />
          </div>
        ) : (
          <div className="space-y-2">
            <Label>Internal Resource</Label>
            <Input
              value={internalResourceLabel}
              onChange={(e) => setInternalResourceLabel(e.target.value)}
              placeholder="Employee/Department name"
            />
          </div>
        )}
      </div>

      <Separator />

      {/* Section 3: Client */}
      <div>
        <SectionHeader icon={Users} title="Client" />
        <ClientSelector
          selectedClientId={clientId}
          onClientSelect={(id) => setClientId(id)}
        />
      </div>

      <Separator />

      {/* Section 4: Assignee */}
      <div>
        <SectionHeader icon={UserCheck} title="Assignee" />
        <AssigneeSelector
          selectedAssigneeId={assignedTo}
          onAssigneeSelect={(id) => setAssignedTo(id)}
        />
      </div>

      <Separator />

      {/* Section 5: Financial */}
      <div>
        <SectionHeader icon={Wallet} title="Financial Classification" />
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Estimated Cost (SAR)</Label>
            <Input
              type="number"
              value={estimatedCost}
              onChange={(e) => setEstimatedCost(e.target.value)}
              placeholder="0.00"
              dir="ltr"
              className="text-left"
            />
          </div>
          <FinancialCategorization
            orderCategory={(selectedType?.category as OrderCategory) || "veterinary"}
            estimatedCost={estimatedCost ? parseFloat(estimatedCost) : 0}
            isExternalService={serviceMode === "external"}
            categorization={financialCategorization}
            onCategorizationChange={setFinancialCategorization}
          />
        </div>
      </div>

      <Separator />

      {/* Section 6: Schedule */}
      <div>
        <SectionHeader icon={Calendar} title="Schedule & Priority" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Scheduled Date</Label>
            <DateTimePicker
              value={scheduledFor}
              onChange={setScheduledFor}
              minDate={new Date()}
              maxDate={addYears(new Date(), 2)}
              placeholder="Select date and time"
            />
          </div>
          <div className="space-y-2">
            <Label>Priority</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">{t("severity.low")}</SelectItem>
                <SelectItem value="medium">{t("severity.medium")}</SelectItem>
                <SelectItem value="high">{t("severity.high")}</SelectItem>
                <SelectItem value="urgent">{t("severity.urgent")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Separator />

      {/* Section 7: Notes */}
      <div>
        <SectionHeader icon={FileText} title="Additional Notes" />
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add any additional details..."
          rows={3}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-4">
        <Button
          variant="outline"
          onClick={() => handleSubmit(true)}
          disabled={loading || !horseId || !orderTypeId}
          className="flex-1"
        >
          Save as Draft
        </Button>
        <Button
          onClick={() => handleSubmit(false)}
          disabled={loading || !horseId || !orderTypeId}
          className="flex-1"
        >
          {editOrder ? "Update" : "Create"} Order
        </Button>
      </div>
    </div>
  );

  const title = editOrder ? "Edit Order" : "Create New Order";

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{title}</SheetTitle>
          </SheetHeader>
          {formContent}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  );
}