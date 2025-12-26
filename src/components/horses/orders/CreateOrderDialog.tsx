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
import { useIsMobile } from "@/hooks/use-mobile";
import { useHorses } from "@/hooks/useHorses";
import { useHorseOrderTypes } from "@/hooks/useHorseOrderTypes";
import { useTenantCapabilities } from "@/hooks/useTenantCapabilities";
import type { HorseOrder, CreateOrderData } from "@/hooks/useHorseOrders";

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

  const [loading, setLoading] = useState(false);
  const [horseId, setHorseId] = useState(defaultHorseId || "");
  const [orderTypeId, setOrderTypeId] = useState("");
  const [serviceMode, setServiceMode] = useState<"internal" | "external">("external");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [scheduledFor, setScheduledFor] = useState<Date | undefined>(undefined);
  const [notes, setNotes] = useState("");
  const [externalProviderName, setExternalProviderName] = useState("");
  const [internalResourceLabel, setInternalResourceLabel] = useState("");
  const [estimatedCost, setEstimatedCost] = useState("");

  // Get the selected order type's category
  const selectedType = activeTypes.find((t) => t.id === orderTypeId);
  const serviceModeOptions = getServiceModeOptions(selectedType?.category || null);

  // Reset service mode when order type changes
  useEffect(() => {
    if (serviceModeOptions.length === 1) {
      setServiceMode(serviceModeOptions[0].value);
    }
  }, [orderTypeId, serviceModeOptions]);

  // Populate form when editing
  useEffect(() => {
    if (editOrder) {
      setHorseId(editOrder.horse_id);
      setOrderTypeId(editOrder.order_type_id);
      setServiceMode(editOrder.service_mode);
      setPriority(editOrder.priority);
      setScheduledFor(editOrder.scheduled_for ? new Date(editOrder.scheduled_for) : undefined);
      setNotes(editOrder.notes || "");
      setExternalProviderName(editOrder.external_provider_name || "");
      const ref = editOrder.internal_resource_ref as Record<string, unknown> | null;
      setInternalResourceLabel((ref?.label as string) || "");
      setEstimatedCost(editOrder.estimated_cost?.toString() || "");
    } else {
      // Reset form
      setHorseId(defaultHorseId || "");
      setOrderTypeId("");
      setServiceMode("external");
      setPriority("medium");
      setScheduledFor(undefined);
      setNotes("");
      setExternalProviderName("");
      setInternalResourceLabel("");
      setEstimatedCost("");
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

  const formContent = (
    <div className="space-y-4 py-4">
      {/* Horse Selection */}
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

      {/* Order Type */}
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
                {type.category && (
                  <span className="text-muted-foreground ml-2">({type.category})</span>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Service Mode */}
      {orderTypeId && serviceModeOptions.length > 1 && (
        <div className="space-y-2">
          <Label>Service Mode *</Label>
          <Select value={serviceMode} onValueChange={(v) => setServiceMode(v as "internal" | "external")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {serviceModeOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Provider/Resource based on mode */}
      {serviceMode === "external" ? (
        <div className="space-y-2">
          <Label>External Provider</Label>
          <Input
            value={externalProviderName}
            onChange={(e) => setExternalProviderName(e.target.value)}
            placeholder="Provider name"
          />
        </div>
      ) : (
        <div className="space-y-2">
          <Label>Internal Resource</Label>
          <Input
            value={internalResourceLabel}
            onChange={(e) => setInternalResourceLabel(e.target.value)}
            placeholder="Resource/staff name"
          />
        </div>
      )}

      {/* Priority */}
      <div className="space-y-2">
        <Label>Priority</Label>
        <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Schedule */}
      <div className="space-y-2">
        <Label>Scheduled For</Label>
        <DateTimePicker
          value={scheduledFor}
          onChange={setScheduledFor}
          minDate={new Date()}
          maxDate={addYears(new Date(), 2)}
          placeholder="Select date and time"
        />
      </div>

      {/* Estimated Cost */}
      <div className="space-y-2">
        <Label>Estimated Cost (SAR)</Label>
        <Input
          type="number"
          value={estimatedCost}
          onChange={(e) => setEstimatedCost(e.target.value)}
          placeholder="0.00"
        />
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Additional details..."
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
          Save Draft
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

  const title = editOrder ? "Edit Order" : "Create Order";

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
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  );
}
