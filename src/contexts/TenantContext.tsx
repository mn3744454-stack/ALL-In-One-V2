import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import { tenantSchema, safeValidate } from "@/lib/validations";
import { debugLog, debugError } from "@/lib/debug";
import { withTimeout, BOOTSTRAP_TIMEOUT_MS } from "@/lib/withTimeout";

type TenantType = "stable" | "clinic" | "lab" | "academy" | "pharmacy" | "transport" | "auction";
// Note: "admin" is kept for backward compatibility with existing database records but is not used in UI
type TenantRole = "owner" | "admin" | "manager" | "foreman" | "vet" | "trainer" | "employee";

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
  loading: boolean;
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
  const [loading, setLoading] = useState(true);
  const [tenantError, setTenantError] = useState<string | null>(null);

  const fetchTenants = useCallback(async () => {
    log('fetchTenants start', { userId: user?.id });

    if (!user) {
      log('fetchTenants: no user, clearing state');
      setTenants([]);
      setActiveTenantState(null);
      setActiveRoleState(null);
      setLoading(false);
      setTenantError(null);
      return;
    }

    setLoading(true);
    setTenantError(null);

    try {
      log('Fetching tenant_members...');
      const { data, error } = await withTimeout(
        async () => supabase
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
          .eq("is_active", true),
        BOOTSTRAP_TIMEOUT_MS,
        'Fetch tenants'
      );

      if (error) {
        logError('fetchTenants query error', error);
        setTenantError('فشل في تحميل بيانات المنظمة. تحقق من الاتصال.');
        return;
      }

      log('fetchTenants success', { count: data?.length });

      if (data) {
        const memberships = data.map((m) => ({
          ...m,
          tenant: m.tenant as unknown as Tenant,
        })) as TenantMembership[];
        
        setTenants(memberships);

        // Set active tenant: prefer localStorage, then first tenant
        if (memberships.length > 0 && !activeTenant) {
          const storedTenantId = localStorage.getItem('activeTenantId');
          const storedMembership = storedTenantId 
            ? memberships.find(m => m.tenant_id === storedTenantId)
            : null;
          
          if (storedMembership) {
            // Use stored tenant (it's valid)
            setActiveTenantState(storedMembership);
            setActiveRoleState(storedMembership.role);
          } else {
            // Invalid or no stored tenant - fallback to first
            if (storedTenantId) {
              localStorage.removeItem('activeTenantId'); // Clean up invalid value
            }
            setActiveTenantState(memberships[0]);
            setActiveRoleState(memberships[0].role);
            localStorage.setItem('activeTenantId', memberships[0].tenant_id);
          }
        }
      }
    } catch (err) {
      logError('fetchTenants exception', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      
      if (errorMessage.includes('timed out')) {
        setTenantError('انتهت مهلة الاتصال. الاتصال بطيء.');
      } else {
        setTenantError('فشل في تحميل المنظمات. حاول مرة أخرى.');
      }
    } finally {
      setLoading(false);
      log('fetchTenants finally - loading set to false');
    }
  }, [user, activeTenant]);

  const retryTenantFetch = useCallback(() => {
    log('retryTenantFetch called');
    fetchTenants();
  }, [fetchTenants]);

  useEffect(() => {
    fetchTenants();
  }, [user]);

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
    setLoading(true);
    await fetchTenants();
  };

  const createTenant = async (tenantData: Partial<Tenant>): Promise<{
    data: Tenant | null;
    error: TenantOperationError | null;
  }> => {
    debugLog("=== CREATE TENANT START ===");
    debugLog("Input data", tenantData);

    // Ensure we are authenticated (avoid running inserts with anon role)
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

    // Prepare and validate input data
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

    // Step A: INSERT into tenants with retry on RLS error
    debugLog("Step A: Inserting into tenants...");
    
    const insertTenant = async (userId: string) => {
      return await supabase
        .from("tenants")
        .insert({
          name: validatedData.name,
          type: validatedData.type,
          description: validatedData.description,
          address: validatedData.address,
          phone: validatedData.phone,
          email: validatedData.email || null,
          owner_id: userId,
        })
        .select()
        .single();
    };

    const { data: tenant, error: tenantError } = await insertTenant(currentUserId);

    if (tenantError) {
      debugError("Step A FAILED", {
        message: tenantError.message,
        code: tenantError.code,
        details: tenantError.details,
        hint: tenantError.hint,
      });
      return { 
        data: null, 
        error: {
          step: "tenant_insert",
          message: tenantError.message,
          code: tenantError.code,
          details: tenantError.details,
          hint: tenantError.hint,
        }
      };
    }
    debugLog("Step A SUCCESS", { id: tenant.id, name: tenant.name });

    // Step B: INSERT into tenant_members
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
      debugError("Step B FAILED", {
        message: memberError.message,
        code: memberError.code,
        details: memberError.details,
        hint: memberError.hint,
      });
      
      // Rollback: Delete orphan tenant (debug-only, no user-facing toast)
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

    // Step C: Initialize tenant capability defaults
    debugLog("Step C: Initializing tenant capability defaults...");
    const { error: rpcError } = await supabase.rpc('initialize_tenant_defaults', {
      p_tenant_id: tenant.id,
      p_tenant_type: tenant.type
    });

    if (rpcError) {
      // Non-blocking - log warning but don't fail onboarding
      debugError("Step C WARNING - Failed to initialize defaults (non-blocking)", {
        message: rpcError.message,
      });
      // Continue with tenant creation - defaults will apply at runtime via useModuleAccess fallbacks
    } else {
      debugLog("Step C SUCCESS - Tenant capability defaults initialized");
    }

    // Refresh tenants and return success
    debugLog("Refreshing tenants...");
    await refreshTenants();
    debugLog("=== CREATE TENANT COMPLETE ===");
    
    return { data: tenant as Tenant, error: null };
  };

  return (
    <TenantContext.Provider
      value={{
        tenants,
        activeTenant,
        activeRole,
        loading,
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
