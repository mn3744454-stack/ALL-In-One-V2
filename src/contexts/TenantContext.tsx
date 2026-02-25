import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import { tenantSchema, safeValidate } from "@/lib/validations";
import { debugLog, debugError } from "@/lib/debug";
import { toast } from "sonner";

type TenantType = "stable" | "clinic" | "lab" | "academy" | "pharmacy" | "transport" | "auction" | "horse_owner" | "trainer" | "doctor";
// Note: "admin" is kept for backward compatibility with existing database records but is not used in UI
type TenantRole = "owner" | "admin" | "manager" | "foreman" | "vet" | "trainer" | "employee";
export type WorkspaceMode = "personal" | "organization";

interface Tenant {
  id: string;
  name: string;
  type: TenantType;
  description: string | null;
  logo_url: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  slug: string | null;
  is_public: boolean | null;
}

interface TenantMembership {
  id: string;
  tenant_id: string;
  user_id: string;
  role: TenantRole;
  can_invite: boolean;
  can_manage_horses: boolean;
  is_active: boolean;
  tenant: Tenant;
}

// Structured error for createTenant operations
export interface TenantOperationError {
  step: "validation" | "tenant_insert" | "member_insert";
  message: string;
  code?: string;
  details?: string;
  hint?: string;
}

interface TenantContextType {
  tenants: TenantMembership[];
  activeTenant: TenantMembership | null;
  activeRole: TenantRole | null;
  workspaceMode: WorkspaceMode;
  setWorkspaceMode: (mode: WorkspaceMode) => void;
  loading: boolean;
  /** True once the initial tenant fetch + rehydration is complete */
  tenantHydrated: boolean;
  tenantError: string | null;
  retryTenantFetch: () => void;
  setActiveTenant: (tenantId: string) => void;
  setActiveRole: (role: TenantRole) => void;
  refreshTenants: () => Promise<void>;
  createTenant: (tenant: Partial<Tenant>) => Promise<{ data: Tenant | null; error: TenantOperationError | null }>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

const DEV = import.meta.env.DEV;
const log = (msg: string, data?: unknown) => {
  if (DEV) console.log(`[TENANT] ${msg}`, data ?? '');
};
const logError = (msg: string, error?: unknown) => {
  if (DEV) console.error(`[TENANT ERROR] ${msg}`, error ?? '');
};

export const TenantProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [tenants, setTenants] = useState<TenantMembership[]>([]);
  const [activeTenant, setActiveTenantState] = useState<TenantMembership | null>(null);
  const [activeRole, setActiveRoleState] = useState<TenantRole | null>(null);
  const [workspaceMode, setWorkspaceModeState] = useState<WorkspaceMode>(() => {
    const stored = localStorage.getItem("workspaceMode");
    return (stored === "personal" || stored === "organization") ? stored : "organization";
  });
  const [loading, setLoading] = useState(true);
  const [tenantHydrated, setTenantHydrated] = useState(false);
  const [tenantError, setTenantError] = useState<string | null>(null);
  
  // Track if we've ever had a user - to distinguish "not logged in yet" from "logged out"
  const hadUserRef = useRef(false);
  
  // Network resilience refs
  const lastGoodTenantsRef = useRef<TenantMembership[]>([]);
  const didHydrateOnceRef = useRef(false);
  const clearSessionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Track previous user ID to avoid redundant fetches on same user
  const prevUserIdRef = useRef<string | null>(null);

  // Workspace mode setter with persistence
  const setWorkspaceMode = useCallback((mode: WorkspaceMode) => {
    setWorkspaceModeState(mode);
    localStorage.setItem("workspaceMode", mode);
  }, []);

