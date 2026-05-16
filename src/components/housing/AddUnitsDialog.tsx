import { useMemo, useState, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SafeFormDialog } from "@/components/ui/safe-form-dialog";
import { useDirtyForm } from "@/hooks/useDirtyForm";
import { useI18n } from "@/i18n";
import { useHousingUnits } from "@/hooks/housing/useHousingUnits";
import { Loader2 } from "lucide-react";
import { RoomLayoutSetup, type RoomLayoutConfig } from "./RoomLayoutSetup";
import type { FacilityArea } from "@/hooks/housing/useFacilityAreas";

interface AddUnitsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  facility: FacilityArea;
  existingUnitCount: number;
}

export function AddUnitsDialog({ open, onOpenChange, facility, existingUnitCount }: AddUnitsDialogProps) {
  const { t } = useI18n();
  const { createUnit } = useHousingUnits();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [roomConfig, setRoomConfig] = useState<RoomLayoutConfig | null>(null);

  const handleConfigChange = useCallback((config: RoomLayoutConfig) => {
    setRoomConfig(config);
  }, []);

  // Normalized snapshot — represents user-editable settings, not transient
  // preview-array regeneration. Keeps dirty tracking stable across re-renders.
  const dirtySnapshot = useMemo(() => {
    if (!roomConfig) {
      return { count: 0, prefix: "", startNumber: 0, layoutMode: "", startSide: "", fns: [] as string[] };
    }
    return {
      count: roomConfig.unitCount,
      prefix: roomConfig.codePrefix,
      startNumber: roomConfig.startNumber,
      layoutMode: roomConfig.layoutMode,
      startSide: roomConfig.startSide,
      fns: roomConfig.previewRooms.map((r) => r.fn),
    };
  }, [roomConfig]);

  const { isDirty, resetBaseline } = useDirtyForm(dirtySnapshot, open);

  const handleSubmit = async () => {
    if (!roomConfig || roomConfig.previewRooms.length === 0) return;
    setIsSubmitting(true);
    const defaultUnitType = facility.facility_type === 'isolation' ? 'isolation_room' : 'stall';
    let successCount = 0;
    let failCount = 0;

    for (const room of roomConfig.previewRooms) {
      const unitType = room.fn === 'default' ? defaultUnitType : room.fn;
      try {
        await createUnit({
          branch_id: facility.branch_id,
          area_id: facility.id,
          code: room.code,
          name: room.code,
          unit_type: unitType as any,
          occupancy: 'single',
          capacity: 1,
        });
        successCount++;
      } catch {
        failCount++;
      }
    }

    setIsSubmitting(false);

    if (failCount > 0 && successCount > 0) {
      toast.info(`${successCount} units created, ${failCount} skipped (may already exist)`);
    } else if (failCount > 0 && successCount === 0) {
      toast.error(t('housing.create.allUnitsFailed' as any) || 'All units failed — they may already exist');
    }

    // Clear baseline so close path doesn't trigger discard confirmation.
    resetBaseline(dirtySnapshot);
    onOpenChange(false);
  };

  const handleOpenChange = (next: boolean) => {
    // Block all close paths while submitting.
    if (!next && isSubmitting) return;
    onOpenChange(next);
  };

  const effectiveIsDirty = isDirty && !isSubmitting;

  return (
    <SafeFormDialog
      open={open}
      onOpenChange={handleOpenChange}
      isDirty={effectiveIsDirty}
      className="!grid-rows-none !grid-cols-none !flex !flex-col sm:max-w-5xl max-h-[90vh] p-0 gap-0"
    >
      {/* Fixed header */}
      <div className="shrink-0 border-b px-6 py-4">
        <DialogHeader>
          <DialogTitle>{t('housing.create.addUnitsTitle')}</DialogTitle>
          <DialogDescription>
            {t('housing.create.addUnitsDesc').replace('{name}', facility.name)}
          </DialogDescription>
        </DialogHeader>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
        <RoomLayoutSetup
          facilityType={facility.facility_type}
          maxUnits={50}
          initialCount={2}
          initialPrefix="S"
          initialStartNumber={existingUnitCount + 1}
          onChange={handleConfigChange}
        />
      </div>

      {/* Fixed footer */}
      <div className="shrink-0 border-t px-6 py-3 flex justify-end gap-2">
        <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
          {t('common.cancel')}
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting || !roomConfig || roomConfig.previewRooms.length === 0}>
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : t('housing.create.addUnitsSubmit')}
        </Button>
      </div>
    </SafeFormDialog>
  );
}
