import { useMemo, useCallback } from "react";
import { useTenantCapabilities } from "@/hooks/useTenantCapabilities";

export interface LabFeatureFlags {
  enableLabFull: boolean;
  enableLabPos: boolean;
  enableLabClients: boolean;
  enableLabEmployees: boolean;
  enableLabEquipment: boolean;
  enableLabQuality: boolean;
  enableLabCredits: boolean;
  labStaffCanEdit: boolean;
}

export function useLabFeatures() {
  const { capabilities, loading, getCapabilityForCategory } = useTenantCapabilities();

  const labCapability = useMemo(
    () => getCapabilityForCategory("laboratory"),
    [getCapabilityForCategory, capabilities]
  );

  const config = useMemo(
    () => (labCapability?.config as Record<string, unknown>) || {},
    [labCapability]
  );

  const hasFeature = useCallback(
    (key: string): boolean => {
      return Boolean(config[key]);
    },
    [config]
  );

  const features: LabFeatureFlags = useMemo(
    () => ({
      enableLabFull: Boolean(config.enable_lab_full),
      enableLabPos: Boolean(config.enable_lab_pos),
      enableLabClients: Boolean(config.enable_lab_clients),
      enableLabEmployees: Boolean(config.enable_lab_employees),
      enableLabEquipment: Boolean(config.enable_lab_equipment),
      enableLabQuality: Boolean(config.enable_lab_quality),
      enableLabCredits: Boolean(config.enable_lab_credits),
      labStaffCanEdit: Boolean(config.lab_staff_can_edit),
    }),
    [config]
  );

  return {
    features,
    loading,
    hasFeature,
    creditsEnabled: features.enableLabCredits,
    isLabFullEnabled: features.enableLabFull,
    labCapability,
  };
}
