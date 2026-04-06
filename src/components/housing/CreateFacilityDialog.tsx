import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useI18n } from "@/i18n";
import { useFacilityAreas } from "@/hooks/housing/useFacilityAreas";
import { useHousingUnits } from "@/hooks/housing/useHousingUnits";
import { Loader2 } from "lucide-react";
import { FacilityCreationForm, FACILITY_CATEGORY, type FacilityFormData } from "./FacilityCreationForm";

// ─── Props ──────────────────────────────
interface CreateFacilityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lockedBranchId?: string;
  effectiveBranchId?: string;
}

export function CreateFacilityDialog({
  open,
  onOpenChange,
  lockedBranchId,
  effectiveBranchId,
}: CreateFacilityDialogProps) {
  const { t } = useI18n();
  const { createArea, isCreating } = useFacilityAreas();
  const { createUnit } = useHousingUnits();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const formDataRef = useRef<FacilityFormData | null>(null);

  const handleFormDataChange = useCallback((data: FacilityFormData) => {
    formDataRef.current = data;
  }, []);

  const handleValidityChange = useCallback((valid: boolean) => {
    setIsValid(valid);
  }, []);

  const handleSubmit = async () => {
    const data = formDataRef.current;
    if (!data || !data.name || !data.branchId) return;
    setIsSubmitting(true);

    try {
      const category = FACILITY_CATEGORY[data.facilityType];
      const isHousing = category === 'housing';
      const isOpenArea = category === 'open_area';
      const isActivity = category === 'activity';

      let metadata: Record<string, unknown> | undefined;
      if (isActivity) {
        metadata = {};
        if (data.facilityType === 'arena' && data.actDimensions) metadata.dimensions = data.actDimensions;
        if (data.facilityType === 'round_pen' && data.actDiameter) metadata.diameter = data.actDiameter;
        metadata.covered = data.actCovered;
        if (data.facilityType !== 'wash_area') metadata.footing = data.actFooting;
        if (data.facilityType === 'wash_area') {
          if (data.actWashPoints) metadata.wash_points = Number(data.actWashPoints);
          metadata.water_type = data.actWaterType;
        }
      }

      const newArea = await createArea({
        branch_id: data.branchId,
        name: data.name,
        name_ar: data.nameAr || undefined,
        code: data.code || undefined,
        facility_type: data.facilityType,
        capacity: isOpenArea && data.capacity ? Number(data.capacity) : undefined,
        area_size: isOpenArea && data.areaSize ? Number(data.areaSize) : undefined,
        shade: isOpenArea ? data.shade : undefined,
        has_water: isOpenArea ? data.hasWater : undefined,
        metadata,
      });

      if (isHousing && data.unitCount > 0 && newArea?.id) {
        const defaultUnitType = data.facilityType === 'isolation' ? 'isolation_room' : 'stall';
        for (const room of data.previewRooms) {
          const unitType = room.fn === 'default' ? defaultUnitType : room.fn;
          await createUnit({
            branch_id: data.branchId,
            area_id: newArea.id,
            code: room.code,
            name: room.code,
            unit_type: unitType as any,
            occupancy: 'single',
            capacity: 1,
          });
        }
      }

      onOpenChange(false);
    } catch (error) {
      // Handled by mutation error handlers
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0">
        {/* Sticky header */}
        <div className="sticky top-0 z-10 bg-background border-b px-6 py-4">
          <DialogHeader>
            <DialogTitle>{t('housing.create.title')}</DialogTitle>
            <DialogDescription>{t('housing.create.description')}</DialogDescription>
          </DialogHeader>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <FacilityCreationForm
            lockedBranchId={lockedBranchId}
            defaultBranchId={effectiveBranchId}
            onFormDataChange={handleFormDataChange}
            onValidityChange={handleValidityChange}
          />
        </div>

        {/* Sticky footer */}
        <div className="sticky bottom-0 z-10 bg-background border-t px-6 py-3 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || isCreating || isSubmitting}
          >
            {(isCreating || isSubmitting) ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              t('common.create')
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Re-export helpers used by other components
export { FACILITY_CATEGORY, FACILITY_ICONS } from "./FacilityCreationForm";
export type { FacilityCategory, RoomFunction, LayoutMode, StartSide } from "./FacilityCreationForm";
