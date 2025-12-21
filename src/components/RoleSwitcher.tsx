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

type TenantRole = "owner" | "admin" | "manager" | "foreman" | "vet" | "trainer" | "employee";

const roleConfig: Record<TenantRole, { label: string; icon: React.ElementType; color: string }> = {
  owner: { label: "Owner", icon: Crown, color: "text-gold" },
  admin: { label: "Administrator", icon: UserCog, color: "text-purple-500" },
  manager: { label: "Manager", icon: UserCog, color: "text-indigo-500" },
  foreman: { label: "Foreman", icon: Hammer, color: "text-orange-500" },
  vet: { label: "Veterinarian", icon: Stethoscope, color: "text-emerald-500" },
  trainer: { label: "Trainer", icon: GraduationCap, color: "text-blue-500" },
  employee: { label: "Employee", icon: User, color: "text-slate-500" },
};

export const RoleSwitcher = () => {
  const { activeTenant, activeRole, setActiveRole } = useTenant();

  if (!activeTenant || !activeRole) {
    return null;
  }

  const currentRole = roleConfig[activeRole];
  const RoleIcon = currentRole?.icon || Shield;

  // For now, users have one role per tenant - but the UI supports switching
  const availableRoles: TenantRole[] = [activeTenant.role];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <RoleIcon className={`w-4 h-4 ${currentRole?.color}`} />
          <span className="text-sm">{currentRole?.label}</span>
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[180px]">
        <DropdownMenuLabel>Active Role</DropdownMenuLabel>
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
              <span className="flex-1">{config.label}</span>
              {activeRole === role && <Check className="w-4 h-4 text-gold" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
