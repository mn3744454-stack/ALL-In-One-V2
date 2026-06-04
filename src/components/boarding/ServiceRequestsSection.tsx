import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import { useTenant } from "@/contexts/TenantContext";
import {
  useServiceRequests,
  type ServiceRequest,
  type ServiceRequestStatus,
} from "@/hooks/boarding/useServiceRequests";
import { ServiceRequestSheet } from "./ServiceRequestSheet";
import { ReviewServiceRequestSheet } from "./ReviewServiceRequestSheet";

interface Props {
  boardingContractId: string;
  side: "owner" | "stable";
}

function StatusBadge({ status }: { status: ServiceRequestStatus }) {
  const { t } = useI18n();
  const map: Record<ServiceRequestStatus, any> = {
    pending: "secondary",
    approved: "default",
    rejected: "outline",
    cancelled: "outline",
    completed: "default",
  };
  return <Badge variant={map[status]}>{t(`serviceRequests.status.${status}`)}</Badge>;
}

export function ServiceRequestsSection({ boardingContractId, side }: Props) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant?.id ?? activeTenant?.tenant_id ?? null;

  const { requests, isLoading, cancel, updateFulfillment } =
    useServiceRequests({ boardingContractId });
  const [createOpen, setCreateOpen] = useState(false);
  const [review, setReview] = useState<ServiceRequest | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium text-navy">
          {t("serviceRequests.sectionTitle")}
        </h3>
        <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
          {t("serviceRequests.newRequest")}
        </Button>
      </div>

      {isLoading && (
        <p className="text-xs text-muted-foreground">{t("common.loading")}</p>
      )}
      {!isLoading && requests.length === 0 && (
        <p className="text-xs text-muted-foreground">{t("serviceRequests.empty")}</p>
      )}

      <div className="space-y-2">
        {requests.map((r) => {
          const isTarget = r.target_tenant_id === tenantId;
          const isInitiator = r.initiator_tenant_id === tenantId;
          const notes = (r.details as any)?.notes as string | undefined;
          return (
            <div
              key={r.id}
              className="rounded-md border p-3 space-y-2 text-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={r.status} />
                <span className="font-medium">
                  {t(`serviceRequests.type.${r.request_type}`)}
                </span>
                <span className="text-xs text-muted-foreground">
                  · {t(`serviceRequests.direction.${r.direction}`)}
                </span>
              </div>
              {notes && (
                <div className="text-xs text-muted-foreground line-clamp-2">{notes}</div>
              )}
              {r.cost_estimate != null && (
                <div className="text-xs text-muted-foreground">
                  {t("serviceRequests.costEstimate")}: {r.cost_estimate} {r.currency}
                </div>
              )}
              {r.status === "rejected" && r.rejection_reason && (
                <div className="text-xs text-destructive">
                  {t("serviceRequests.rejectionReason")}: {r.rejection_reason}
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-1">
                {r.status === "pending" && isTarget && (
                  <Button size="sm" onClick={() => setReview(r)}>
                    {t("serviceRequests.review")}
                  </Button>
                )}
                {r.status === "pending" && isInitiator && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => cancel.mutate({ service_request_id: r.id })}
                  >
                    {t("serviceRequests.cancel")}
                  </Button>
                )}

                {/* Stable-side post-approval fulfillment */}
                {side === "stable" &&
                  isTarget &&
                  r.status === "approved" &&
                  r.fulfillment_status !== "fulfilled" && (
                    <>
                      {r.request_type === "extra_lab" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            navigate(
                              `/dashboard/laboratory?from_service_request=${r.id}&horse_id=${r.horse_id}`,
                            )
                          }
                        >
                          {t("serviceRequests.createLabRequestCta")}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          updateFulfillment.mutate({
                            service_request_id: r.id,
                            fulfillment_status: "fulfilled",
                          })
                        }
                      >
                        {t("serviceRequests.markFulfilled")}
                      </Button>
                    </>
                  )}
              </div>
              {r.fulfillment_status !== "not_required" && (
                <div className="text-[11px] text-muted-foreground">
                  {t("serviceRequests.fulfillmentLabel")}:{" "}
                  {t(`serviceRequests.fulfillment.${r.fulfillment_status}`)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <ServiceRequestSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        boardingContractId={boardingContractId}
        side={side}
      />
      <ReviewServiceRequestSheet
        open={!!review}
        onOpenChange={(o) => !o && setReview(null)}
        request={review}
      />
    </div>
  );
}
