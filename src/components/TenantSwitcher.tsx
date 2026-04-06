import { useTenant } from "@/contexts/TenantContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Building2, ChevronDown, Plus, Check, AlertCircle, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "@/i18n";

const tenantTypeLabels: Record<string, { en: string; ar: string }> = {
  stable: { en: "Stable", ar: "إسطبل" },
  clinic: { en: "Clinic", ar: "عيادة" },
  lab: { en: "Laboratory", ar: "مختبر" },
  academy: { en: "Academy", ar: "أكاديمية" },
  pharmacy: { en: "Pharmacy", ar: "صيدلية" },
  transport: { en: "Transport", ar: "نقل" },
  auction: { en: "Auction", ar: "مزاد" },
  horse_owner: { en: "Horse Owner", ar: "مالك خيل" },
  trainer: { en: "Trainer", ar: "مدرب" },
  doctor: { en: "Doctor", ar: "طبيب" },
};

const roleLabels: Record<string, { en: string; ar: string }> = {
  owner: { en: "Owner", ar: "مالك" },
  admin: { en: "Administrator", ar: "مدير" },
  manager: { en: "Manager", ar: "مدير" },
  foreman: { en: "Foreman", ar: "مشرف" },
  vet: { en: "Veterinarian", ar: "طبيب بيطري" },
  trainer: { en: "Trainer", ar: "مدرب" },
  employee: { en: "Employee", ar: "موظف" },
};

function getDisplayName(tenant: { name: string; name_ar?: string | null }, lang: string): string {
  if (lang === 'ar' && tenant.name_ar) return tenant.name_ar;
  return tenant.name;
}

export const TenantSwitcher = () => {
  const { tenants, activeTenant, setActiveTenant, tenantError, retryTenantFetch, loading } = useTenant();
  const navigate = useNavigate();
  const { lang, t } = useI18n();

  const getTypeLabel = (type: string) => tenantTypeLabels[type]?.[lang] || type;
  const getRoleLabel = (role: string) => roleLabels[role]?.[lang] || role;

  if (tenantError && tenants.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
          <AlertCircle className="w-4 h-4 text-destructive" />
        </div>
        <div className="flex flex-col items-start text-left">
          <span className="text-sm font-medium text-destructive">{t('common.error')}</span>
          <button
            onClick={retryTenantFetch}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            {t('common.refresh')}
          </button>
        </div>
      </div>
    );
  }

  if (loading && tenants.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
          <RefreshCw className="w-4 h-4 text-muted-foreground animate-spin" />
        </div>
        <span className="text-sm font-medium text-foreground">{t('common.loading')}</span>
      </div>
    );
  }

  if (tenants.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
          <Building2 className="w-4 h-4 text-muted-foreground" />
        </div>
        <span className="text-sm font-medium text-foreground">{t('common.noResults')}</span>
      </div>
    );
  }

  const activeName = activeTenant ? getDisplayName(activeTenant.tenant as any, lang) : '';
  const activeTypeLabel = activeTenant ? getTypeLabel(activeTenant.tenant.type) : '';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-1.5 max-w-[200px] px-2 sm:px-3">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gold/10 flex items-center justify-center shrink-0">
            <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gold" />
          </div>
          <div className="flex flex-col items-start text-left min-w-0">
            <span className="text-xs sm:text-sm font-medium truncate max-w-[120px]">
              {activeName || t('common.select')}
            </span>
            <span className="text-[10px] sm:text-xs text-muted-foreground truncate max-w-[120px]">
              {activeTypeLabel}
            </span>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[240px]">
        <DropdownMenuLabel>{lang === 'ar' ? 'مؤسساتك' : 'Your Organizations'}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {tenants.map((membership) => (
          <DropdownMenuItem
            key={membership.id}
            onClick={() => setActiveTenant(membership.tenant_id)}
            className="gap-3 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4 text-gold" />
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-sm font-medium truncate">
                {getDisplayName(membership.tenant as any, lang)}
              </span>
              <span className="text-xs text-muted-foreground">
                {getTypeLabel(membership.tenant.type)} · {getRoleLabel(membership.role)}
              </span>
            </div>
            {activeTenant?.tenant_id === membership.tenant_id && (
              <Check className="w-4 h-4 text-gold shrink-0" />
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => navigate("/select-role")}
          className="gap-2 cursor-pointer text-gold"
        >
          <Plus className="w-4 h-4" />
          {lang === 'ar' ? 'إضافة مؤسسة' : 'Add Organization'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
