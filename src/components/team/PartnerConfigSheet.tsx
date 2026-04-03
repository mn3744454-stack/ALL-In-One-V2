import { useState, useEffect } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Building2, Save, Loader2, Shield } from "lucide-react";
import { useI18n } from "@/i18n";
import { useHorses } from "@/hooks/useHorses";
import { useConnectionHorseAccess } from "@/hooks/team/useConnectionHorseAccess";
import type { ConnectionWithDetails } from "@/hooks/connections/useConnectionsWithDetails";

const OPERATIONAL_TYPES = ["doctor", "trainer", "vet_clinic"];

interface PartnerConfigSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connection: ConnectionWithDetails;
  isMine: boolean;
  partnerName: string;
  partnerType: string | undefined;
}

export function PartnerConfigSheet({ open, onOpenChange, connection, isMine, partnerName, partnerType }: PartnerConfigSheetProps) {
  const { t } = useI18n();
  const { horses } = useHorses();
  const isOperational = OPERATIONAL_TYPES.includes(partnerType || "");
  const { horseAccess, isLoading: loadingAccess, updateAccess } = useConnectionHorseAccess(
    isOperational && connection.status === "accepted" ? connection.id : null
  );

  const [selectedHorses, setSelectedHorses] = useState<string[]>([]);
  const [accessLevel, setAccessLevel] = useState<"read" | "readwrite">("read");

  useEffect(() => {
    if (horseAccess.length > 0) {
      setSelectedHorses(horseAccess.map(a => a.horse_id));
      setAccessLevel(horseAccess[0]?.access_level || "read");
    } else {
      setSelectedHorses([]);
      setAccessLevel("read");
    }
  }, [horseAccess]);

  const toggleHorse = (horseId: string) => {
    setSelectedHorses(prev =>
      prev.includes(horseId) ? prev.filter(id => id !== horseId) : [...prev, horseId]
    );
  };

  const handleSave = () => {
    updateAccess.mutate({ horseIds: selectedHorses, accessLevel }, {
      onSuccess: () => onOpenChange(false),
    });
  };

  const partnerTypeLabel = partnerType
    ? (t(`onboarding.tenantTypes.${partnerType}`) || partnerType)
    : t("teamPartners.partnerTypes.organization");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[95vw] sm:w-[440px]">
        <SheetHeader>
          <SheetTitle>{t("teamPartners.partnerConfig.title")}</SheetTitle>
          <SheetDescription>{t("teamPartners.partnerConfig.description")}</SheetDescription>
        </SheetHeader>

        <ScrollArea className="mt-4 h-[calc(100vh-140px)] pe-2">
          <div className="space-y-5">
            {/* Partner info */}
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5 text-accent-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{partnerName || t("teamPartners.unknownPartner")}</p>
                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                  <Badge
                    variant={connection.status === "accepted" ? "default" : "outline"}
                    className="text-[10px]"
                  >
                    {t(`teamPartners.connectionStatus.${connection.status}`) || connection.status}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px]">
                    {isOperational
                      ? t("teamPartners.partnerTypes.operational")
                      : t("teamPartners.partnerTypes.service")}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Partner type info */}
            <div className="flex items-center gap-2 p-2.5 rounded-lg border bg-card">
              <Shield className="w-4 h-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground">{t("teamPartners.partnerConfig.partnerType")}</p>
                <p className="text-xs font-medium">{partnerTypeLabel}</p>
              </div>
            </div>

            {/* Operational collaborator: horse scoping */}
            {isOperational && connection.status === "accepted" && isMine && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label>{t("teamPartners.partnerConfig.horseScope")}</Label>
                  <p className="text-xs text-muted-foreground">{t("teamPartners.partnerConfig.horseScopeDesc")}</p>

                  {loadingAccess ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : horses.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">{t("teamPartners.setup.noHorses")}</p>
                  ) : (
                    <ScrollArea className="max-h-[180px] border rounded-lg p-2">
                      <div className="space-y-2">
                        {horses.map((horse) => (
                          <div key={horse.id} className="flex items-center gap-2">
                            <Checkbox
                              id={`partner-horse-${horse.id}`}
                              checked={selectedHorses.includes(horse.id)}
                              onCheckedChange={() => toggleHorse(horse.id)}
                            />
                            <label htmlFor={`partner-horse-${horse.id}`} className="text-sm cursor-pointer flex-1">
                              {horse.name}
                            </label>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </div>

                {/* Access level */}
                <div className="space-y-2">
                  <Label>{t("teamPartners.partnerConfig.accessLevel")}</Label>
                  <Select value={accessLevel} onValueChange={(v) => setAccessLevel(v as "read" | "readwrite")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="read">{t("teamPartners.partnerConfig.readOnly")}</SelectItem>
                      <SelectItem value="readwrite">{t("teamPartners.partnerConfig.readWrite")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Save */}
                <Button variant="gold" className="w-full" onClick={handleSave} disabled={updateAccess.isPending}>
                  {updateAccess.isPending
                    ? <Loader2 className="w-4 h-4 me-2 animate-spin" />
                    : <Save className="w-4 h-4 me-2" />}
                  {t("teamPartners.partnerConfig.save")}
                </Button>
              </>
            )}

            {/* Service partner: read-only info */}
            {!isOperational && connection.status === "accepted" && (
              <>
                <Separator />
                <div className="p-3 rounded-lg border bg-card">
                  <p className="text-sm text-muted-foreground">
                    {t("teamPartners.partnerConfig.serviceInfo")}
                  </p>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