  const fetchTenants = useCallback(async (isBackground = false) => {
    log('fetchTenants start', { userId: user?.id, isBackground });

    // No user = no need to fetch tenants
    if (!user) {
      log('fetchTenants: no user, skipping fetch');
      return;
    }

    // Only set loading=true for initial/foreground fetches.
    // Background fetches must NOT flip loading, because that would cause
    // WorkspaceRouteGuard to unmount children (killing open modals).
    if (!isBackground) {
      setLoading(true);
    }
    setTenantError(null);

    try {
      log('Fetching tenant_members...');
      const { data, error } = await supabase
        .from("tenant_members")
        .select(`
          id,
          tenant_id,
          user_id,
          role,
          can_invite,
          can_manage_horses,
          is_active,
          tenant:tenants(*)
        `)
        .eq("user_id", user.id)
        .eq("is_active", true);

      if (error) {
        logError('fetchTenants query error', error);
        // Keep last good tenants on error
        if (lastGoodTenantsRef.current.length > 0) {
          setTenants(lastGoodTenantsRef.current);
          log('Kept last good tenants on error', { count: lastGoodTenantsRef.current.length });
        }
        setTenantError('فشل في تحميل بيانات المنظمة. تحقق من الاتصال.');
        if (!isBackground) {
          setLoading(false);
          setTenantHydrated(true);
        }
        return;
      }

      log('fetchTenants success', { count: data?.length });

      if (data) {
        const memberships = data.map((m) => ({
          ...m,
          tenant: m.tenant as unknown as Tenant,
        })) as TenantMembership[];
        
        setTenants(memberships);
        lastGoodTenantsRef.current = memberships;
        didHydrateOnceRef.current = true;
        setTenantError(null);

        // Set active tenant: prefer localStorage, then first tenant
        if (memberships.length > 0) {
          const storedTenantId = localStorage.getItem('activeTenantId');
          const storedMembership = storedTenantId 
            ? memberships.find(m => m.tenant_id === storedTenantId)
            : null;
          
          if (storedMembership) {
            setActiveTenantState(storedMembership);
            setActiveRoleState(storedMembership.role);
          } else {
            if (storedTenantId) {
              localStorage.removeItem('activeTenantId');
            }
            setActiveTenantState(memberships[0]);
            setActiveRoleState(memberships[0].role);
            localStorage.setItem('activeTenantId', memberships[0].tenant_id);
          }
        } else {
          setActiveTenantState(null);
          setActiveRoleState(null);
          localStorage.removeItem('activeTenantId');
        }
      }
    } catch (err) {
      logError('fetchTenants exception', err);
      // Keep last good tenants on exception
      if (lastGoodTenantsRef.current.length > 0) {
        setTenants(lastGoodTenantsRef.current);
        log('Kept last good tenants on exception', { count: lastGoodTenantsRef.current.length });
      }
      setTenantError('فشل في تحميل المنظمات. حاول مرة أخرى.');
    } finally {
      if (!isBackground) {
        setLoading(false);
        setTenantHydrated(true);
        log('fetchTenants finally - loading set to false, tenantHydrated set to true');
      }
    }
  }, [user]);

  const retryTenantFetch = useCallback(() => {
    log('retryTenantFetch called');
    fetchTenants(false);
  }, [fetchTenants]);

