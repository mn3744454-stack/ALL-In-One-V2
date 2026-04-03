import { useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { MobilePageHeader } from "@/components/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Users, Building2, UserPlus, Send, Clock, Check, X,
  Mail, Phone, Loader2, Settings2, AlertCircle, Link2,
} from "lucide-react";
import { useI18n } from "@/i18n";
import { useTenant } from "@/contexts/TenantContext";
import { useInvitations } from "@/hooks/useInvitations";
import { useConnectionsWithDetails } from "@/hooks/connections";
import { useMemberRoleAssignment } from "@/hooks/roles/useMemberRoleAssignment";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale/ar";
import { InvitePersonDialog } from "@/components/team/InvitePersonDialog";
import { AddPartnerDialog } from "@/components/connections/AddPartnerDialog";
import { MemberSetupSheet } from "@/components/team/MemberSetupSheet";
import { useConnections } from "@/hooks/connections";
import { toast } from "sonner";

const DashboardTeamPartners = () => {
  const { t, lang } = useI18n();
  const { activeTenant, activeRole } = useTenant();
  const canManage = activeRole === "owner" || activeRole === "manager";

  const { sentInvitations, receivedInvitations, respondToInvitation, revokeInvitation } = useInvitations();
  const { connections: connectionsWithDetails, isLoading: connectionsLoading } = useConnectionsWithDetails();
  const { createConnection } = useConnections();
  const { members, isLoading: membersLoading } = useMemberRoleAssignment();

  const [invitePersonOpen, setInvitePersonOpen] = useState(false);
  const [addPartnerOpen, setAddPartnerOpen] = useState(false);
  const [setupMember, setSetupMember] = useState<string | null>(null);

  // Determine which members need setup (accepted but missing horse assignments or still 'external' default)
  const pendingInvitations = sentInvitations.filter(i => i.status === "pending" || i.status === "preaccepted");
  const acceptedMembers = members.filter(m => m.role !== "owner");

  const handleAddPartner = async (recipientTenantId: string) => {
    await createConnection.mutateAsync({ connectionType: "b2b", recipientTenantId });
    setAddPartnerOpen(false);
    toast.success(t("teamPartners.partnerRequestSent"));
  };

  const selectedMember = setupMember ? members.find(m => m.id === setupMember) : null;

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
                <Button variant="gold" size="sm" onClick={() => setInvitePersonOpen(true)} className="gap-2">
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

          <Tabs defaultValue="people" className="space-y-4">
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="people" className="flex-1 sm:flex-none gap-1.5">
                <Users className="w-4 h-4" />
                {t("teamPartners.tabs.people")}
                {(pendingInvitations.length + acceptedMembers.length) > 0 && (
                  <Badge variant="secondary" className="text-[10px] h-4 min-w-[16px] p-0 flex items-center justify-center">
                    {pendingInvitations.length + acceptedMembers.length}
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
                                {t("teamPartners.status.pending")}
                              </Badge>
                              <Badge variant="secondary" className="text-[10px]">
                                {t(`notifications.roles.${inv.proposed_role}`) || inv.proposed_role}
                              </Badge>
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {formatDistanceToNow(new Date(inv.created_at), { addSuffix: true, ...(lang === 'ar' ? { locale: ar } : {}) })}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Active team members */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  {t("teamPartners.activeMembers")} ({acceptedMembers.length})
                </h3>
                {membersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : acceptedMembers.length === 0 ? (
                  <Card>
                    <CardContent className="p-6 text-center text-muted-foreground">
                      <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">{t("teamPartners.noMembers")}</p>
                    </CardContent>
                  </Card>
                ) : (
                  acceptedMembers.map((member) => (
                    <Card key={member.id} className="overflow-hidden">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <Users className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {member.profile?.full_name || t("teamPartners.unnamed")}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Badge variant="default" className="text-[10px]">
                                {t(`notifications.roles.${member.role}`) || member.role}
                              </Badge>
                            </div>
                          </div>
                          {canManage && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="shrink-0 h-8 w-8"
                              onClick={() => setSetupMember(member.id)}
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

              {/* Received invitations for current user */}
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

                  return (
                    <Card key={conn.id} className="overflow-hidden">
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
                              {partnerType && (
                                <Badge variant="secondary" className="text-[10px]">
                                  {t(`onboarding.tenantTypes.${partnerType}`) || partnerType}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Link2 className="w-4 h-4 text-muted-foreground shrink-0" />
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

      {/* Dialogs */}
      <InvitePersonDialog open={invitePersonOpen} onOpenChange={setInvitePersonOpen} />
      <AddPartnerDialog open={addPartnerOpen} onOpenChange={setAddPartnerOpen} onSubmit={handleAddPartner} isLoading={createConnection.isPending} />
      {selectedMember && (
        <MemberSetupSheet
          open={!!setupMember}
          onOpenChange={(open) => !open && setSetupMember(null)}
          member={selectedMember}
        />
      )}
    </DashboardShell>
  );
};

export default DashboardTeamPartners;
