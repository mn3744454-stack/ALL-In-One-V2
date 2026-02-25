import { useMemo, useCallback } from "react";
import { useTenant } from "@/contexts/TenantContext";
import { useTenantCapabilities } from "@/hooks/useTenantCapabilities";
import type { Json } from "@/integrations/supabase/types";

export type LabMode = "none" | "requests" | "full";

export interface ModuleAccess {
  // Lab modes
  labMode: LabMode;
  canViewLabRequests: boolean;
  canManageLabFull: boolean;
  
  // Other modules (all use config.enabled)
  vetEnabled: boolean;
  housingEnabled: boolean;
  movementEnabled: boolean;
  breedingEnabled: boolean;
  
  // Tenant type helpers
  isLabTenant: boolean;
  isStable: boolean;
  isClinic: boolean;
  isDoctor: boolean;
  isVetIndependent: boolean;
  isTransport: boolean;
  isAcademy: boolean;
  
  // Actions
  setLabMode: (mode: LabMode) => Promise<void>;
  toggleModule: (category: string, enabled: boolean) => Promise<void>;
  
  loading: boolean;
}

// Helper to safely extract config value
function getConfigValue<T>(config: Json | undefined | null, key: string, defaultValue: T): T {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    return defaultValue;
  }
  const value = (config as Record<string, unknown>)[key];
  return (value !== undefined ? value : defaultValue) as T;
}

export function useModuleAccess(): ModuleAccess {
  const { activeTenant, loading: tenantLoading } = useTenant();
  const { capabilities, loading: capLoading, upsertCapability } = useTenantCapabilities();
  
  const tenantType = activeTenant?.tenant?.type;
  
  // Tenant type helpers
  const isLabTenant = tenantType === 'lab';
  const isStable = tenantType === 'stable';
  const isClinic = tenantType === 'clinic';
  const isDoctor = tenantType === 'doctor';
  const isVetIndependent = tenantType === 'doctor';
  const isTransport = tenantType === 'transport';
  const isAcademy = tenantType === 'academy';
  const isPharmacy = tenantType === 'pharmacy';
  
  // Get capability by category
  const getCapabilityConfig = useCallback((category: string): Json | null => {
    const cap = capabilities.find(c => c.category === category);
    return cap?.config ?? null;
  }, [capabilities]);
  
  // Compute lab mode from capabilities or defaults
  const labMode = useMemo((): LabMode => {
    const labConfig = getCapabilityConfig('laboratory');
    const configMode = getConfigValue<string>(labConfig, 'lab_mode', '');
    
    if (configMode === 'full' || configMode === 'requests' || configMode === 'none') {
      return configMode;
    }
    
    // Default based on tenant type
    if (isLabTenant) return 'full';
    if (isStable || isClinic) return 'requests';
    return 'none';
  }, [getCapabilityConfig, isLabTenant, isStable, isClinic]);
  
  // Compute vet/visits enabled
  const vetEnabled = useMemo((): boolean => {
    const vetConfig = getCapabilityConfig('vet');
    const configEnabled = getConfigValue<boolean | null>(vetConfig, 'enabled', null);
    
    if (configEnabled !== null) return configEnabled;
    
    // Default based on tenant type
    if (isClinic || isVetIndependent) return true;
    return false;
  }, [getCapabilityConfig, isClinic, isVetIndependent]);
  
  // Compute housing enabled
  const housingEnabled = useMemo((): boolean => {
    const housingConfig = getCapabilityConfig('housing');
    const configEnabled = getConfigValue<boolean | null>(housingConfig, 'enabled', null);
    
    if (configEnabled !== null) return configEnabled;
    
    // Default based on tenant type
    if (isStable || isClinic) return true;
    return false;
  }, [getCapabilityConfig, isStable, isClinic]);
  
  // Compute movement enabled
  const movementEnabled = useMemo((): boolean => {
    const movementConfig = getCapabilityConfig('movement');
    const configEnabled = getConfigValue<boolean | null>(movementConfig, 'enabled', null);
    
    if (configEnabled !== null) return configEnabled;
    
    // Default based on tenant type
    if (isStable || isClinic || isTransport) return true;
    return false;
  }, [getCapabilityConfig, isStable, isClinic, isTransport]);
  
  // Compute breeding enabled
  const breedingEnabled = useMemo((): boolean => {
    const breedingConfig = getCapabilityConfig('breeding');
    const configEnabled = getConfigValue<boolean | null>(breedingConfig, 'enabled', null);
    
    if (configEnabled !== null) return configEnabled;
    
    // Default based on tenant type
    if (isStable) return true;
    return false;
  }, [getCapabilityConfig, isStable]);
  
  // Actions
  const setLabMode = useCallback(async (mode: LabMode) => {
    await upsertCapability('laboratory', { config: { lab_mode: mode } as unknown as Json });
  }, [upsertCapability]);
  
  const toggleModule = useCallback(async (category: string, enabled: boolean) => {
    await upsertCapability(category, { config: { enabled } as unknown as Json });
  }, [upsertCapability]);
  
  return {
    labMode,
    canViewLabRequests: labMode !== 'none',
    canManageLabFull: labMode === 'full',
    
    vetEnabled,
    housingEnabled,
    movementEnabled,
    breedingEnabled,
    
    isLabTenant,
    isStable,
    isClinic,
    isDoctor,
    isVetIndependent,
    isTransport,
    isAcademy,
    
    setLabMode,
    toggleModule,
    
    loading: tenantLoading || capLoading,
  };
}
