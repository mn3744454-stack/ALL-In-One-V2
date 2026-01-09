/**
 * Centralized React Query keys for consistent caching and invalidation
 * Uses stable serialization for filter objects to ensure proper cache matching
 */

const stableStringify = (obj: Record<string, unknown> | undefined): string => {
  if (!obj) return '';
  return JSON.stringify(
    Object.keys(obj).sort().reduce((acc, key) => {
      acc[key] = obj[key];
      return acc;
    }, {} as Record<string, unknown>)
  );
};

export const queryKeys = {
  // Horses
  horses: (tenantId?: string) => ['horses', tenantId] as const,
  horse: (horseId: string) => ['horse', horseId] as const,
  horseSearch: (tenantId?: string, search?: string) => ['horse-search', tenantId, search] as const,
  
  // Laboratory
  labSamples: (tenantId?: string) => ['lab-samples', tenantId] as const,
  labResults: (tenantId?: string) => ['lab-results', tenantId] as const,
  labRequests: (tenantId?: string) => ['lab-requests', tenantId] as const,
  labTemplates: (tenantId?: string) => ['lab-templates', tenantId] as const,
  labTestTypes: (tenantId?: string) => ['lab-test-types', tenantId] as const,
  labCredits: (tenantId?: string) => ['lab-credits', tenantId] as const,
  labShares: (tenantId?: string) => ['lab-result-shares', tenantId] as const,
  labEvents: (tenantId?: string) => ['lab-events', tenantId] as const,
  
  // Movement
  movements: (tenantId?: string, filters?: Record<string, unknown>) => 
    ['horse-movements', tenantId, stableStringify(filters)] as const,
  locations: (tenantId?: string) => ['locations', tenantId] as const,
  
  // Housing
  facilityAreas: (tenantId?: string, branchId?: string) => 
    ['facility-areas', tenantId, branchId] as const,
  housingUnits: (tenantId?: string, filters?: Record<string, unknown>) => 
    ['housing-units', tenantId, stableStringify(filters)] as const,
  unitOccupants: (tenantId?: string, unitId?: string) => 
    ['unit-occupants', tenantId, unitId] as const,
  
  // Tenant & Capabilities
  capabilities: (tenantId?: string) => ['tenant-capabilities', tenantId] as const,
  tenants: (userId?: string) => ['tenants', userId] as const,
  
  // HR
  employees: (tenantId?: string) => ['hr-employees', tenantId] as const,
  employeeAssignments: (tenantId?: string, horseId?: string) => 
    ['hr-assignments', tenantId, horseId] as const,
  
  // Vet
  vetTreatments: (tenantId?: string) => ['vet-treatments', tenantId] as const,
  vetVisits: (tenantId?: string) => ['vet-visits', tenantId] as const,
  vetFollowups: (tenantId?: string) => ['vet-followups', tenantId] as const,
  vaccinations: (tenantId?: string) => ['vaccinations', tenantId] as const,
  vaccinationPrograms: (tenantId?: string) => ['vaccination-programs', tenantId] as const,
  
  // Breeding
  breedingAttempts: (tenantId?: string) => ['breeding-attempts', tenantId] as const,
  pregnancies: (tenantId?: string) => ['pregnancies', tenantId] as const,
  embryoTransfers: (tenantId?: string) => ['embryo-transfers', tenantId] as const,
  semenBatches: (tenantId?: string) => ['semen-batches', tenantId] as const,
  
  // Orders
  horseOrders: (tenantId?: string, filters?: Record<string, unknown>) => 
    ['horse-orders', tenantId, stableStringify(filters)] as const,
  orderTypes: (tenantId?: string) => ['order-types', tenantId] as const,
  orderEvents: (tenantId?: string, orderId?: string) => 
    ['order-events', tenantId, orderId] as const,
  
  // Clients & Providers
  clients: (tenantId?: string) => ['clients', tenantId] as const,
  serviceProviders: (tenantId?: string) => ['service-providers', tenantId] as const,
  
  // Services
  services: (tenantId?: string) => ['services', tenantId] as const,
  
  // Academy
  academySessions: (tenantId?: string) => ['academy-sessions', tenantId] as const,
  academyBookings: (tenantId?: string) => ['academy-bookings', tenantId] as const,
  
  // Financial
  financialCategories: (tenantId?: string) => ['financial-categories', tenantId] as const,
  financialEntries: (tenantId?: string) => ['financial-entries', tenantId] as const,
} as const;

export type QueryKeys = typeof queryKeys;
