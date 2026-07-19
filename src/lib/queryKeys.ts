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
  labSamples: (tenantId?: string, filters?: Record<string, unknown>) => 
    ['lab-samples', tenantId, stableStringify(filters)] as const,
  labHorses: (tenantId?: string, filters?: Record<string, unknown>) => 
    ['lab-horses', tenantId, stableStringify(filters)] as const,
  labResults: (tenantId?: string) => ['lab-results', tenantId] as const,
  labRequests: (tenantId?: string, mode?: string) => ['lab-requests', tenantId, mode] as const,
  labTemplates: (tenantId?: string) => ['lab-templates', tenantId] as const,
  labTestTypes: (tenantId?: string) => ['lab-test-types', tenantId] as const,
  labCredits: (tenantId?: string) => ['lab-credits', tenantId] as const,
  labShares: (tenantId?: string) => ['lab-result-shares', tenantId] as const,
  labServiceTemplates: (tenantId?: string, serviceId?: string) => ['lab-service-templates', tenantId, serviceId] as const,
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
  vetTreatments: {
    root: ['vet-treatments'] as const,
    tenant: (tenantId?: string) => ['vet-treatments', tenantId] as const,
    lists: (tenantId?: string) => ['vet-treatments', tenantId, 'list'] as const,
    list: (tenantId?: string, filters?: Record<string, unknown>) =>
      ['vet-treatments', tenantId, 'list', stableStringify(filters)] as const,
    horse: (tenantId?: string, horseId?: string) =>
      ['vet-treatments', tenantId, 'horse', horseId] as const,
    detail: (tenantId?: string, treatmentId?: string) =>
      ['vet-treatments', tenantId, 'detail', treatmentId] as const,
  },
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

  // Tenant service categories (Slice 2A)
  serviceCategories: {
    root: ['service-categories'] as const,
    list: (tenantId?: string, includeArchived: boolean = false) =>
      ['service-categories', tenantId, includeArchived ? 'all' : 'active'] as const,
  },

  // 2QA-C — Canonical root for cross-tenant Laboratory catalog queries.
  // Category create/rename/archive/restore invalidates this root so an open
  // LabCatalogViewer refetches live category identity without a page refresh.
  labCatalog: {
    root: ['lab-catalog'] as const,
    list: (labTenantId?: string | null, search?: string, categoryId?: string | null) =>
      ['lab-catalog', labTenantId, search ?? '', categoryId ?? null] as const,
  },

  // Client statement (Slice 2)
  clientStatement: (
    tenantId?: string,
    clientId?: string,
    scope?: Record<string, unknown>
  ) => ['client-statement', tenantId, clientId, stableStringify(scope)] as const,
  clientFirstActivity: (tenantId?: string, clientId?: string) =>
    ['client-first-activity', tenantId, clientId] as const,
  customerBalances: (tenantId?: string) => ['customer-balances', tenantId] as const,
  customerLedgerBalance: (tenantId?: string, clientId?: string) =>
    ['v-customer-ledger-balances', tenantId, clientId] as const,
  
  // Academy
  academySessions: (tenantId?: string) => ['academy-sessions', tenantId] as const,
  academyBookings: (tenantId?: string) => ['academy-bookings', tenantId] as const,
  
  // Financial
  financialCategories: (tenantId?: string) => ['financial-categories', tenantId] as const,
  financialEntries: (tenantId?: string) => ['financial-entries', tenantId] as const,
  ledgerBalances: (tenantId?: string) => ['ledger-balances', tenantId] as const,
  
  // Party-Horse Links (UHP junction)
  partyHorseLinks: (tenantId?: string, filters?: Record<string, unknown>) => 
    ['party-horse-links', tenantId, stableStringify(filters)] as const,
  
  // Connections & Sharing
  connections: (tenantId?: string, userId?: string) => 
    ['connections', tenantId, userId] as const,
  connectionsWithDetails: (tenantId?: string, userId?: string) => 
    ['connections-with-details', tenantId, userId] as const,
  consentGrants: (tenantId?: string, connectionId?: string, recipientView?: boolean) =>
    ['consent-grants', tenantId, connectionId, recipientView] as const,
  sharingAuditLog: (tenantId?: string, connectionId?: string) =>
    ['sharing-audit-log', tenantId, connectionId] as const,
} as const;

export type QueryKeys = typeof queryKeys;
