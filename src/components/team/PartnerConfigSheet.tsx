import { useState, useEffect, useCallback } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Building2, Save, Loader2, Shield, ChevronDown, Plus, Trash2,
  Calendar, Eye, Beaker, Stethoscope, Baby, FileText,
  Link2, CheckCircle, XCircle, Activity,
} from "lucide-react";
import { useI18n } from "@/i18n";
import { useHorses } from "@/hooks/useHorses";
import { useConnectionHorseAccess } from "@/hooks/team/useConnectionHorseAccess";
import { useConsentGrants } from "@/hooks/connections/useConsentGrants";
import { useSharingAuditLog } from "@/hooks/connections/useSharingAuditLog";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale/ar";
import type { ConnectionWithDetails } from "@/hooks/connections/useConnectionsWithDetails";
import type { Database } from "@/integrations/supabase/types";

type ConsentGrant = Database["public"]["Tables"]["consent_grants"]["Row"];
type SharingAuditLog = Database["public"]["Tables"]["sharing_audit_log"]["Row"];

const OPERATIONAL_TYPES = ["doctor", "trainer", "vet_clinic"];

const RESOURCE_TYPE_ICONS: Record<string, typeof Beaker> = {
  lab_results: Beaker,
  lab_requests: Beaker,
  vet_records: Stethoscope,
  breeding_records: Baby,
};

const EVENT_ICONS: Record<string, typeof Activity> = {
  connection_created: Link2,
  connection_accepted: CheckCircle,
  connection_revoked: XCircle,
  grant_created: Shield,
  grant_revoked: XCircle,
  data_accessed: Eye,
};

interface PartnerConfigSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connection: ConnectionWithDetails;
  isMine: boolean;
  partnerName: string;
  partnerType: string | undefined;
}

