import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import { tenantSchema, safeValidate } from "@/lib/validations";

type TenantType = "stable" | "clinic" | "lab" | "academy" | "pharmacy" | "transport" | "auction";
type TenantRole = "owner" | "admin" | "foreman" | "vet" | "trainer" | "employee";

interface Tenant {
  id: string;
  name: string;
  type: TenantType;
  description: string | null;
  logo_url: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
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

interface TenantContextType {
  tenants: TenantMembership[];
  activeTenant: TenantMembership | null;
  activeRole: TenantRole | null;
  loading: boolean;
  setActiveTenant: (tenantId: string) => void;
  setActiveRole: (role: TenantRole) => void;
  refreshTenants: () => Promise<void>;
  createTenant: (tenant: Partial<Tenant>) => Promise<{ data: Tenant | null; error: Error | null }>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const TenantProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [tenants, setTenants] = useState<TenantMembership[]>([]);
  const [activeTenant, setActiveTenantState] = useState<TenantMembership | null>(null);
  const [activeRole, setActiveRoleState] = useState<TenantRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTenants = async () => {
    if (!user) {
      setTenants([]);
      setActiveTenantState(null);
      setActiveRoleState(null);
      setLoading(false);
      return;
    }

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

    if (!error && data) {
      const memberships = data.map((m) => ({
        ...m,
        tenant: m.tenant as unknown as Tenant,
      })) as TenantMembership[];
      
      setTenants(memberships);

      // Set first tenant as active if none selected
      if (memberships.length > 0 && !activeTenant) {
        setActiveTenantState(memberships[0]);
        setActiveRoleState(memberships[0].role);
      }
    }

    setLoading(false);
  };

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

  const createTenant = async (tenantData: Partial<Tenant>) => {
    if (!user) {
      return { data: null, error: new Error("Not authenticated") };
    }

    // Validate input data
    const dataToValidate = {
      name: tenantData.name || "",
      type: tenantData.type || "stable",
      description: tenantData.description || null,
      address: tenantData.address || null,
      phone: tenantData.phone || null,
      email: tenantData.email || null,
      logo_url: tenantData.logo_url || null,
    };

    const validation = safeValidate(tenantSchema, dataToValidate);
    if (!validation.success) {
      return { data: null, error: new Error(validation.errors.join(", ")) };
    }

    const validatedData = validation.data;

    // Create tenant with owner_id set to current user
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .insert({
        name: validatedData.name,
        type: validatedData.type,
        description: validatedData.description,
        address: validatedData.address,
        phone: validatedData.phone,
        email: validatedData.email || null,
        logo_url: validatedData.logo_url,
        owner_id: user.id,
      })
      .select()
      .single();

    if (tenantError) {
      return { data: null, error: tenantError as Error };
    }

    // Add user as owner
    const { error: memberError } = await supabase
      .from("tenant_members")
      .insert({
        tenant_id: tenant.id,
        user_id: user.id,
        role: "owner",
        can_invite: true,
        can_manage_horses: true,
      });

    if (memberError) {
      return { data: null, error: memberError as Error };
    }

    await refreshTenants();
    return { data: tenant as Tenant, error: null };
  };

  return (
    <TenantContext.Provider
      value={{
        tenants,
        activeTenant,
        activeRole,
        loading,
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
