import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { useI18n } from "@/i18n";
import { useIncomingMovements, type IncomingMovement } from "@/hooks/movement/useIncomingMovements";
import { usePermissions } from "@/hooks/usePermissions";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { formatStandardDateTime } from "@/lib/displayHelpers";
import { Package, CheckCircle2, XCircle, Clock, Building2, ClipboardCheck, CalendarPlus } from "lucide-react";
import { cn } from "@/lib/utils";

export function IncomingArrivals() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { hasPermission, isOwner } = usePermissions();
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [nextStepData, setNextStepData] = useState<{ horseId: string; horseName: string } | null>(null);

  const canView = isOwner || hasPermission("movement.incoming.view");
  const canConfirm = isOwner || hasPermission("movement.incoming.confirm");

  const {
    incomingMovements, pendingCount, isLoading, canManage,
    confirmIncoming, isConfirming, cancelIncoming, isCancelling,
  } = useIncomingMovements(statusFilter);

  if (!canView) return null;

  const handleConfirm = async () => {
    if (!confirmId) return;
    const incoming = incomingMovements.find(m => m.id === confirmId);
    await confirmIncoming({ incomingId: confirmId });
    setConfirmId(null);
    // Show guided next step
    if (incoming) {
      setNextStepData({ horseId: incoming.horse_id, horseName: incoming.horse_name });
    }
  };

  const handleCancel = async () => {
    if (!cancelId) return;
    await cancelIncoming({ incomingId: cancelId });
    setCancelId(null);
  };

  const handleStartAdmission = () => {
    if (!nextStepData) return;
    setNextStepData(null);
    navigate(`/dashboard/housing?tab=admissions&startAdmission=true&horseId=${nextStepData.horseId}`);
  };

  const handleAssignLater = () => {
    setNextStepData(null);
    toast.info(t('movement.nextStep.assignLaterToast'));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-amber-600 border-amber-300 gap-1"><Clock className="h-3 w-3" />{t('movement.incoming.statusPending')}</Badge>;
      case 'completed':
        return <Badge variant="outline" className="text-emerald-600 border-emerald-300 gap-1"><CheckCircle2 className="h-3 w-3" />{t('movement.incoming.statusCompleted')}</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="text-red-600 border-red-300 gap-1"><XCircle className="h-3 w-3" />{t('movement.incoming.statusCancelled')}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">{t('movement.incoming.statusPending')} {pendingCount > 0 && `(${pendingCount})`}</SelectItem>
            <SelectItem value="completed">{t('movement.incoming.statusCompleted')}</SelectItem>
            <SelectItem value="cancelled">{t('movement.incoming.statusCancelled')}</SelectItem>
            <SelectItem value="all">{t('movement.filters.all')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {incomingMovements.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-3">
            <Package className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="text-base font-medium mb-1">{t('movement.incoming.empty')}</h3>
          <p className="text-sm text-muted-foreground">{t('movement.incoming.emptyDesc')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {incomingMovements.map((incoming) => (
            <IncomingCard
              key={incoming.id}
              incoming={incoming}
              canConfirm={canConfirm && canManage}
              onConfirm={() => setConfirmId(incoming.id)}
              onCancel={() => setCancelId(incoming.id)}
              getStatusBadge={getStatusBadge}
            />
          ))}
        </div>
      )}

      {/* Confirm Dialog */}
      <AlertDialog open={!!confirmId} onOpenChange={(open) => !open && setConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('movement.incoming.confirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('movement.incoming.confirmDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} disabled={isConfirming}>
              {t('common.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Dialog */}
      <AlertDialog open={!!cancelId} onOpenChange={(open) => !open && setCancelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('movement.incoming.cancelTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('movement.incoming.cancelDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} disabled={isCancelling} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('movement.incoming.cancelAction')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Guided Next Step Dialog */}
      <Dialog open={!!nextStepData} onOpenChange={(open) => { if (!open) setNextStepData(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              {t('movement.nextStep.title')}
            </DialogTitle>
            <DialogDescription>
              {nextStepData?.horseName} — {t('movement.nextStep.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 pt-2">
            <Button className="w-full gap-2" onClick={handleStartAdmission}>
              <ClipboardCheck className="h-4 w-4" />
              {t('movement.nextStep.startAdmission')}
            </Button>
            <Button variant="outline" className="w-full gap-2" onClick={handleAssignLater}>
              <CalendarPlus className="h-4 w-4" />
              {t('movement.nextStep.assignLater')}
            </Button>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNextStepData(null)} className="w-full">
              {t('movement.nextStep.done')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function IncomingCard({ incoming, canConfirm, onConfirm, onCancel, getStatusBadge }: {
  incoming: IncomingMovement; canConfirm: boolean; onConfirm: () => void; onCancel: () => void;
  getStatusBadge: (status: string) => React.ReactNode;
}) {
  const { t } = useI18n();
  return (
    <Card className={cn("transition-all", incoming.status === 'pending' && "border-amber-200 dark:border-amber-800")}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage src={incoming.horse_avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary">{incoming.horse_name?.[0]?.toUpperCase() || 'H'}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-medium truncate">{incoming.horse_name}</h4>
              {getStatusBadge(incoming.status)}
            </div>
            {incoming.horse_name_ar && <p className="text-xs text-muted-foreground" dir="rtl">{incoming.horse_name_ar}</p>}
            <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
              <Building2 className="h-3 w-3" />
              <span>{t('movement.incoming.from')}: {incoming.sender_tenant_name || t('common.unknown')}</span>
            </div>
            {incoming.scheduled_at && (
              <p className="text-xs text-muted-foreground mt-0.5">{t('movement.incoming.scheduledAt')}: {formatStandardDateTime(incoming.scheduled_at)}</p>
            )}
            {incoming.reason && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{t('movement.detail.reason')}: {incoming.reason}</p>
            )}
          </div>
        </div>
        {incoming.status === 'pending' && canConfirm && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t">
            <Button size="sm" variant="default" className="gap-1 flex-1" onClick={onConfirm}>
              <CheckCircle2 className="h-3.5 w-3.5" />{t('movement.incoming.confirmArrival')}
            </Button>
            <Button size="sm" variant="outline" className="gap-1" onClick={onCancel}>
              <XCircle className="h-3.5 w-3.5" />{t('movement.incoming.cancelAction')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
