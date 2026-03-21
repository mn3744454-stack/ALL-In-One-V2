import { format } from "date-fns";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Baby, Calendar, MoreHorizontal, UserPlus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Foaling } from "@/hooks/breeding/useFoalings";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";

interface FoalingCardProps {
  foaling: Foaling;
  canManage?: boolean;
  onClick?: (foaling: Foaling) => void;
  onRegisterFoal?: (foaling: Foaling) => void;
}

const outcomeStyles: Record<string, string> = {
  live: "bg-emerald-500/20 text-emerald-600 border-emerald-500/30",
  stillborn: "bg-red-500/20 text-red-600 border-red-500/30",
  non_viable: "bg-amber-500/20 text-amber-600 border-amber-500/30",
  other: "bg-slate-500/20 text-slate-600 border-slate-500/30",
};

export function FoalingCard({
  foaling,
  canManage = false,
  onClick,
  onRegisterFoal,
}: FoalingCardProps) {
  const { t } = useI18n();

  const outcomeLabel = t(`breeding.foaling.outcomes.${foaling.outcome}`);
  const outcomeStyle = outcomeStyles[foaling.outcome] || outcomeStyles.other;

  const canRegister = canManage && foaling.outcome === "live" && !foaling.foal_horse_id;

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onClick?.(foaling)}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={foaling.mare?.avatar_url || undefined} />
              <AvatarFallback>{(foaling.mare?.name || "M")[0]}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold">{foaling.mare?.name || t("breeding.unknownMare")}</h3>
              {foaling.stallion && (
                <p className="text-xs text-muted-foreground">× {foaling.stallion.name}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <Badge variant="outline" className={cn("text-xs font-medium", outcomeStyle)}>
              {outcomeLabel}
            </Badge>
            {canRegister && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1 text-xs"
                onClick={() => onRegisterFoal?.(foaling)}
              >
                <UserPlus className="h-3 w-3" />
                {t("breeding.foaling.registerFoal")}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            <span>{format(new Date(foaling.foaling_date), "PP")}</span>
          </div>
          {foaling.foal_name && (
            <div className="flex items-center gap-1">
              <Baby className="h-3.5 w-3.5" />
              <span>{foaling.foal_name}</span>
            </div>
          )}
          {foaling.foal_sex && (
            <div className="flex items-center gap-1 text-xs">
              <span>{foaling.foal_sex === "male" ? "♂" : "♀"} {t(`horses.gender.${foaling.foal_sex}`)}</span>
            </div>
          )}
          {foaling.foal_horse_id && foaling.foal_horse && (
            <div className="col-span-2">
              <Badge variant="secondary" className="text-[10px]">
                {t("breeding.foaling.registered")}: {foaling.foal_horse.name}
              </Badge>
            </div>
          )}
        </div>

        {/* Registry status indicators for live foals */}
        {foaling.outcome === "live" && (
          <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t">
            <RegistryDot label={t("breeding.foaling.registry.notification")} status={foaling.registry_notification_status} />
            <RegistryDot label={t("breeding.foaling.registry.blood")} status={foaling.registry_blood_sample_status} />
            <RegistryDot label={t("breeding.foaling.registry.microchip")} status={foaling.registry_microchip_status} />
            <RegistryDot label={t("breeding.foaling.registry.registration")} status={foaling.registry_registration_status} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RegistryDot({ label, status }: { label: string; status: string }) {
  const color = status === "done" ? "bg-emerald-500" : status === "not_applicable" ? "bg-slate-300" : "bg-amber-400";
  return (
    <div className="flex items-center gap-1 text-[10px] text-muted-foreground" title={`${label}: ${status}`}>
      <span className={cn("w-1.5 h-1.5 rounded-full inline-block", color)} />
      {label}
    </div>
  );
}
