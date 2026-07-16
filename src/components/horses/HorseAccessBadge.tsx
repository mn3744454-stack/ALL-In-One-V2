/**
 * Phase 1.e.f.8.1.3 — Access mode badge for the existing Horse Profile.
 * Pure presentational; consumes the envelope from useHorseFileAccess only.
 */
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/i18n";
import type { HorseAccessMode } from "@/hooks/useHorseFileAccess";

interface Props {
  mode: HorseAccessMode;
  /**
   * Retained for backwards compatibility with callers passing
   * `access.snapshot_only`. Phase 1.e.f.8.1.4.d.3.fix.1.pre.r1.fix.qa1.execution:
   * we no longer append a raw English "· snapshot" suffix, which was leaking
   * an internal technical term into the Arabic UI. Snapshot semantics are
   * an internal projection concept and are not user-facing here.
   */
  snapshotOnly?: boolean;
}

const AR: Record<HorseAccessMode, string> = {
  owner_authority: "مالك الخيل",
  co_owner_authority: "مالك مشارك",
  delegated_identity: "تفويض مالك",
  current_host_operational: "مضيف حالي",
  previous_host_historical: "مضيف سابق — للقراءة فقط",
  provider_scoped: "مزود خدمة",
  invited_owner_read: "دعوة مالك — للقراءة",
  shared_link_read: "رابط مشاركة — للقراءة",
  public_read: "عرض عام",
  owner_bridge_not_provisioned: "صلاحية المالك غير مفعّلة",
  local_tenant_horse: "سجل محلي",
  no_access: "بدون صلاحية",
};

const EN: Record<HorseAccessMode, string> = {
  owner_authority: "Owner",
  co_owner_authority: "Co-Owner",
  delegated_identity: "Delegated",
  current_host_operational: "Current Host",
  previous_host_historical: "Previous Host — Read Only",
  provider_scoped: "Provider Scope",
  invited_owner_read: "Invited Owner — Read",
  shared_link_read: "Shared Link — Read",
  public_read: "Public View",
  owner_bridge_not_provisioned: "Owner Bridge Pending",
  local_tenant_horse: "Local Record",
  no_access: "No Access",
};

export function HorseAccessBadge({ mode }: Props) {
  const { lang } = useI18n();
  const label = (lang === "ar" ? AR : EN)[mode] ?? mode;
  const variant: "default" | "secondary" | "outline" | "destructive" =
    mode === "owner_authority"
      ? "default"
      : mode === "no_access"
        ? "destructive"
        : mode === "current_host_operational"
          ? "secondary"
          : "outline";
  return (
    <Badge variant={variant} className="text-xs">
      {label}
    </Badge>
  );
}