  // User tracking with delayed localStorage clear for auth flicker resilience
  useEffect(() => {
    if (user) {
      // Cancel any pending session clear
      if (clearSessionTimeoutRef.current) {
        clearTimeout(clearSessionTimeoutRef.current);
        clearSessionTimeoutRef.current = null;
        log('Cancelled pending session clear - user returned');
      }
      hadUserRef.current = true;
      
      // Only fetch tenants if user ID actually changed (prevents re-fetch on TOKEN_REFRESHED)
      if (user.id !== prevUserIdRef.current) {
        log('User ID changed, fetching tenants', { prev: prevUserIdRef.current, new: user.id });
        prevUserIdRef.current = user.id;
        fetchTenants(false); // Initial/foreground fetch
      } else {
        log('Same user ID, skipping tenant re-fetch');
      }
    } else if (hadUserRef.current) {
      // User was present but now null - could be auth flicker or real logout
      log('User became null, scheduling delayed session clear');
      
      if (clearSessionTimeoutRef.current) {
        clearTimeout(clearSessionTimeoutRef.current);
      }
      
      clearSessionTimeoutRef.current = setTimeout(async () => {
        // Verify session is truly gone before clearing
        const { data: { session } } = await supabase.auth.getSession();
        if (session === null) {
          log('Session confirmed null after delay, clearing tenant state');
          setTenants([]);
          setActiveTenantState(null);
          setActiveRoleState(null);
          setLoading(false);
          setTenantHydrated(true);
          setTenantError(null);
          localStorage.removeItem('activeTenantId');
          localStorage.removeItem('workspaceMode');
          setWorkspaceModeState("organization");
          hadUserRef.current = false;
          lastGoodTenantsRef.current = [];
          didHydrateOnceRef.current = false;
          prevUserIdRef.current = null;
        } else {
          log('Session still valid after delay, keeping tenant state');
        }
        clearSessionTimeoutRef.current = null;
      }, 1000);
    } else {
      // Never had a user - initial load without auth
      setLoading(false);
      setTenantHydrated(true);
    }
  }, [user, fetchTenants]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (clearSessionTimeoutRef.current) {
        clearTimeout(clearSessionTimeoutRef.current);
      }
    };
  }, []);

  // Set default workspace mode based on tenants
  // ONLY force personal when we have definitively confirmed 0 tenants with no error
  useEffect(() => {
    if (!loading && didHydrateOnceRef.current && tenants.length === 0 && !tenantError) {
      setWorkspaceMode("personal");
    }
  }, [loading, tenants.length, tenantError, setWorkspaceMode]);

  // Show toast when tenant error occurs
  useEffect(() => {
    if (tenantError) {
      toast.error(tenantError, {
        action: {
          label: 'إعادة المحاولة',
          onClick: () => retryTenantFetch(),
        },
      });
    }
  }, [tenantError, retryTenantFetch]);

  const setActiveTenant = (tenantId: string) => {
    const membership = tenants.find((t) => t.tenant_id === tenantId);
    if (membership) {
      setActiveTenantState(membership);
      setActiveRoleState(membership.role);
      localStorage.setItem("activeTenantId", tenantId);
    }
  };

  const setActiveRole = (role: TenantRole) => {
    setActiveRoleState(role);
  };

  const refreshTenants = async () => {
    // Use background mode so it doesn't unmount children
    await fetchTenants(true);
  };

  const createTenant = async (tenantData: Partial<Tenant>): Promise<{
    data: Tenant | null;
    error: TenantOperationError | null;
  }> => {
    debugLog("=== CREATE TENANT START ===");
    debugLog("Input data", tenantData);

    try {
      const {
        data: { user: authUser },
        error: authUserError,
      } = await supabase.auth.getUser();

      if (authUserError || !authUser) {
        debugError("Not authenticated", authUserError);
        return {
          data: null,
          error: {
            step: "validation",
            message: "يجب تسجيل الدخول قبل إنشاء منظمة جديدة",
          },
        };
      }

      const currentUserId = authUser.id;
      debugLog("Using authenticated user", { user_id: currentUserId });

      const dataToValidate = {
        name: tenantData.name || "",
        type: tenantData.type || "stable",
        description: tenantData.description || null,
        address: tenantData.address || null,
        phone: tenantData.phone || null,
        email: tenantData.email || null,
        logo_url: tenantData.logo_url || null,
      };

      debugLog("Data to validate", dataToValidate);

      const validation = safeValidate(tenantSchema, dataToValidate);
      if (!validation.success) {
        debugError("Validation failed", validation.errors);
        return { 
          data: null, 
          error: { step: "validation", message: validation.errors.join(", ") } 
        };
      }
      debugLog("Validation passed");

      const validatedData = validation.data;

      debugLog("Step A: Inserting into tenants...");
      
      const { data: tenant, error: tenantError } = await supabase
        .from("tenants")
        .insert({
          name: validatedData.name,
          type: validatedData.type,
          description: validatedData.description,
          address: validatedData.address,
          phone: validatedData.phone,
          email: validatedData.email || null,
          owner_id: currentUserId,
        })
        .select()
        .single();

      if (tenantError || !tenant) {
        debugError("Step A FAILED", tenantError);
        return { 
          data: null, 
          error: {
            step: "tenant_insert",
            message: tenantError?.message || "فشل إنشاء المنشأة",
            code: tenantError?.code,
            details: tenantError?.details,
            hint: tenantError?.hint,
          }
        };
      }
      debugLog("Step A SUCCESS", { id: tenant.id, name: tenant.name });

      debugLog("Step B: Inserting into tenant_members...");
      
      const { error: memberError } = await supabase
        .from("tenant_members")
        .insert({
          tenant_id: tenant.id,
          user_id: currentUserId,
          role: "owner",
          can_invite: true,
          can_manage_horses: true,
        });

      if (memberError) {
        debugError("Step B FAILED", memberError);
        
        debugLog("Rolling back: Deleting orphan tenant...", { id: tenant.id });
        const { error: rollbackError } = await supabase
          .from("tenants")
          .delete()
          .eq("id", tenant.id);
        
        if (rollbackError) {
          debugError("Rollback FAILED - Orphan tenant may exist", {
            tenant_id: tenant.id,
            rollbackError: rollbackError.message,
          });
        } else {
          debugLog("Rollback SUCCESS - Orphan tenant deleted");
        }
        
        return { 
          data: null, 
          error: {
            step: "member_insert",
            message: memberError.message,
            code: memberError.code,
            details: memberError.details,
            hint: memberError.hint,
          }
        };
      }
      debugLog("Step B SUCCESS - Member created as owner");

      debugLog("Step C: Initializing tenant capability defaults...");
      
      try {
        const { error: rpcError } = await supabase.rpc('initialize_tenant_defaults', {
          p_tenant_id: tenant.id,
          p_tenant_type: tenant.type
        });

        if (rpcError) {
          debugError("Step C WARNING - Failed to initialize defaults (non-blocking)", {
            message: rpcError.message,
          });
        } else {
          debugLog("Step C SUCCESS - Tenant capability defaults initialized");
        }
      } catch (rpcFetchErr) {
        debugError("Step C fetch exception (non-blocking)", rpcFetchErr);
      }

      debugLog("Refreshing tenants...");
      await refreshTenants();
      debugLog("=== CREATE TENANT COMPLETE ===");
      
      return { data: tenant as Tenant, error: null };
      
    } catch (unexpectedError) {
      debugError("=== CREATE TENANT UNEXPECTED ERROR ===", unexpectedError);
      
      const errorMessage = unexpectedError instanceof Error 
        ? unexpectedError.message 
        : "حدث خطأ غير متوقع";
      
      return {
        data: null,
        error: {
          step: "tenant_insert",
          message: errorMessage,
        },
      };
    }
  };

  return (
    <TenantContext.Provider
      value={{
        tenants,
        activeTenant,
        activeRole,
        workspaceMode,
        setWorkspaceMode,
        loading,
        tenantHydrated,
        tenantError,
        retryTenantFetch,
        setActiveTenant,
        setActiveRole,
        refreshTenants,
        createTenant,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error("useTenant must be used within a TenantProvider");
  }
  return context;
};
