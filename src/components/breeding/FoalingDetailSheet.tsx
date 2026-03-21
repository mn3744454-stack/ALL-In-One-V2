import { Baby, CheckCircle, Clock, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Foaling, useFoalings } from "@/hooks/breeding/useFoalings";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { displayHorseName, formatBreedingDate } from "@/lib/displayHelpers";

interface FoalingDetailSheetProps {
  foaling: Foaling | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canManage?: boolean;
}

export function FoalingDetailSheet({ foaling, open, onOpenChange, canManage }: FoalingDetailSheetProps) {
  const { t, lang } = useI18n();
  const { updateFoaling } = useFoalings();

  if (!foaling) return null;

  const outcomeLabel = t(`breeding.foaling.outcomes.${foaling.outcome}`);
  const isLive = foaling.outcome === "live";

  const handleRegistryUpdate = async (field: string, value: string) => {
    await updateFoaling(foaling.id, { [field]: value } as Partial<Foaling>);
  };

  const handleAliveToggle = async () => {
    await updateFoaling(foaling.id, { foal_alive: !foaling.foal_alive } as Partial<Foaling>);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-lg flex items-center gap-2">
            <Baby className="h-5 w-5 text-primary" />
            {t("breeding.foaling.detailTitle")}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          {/* Outcome badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={cn(
              "text-xs font-medium",
              foaling.outcome === "live" ? "bg-emerald-500/20 text-emerald-600 border-emerald-500/30" :
              foaling.outcome === "stillborn" ? "bg-red-500/20 text-red-600 border-red-500/30" :
              "bg-amber-500/20 text-amber-600 border-amber-500/30"
            )}>
              {outcomeLabel}
            </Badge>
            {isLive && (
              <Badge variant={foaling.foal_alive ? "default" : "destructive"} className="text-xs">
                {foaling.foal_alive ? t("breeding.foaling.alive") : t("breeding.foaling.deceased")}
              </Badge>
            )}
          </div>

          <Separator />

          {/* Core info */}
          <DetailRow label={t("breeding.detail.mare")} value={displayHorseName(foaling.mare?.name, foaling.mare?.name_ar, lang)} />
          {foaling.stallion && (
            <DetailRow label={t("breeding.detail.stallion")} value={displayHorseName(foaling.stallion.name, foaling.stallion.name_ar, lang)} />
          )}
          <DetailRow label={t("breeding.foaling.date")} value={formatBreedingDate(foaling.foaling_date)} />
          {foaling.foaling_time && (
            <DetailRow label={t("breeding.foaling.time")} value={foaling.foaling_time} />
          )}

          {isLive && foaling.foal_name && (
            <DetailRow label={t("breeding.foaling.foalName")} value={foaling.foal_name} />
          )}
          {foaling.foal_sex && (
            <DetailRow label={t("breeding.foaling.foalSex")} value={t(`horses.gender.${foaling.foal_sex}`)} />
          )}
          {foaling.foal_color && (
            <DetailRow label={t("breeding.foaling.foalColor")} value={foaling.foal_color} />
          )}

          {foaling.performer && (
            <DetailRow label={t("breeding.performedBy")} value={foaling.performer.full_name || "—"} />
          )}

          {/* Linked foal horse */}
          {foaling.foal_horse && (
            <>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground mb-1">{t("breeding.foaling.registeredFoalRecord")}</p>
                <Link to={`/dashboard/horses/${foaling.foal_horse.id}`}>
                  <Button variant="outline" size="sm" className="gap-2 w-full justify-start">
                    <Baby className="h-3.5 w-3.5" />
                    {displayHorseName(foaling.foal_horse.name, foaling.foal_horse.name_ar, lang)}
                  </Button>
                </Link>
              </div>
            </>
          )}

          {/* Registry tracking — only for live foals */}
          {isLive && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-medium mb-3">{t("breeding.foaling.registry.title")}</h4>
                <div className="space-y-3">
                  <RegistryField
                    label={t("breeding.foaling.registry.notification")}
                    value={foaling.registry_notification_status}
                    onChange={canManage ? (v) => handleRegistryUpdate("registry_notification_status", v) : undefined}
                    t={t}
                  />
                  <RegistryField
                    label={t("breeding.foaling.registry.blood")}
                    value={foaling.registry_blood_sample_status}
                    onChange={canManage ? (v) => handleRegistryUpdate("registry_blood_sample_status", v) : undefined}
                    t={t}
                  />
                  <RegistryField
                    label={t("breeding.foaling.registry.microchip")}
                    value={foaling.registry_microchip_status}
                    onChange={canManage ? (v) => handleRegistryUpdate("registry_microchip_status", v) : undefined}
                    t={t}
                  />
                  <RegistryField
                    label={t("breeding.foaling.registry.registration")}
                    value={foaling.registry_registration_status}
                    onChange={canManage ? (v) => handleRegistryUpdate("registry_registration_status", v) : undefined}
                    t={t}
                  />
                </div>
              </div>

              {/* Alive / deceased toggle */}
              {canManage && (
                <div className="pt-2">
                  <Button
                    variant={foaling.foal_alive ? "outline" : "destructive"}
                    size="sm"
                    className="w-full text-xs"
                    onClick={handleAliveToggle}
                  >
                    {foaling.foal_alive ? t("breeding.foaling.markDeceased") : t("breeding.foaling.markAlive")}
                  </Button>
                </div>
              )}
            </>
          )}

          {/* Notes */}
          {foaling.notes && (
            <>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground mb-1">{t("breeding.detail.notes")}</p>
                <p className="text-sm">{foaling.notes}</p>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-end">{value || "—"}</span>
    </div>
  );
}

interface RegistryFieldProps {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  t: (key: string) => string;
}

function RegistryField({ label, value, onChange, t }: RegistryFieldProps) {
  const icon = value === "done" ? <CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> :
               value === "not_applicable" ? <XCircle className="h-3.5 w-3.5 text-muted-foreground" /> :
               <Clock className="h-3.5 w-3.5 text-amber-500" />;

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm">
        {icon}
        <span>{label}</span>
      </div>
      {onChange ? (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="w-28 h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="z-[200]">
            <SelectItem value="pending">{t("breeding.foaling.registry.statuses.pending")}</SelectItem>
            <SelectItem value="done">{t("breeding.foaling.registry.statuses.done")}</SelectItem>
            <SelectItem value="not_applicable">{t("breeding.foaling.registry.statuses.na")}</SelectItem>
          </SelectContent>
        </Select>
      ) : (
        <Badge variant="outline" className="text-[10px]">
          {t(`breeding.foaling.registry.statuses.${value === "not_applicable" ? "na" : value}`)}
        </Badge>
      )}
    </div>
  );
}
