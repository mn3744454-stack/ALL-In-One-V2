import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

export type PersonStatus = "pending" | "active" | "hr_only";
export type EmploymentKind = "internal" | "external";

export interface UnifiedPerson {
  id: string; // synthetic key for dedup
  userId: string | null;
  fullName: string;
  avatarUrl: string | null;
  email: string | null;
  phone: string | null;

  // Platform membership
  memberId: string | null;
  role: string | null;
  hasPlatformAccess: boolean;

  // HR
  hrEmployeeId: string | null;
  employmentKind: EmploymentKind | null;
  employeeType: string | null;
  department: string | null;
  hasHrRecord: boolean;

  // Computed
  status: PersonStatus;
  needsSetup: boolean;
  createdAt: string;
}

export function useUnifiedTeam() {
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant_id;

  const { data: people = [], isLoading, error, refetch } = useQuery({
    queryKey: ["unified-team", tenantId],
    queryFn: async (): Promise<UnifiedPerson[]> => {
      if (!tenantId) return [];

      // Fetch members and employees in parallel
      const [membersRes, employeesRes] = await Promise.all([
        supabase
          .from("tenant_members")
          .select("id, user_id, role, is_active, created_at, profiles:user_id(id, full_name, avatar_url, email)")
          .eq("tenant_id", tenantId)
          .eq("is_active", true)
          .order("created_at", { ascending: true }),
        supabase
          .from("hr_employees")
          .select("id, user_id, full_name, email, phone, employee_type, department, employment_kind, avatar_url, is_active, created_at")
          .eq("tenant_id", tenantId)
          .eq("is_active", true)
          .order("full_name", { ascending: true }),
      ]);

      const members = (membersRes.data || []) as any[];
      const employees = (employeesRes.data || []) as any[];

      // Build map keyed by user_id for dedup
      const personMap = new Map<string, UnifiedPerson>();

      // Process members first
      for (const m of members) {
        const profile = m.profiles;
        const key = m.user_id || `member-${m.id}`;
        personMap.set(key, {
          id: key,
          userId: m.user_id,
          fullName: profile?.full_name || "",
          avatarUrl: profile?.avatar_url || null,
          email: profile?.email || null,
          phone: null,
          memberId: m.id,
          role: m.role,
          hasPlatformAccess: true,
          hrEmployeeId: null,
          employmentKind: null,
          employeeType: null,
          department: null,
          hasHrRecord: false,
          status: "active",
          needsSetup: false,
          createdAt: m.created_at,
        });
      }

      // Merge employees
      for (const e of employees) {
        const key = e.user_id || `hr-${e.id}`;
        const existing = personMap.get(key);
        if (existing) {
          // Merge HR into existing member
          existing.hrEmployeeId = e.id;
          existing.employmentKind = e.employment_kind || "external";
          existing.employeeType = e.employee_type;
          existing.department = e.department;
          existing.hasHrRecord = true;
          if (!existing.phone) existing.phone = e.phone;
          if (!existing.fullName) existing.fullName = e.full_name;
        } else {
          // HR-only person
          personMap.set(key, {
            id: key,
            userId: e.user_id || null,
            fullName: e.full_name || "",
            avatarUrl: e.avatar_url || null,
            email: e.email || null,
            phone: e.phone || null,
            memberId: null,
            role: null,
            hasPlatformAccess: false,
            hrEmployeeId: e.id,
            employmentKind: e.employment_kind || "external",
            employeeType: e.employee_type,
            department: e.department,
            hasHrRecord: true,
            status: "hr_only",
            needsSetup: false,
            createdAt: e.created_at,
          });
        }
      }

      return Array.from(personMap.values());
    },
    enabled: !!tenantId,
  });

  const counts = {
    total: people.length,
    active: people.filter(p => p.hasPlatformAccess).length,
    hrOnly: people.filter(p => !p.hasPlatformAccess && p.hasHrRecord).length,
    internal: people.filter(p => p.employmentKind === "internal").length,
    external: people.filter(p => p.employmentKind === "external").length,
  };

  return { people, counts, isLoading, error, refetch };
}
