import { useState, useCallback } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { MobilePageHeader } from "@/components/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Users, Building2, UserPlus, Send, Clock, Check, X,
  Mail, Loader2, Settings2, Monitor, FileText, Briefcase,
} from "lucide-react";
import { useI18n } from "@/i18n";
import { useTenant } from "@/contexts/TenantContext";
import { useInvitations } from "@/hooks/useInvitations";
import { useConnectionsWithDetails } from "@/hooks/connections";
import { useUnifiedTeam } from "@/hooks/team/useUnifiedTeam";
import { useConnections } from "@/hooks/connections";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale/ar";
import { InvitePersonDialog } from "@/components/team/InvitePersonDialog";
import { AddPartnerDialog } from "@/components/connections/AddPartnerDialog";
import { PersonDetailSheet } from "@/components/team/PersonDetailSheet";
import { PartnerConfigSheet } from "@/components/team/PartnerConfigSheet";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useToast } from "@/hooks/use-toast";
import type { UnifiedPerson } from "@/hooks/team/useUnifiedTeam";
import type { ConnectionWithDetails } from "@/hooks/connections/useConnectionsWithDetails";

const DashboardTeamPartners = () => {
  const { t, lang } = useI18n();
  const { activeTenant, activeRole } = useTenant();
  const { toast: uiToast } = useToast();
  const canManage = activeRole === "owner" || activeRole === "manager";

  const { sentInvitations, receivedInvitations, respondToInvitation } = useInvitations();
  const { connections: connectionsWithDetails, isLoading: connectionsLoading, refetch: refetchConnections } = useConnectionsWithDetails();
  const { createConnection, acceptConnection, rejectConnection } = useConnections();
  const { people, counts, isLoading: teamLoading } = useUnifiedTeam();

  const [invitePersonOpen, setInvitePersonOpen] = useState(false);
  const [addPartnerOpen, setAddPartnerOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<UnifiedPerson | null>(null);
  const [selectedPartner, setSelectedPartner] = useState<ConnectionWithDetails | null>(null);
  const [invitePrefilledEmail, setInvitePrefilledEmail] = useState("");

  const pendingInvitations = sentInvitations.filter(i => i.status === "pending" || i.status === "preaccepted");
  const nonOwnerPeople = people.filter(p => p.role !== "owner");

  const handleAddPartner = async (recipientTenantId: string) => {
    await createConnection.mutateAsync({ connectionType: "b2b", recipientTenantId });
    setAddPartnerOpen(false);
    toast.success(t("teamPartners.partnerRequestSent"));
  };

  const handleInviteToPlatform = (person: UnifiedPerson) => {
    setInvitePrefilledEmail(person.email || "");
    setInvitePersonOpen(true);
  };

  const handleAcceptPartner = useCallback(async (conn: ConnectionWithDetails) => {
    try {
      await acceptConnection.mutateAsync(conn.token);

      // Apply link preset after acceptance
      setTimeout(async () => {
        const refetched = await refetchConnections();
        const acceptedConn = refetched.data?.find(
          (c) => c.token === conn.token && c.status === "accepted"
        );
        if (acceptedConn?.recipient_tenant_id && acceptedConn?.initiator_tenant_id) {
          const types = [
            acceptedConn.initiator_tenant_type,
            acceptedConn.recipient_tenant_type,
          ].sort();
          let preset: string | null = null;
          if (types.includes("laboratory") && types.includes("stable")) preset = "requests_and_results";
          else if (types.includes("clinic") && types.includes("stable")) preset = "appointments_and_records";
          else if (types.includes("clinic") && types.includes("laboratory")) preset = "referrals_and_results";

          if (preset) {
            try {
              await supabase.rpc("apply_link_preset", {
                _connection_id: acceptedConn.id,
                _preset_name: preset,
              });
              uiToast({ title: t("common.success"), description: t("connections.presetApplied") });
            } catch { /* preset failed silently */ }
          }
        }
      }, 500);
    } catch { /* error handled by hook */ }
  }, [acceptConnection, refetchConnections, uiToast, t]);

  const handleRejectPartner = useCallback(async (conn: ConnectionWithDetails) => {
    try {
      await rejectConnection.mutateAsync(conn.token);
    } catch { /* error handled by hook */ }
  }, [rejectConnection]);

  const personStatusIcon = (p: UnifiedPerson) => {
    if (p.status === "hr_only") return <Briefcase className="w-4 h-4 text-muted-foreground" />;
    return <Users className="w-4 h-4 text-primary" />;
  };

  return (
    <DashboardShell>
      <MobilePageHeader title={t("teamPartners.title")} backTo="/dashboard" />

      <div className="flex-1 p-4 lg:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header with actions */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div>
              <h1 className="text-xl font-bold text-foreground">{t("teamPartners.title")}</h1>
              <p className="text-sm text-muted-foreground mt-1">{t("teamPartners.subtitle")}</p>
            </div>
            {canManage && (
              <div className="flex gap-2">
                <Button variant="gold" size="sm" onClick={() => { setInvitePrefilledEmail(""); setInvitePersonOpen(true); }} className="gap-2">
                  <UserPlus className="w-4 h-4" />
                  <span>{t("teamPartners.invitePerson")}</span>
                </Button>
                <Button variant="outline" size="sm" onClick={() => setAddPartnerOpen(true)} className="gap-2">
                  <Building2 className="w-4 h-4" />
                  <span>{t("teamPartners.addPartner")}</span>
                </Button>
              </div>
            )}
          </div>

          {/* Summary counters */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="text-center p-2 rounded-lg border bg-card">
              <p className="text-lg font-bold text-foreground">{counts.total}</p>
              <p className="text-[10px] text-muted-foreground">{t("teamPartners.counts.total")}</p>
            </div>
            <div className="text-center p-2 rounded-lg border bg-card">
              <p className="text-lg font-bold text-foreground">{counts.active}</p>
              <p className="text-[10px] text-muted-foreground">{t("teamPartners.counts.withAccess")}</p>
            </div>
            <div className="text-center p-2 rounded-lg border bg-card">
              <p className="text-lg font-bold text-foreground">{counts.hrOnly}</p>
              <p className="text-[10px] text-muted-foreground">{t("teamPartners.counts.hrOnly")}</p>
            </div>
          </div>

          <Tabs defaultValue="people" className="space-y-4">
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="people" className="flex-1 sm:flex-none gap-1.5">
                <Users className="w-4 h-4" />
                {t("teamPartners.tabs.people")}
                {nonOwnerPeople.length > 0 && (
                  <Badge variant="secondary" className="text-[10px] h-4 min-w-[16px] p-0 flex items-center justify-center">
                    {nonOwnerPeople.length + pendingInvitations.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="partners" className="flex-1 sm:flex-none gap-1.5">
                <Building2 className="w-4 h-4" />
                {t("teamPartners.tabs.partners")}
                {(connectionsWithDetails?.length || 0) > 0 && (
                  <Badge variant="secondary" className="text-[10px] h-4 min-w-[16px] p-0 flex items-center justify-center">
                    {connectionsWithDetails?.length || 0}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* ── People Tab ── */}
            <TabsContent value="people" className="space-y-4">
              {/* Pending invitations */}
              {pendingInvitations.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {t("teamPartners.pendingInvitations")} ({pendingInvitations.length})
                  </h3>
                  {pendingInvitations.map((inv) => (
                    <Card key={inv.id} className="overflow-hidden border-dashed">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-warning/10 flex items-center justify-center shrink-0">
                            <Send className="w-4 h-4 text-warning" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {inv.invitee_email || (inv as any).invitee_phone || t("teamPartners.unknownInvitee")}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Badge variant="outline" className="text-[10px]">
                                {t("teamPartners.personStatus.pending")}
                              </Badge>
                              <Badge variant="secondary" className="text-[10px]">
                                {t(`notifications.roles.${inv.proposed_role}`) || inv.proposed_role}
                              </Badge>
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {formatDistanceToNow(new Date(inv.created_at), { addSuffix: true, ...(lang === "ar" ? { locale: ar } : {}) })}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Unified team list */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  {t("teamPartners.teamMembers")} ({nonOwnerPeople.length})
                </h3>
                {teamLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : nonOwnerPeople.length === 0 ? (
                  <Card>
                    <CardContent className="p-6 text-center text-muted-foreground">
                      <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">{t("teamPartners.noMembers")}</p>
                    </CardContent>
                  </Card>
                ) : (
                  nonOwnerPeople.map((person) => (
                    <Card key={person.id} className="overflow-hidden">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                            person.hasPlatformAccess ? "bg-primary/10" : "bg-muted"
                          }`}>
                            {personStatusIcon(person)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {person.fullName || t("teamPartners.unnamed")}
                            </p>
                            <div className="flex flex-wrap items-center gap-1 mt-0.5">
                              {person.role && (
                                <Badge variant="default" className="text-[10px]">
                                  {t(`notifications.roles.${person.role}`) || person.role}
                                </Badge>
                              )}
                              {person.hasPlatformAccess && (
                                <Badge variant="outline" className="text-[10px] gap-0.5">
                                  <Monitor className="w-2.5 h-2.5" />
                                  {t("teamPartners.personStatus.active")}
                                </Badge>
                              )}
                              {!person.hasPlatformAccess && person.hasHrRecord && (
                                <Badge variant="secondary" className="text-[10px] gap-0.5">
                                  <FileText className="w-2.5 h-2.5" />
                                  {t("teamPartners.personStatus.hrOnly")}
                                </Badge>
                              )}
                              {person.employmentKind && (
                                <Badge variant="outline" className="text-[10px]">
                                  {person.employmentKind === "internal"
                                    ? t("teamPartners.classification.internal")
                                    : t("teamPartners.classification.external")}
                                </Badge>
                              )}
                            </div>
                          </div>
                          {canManage && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="shrink-0 h-8 w-8"
                              onClick={() => setSelectedPerson(person)}
                              title={t("teamPartners.configure")}
                            >
                              <Settings2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>

              {/* Received invitations */}
              {receivedInvitations.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" />
                    {t("teamPartners.receivedInvitations")} ({receivedInvitations.length})
                  </h3>
                  {receivedInvitations.map((inv) => (
                    <Card key={inv.id} className="overflow-hidden border-primary/30">
                      <CardContent className="p-3">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <Building2 className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold">{inv.tenant_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {t("notifications.from")}: {inv.sender_display_name}
                            </p>
                            <Badge variant="secondary" className="text-[10px] mt-1">
                              {t(`notifications.roles.${inv.proposed_role}`) || inv.proposed_role}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <Button
                            size="sm"
                            variant="gold"
                            className="flex-1"
                            onClick={async () => {
                              const { error } = await respondToInvitation(inv.token, true);
                              if (error) toast.error(error.message);
                              else toast.success(t("notifications.invitationAccepted"));
                            }}
                          >
                            <Check className="w-4 h-4 me-1" />
                            {t("notifications.accept")}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={async () => {
                              const { error } = await respondToInvitation(inv.token, false);
                              if (error) toast.error(error.message);
                              else toast.success(t("notifications.invitationDeclined"));
                            }}
                          >
                            <X className="w-4 h-4 me-1" />
                            {t("notifications.decline")}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ── Partners Tab ── */}
            <TabsContent value="partners" className="space-y-4">
              {connectionsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : !connectionsWithDetails || connectionsWithDetails.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center text-muted-foreground">
                    <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">{t("teamPartners.noPartners")}</p>
                    {canManage && (
                      <Button variant="outline" size="sm" className="mt-3 gap-2" onClick={() => setAddPartnerOpen(true)}>
                        <Building2 className="w-4 h-4" />
                        {t("teamPartners.addPartner")}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                connectionsWithDetails.map((conn) => {
                  const isMine = conn.initiator_tenant_id === activeTenant?.tenant_id;
                  const partnerName = isMine ? conn.recipient_tenant_name : conn.initiator_tenant_name;
                  const partnerType = isMine ? conn.recipient_tenant_type : conn.initiator_tenant_type;
                  const isOperational = ["doctor", "trainer", "vet_clinic"].includes(partnerType || "");
                  const isPendingInbound = conn.status === "pending" && !isMine;

                  return (
                    <Card key={conn.id} className={`overflow-hidden ${isPendingInbound ? "border-primary/30" : ""}`}>
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                            <Building2 className="w-4 h-4 text-accent-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{partnerName || t("teamPartners.unknownPartner")}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Badge
                                variant={conn.status === "accepted" ? "default" : conn.status === "pending" ? "outline" : "destructive"}
                                className="text-[10px]"
                              >
                                {t(`teamPartners.connectionStatus.${conn.status}`) || conn.status}
                              </Badge>
                              <Badge variant="secondary" className="text-[10px]">
                                {isOperational
                                  ? t("teamPartners.partnerTypes.operational")
                                  : t("teamPartners.partnerTypes.service")}
                              </Badge>
                            </div>
                            {isPendingInbound && (
                              <p className="text-[10px] text-primary mt-0.5">
                                {t("teamPartners.partnerDetail.pendingInbound")}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {/* Accept/Reject for pending inbound */}
                            {isPendingInbound && canManage && (
                              <>
                                <Button
                                  variant="gold" size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleAcceptPartner(conn)}
                                  disabled={acceptConnection.isPending}
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="outline" size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleRejectPartner(conn)}
                                  disabled={rejectConnection.isPending}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            {/* Config button for accepted or own pending */}
                            {(conn.status === "accepted" || (conn.status === "pending" && isMine)) && canManage && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setSelectedPartner(conn)}
                                title={t("teamPartners.configure")}
                              >
                                <Settings2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Dialogs & Sheets */}
      <InvitePersonDialog
        open={invitePersonOpen}
        onOpenChange={setInvitePersonOpen}
        prefilledEmail={invitePrefilledEmail}
      />
      <AddPartnerDialog open={addPartnerOpen} onOpenChange={setAddPartnerOpen} onSubmit={handleAddPartner} isLoading={createConnection.isPending} />

      {selectedPerson && (
        <PersonDetailSheet
          open={!!selectedPerson}
          onOpenChange={(open) => !open && setSelectedPerson(null)}
          person={selectedPerson}
          onInviteToPlatform={canManage ? handleInviteToPlatform : undefined}
        />
      )}

      {selectedPartner && (() => {
        const isMine = selectedPartner.initiator_tenant_id === activeTenant?.tenant_id;
        const partnerName = isMine ? selectedPartner.recipient_tenant_name : selectedPartner.initiator_tenant_name;
        const partnerType = isMine ? selectedPartner.recipient_tenant_type : selectedPartner.initiator_tenant_type;
        return (
          <PartnerConfigSheet
            open={!!selectedPartner}
            onOpenChange={(open) => !open && setSelectedPartner(null)}
            connection={selectedPartner}
            isMine={isMine}
            partnerName={partnerName || ""}
            partnerType={partnerType}
          />
        );
      })()}
    </DashboardShell>
  );
};

export default DashboardTeamPartners;