export function PartnerConfigSheet({ open, onOpenChange, connection, isMine, partnerName, partnerType }: PartnerConfigSheetProps) {
  const { t, lang } = useI18n();
  const { activeTenant } = useTenant();
  const { user } = useAuth();
  const { horses } = useHorses();
  const isOperational = OPERATIONAL_TYPES.includes(partnerType || "");

  // Horse scoping (operational only)
  const { horseAccess, isLoading: loadingAccess, updateAccess } = useConnectionHorseAccess(
    isOperational && connection.status === "accepted" ? connection.id : null
  );

  // Outbound grants (grantor view)
  const {
    grants: outboundGrants,
    isLoading: grantsLoading,
    createGrant,
    revokeGrant,
  } = useConsentGrants(connection.id);

  // Inbound grants (recipient view)
  const isRecipient = connection.recipient_tenant_id === activeTenant?.tenant_id ||
    connection.recipient_profile_id === user?.id;
  const {
    grants: inboundGrants,
    isLoading: inboundLoading,
  } = useConsentGrants(connection.id, { recipientView: true });

  // Activity log
  const {
    logs,
    isLoading: logsLoading,
  } = useSharingAuditLog({ connectionId: connection.id }, 10);

  // Horse scoping state
  const [selectedHorses, setSelectedHorses] = useState<string[]>([]);
  const [accessLevel, setAccessLevel] = useState<"read" | "readwrite">("read");

  // Collapsible sections
  const [horseScopeOpen, setHorseScopeOpen] = useState(true);
  const [permissionsOpen, setPermissionsOpen] = useState(true);
  const [inboundOpen, setInboundOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);

  // Create grant dialog
  const [createGrantOpen, setCreateGrantOpen] = useState(false);
  const [newResourceType, setNewResourceType] = useState("lab_results");
  const [newAccessLevel, setNewAccessLevel] = useState("read");
  const [newDateFrom, setNewDateFrom] = useState("");
  const [newDateTo, setNewDateTo] = useState("");
  const [newForwardOnly, setNewForwardOnly] = useState(false);

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

  const handleSaveHorseAccess = () => {
    updateAccess.mutate({ horseIds: selectedHorses, accessLevel });
  };

  const handleCreateGrant = async () => {
    await createGrant.mutateAsync({
      connectionId: connection.id,
      resourceType: newResourceType,
      accessLevel: newAccessLevel,
      dateFrom: newDateFrom || undefined,
      dateTo: newDateTo || undefined,
      forwardOnly: newForwardOnly,
    });
    setCreateGrantOpen(false);
    setNewResourceType("lab_results");
    setNewAccessLevel("read");
    setNewDateFrom("");
    setNewDateTo("");
    setNewForwardOnly(false);
  };

  const handleRevokeGrant = (grantId: string) => {
    revokeGrant.mutate(grantId);
  };

  const tenantTypeLabelMap: Record<string, Record<string, string>> = {
    ar: { stable: "الإسطبل", lab: "المختبر", laboratory: "المختبر", doctor: "الطبيب", clinic: "العيادة", vet_clinic: "العيادة البيطرية", trainer: "المدرب", horse_owner: "مالك خيل" },
    en: { stable: "Stable", lab: "Laboratory", laboratory: "Laboratory", doctor: "Doctor", clinic: "Clinic", vet_clinic: "Vet Clinic", trainer: "Trainer", horse_owner: "Horse Owner" },
  };
  const getTenantTypeLabel = (type: string | undefined) => {
    if (!type) return t("teamPartners.partnerTypes.organization");
    const map = tenantTypeLabelMap[lang] || tenantTypeLabelMap.en;
    return map[type.toLowerCase()] || type.charAt(0).toUpperCase() + type.slice(1);
  };
  const partnerTypeLabel = getTenantTypeLabel(partnerType);

  const dateLocale = lang === "ar" ? { locale: ar } : {};

  const resourceTypeLabel = (rt: string) =>
    t(`connections.grants.resourceTypes.${rt}`) || rt;

  const ResourceIcon = ({ type }: { type: string }) => {
    const Icon = RESOURCE_TYPE_ICONS[type] || FileText;
    return <Icon className="w-4 h-4 text-muted-foreground shrink-0" />;
  };

  const renderGrant = (grant: ConsentGrant, showRevoke: boolean) => (
    <Card key={grant.id} className="overflow-hidden">
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <ResourceIcon type={grant.resource_type} />
            <span className="text-sm font-medium truncate">
              {resourceTypeLabel(grant.resource_type)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Badge variant={grant.status === "active" ? "default" : "secondary"} className="text-[10px]">
              {t(`connections.grants.status.${grant.status}`)}
            </Badge>
            {showRevoke && grant.status === "active" && (
              <Button
                variant="ghost" size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => handleRevokeGrant(grant.id)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className="text-[10px]">
            {t(`connections.grants.accessLevels.${grant.access_level}`)}
          </Badge>
          {grant.forward_only && (
            <Badge variant="outline" className="text-[10px]">
              {t("connections.grants.forwardOnly")}
            </Badge>
          )}
        </div>
        {(grant.date_from || grant.date_to) && (
          <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3" />
            <span>{grant.date_from || "∞"} → {grant.date_to || "∞"}</span>
          </div>
        )}
        <p className="text-[10px] text-muted-foreground mt-1">
          {formatDistanceToNow(new Date(grant.created_at), { addSuffix: true, ...dateLocale })}
        </p>
      </CardContent>
    </Card>
  );

  const renderActivityItem = (log: SharingAuditLog) => {
    const Icon = EVENT_ICONS[log.event_type] || Activity;
    return (
      <div key={log.id} className="flex items-start gap-2.5 py-2">
        <div className="rounded-full p-1.5 bg-muted shrink-0 mt-0.5">
          <Icon className="w-3 h-3" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-medium capitalize">
              {t(`teamPartners.partnerDetail.events.${log.event_type}`) || log.event_type.replace(/_/g, " ")}
            </span>
            {log.resource_type && (
              <Badge variant="secondary" className="text-[9px]">
                {resourceTypeLabel(log.resource_type)}
              </Badge>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground">
            {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, ...dateLocale })}
          </p>
        </div>
      </div>
    );
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-[95vw] sm:w-[480px] p-0">
          <div className="p-4 pb-0">
            <SheetHeader>
              <SheetTitle>{t("teamPartners.partnerDetail.title")}</SheetTitle>
              <SheetDescription>{t("teamPartners.partnerDetail.description")}</SheetDescription>
            </SheetHeader>
          </div>

          <ScrollArea className="h-[calc(100vh-100px)] px-4 pb-6">
            <div className="space-y-4 pt-4 pb-8">
              {/* ── Partner Summary ── */}
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

              {/* Partner type */}
              <div className="flex items-center gap-2 p-2.5 rounded-lg border bg-card">
                <Shield className="w-4 h-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-[10px] text-muted-foreground">{t("teamPartners.partnerConfig.partnerType")}</p>
                  <p className="text-xs font-medium">{partnerTypeLabel}</p>
                </div>
              </div>

              {/* ── Operational: Horse Scoping ── */}
              {isOperational && connection.status === "accepted" && isMine && (
                <>
                  <Separator />
                  <Collapsible open={horseScopeOpen} onOpenChange={setHorseScopeOpen}>
                    <CollapsibleTrigger className="flex items-center justify-between w-full py-1">
                      <Label className="cursor-pointer">{t("teamPartners.partnerConfig.horseScope")}</Label>
                      <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${horseScopeOpen ? "rotate-180" : ""}`} />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-3 pt-2">
                      <p className="text-xs text-muted-foreground">{t("teamPartners.partnerConfig.horseScopeDesc")}</p>
                      {loadingAccess ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        </div>
                      ) : horses.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-2">{t("teamPartners.setup.noHorses")}</p>
                      ) : (
                        <ScrollArea className="max-h-[160px] border rounded-lg p-2">
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
                      <div className="space-y-1.5">
                        <Label className="text-xs">{t("teamPartners.partnerConfig.accessLevel")}</Label>
                        <Select value={accessLevel} onValueChange={(v) => setAccessLevel(v as "read" | "readwrite")}>
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="read">{t("teamPartners.partnerConfig.readOnly")}</SelectItem>
                            <SelectItem value="readwrite">{t("teamPartners.partnerConfig.readWrite")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button variant="gold" size="sm" className="w-full" onClick={handleSaveHorseAccess} disabled={updateAccess.isPending}>
                        {updateAccess.isPending
                          ? <Loader2 className="w-4 h-4 me-2 animate-spin" />
                          : <Save className="w-4 h-4 me-2" />}
                        {t("teamPartners.partnerConfig.save")}
                      </Button>
                    </CollapsibleContent>
                  </Collapsible>
                </>
              )}

              {/* Service info */}
              {!isOperational && connection.status === "accepted" && (
                <div className="p-3 rounded-lg border bg-card">
                  <p className="text-xs text-muted-foreground">
                    {t("teamPartners.partnerConfig.serviceInfo")}
                  </p>
                </div>
              )}

              {/* ── Data Sharing Permissions ── */}
              {connection.status === "accepted" && (
                <>
                  <Separator />
                  <Collapsible open={permissionsOpen} onOpenChange={setPermissionsOpen}>
                    <CollapsibleTrigger className="flex items-center justify-between w-full py-1">
                      <Label className="cursor-pointer flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5" />
                        {t("teamPartners.partnerDetail.dataSharing")}
                      </Label>
                      <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${permissionsOpen ? "rotate-180" : ""}`} />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-3 pt-2">
                      <p className="text-xs text-muted-foreground">
                        {t("teamPartners.partnerDetail.dataSharingDesc")}
                      </p>

                      {grantsLoading ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        </div>
                      ) : outboundGrants.length === 0 ? (
                        <div className="text-center py-4 border border-dashed rounded-lg">
                          <Shield className="w-6 h-6 mx-auto mb-1.5 text-muted-foreground/50" />
                          <p className="text-xs text-muted-foreground">{t("teamPartners.partnerDetail.noPermissions")}</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {outboundGrants.map(g => renderGrant(g, true))}
                        </div>
                      )}

                      {isMine && (
                        <Button
                          variant="outline" size="sm" className="w-full gap-1.5"
                          onClick={() => setCreateGrantOpen(true)}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          {t("teamPartners.partnerDetail.addPermission")}
                        </Button>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                </>
              )}

              {/* ── Inbound / Shared With Me ── */}
              {connection.status === "accepted" && isRecipient && (
                <>
                  <Separator />
                  <Collapsible open={inboundOpen} onOpenChange={setInboundOpen}>
                    <CollapsibleTrigger className="flex items-center justify-between w-full py-1">
                      <Label className="cursor-pointer flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5" />
                        {t("teamPartners.partnerDetail.sharedWithYou")}
                      </Label>
                      <div className="flex items-center gap-1.5">
                        {inboundGrants.length > 0 && (
                          <Badge variant="secondary" className="text-[10px]">{inboundGrants.length}</Badge>
                        )}
                        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${inboundOpen ? "rotate-180" : ""}`} />
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-3 pt-2">
                      {inboundLoading ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        </div>
                      ) : inboundGrants.length === 0 ? (
                        <div className="text-center py-4 border border-dashed rounded-lg">
                          <Eye className="w-6 h-6 mx-auto mb-1.5 text-muted-foreground/50" />
                          <p className="text-xs text-muted-foreground">{t("teamPartners.partnerDetail.noInboundData")}</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {inboundGrants.map(g => renderGrant(g, false))}
                        </div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                </>
              )}

              {/* ── Activity History ── */}
              {connection.status === "accepted" && (
                <>
                  <Separator />
                  <Collapsible open={activityOpen} onOpenChange={setActivityOpen}>
                    <CollapsibleTrigger className="flex items-center justify-between w-full py-1">
                      <Label className="cursor-pointer flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5" />
                        {t("teamPartners.partnerDetail.activity")}
                      </Label>
                      <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${activityOpen ? "rotate-180" : ""}`} />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-2">
                      {logsLoading ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        </div>
                      ) : logs.length === 0 ? (
                        <div className="text-center py-4 border border-dashed rounded-lg">
                          <Activity className="w-6 h-6 mx-auto mb-1.5 text-muted-foreground/50" />
                          <p className="text-xs text-muted-foreground">{t("teamPartners.partnerDetail.noActivity")}</p>
                        </div>
                      ) : (
                        <div className="divide-y">
                          {logs.map(renderActivityItem)}
                        </div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                </>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* ── Create Permission Dialog ── */}
      <Dialog open={createGrantOpen} onOpenChange={setCreateGrantOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("teamPartners.partnerDetail.addPermission")}</DialogTitle>
            <DialogDescription>{t("teamPartners.partnerDetail.addPermissionDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Resource type */}
            <div className="space-y-2">
              <Label>{t("teamPartners.partnerDetail.dataType")}</Label>
              <Select value={newResourceType} onValueChange={setNewResourceType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["lab_results", "lab_requests", "vet_records", "breeding_records"].map(rt => (
                    <SelectItem key={rt} value={rt}>
                      <div className="flex items-center gap-2">
                        <ResourceIcon type={rt} />
                        <span>{resourceTypeLabel(rt)}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">
                {t(`teamPartners.partnerDetail.dataTypeHints.${newResourceType}`)}
              </p>
            </div>

            {/* Access level */}
            <div className="space-y-2">
              <Label>{t("teamPartners.partnerConfig.accessLevel")}</Label>
              <Select value={newAccessLevel} onValueChange={setNewAccessLevel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="read">{t("connections.grants.accessLevels.read")}</SelectItem>
                  <SelectItem value="write">{t("connections.grants.accessLevels.write")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date range */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">{t("connections.grants.dateFrom")}</Label>
                <Input type="date" value={newDateFrom} onChange={e => setNewDateFrom(e.target.value)} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t("connections.grants.dateTo")}</Label>
                <Input type="date" value={newDateTo} onChange={e => setNewDateTo(e.target.value)} className="h-9" />
              </div>
            </div>

            {/* Forward only */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label className="text-sm">{t("connections.grants.forwardOnly")}</Label>
                <p className="text-[10px] text-muted-foreground">{t("connections.grants.forwardOnlyDesc")}</p>
              </div>
              <Switch checked={newForwardOnly} onCheckedChange={setNewForwardOnly} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateGrantOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleCreateGrant} disabled={createGrant.isPending}>
              {createGrant.isPending ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : null}
              {t("common.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
