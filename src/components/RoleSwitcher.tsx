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
import { 
  Shield, 
  ChevronDown, 
  Check,
  Crown,
  UserCog,
  Hammer,
  Stethoscope,
  GraduationCap,
  User
} from "lucide-react";
import { useI18n } from "@/i18n";

type TenantRole = "owner" | "admin" | "manager" | "foreman" | "vet" | "trainer" | "employee";

const roleConfig: Record<TenantRole, { en: string; ar: string; icon: React.ElementType; color: string }> = {
  owner: { en: "Owner", ar: "مالك", icon: Crown, color: "text-gold" },
  admin: { en: "Administrator", ar: "مدير", icon: UserCog, color: "text-purple-500" },
  manager: { en: "Manager", ar: "مدير عام", icon: UserCog, color: "text-indigo-500" },
  foreman: { en: "Foreman", ar: "مشرف", icon: Hammer, color: "text-orange-500" },
  vet: { en: "Veterinarian", ar: "طبيب بيطري", icon: Stethoscope, color: "text-emerald-500" },
  trainer: { en: "Trainer", ar: "مدرب", icon: GraduationCap, color: "text-blue-500" },
  employee: { en: "Employee", ar: "موظف", icon: User, color: "text-slate-500" },
};

export const RoleSwitcher = () => {
  const { activeTenant, activeRole, setActiveRole } = useTenant();
  const { lang } = useI18n();

  if (!activeTenant || !activeRole) {
    return null;
  }

  const currentRole = roleConfig[activeRole];
  const RoleIcon = currentRole?.icon || Shield;
  const label = currentRole ? currentRole[lang] || currentRole.en : activeRole;

  const availableRoles: TenantRole[] = [activeTenant.role];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <RoleIcon className={`w-4 h-4 ${currentRole?.color}`} />
          <span className="text-sm">{label}</span>
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[180px]">
        <DropdownMenuLabel>{lang === 'ar' ? 'الدور الحالي' : 'Active Role'}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {availableRoles.map((role) => {
          const config = roleConfig[role];
          const Icon = config.icon;
          return (
            <DropdownMenuItem
              key={role}
              onClick={() => setActiveRole(role)}
              className="gap-2 cursor-pointer"
            >
              <Icon className={`w-4 h-4 ${config.color}`} />
              <span className="flex-1">{config[lang] || config.en}</span>
              {activeRole === role && <Check className="w-4 h-4 text-gold" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
